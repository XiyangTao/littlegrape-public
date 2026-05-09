import { useState, useCallback, useRef, useEffect } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import AudioRecord from 'react-native-audio-record';
import { File } from 'expo-file-system/next';
import { useSharedValue, SharedValue } from 'react-native-reanimated';
import { useQuotaStore } from '@/stores';
import { handlePaymentBlockMessage } from '@/utils/paymentBlock';
import { calculateVolumeFromBase64, requestAudioPermission } from '@/utils/audioUtils';
import { tokenManager, isInvalidTokenWsError } from '@/auth/TokenManager';
import { tryGetSession } from '@/session/registry';

// ============================================================================
// 类型定义
// ============================================================================

/** 录音配置 */
export interface RecordingConfig {
  /** 是否启用实时 ASR */
  enableASR?: boolean;
  /** ASR 配置 */
  asrConfig?: {
    /** 识别语言，默认自动检测 */
    language?: string;
    /** 候选语言列表 */
    candidateLanguages?: string[];
    /** ASR 引擎: 'azure' | 'xunfei'，默认 'azure' */
    engine?: 'azure' | 'xunfei';
  };
  /** 最大录音时长（毫秒），默认 60000（1分钟） */
  maxDuration?: number;
  /** 用户ID（用于 ASR 用量统计） */
  userId?: string | null;
}

/** 录音状态 */
export interface RecordingState {
  /** 是否正在初始化（权限请求、WebSocket 连接等） */
  isInitializing: boolean;
  /** 是否正在录音 */
  isRecording: boolean;
  /** 错误信息 */
  error: string | null;
  /** WebSocket 是否已连接（仅 ASR 模式） */
  isConnected: boolean;
  /** 当前识别的文本（实时更新，仅 ASR 模式） */
  recognizingText: string;
  /** 最终识别的文本（仅 ASR 模式） */
  recognizedText: string;
}

/** 录音结果 */
export interface RecordingResult {
  /** 录音文件路径 */
  filePath: string;
  /** 录音时长（毫秒） */
  duration: number;
  /** 识别文本 Promise（仅 ASR 模式） */
  textPromise?: Promise<string>;
}

/** WebSocket 消息类型 */
interface WSMessage {
  type: 'config' | 'audio' | 'stop';
  config?: RecordingConfig['asrConfig'] & { user_id?: string };
  audio?: string;
}

interface WSResponse {
  type: 'started' | 'recognizing' | 'recognized' | 'stopped' | 'error';
  text?: string;
  confidence?: number;
  isFinal?: boolean;
  error?: string;
  requestId?: string;
}

// ============================================================================
// 常量
// ============================================================================

const INITIAL_STATE: RecordingState = {
  isInitializing: false,
  isRecording: false,
  error: null,
  isConnected: false,
  recognizingText: '',
  recognizedText: '',
};

const DEFAULT_MAX_DURATION = 60000; // 1分钟
const MAX_VOLUME_HISTORY = 50; // 最大音量历史记录数
const WS_CONNECT_TIMEOUT = 10000;
const MAX_AUDIO_BUFFER_SIZE = 500; // 音频缓冲区上限（防内存泄漏）

const WS_STOP_TIMEOUT = 5000;
const AUDIO_FLUSH_DELAY = 100; // 音频数据刷新延迟

// ============================================================================
// Hook 实现
// ============================================================================

/**
 * 统一录音 Hook
 *
 * 支持两种模式：
 * 1. 纯录音模式：录音后返回文件路径
 * 2. ASR 模式：录音时实时识别，返回识别文本
 *
 * 特性：
 * - 全局锁防止并发录音
 * - 后台自动停止
 * - 最大录音时长限制（默认1分钟）
 * - 停止时确保音频数据完整发送
 */
