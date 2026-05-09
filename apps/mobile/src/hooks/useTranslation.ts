import { useState, useCallback, useRef, useEffect } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import AudioRecord from 'react-native-audio-record';
import { useSharedValue, SharedValue, runOnJS } from 'react-native-reanimated';
import { useQuotaStore } from '@/stores';
import { handlePaymentBlockMessage } from '@/utils/paymentBlock';
import { calculateVolumeFromBase64, requestAudioPermission } from '@/utils/audioUtils';
import { tokenManager, isInvalidTokenWsError } from '@/auth/TokenManager';
import { tryGetSession } from '@/session/registry';

// ============================================================================
// 类型定义
// ============================================================================

/** 翻译配置 */
export interface TranslationConfig {
  /** 源语言: 'zh-CN' | 'en-US' | 'auto' */
  sourceLanguage?: 'zh-CN' | 'en-US' | 'auto';
  /** 目标语言: 'zh-CN' | 'en-US' */
  targetLanguage: 'zh-CN' | 'en-US';
  /** 是否启用语音合成 */
  enableSynthesis?: boolean;
  /** 合成语音名称 */
  voiceName?: string;
  /** 最大录音时长（毫秒），默认 60000（60秒） */
  maxDuration?: number;
}

/** 翻译结果 */
export interface TranslationResult {
  /** 唯一标识 */
  id: string;
  /** 源文本 */
  sourceText: string;
  /** 翻译后的文本 */
  translatedText: string;
  /** 检测到的语言 */
  detectedLanguage?: string;
  /** 时间戳 */
  timestamp: number;
  /** 状态 */
  status: 'pending' | 'done' | 'error';
  /** 来源 */
  source: 'voice' | 'text';
  /** 语音录音文件路径 */
  audioUri?: string;
  /** 语音时长（毫秒） */
  voiceDuration?: number;
  /** 源语言代码 */
  sourceLanguageCode?: 'zh-CN' | 'en-US';
  /** 目标语言代码 */
  targetLanguageCode?: 'zh-CN' | 'en-US';
}

/** useTranslation 选项 */
export interface UseTranslationOptions {
  /** 收到最终翻译结果时的回调 */
  onResult?: (data: { sourceText: string; translatedText: string; detectedLanguage?: string }) => void;
}

/** 翻译状态 */
export interface TranslationState {
  /** 是否正在初始化 */
  isInitializing: boolean;
  /** 是否正在录音 */
  isRecording: boolean;
  /** 是否正在翻译（等待结果） */
  isTranslating: boolean;
  /** WebSocket 是否已连接 */
  isConnected: boolean;
  /** 错误信息 */
  error: string | null;
}

/** WebSocket 消息类型 */
interface WSMessage {
  type: 'config' | 'audio' | 'stop';
  config?: {
    sourceLanguage?: string;
    targetLanguage: string;
    enableSynthesis?: boolean;
    voiceName?: string;
  };
  audio?: string;
}

interface WSResponse {
  type: 'started' | 'translating' | 'translated' | 'synthesis' | 'error' | 'stopped';
  sourceText?: string;
  translatedText?: string;
  isFinal?: boolean;
  detectedLanguage?: string;
  audioData?: string;
  error?: string;
  requestId?: string;
}

// ============================================================================
// 常量
// ============================================================================

const INITIAL_STATE: TranslationState = {
  isInitializing: false,
  isRecording: false,
  isTranslating: false,
  isConnected: false,
  error: null,
};

const DEFAULT_MAX_DURATION = 60000; // 60秒
const MAX_VOLUME_HISTORY = 50;
const WS_CONNECT_TIMEOUT = 10000;
const PENDING_STOP_TIMEOUT = 3000; // 等待 started 的超时（pendingStop 兜底）
const MAX_AUDIO_BUFFER_SIZE = 500; // 音频缓冲区上限（防内存泄漏）
const AUDIO_FLUSH_DELAY = 100;

// ============================================================================
// Hook 实现
// ============================================================================

/**
 * 实时语音翻译 Hook
 *
 * 使用方式：
 * 1. 调用 start(config) 开始录音和翻译
 * 2. 实时显示 recognizingText 和 translatingText
 * 3. 最终结果会被添加到 results 数组
 * 4. 调用 stop() 停止录音
 *
 * 特性：
 * - 录音立即开始，无需等待 WebSocket 连接
 * - 实时显示识别和翻译结果
 * - 支持中英双向翻译
 * - 全局锁防止并发
 * - 后台自动停止
 */