export const useRecording = (config?: RecordingConfig) => {
  const [state, setState] = useState<RecordingState>(INITIAL_STATE);

  // 配置
  const enableASR = config?.enableASR ?? false;
  const maxDuration = config?.maxDuration ?? DEFAULT_MAX_DURATION;

  // SharedValues - 高频更新数据，绑过 React 渲染周期
  const volumeHistoryShared = useSharedValue<number[]>([]);
  const durationShared = useSharedValue<number>(0);

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const maxDurationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const isInitializedRef = useRef<boolean>(false);
  const isRecordingRef = useRef<boolean>(false);
  const isInitializingRef = useRef<boolean>(false); // 同步读取初始化状态
  const isStoppingRef = useRef<boolean>(false); // 防止重复停止
  const audioListenerRef = useRef<any>(null);
  const isMountedRef = useRef<boolean>(true);
  const pendingAudioCountRef = useRef<number>(0); // 待发送的音频数量
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  // 待处理事件（用于初始化期间用户释放手指的情况）
  const pendingActionRef = useRef<string | null>(null);
  const pendingCallbackRef = useRef<((action: string) => void) | null>(null);
  // 音频数据缓冲（WebSocket 就绪前缓存音频数据，避免丢失开头部分）
  const audioBufferRef = useRef<string[]>([]);
  const isWSReadyRef = useRef<boolean>(false);
  // 正在连接中的 WebSocket（用于取消未完成的连接）
  const pendingWSRef = useRef<WebSocket | null>(null);
  // 识别文本 ref（解决 useCallback 闭包问题）
  const recognizedTextRef = useRef<string>('');
  const recognizingTextRef = useRef<string>('');
  const isLockedRef = useRef<boolean>(false);

  // ============================================================================
  // 工具函数
  // ============================================================================

  /** 安全更新状态 */
  const safeSetState = useCallback((updater: (prev: RecordingState) => RecordingState) => {
    if (isMountedRef.current) {
      setState(updater);
    }
  }, []);

  /** 清理计时器 */
  const clearAllTimers = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (maxDurationTimerRef.current) {
      clearTimeout(maxDurationTimerRef.current);
      maxDurationTimerRef.current = null;
    }
  }, []);

  /** 清理 WebSocket */
  const cleanupWebSocket = useCallback(() => {
    if (audioListenerRef.current) {
      audioListenerRef.current.remove();
      audioListenerRef.current = null;
    }
    const closeWS = (ws: WebSocket | null) => {
      if (!ws) return;
      try {
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close();
        }
      } catch (e) {
        console.debug('[useRecording] WebSocket close error:', e);
      }
    };
    closeWS(pendingWSRef.current);
    pendingWSRef.current = null;
    closeWS(wsRef.current);
    wsRef.current = null;
    isWSReadyRef.current = false;
  }, []);

  /** 释放锁 */
  const releaseLock = useCallback(() => {
    isLockedRef.current = false;
  }, []);

  /** 删除录音文件 */
  const deleteFile = useCallback(async (filePath: string) => {
    try {
      const uri = filePath.startsWith('file://') ? filePath : `file://${filePath}`;
      const file = new File(uri);
      if (file.exists) {
        file.delete();
      }
    } catch (error) {
      console.error('[useRecording] 删除录音文件失败:', error);
    }
  }, []);

  /**
   * 设置待处理事件（用于初始化期间用户释放手指的情况）
   * 如果当前正在初始化，事件会被存储，初始化完成后自动执行回调
   * 如果不在初始化中，直接执行回调
   * @param action 事件类型
   * @param callback 回调函数
   * @returns true 表示事件被存储（正在初始化中），false 表示直接执行了回调
   */
  const setPendingAction = useCallback(<T extends string>(action: T, callback: (action: T) => void): boolean => {
    if (isInitializingRef.current) {
      pendingActionRef.current = action;
      pendingCallbackRef.current = callback as (action: string) => void;
      return true;
    }
    callback(action);
    return false;
  }, []);

  /** 清除待处理事件 */
  const clearPendingAction = useCallback(() => {
    pendingActionRef.current = null;
    pendingCallbackRef.current = null;
  }, []);

  // ============================================================================
  // 权限和初始化
  // ============================================================================

  /** 请求录音权限 */
  const requestPermission = useCallback(
    () => requestAudioPermission('语音录制'),
    []
  );

  /** 初始化录音器（每次录音使用唯一文件名） */
  const initializeAudioRecorder = useCallback(async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) {
      throw new Error('录音权限被拒绝');
    }

    // 每次录音使用唯一文件名，避免覆盖之前的录音
    const uniqueFileName = `recording_${Date.now()}.wav`;

    const options = {
      sampleRate: 16000,
      channels: 1,
      bitsPerSample: 16,
      audioSource: 6, // VOICE_RECOGNITION
      wavFile: uniqueFileName,
    };

    AudioRecord.init(options);
    isInitializedRef.current = true;
  }, [requestPermission]);

  // ============================================================================
  // WebSocket 处理
  // ============================================================================

  /** 处理 WebSocket 响应 */
  const handleWSResponse = useCallback((response: WSResponse) => {
    switch (response.type) {
      case 'started':
        break;

      case 'recognizing':
        recognizingTextRef.current = response.text || '';
        safeSetState(prev => ({ ...prev, recognizingText: response.text || '' }));
        break;

      case 'recognized':
        recognizedTextRef.current = recognizedTextRef.current
          ? `${recognizedTextRef.current} ${response.text || ''}`
          : response.text || '';
        recognizingTextRef.current = '';
        safeSetState(prev => ({
          ...prev,
          recognizedText: recognizedTextRef.current,
          recognizingText: '',
        }));
        break;

      case 'stopped':
        break;

      case 'error':
        console.error('[useRecording] ASR 错误:', response.error);
        handlePaymentBlockMessage(response);
        safeSetState(prev => ({ ...prev, error: response.error || '识别错误' }));
        break;
    }
  }, [safeSetState]);

  /** 解析 WebSocket 消息 */
  const parseWSMessage = useCallback(async (data: any): Promise<WSResponse | null> => {
    try {
      if (typeof data === 'string') {
        return JSON.parse(data);
      } else if (data instanceof Blob) {
        const text = await data.text();
        return JSON.parse(text);
      } else if (typeof data === 'object' && data !== null) {
        return data as WSResponse;
      }
    } catch (error) {
      console.error('[useRecording] 解析 WebSocket 消息失败:', error);
    }
    return null;
  }, []);

  /** 发送单个音频数据到 WebSocket（内部使用） */
  const sendAudioData = useCallback((ws: WebSocket, data: string) => {
    if (ws.readyState === WebSocket.OPEN) {
      const audioMessage: WSMessage = { type: 'audio', audio: data };
      ws.send(JSON.stringify(audioMessage));
    }
  }, []);

  /**
   * 尝试发送缓冲区数据（如果 WebSocket 就绪）
   * 所有音频数据都先进缓冲区，然后由此函数统一发送
   * 保证数据顺序：先进先出
   */
  const flushBufferIfReady = useCallback(() => {
    // 检查 WebSocket 是否就绪
    if (!isWSReadyRef.current) {
      return;
    }

    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return;
    }

    // 缓冲区为空则跳过
    if (audioBufferRef.current.length === 0) {
      return;
    }

    // 取出所有数据并清空缓冲区（原子操作）
    const buffer = audioBufferRef.current;
    audioBufferRef.current = [];

    // 按顺序发送
    for (const data of buffer) {
      sendAudioData(ws, data);
    }
  }, [sendAudioData]);

  /**
   * 标记 WebSocket 就绪并立即发送缓冲区数据
   * 在收到 'started' 响应时调用
   */
  const markWSReadyAndFlush = useCallback((ws: WebSocket) => {
    isWSReadyRef.current = true;
    if (audioBufferRef.current.length > 0) {
      const buffer = audioBufferRef.current;
      audioBufferRef.current = [];
      for (const data of buffer) {
        sendAudioData(ws, data);
      }
    }
  }, [sendAudioData]);

  /** 连接 WebSocket */
  const connectWebSocket = useCallback((_retryCount = 0): Promise<void> => {
    return new Promise((resolve, reject) => {
      const session = tryGetSession();
      if (!session) {
        reject(new Error('未登录'));
        return;
      }
      // 默认使用 Azure 引擎
      const engine = config?.asrConfig?.engine || 'azure';
      const ws = session.openWebSocket(`/ws/asr/stream?engine=${engine}`);
      pendingWSRef.current = ws;
      let resolved = false;
      // 闭包持有当次握手用的 token —— INVALID_TOKEN 重试时给 invalidate
      let usedToken: string | null = null;

      const isConnectionValid = () => pendingWSRef.current === ws;
      let connectTimeout: NodeJS.Timeout | null = null;

      ws.onopen = () => {
        if (!isConnectionValid()) {
          ws.close();
          return;
        }

        const accessToken = tokenManager.peek();
        if (!accessToken) {
          ws.close();
          pendingWSRef.current = null;
          if (!resolved) {
            resolved = true;
            console.warn('[useRecording] 未登录，跳过 WebSocket 连接');
            reject(new Error('未登录'));
          }
          return;
        }

        pendingWSRef.current = null;
        wsRef.current = ws;
        usedToken = accessToken;
        safeSetState(prev => ({ ...prev, isConnected: true, error: null }));

        ws.send(JSON.stringify({ type: 'auth', token: accessToken }));

        const configMessage: WSMessage = {
          type: 'config',
          config: {
            language: config?.asrConfig?.language || 'auto',
            candidateLanguages: config?.asrConfig?.candidateLanguages || ['zh-CN', 'en-US'],
            user_id: config?.userId || undefined,
          },
        };
        ws.send(JSON.stringify(configMessage));
      };

      ws.onmessage = async (event) => {
        if (!isConnectionValid() && wsRef.current !== ws) return;

        const response = await parseWSMessage(event.data);
        if (!response) return;

        // 认证失败 → 让 TokenManager 决定是否刷新 → 重连一次
        if (response.type === 'error' && isInvalidTokenWsError(response) && _retryCount === 0) {
          if (connectTimeout) { clearTimeout(connectTimeout); connectTimeout = null; }
          ws.close();
          pendingWSRef.current = null;
          try {
            await tokenManager.invalidate(usedToken ?? '');
            connectWebSocket(1).then(resolve).catch(reject);
          } catch (err) {
            if (!resolved) { resolved = true; reject(err); }
          }
          return;
        }

        handleWSResponse(response);

        if (response.type === 'started' && !resolved) {
          resolved = true;
          if (connectTimeout) { clearTimeout(connectTimeout); connectTimeout = null; }
          markWSReadyAndFlush(ws);
          resolve();
        }
      };

      ws.onerror = (error) => {
        if (!isConnectionValid() && wsRef.current !== ws) return;

        console.error('[useRecording] WebSocket 错误:', error);
        safeSetState(prev => ({ ...prev, error: 'WebSocket 连接错误', isConnected: false }));
        if (!resolved) {
          resolved = true;
          if (connectTimeout) { clearTimeout(connectTimeout); connectTimeout = null; }
          reject(new Error('WebSocket 连接错误'));
        }
      };

      ws.onclose = () => {
        if (wsRef.current === ws) {
          wsRef.current = null;
          safeSetState(prev => ({ ...prev, isConnected: false }));
        }
      };

      connectTimeout = setTimeout(() => {
        connectTimeout = null;
        if (!resolved) {
          if (!isConnectionValid()) return;
          ws.close();
          pendingWSRef.current = null;
          resolved = true;
          reject(new Error('WebSocket 连接超时'));
        }
      }, WS_CONNECT_TIMEOUT);
    });
  }, [config?.asrConfig, config?.userId, handleWSResponse, parseWSMessage, safeSetState, markWSReadyAndFlush]);

  // ============================================================================
  // 核心录音控制
  // ============================================================================

  /** 内部停止录音实现 */
  const stopInternal = useCallback(async (reason: string): Promise<RecordingResult | null> => {
    if (isStoppingRef.current || !isRecordingRef.current) {
      return null;
    }

    isStoppingRef.current = true;
    clearAllTimers();
    const finalDuration = Date.now() - startTimeRef.current;

    try {
      const filePath = await AudioRecord.stop();

      // 等待剩余数据处理完成
      if (enableASR) {
        await new Promise(resolve => setTimeout(resolve, AUDIO_FLUSH_DELAY));
      }

      // 移除音频监听器
      if (audioListenerRef.current) {
        audioListenerRef.current.remove();
        audioListenerRef.current = null;
      }

      // 最终 flush：发送缓冲区中所有剩余数据
      if (enableASR && audioBufferRef.current.length > 0) {
        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) {
          const buffer = audioBufferRef.current;
          audioBufferRef.current = [];
          for (const data of buffer) {
            sendAudioData(ws, data);
          }
        } else {
          audioBufferRef.current = [];
        }
      }

      isRecordingRef.current = false;
      safeSetState(prev => ({
        ...prev,
        isRecording: false,
      }));

      // 非 ASR 模式：直接返回
      if (!enableASR) {
        releaseLock();
        isStoppingRef.current = false;
        return { filePath, duration: finalDuration };
      }

      // ASR 模式：等待最终识别结果
      const ws = wsRef.current;
      const currentRecognizedText = recognizedTextRef.current;
      const currentRecognizingText = recognizingTextRef.current;

      wsRef.current = null;
      safeSetState(prev => ({ ...prev, isConnected: false }));

      // WebSocket 未连接
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        const currentText = currentRecognizingText
          ? (currentRecognizedText ? `${currentRecognizedText} ${currentRecognizingText}` : currentRecognizingText)
          : currentRecognizedText;
        safeSetState(prev => ({ ...prev, recognizedText: currentText, recognizingText: '' }));
        releaseLock();
        isStoppingRef.current = false;
        return { filePath, duration: finalDuration, textPromise: Promise.resolve(currentText) };
      }

      releaseLock();
      isStoppingRef.current = false;

      // 创建 textPromise
      const textPromise = new Promise<string>((resolve) => {
        let finalText = currentRecognizedText;

        const closeWS = () => {
          try {
            if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
              ws.close();
            }
          } catch (e) {
            console.debug('[useRecording] WebSocket close error:', e);
          }
        };

        const timeout = setTimeout(() => {
          finalText = currentRecognizingText
            ? (finalText ? `${finalText} ${currentRecognizingText}` : currentRecognizingText)
            : finalText;
          closeWS();
          resolve(finalText);
        }, WS_STOP_TIMEOUT);

        ws.onmessage = async (event) => {
          const response = await parseWSMessage(event.data);
          if (!response) return;

          if (response.type === 'recognized' && response.text) {
            finalText = finalText ? `${finalText} ${response.text}` : response.text;
          }

          if (response.type === 'stopped') {
            clearTimeout(timeout);
            closeWS();
            resolve(finalText);
          }
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          closeWS();
          resolve(finalText);
        };

        ws.onclose = () => {
          clearTimeout(timeout);
          resolve(finalText);
        };

        ws.send(JSON.stringify({ type: 'stop' } as WSMessage));
      });

      return { filePath, duration: finalDuration, textPromise };
    } catch (error) {
      isRecordingRef.current = false;
      isStoppingRef.current = false;
      cleanupWebSocket();
      releaseLock();

      const errorMessage = error instanceof Error ? error.message : '停止录音失败';
      safeSetState(prev => ({
        ...prev,
        isRecording: false,
        isConnected: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, [enableASR, cleanupWebSocket, clearAllTimers, releaseLock, parseWSMessage, safeSetState, sendAudioData]);

  /** 开始录音 */
  const start = useCallback(async () => {
    if (isLockedRef.current || isRecordingRef.current) {
      if (isLockedRef.current) {
        safeSetState(prev => ({ ...prev, error: '已有录音正在进行中' }));
      }
      return;
    }

    isLockedRef.current = true;
    isInitializingRef.current = true;
    clearPendingAction();

    // 重置 SharedValue
    volumeHistoryShared.value = [];
    durationShared.value = 0;

    safeSetState(() => ({ ...INITIAL_STATE, isInitializing: true }));

    try {
      pendingAudioCountRef.current = 0;
      isStoppingRef.current = false;
      audioBufferRef.current = []; // 清空音频缓冲区
      isWSReadyRef.current = false; // 重置 WebSocket 就绪状态
      recognizedTextRef.current = ''; // 重置识别文本 ref
      recognizingTextRef.current = ''; // 重置识别中文本 ref

      await initializeAudioRecorder();

      // ASR 模式：设置音频监听并启动 WebSocket 连接
      if (enableASR) {
        audioListenerRef.current = AudioRecord.on('data', (data: string) => {
          // 缓冲区满时丢弃最旧的数据（防内存泄漏）
          if (audioBufferRef.current.length >= MAX_AUDIO_BUFFER_SIZE) {
            audioBufferRef.current.shift();
          }
          audioBufferRef.current.push(data);
          flushBufferIfReady();

          // 计算音量并直接更新 SharedValue（不触发 React 重渲染）
          const volume = calculateVolumeFromBase64(data);
          const newHistory = [...volumeHistoryShared.value, volume];
          if (newHistory.length > MAX_VOLUME_HISTORY) {
            newHistory.shift();
          }
          volumeHistoryShared.value = newHistory;
        });

        connectWebSocket().catch(error => {
          if (!isRecordingRef.current) return;
          console.error('[useRecording] WebSocket 连接失败:', error);
          safeSetState(prev => ({ ...prev, error: 'ASR 连接失败，录音继续' }));
        });
      }

      isRecordingRef.current = true;
      isInitializingRef.current = false;
      AudioRecord.start();
      startTimeRef.current = Date.now();

      // 更新计时器 - 直接更新 SharedValue（不触发 React 重渲染）
      timerRef.current = setInterval(() => {
        if (isRecordingRef.current) {
          durationShared.value = Date.now() - startTimeRef.current;
        }
      }, 100);

      maxDurationTimerRef.current = setTimeout(() => {
        if (isRecordingRef.current) {
          stopInternal('max_duration');
        }
      }, maxDuration);

      safeSetState(prev => ({ ...prev, isInitializing: false, isRecording: true }));

      // 处理待处理事件（用户在初始化期间释放了手指）
      if (pendingActionRef.current && pendingCallbackRef.current) {
        const action = pendingActionRef.current;
        const callback = pendingCallbackRef.current;
        clearPendingAction();
        setTimeout(() => {
          if (isMountedRef.current) callback(action);
        }, 100);
      }
    } catch (error) {
      isRecordingRef.current = false;
      isInitializingRef.current = false;
      clearPendingAction();
      cleanupWebSocket();
      clearAllTimers();
      releaseLock();

      const errorMessage = error instanceof Error ? error.message : '开始录音失败';
      safeSetState(prev => ({ ...prev, isInitializing: false, error: errorMessage }));
      throw error;
    } finally {
      // 安全网：如果初始化未完成（录音未真正启动），确保锁被释放
      if (!isRecordingRef.current) {
        isLockedRef.current = false;
      }
    }
  }, [enableASR, maxDuration, initializeAudioRecorder, connectWebSocket, cleanupWebSocket, clearAllTimers, clearPendingAction, releaseLock, safeSetState, stopInternal, flushBufferIfReady]);

  /** 停止录音（用户调用） */
  const stop = useCallback(async (): Promise<RecordingResult> => {
    const result = await stopInternal('user');
    if (!result) {
      throw new Error('录音未在进行中');
    }
    return result;
  }, [stopInternal]);

  /** 取消录音 */
  const cancel = useCallback(async () => {
    if (isStoppingRef.current) return;

    clearAllTimers();
    isRecordingRef.current = false;
    isStoppingRef.current = false;
    audioBufferRef.current = [];
    isWSReadyRef.current = false;
    recognizedTextRef.current = '';
    recognizingTextRef.current = '';

    safeSetState(() => INITIAL_STATE);
    cleanupWebSocket();

    try {
      const filePath = await AudioRecord.stop();
      if (filePath) {
        await deleteFile(filePath);
      }
    } catch (error) {
      if (__DEV__) console.warn('[useRecording] 停止录音清理失败:', error);
    } finally {
      releaseLock();
    }
  }, [cleanupWebSocket, clearAllTimers, deleteFile, releaseLock, safeSetState]);

  /** 清理所有资源 */
  const cleanup = useCallback(() => {
    clearAllTimers();
    cleanupWebSocket();

    if (isRecordingRef.current) {
      AudioRecord.stop().catch(e => {
        if (__DEV__) console.warn('[useRecording] cleanup 停止录音失败:', e);
      });
    }

    isInitializedRef.current = false;
    isRecordingRef.current = false;
    isStoppingRef.current = false;
    pendingAudioCountRef.current = 0;
    audioBufferRef.current = [];
    isWSReadyRef.current = false;
    recognizedTextRef.current = '';
    recognizingTextRef.current = '';

    safeSetState(() => INITIAL_STATE);
    releaseLock();
  }, [cleanupWebSocket, clearAllTimers, releaseLock, safeSetState]);

  // ============================================================================
  // 生命周期
  // ============================================================================

  // 后台状态监听：应用进入后台时自动停止录音
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appStateRef.current === 'active' && nextAppState.match(/inactive|background/)) {
        if (isRecordingRef.current && !isStoppingRef.current) {
          stopInternal('background');
        }
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [stopInternal]);

  // 组件挂载/卸载
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      clearAllTimers();
      cleanupWebSocket();

      if (isRecordingRef.current) {
        AudioRecord.stop().catch(e => {
          if (__DEV__) console.warn('[useRecording] 卸载时停止录音失败:', e);
        });
      }

      releaseLock();
    };
  }, [clearAllTimers, cleanupWebSocket, releaseLock]);

  // ============================================================================
  // 返回
  // ============================================================================

  return {
    // 状态
    ...state,
    /** 当前显示的文本（ASR 模式） */
    currentText: state.recognizingText || state.recognizedText,

    // SharedValue（高频数据，直接在 UI 线程使用）
    /** 音量历史 SharedValue */
    volumeHistoryShared,
    /** 录音时长 SharedValue（毫秒） */
    durationShared,

    // 方法
    /** 开始录音 */
    start,
    /** 停止录音并返回结果 */
    stop,
    /** 取消录音 */
    cancel,
    /** 清理所有资源 */
    cleanup,
    /** 删除录音文件 */
    deleteFile,
    /**
     * 设置待处理事件（用于初始化期间用户释放手指的情况）
     * 如果正在初始化，事件会被存储，初始化完成后自动执行回调
     * 如果不在初始化中，直接执行回调
     */
    setPendingAction,
  };
};