export const useTranslation = (options?: UseTranslationOptions) => {
  const [state, setState] = useState<TranslationState>(INITIAL_STATE);

  // 用 useRef 缓存 onResult 回调，避免依赖不稳定
  const onResultRef = useRef(options?.onResult);
  onResultRef.current = options?.onResult;

  // SharedValues - 高频更新数据，绑过 React 渲染周期
  const volumeHistoryShared = useSharedValue<number[]>([]);
  const durationShared = useSharedValue<number>(0);

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const maxDurationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const isRecordingRef = useRef<boolean>(false);
  const isInitializingRef = useRef<boolean>(false);
  const isStoppingRef = useRef<boolean>(false);
  const audioListenerRef = useRef<any>(null);
  const isMountedRef = useRef<boolean>(true);
  const audioBufferRef = useRef<string[]>([]);
  const isWSReadyRef = useRef<boolean>(false);
  const pendingWSRef = useRef<WebSocket | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const configRef = useRef<TranslationConfig | null>(null);
  const wsCloseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLockedRef = useRef<boolean>(false);
  // stop() 时 WS 未就绪，延迟到 markWSReadyAndFlush 中发送 stop
  const pendingStopRef = useRef<boolean>(false);
  const pendingStopTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================================================
  // 工具函数
  // ============================================================================

  const safeSetState = useCallback((updater: (prev: TranslationState) => TranslationState) => {
    if (isMountedRef.current) {
      setState(updater);
    }
  }, []);

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

  const cleanupWebSocket = useCallback(() => {
    pendingStopRef.current = false;
    if (pendingStopTimerRef.current) {
      clearTimeout(pendingStopTimerRef.current);
      pendingStopTimerRef.current = null;
    }
    if (audioListenerRef.current) {
      audioListenerRef.current.remove();
      audioListenerRef.current = null;
    }
    if (wsCloseTimerRef.current) {
      clearTimeout(wsCloseTimerRef.current);
      wsCloseTimerRef.current = null;
    }
    const closeWS = (ws: WebSocket | null) => {
      if (!ws) return;
      try {
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close();
        }
      } catch (e) {
        console.debug('[useTranslation] WebSocket close error:', e);
      }
    };
    closeWS(pendingWSRef.current);
    pendingWSRef.current = null;
    closeWS(wsRef.current);
    wsRef.current = null;
    isWSReadyRef.current = false;
  }, []);

  const releaseLock = useCallback(() => {
    isLockedRef.current = false;
  }, []);

  // ============================================================================
  // 权限和录音初始化
  // ============================================================================

  const requestPermission = useCallback(
    () => requestAudioPermission('语音翻译'),
    []
  );

  const initializeAudioRecorder = useCallback(async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) {
      throw new Error('录音权限被拒绝');
    }

    const uniqueFileName = `translation_${Date.now()}.wav`;

    const options = {
      sampleRate: 16000,
      channels: 1,
      bitsPerSample: 16,
      audioSource: 6, // VOICE_RECOGNITION
      wavFile: uniqueFileName,
    };

    AudioRecord.init(options);
  }, [requestPermission]);

  // ============================================================================
  // WebSocket 处理
  // ============================================================================

  const sendAudioData = useCallback((ws: WebSocket, data: string) => {
    if (ws.readyState === WebSocket.OPEN) {
      const audioMessage: WSMessage = { type: 'audio', audio: data };
      ws.send(JSON.stringify(audioMessage));
    }
  }, []);

  const flushBufferIfReady = useCallback(() => {
    if (!isWSReadyRef.current) return;

    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (audioBufferRef.current.length === 0) return;

    const buffer = audioBufferRef.current;
    audioBufferRef.current = [];

    for (const data of buffer) {
      sendAudioData(ws, data);
    }
  }, [sendAudioData]);

  const markWSReadyAndFlush = useCallback((ws: WebSocket) => {
    isWSReadyRef.current = true;
    if (audioBufferRef.current.length > 0) {
      const buffer = audioBufferRef.current;
      audioBufferRef.current = [];
      for (const data of buffer) {
        sendAudioData(ws, data);
      }
    }
    // 如果 stop() 在等待就绪，现在发送 stop 消息
    if (pendingStopRef.current) {
      pendingStopRef.current = false;
      if (pendingStopTimerRef.current) {
        clearTimeout(pendingStopTimerRef.current);
        pendingStopTimerRef.current = null;
      }
      console.log('[Translation] WS 就绪, 发送延迟的 stop 消息');
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'stop' } as WSMessage));
        wsCloseTimerRef.current = setTimeout(() => {
          cleanupWebSocket();
          safeSetState(prev => ({ ...prev, isTranslating: false }));
        }, 5000);
      }
      releaseLock();
    }
  }, [sendAudioData, cleanupWebSocket, safeSetState, releaseLock]);

  const handleWSResponse = useCallback((response: WSResponse) => {
    switch (response.type) {
      case 'started':
        safeSetState(prev => ({ ...prev, isConnected: true }));
        break;

      case 'translating':
        // 实时翻译结果（中间结果），不再更新状态
        break;

      case 'translated':
        // 最终翻译结果，通过回调通知外部
        if (response.sourceText && response.translatedText) {
          onResultRef.current?.({
            sourceText: response.sourceText,
            translatedText: response.translatedText,
            detectedLanguage: response.detectedLanguage,
          });
        }
        break;

      case 'synthesis':
        // 语音合成结果（可以在这里播放）
        // TODO: 如果需要自动播放，可以在这里实现
        break;

      case 'stopped':
        safeSetState(prev => ({
          ...prev,
          isTranslating: false,
        }));
        // 服务端已确认停止，关闭 WebSocket
        cleanupWebSocket();
        break;

      case 'error':
        console.error('[Translation WS] 翻译错误:', response.error);
        handlePaymentBlockMessage(response);
        if (isRecordingRef.current) {
          isRecordingRef.current = false;
          try { AudioRecord.stop(); } catch {}
          clearAllTimers();
        }
        cleanupWebSocket();
        releaseLock();
        safeSetState(prev => ({
          ...prev,
          isRecording: false,
          isTranslating: false,
          error: response.error || '翻译错误',
        }));
        break;
    }
  }, [safeSetState, cleanupWebSocket, clearAllTimers, releaseLock]);

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
      console.error('[useTranslation] 解析 WebSocket 消息失败:', error);
    }
    return null;
  }, []);

  const connectWebSocket = useCallback((config: TranslationConfig, _retryCount = 0): Promise<void> => {
    return new Promise((resolve, reject) => {
      const session = tryGetSession();
      if (!session) {
        console.warn('[useTranslation] 未登录，跳过 WebSocket 连接');
        resolve();
        return;
      }
      const ws = session.openWebSocket('/ws/translation/stream');
      pendingWSRef.current = ws;
      let resolved = false;
      // 闭包持有当次握手用的 token —— INVALID_TOKEN 重试时给 invalidate
      let usedToken: string | null = null;

      const isConnectionValid = () => pendingWSRef.current === ws;

      // 连接超时 - 不阻塞录音
      const connectTimer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          console.warn('[useTranslation] WebSocket 连接超时，继续录音');
          resolve();
        }
      }, WS_CONNECT_TIMEOUT);

      ws.onopen = () => {
        clearTimeout(connectTimer);
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
            console.warn('[useTranslation] 未登录，跳过 WebSocket 连接');
            resolve();
          }
          return;
        }

        pendingWSRef.current = null;
        wsRef.current = ws;
        usedToken = accessToken;

        ws.send(JSON.stringify({ type: 'auth', token: accessToken }));

        // 发送配置消息
        const configMessage: WSMessage = {
          type: 'config',
          config: {
            sourceLanguage: config.sourceLanguage || 'auto',
            targetLanguage: config.targetLanguage,
            enableSynthesis: config.enableSynthesis,
            voiceName: config.voiceName,
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
          clearTimeout(connectTimer);
          ws.close();
          pendingWSRef.current = null;
          try {
            await tokenManager.invalidate(usedToken ?? '');
            connectWebSocket(config, 1).then(resolve).catch(reject);
          } catch {
            if (!resolved) { resolved = true; resolve(); }
          }
          return;
        }

        handleWSResponse(response);

        // 收到 started 表示可以开始发送音频
        if (response.type === 'started' && !resolved) {
          resolved = true;
          markWSReadyAndFlush(ws);
          resolve();
        }
      };

      ws.onerror = (error) => {
        clearTimeout(connectTimer);
        if (!isConnectionValid() && wsRef.current !== ws) return;

        console.error('[Translation WS] 连接错误:', error);
        if (!resolved) {
          resolved = true;
          // 不 reject，继续录音但不发送
          resolve();
        }
      };

      ws.onclose = (event) => {
        clearTimeout(connectTimer);
        if (wsRef.current === ws) {
          wsRef.current = null;
          isWSReadyRef.current = false;

          // 清理 pendingStop
          if (pendingStopRef.current) {
            pendingStopRef.current = false;
            if (pendingStopTimerRef.current) {
              clearTimeout(pendingStopTimerRef.current);
              pendingStopTimerRef.current = null;
            }
            releaseLock();
          }

          // 连接在录音阶段被关闭（如配额不足），需要停止录音
          if (isRecordingRef.current) {
            isRecordingRef.current = false;
            try { AudioRecord.stop(); } catch {}
            clearAllTimers();
            releaseLock();
          }

          safeSetState(prev => ({
            ...prev,
            isConnected: false,
            isRecording: false,
            isTranslating: false,
          }));
        }
      };
    });
  }, [handleWSResponse, parseWSMessage, safeSetState, markWSReadyAndFlush, clearAllTimers, releaseLock]);

  // ============================================================================
  // 核心控制方法
  // ============================================================================

  /**
   * 开始语音翻译
   */
  const start = useCallback(async (config: TranslationConfig) => {
    if (!config.targetLanguage) {
      safeSetState(prev => ({ ...prev, error: '目标语言不能为空' }));
      return;
    }

    if (isLockedRef.current || isRecordingRef.current) {
      if (isLockedRef.current) {
        safeSetState(prev => ({ ...prev, error: '已有翻译正在进行中' }));
      }
      return;
    }

    isLockedRef.current = true;
    isInitializingRef.current = true;
    configRef.current = config;

    // 重置 SharedValue
    volumeHistoryShared.value = [];
    durationShared.value = 0;

    safeSetState(() => ({ ...INITIAL_STATE, isInitializing: true }));

    try {
      isStoppingRef.current = false;
      audioBufferRef.current = [];
      isWSReadyRef.current = false;

      // 初始化录音器
      await initializeAudioRecorder();

      // 设置音频监听（录音数据先缓存）
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

      // 同时连接 WebSocket（不阻塞录音）
      connectWebSocket(config).catch(() => {
        if (!isRecordingRef.current) return;
        safeSetState(prev => ({ ...prev, error: 'WebSocket 连接失败' }));
      });

      // 立即开始录音
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

      // 最大时长限制
      const maxDuration = config.maxDuration || DEFAULT_MAX_DURATION;
      maxDurationTimerRef.current = setTimeout(() => {
        if (isRecordingRef.current) {
          stop();
        }
      }, maxDuration);

      safeSetState(prev => ({
        ...prev,
        isInitializing: false,
        isRecording: true,
        isTranslating: true,
      }));

    } catch (error) {
      isRecordingRef.current = false;
      isInitializingRef.current = false;
      cleanupWebSocket();
      clearAllTimers();
      releaseLock();

      const errorMessage = error instanceof Error ? error.message : '开始录音失败';
      safeSetState(prev => ({ ...prev, isInitializing: false, error: errorMessage }));
      throw error;
    } finally {
      // 安全网：如果录音未成功启动，确保释放锁
      if (!isRecordingRef.current) {
        isLockedRef.current = false;
      }
    }
  }, [initializeAudioRecorder, connectWebSocket, cleanupWebSocket, clearAllTimers, releaseLock, safeSetState, flushBufferIfReady]);

  /**
   * 停止语音翻译
   * @returns 录音文件路径，失败返回 undefined
   */
  const stop = useCallback(async (): Promise<string | undefined> => {
    if (isStoppingRef.current || !isRecordingRef.current) {
      return undefined;
    }

    isStoppingRef.current = true;
    clearAllTimers();

    try {
      // 停止录音
      const audioFilePath = await AudioRecord.stop();

      // 等待最后一批音频数据处理完成
      await new Promise(resolve => setTimeout(resolve, AUDIO_FLUSH_DELAY));

      // 移除音频监听器
      if (audioListenerRef.current) {
        audioListenerRef.current.remove();
        audioListenerRef.current = null;
      }

      isRecordingRef.current = false;
      safeSetState(prev => ({
        ...prev,
        isRecording: false,
      }));

      const ws = wsRef.current;

      if (ws && ws.readyState === WebSocket.OPEN) {
        if (isWSReadyRef.current) {
          // WS 已就绪：flush 缓冲区 + 发 stop + 释放锁
          if (audioBufferRef.current.length > 0) {
            const buffer = audioBufferRef.current;
            audioBufferRef.current = [];
            for (const data of buffer) {
              sendAudioData(ws, data);
            }
          }
          ws.send(JSON.stringify({ type: 'stop' } as WSMessage));
          wsCloseTimerRef.current = setTimeout(() => {
            cleanupWebSocket();
            safeSetState(prev => ({ ...prev, isTranslating: false }));
          }, 5000);
          releaseLock();
        } else {
          // WS 未就绪（started 还没到）：标记 pendingStop，由 markWSReadyAndFlush 处理
          // 缓冲区保留，等 markWSReadyAndFlush flush 后再发 stop
          console.log('[Translation] WS 未就绪, 设置 pendingStop, 缓冲区:', audioBufferRef.current.length, '条');
          pendingStopRef.current = true;
          pendingStopTimerRef.current = setTimeout(() => {
            if (pendingStopRef.current) {
              console.warn('[Translation] pendingStop 超时, 放弃翻译');
              pendingStopRef.current = false;
              cleanupWebSocket();
              safeSetState(prev => ({ ...prev, isTranslating: false }));
              releaseLock();
            }
          }, PENDING_STOP_TIMEOUT);
          // 注意：不释放锁，等 markWSReadyAndFlush 或超时后释放
        }
      } else {
        audioBufferRef.current = [];
        safeSetState(prev => ({ ...prev, isTranslating: false }));
        releaseLock();
      }

      isStoppingRef.current = false;

      return audioFilePath;
    } catch (error) {
      isRecordingRef.current = false;
      isStoppingRef.current = false;
      cleanupWebSocket();
      releaseLock();

      const errorMessage = error instanceof Error ? error.message : '停止翻译失败';
      safeSetState(prev => ({
        ...prev,
        isRecording: false,
        isTranslating: false,
        error: errorMessage,
      }));

      return undefined;
    }
  }, [clearAllTimers, cleanupWebSocket, releaseLock, safeSetState, sendAudioData]);

  /**
   * 切换语言方向
   */
  const switchLanguage = useCallback(() => {
    if (!configRef.current || isRecordingRef.current) return;

    const currentTarget = configRef.current.targetLanguage;
    const currentSource = configRef.current.sourceLanguage;

    // 切换源语言和目标语言
    configRef.current = {
      ...configRef.current,
      sourceLanguage: currentTarget === 'zh-CN' ? 'zh-CN' : currentTarget === 'en-US' ? 'en-US' : 'auto',
      targetLanguage: currentSource === 'zh-CN' ? 'zh-CN' : currentSource === 'en-US' ? 'en-US' : currentTarget === 'zh-CN' ? 'en-US' : 'zh-CN',
    };
  }, []);

  /**
   * 重置状态
   */
  const reset = useCallback(() => {
    safeSetState(() => INITIAL_STATE);
  }, [safeSetState]);


  // ============================================================================
  // 生命周期
  // ============================================================================

  // 后台状态监听
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appStateRef.current === 'active' && nextAppState.match(/inactive|background/)) {
        if (isRecordingRef.current && !isStoppingRef.current) {
          stop();
        }
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [stop]);

  // 组件卸载清理
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      clearAllTimers();
      cleanupWebSocket();

      if (isRecordingRef.current) {
        AudioRecord.stop().catch(e => {
          if (__DEV__) console.warn('[useTranslation] 卸载时停止录音失败:', e);
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

    // SharedValue（高频数据，直接在 UI 线程使用）
    /** 音量历史 SharedValue */
    volumeHistoryShared,
    /** 录音时长 SharedValue（毫秒） */
    durationShared,

    // 方法
    /** 开始语音翻译 */
    start,
    /** 停止语音翻译 */
    stop,
    /** 切换语言方向 */
    switchLanguage,
    /** 重置状态 */
    reset,
  };
};
