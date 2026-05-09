import { useState, useCallback, useRef, useEffect } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import AudioRecord from 'react-native-audio-record';
import { useQuotaStore } from '@/stores';
import { handlePaymentBlockMessage } from '@/utils/paymentBlock';
import { calculateVolumeFromBase64, requestAudioPermission } from '@/utils/audioUtils';
import { tokenManager, isInvalidTokenWsError } from '@/auth/TokenManager';
import { tryGetSession } from '@/session/registry';

// ============================================================================
// 类型定义
// ============================================================================

/** 发音评估配置 */
export interface PronunciationAssessmentConfig {
  /** 参考文本（用户应该读的内容） */
  referenceText: string;

  /** 语言，默认 'en-US' */
  language?: string;

  /** 评估粒度：phoneme（音素级）、word（单词级）、fullText（全文级） */
  granularity?: 'phoneme' | 'word' | 'fullText';

  /** 是否启用韵律评估（语调、重音） */
  enableProsody?: boolean;

  /** 是否启用错误检测（漏读、多读） */
  enableMiscue?: boolean;

  /** 最大录音时长（毫秒），默认 30000（30秒） */
  maxDuration?: number;

  /** 用户ID（用于用量统计） */
  userId?: string | null;

  /** 语音评估引擎：azure 或 xunfei，默认 azure */
  engine?: 'azure' | 'xunfei';
}

/** 音素评估结果 */
export interface PhonemeResult {
  phoneme: string;
  accuracyScore: number;
}

/** 单词评估结果 */
export interface WordAssessmentResult {
  word: string;
  accuracyScore: number;
  errorType: 'None' | 'Mispronunciation' | 'Omission' | 'Insertion' | 'UnexpectedBreak' | 'MissingBreak' | 'Monotone';
  phonemes?: PhonemeResult[];
}

/** 发音评估结果 */
export interface PronunciationAssessmentResult {
  pronunciationScore: number;
  accuracyScore: number;
  fluencyScore: number;
  completenessScore: number;
  prosodyScore?: number;
  words: WordAssessmentResult[];
  recognizedText: string;
}

/** 发音评估录音结果（stop 方法返回） */
export interface PronunciationRecordingResult {
  /** 录音文件路径 */
  filePath: string;
  /** 录音时长（毫秒） */
  duration: number;
  /** 评估结果 Promise */
  assessmentPromise: Promise<PronunciationAssessmentResult | null>;
}

/** 发音评估状态 */
export interface PronunciationAssessmentState {
  /** 是否正在初始化（权限请求、WebSocket 连接等） */
  isInitializing: boolean;

  /** 是否正在录音 */
  isRecording: boolean;

  /** 是否正在评估（等待结果） */
  isAssessing: boolean;

  /** 录音时长（毫秒） */
  duration: number;

  /** WebSocket 是否已连接 */
  isConnected: boolean;

  /** 实时识别的文本 */
  recognizingText: string;

  /** 最终评估结果 */
  result: PronunciationAssessmentResult | null;

  /** 用户录音文件路径 */
  recordingUri: string | null;

  /** 错误信息 */
  error: string | null;

  /** 音量历史 (0-1)，用于绘制波形 */
  volumeHistory: number[];
}

/** WebSocket 消息类型 */
interface WSMessage {
  type: 'config' | 'audio' | 'stop';
  config?: Omit<PronunciationAssessmentConfig, 'maxDuration' | 'userId'>;
  audio?: string;
}

interface WSResponse {
  type: 'connected' | 'ready' | 'started' | 'assessing' | 'assessed' | 'error' | 'stopped' | 'finalResult';
  requestId?: string;
  recognizedText?: string;
  assessment?: {
    pronunciationScore: number;
    accuracyScore: number;
    fluencyScore: number;
    completenessScore: number;
    prosodyScore?: number;
    words: WordAssessmentResult[];
  };
  cumulativeAssessment?: PronunciationAssessmentResult;
  isFinal?: boolean;
  error?: string;
  duration?: number;
}

// ============================================================================
// 常量
// ============================================================================

const INITIAL_STATE: PronunciationAssessmentState = {
  isInitializing: false,
  isRecording: false,
  isAssessing: false,
  duration: 0,
  isConnected: false,
  recognizingText: '',
  result: null,
  recordingUri: null,
  error: null,
  volumeHistory: [],
};

const DEFAULT_MAX_DURATION = 30000; // 30秒
const MAX_VOLUME_HISTORY = 50;
const WS_CONNECT_TIMEOUT = 10000;
const MAX_AUDIO_BUFFER_SIZE = 500; // 音频缓冲区上限（防内存泄漏）
const WS_STOP_TIMEOUT = 12000; // 停止后等评估结果的最大时长；长句 Azure 处理可能 > 5s，给足时间避免误报"未检测到完整发音"
const AUDIO_FLUSH_DELAY = 100;

// ============================================================================
// Hook 实现
// ============================================================================

/**
 * 流式发音评估 Hook
 *
 * 使用方式（和对话页面录音一致）：
 * 1. 调用 start(config) 开始录音（立即开始，同时连接 WebSocket）
 * 2. 录音数据先缓存，WebSocket 连接好后再发送
 * 3. 调用 stop() 停止录音，返回 { filePath, duration, assessmentPromise }
 *
 * 特性：
 * - 录音立即开始，无需等待 WebSocket 连接
 * - 全局锁防止并发评估
 * - 后台自动停止
 * - 最大录音时长限制
 */
export const usePronunciationAssessment = () => {
  const [state, setState] = useState<PronunciationAssessmentState>(INITIAL_STATE);

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
  const configRef = useRef<PronunciationAssessmentConfig | null>(null);
  const isLockedRef = useRef<boolean>(false);

  // ============================================================================
  // 工具函数
  // ============================================================================

  const safeSetState = useCallback((updater: (prev: PronunciationAssessmentState) => PronunciationAssessmentState) => {
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
        console.debug('[usePronunciationAssessment] WebSocket close error:', e);
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
    () => requestAudioPermission('发音评估'),
    []
  );

  const initializeAudioRecorder = useCallback(async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) {
      throw new Error('录音权限被拒绝');
    }

    const uniqueFileName = `pronunciation_${Date.now()}.wav`;

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
  }, [sendAudioData]);

  const handleWSResponse = useCallback((response: WSResponse) => {
    switch (response.type) {
      case 'connected':
      case 'ready':
      case 'started':
        safeSetState(prev => ({ ...prev, isConnected: true }));
        break;

      case 'assessing':
        safeSetState(prev => ({
          ...prev,
          recognizingText: response.recognizedText || ''
        }));
        break;

      case 'assessed':
      case 'stopped':
        // 这些事件在 stop() 方法中处理
        break;

      case 'finalResult':
        if (response.cumulativeAssessment) {
          const result = response.cumulativeAssessment;
          safeSetState(prev => ({
            ...prev,
            isAssessing: false,
            result,
            recognizingText: result.recognizedText
          }));
        }
        break;

      case 'error':
        console.error('[usePronunciationAssessment] 评估错误:', response.error);
        handlePaymentBlockMessage(response);
        // 根据错误类型显示不同的提示
        let errorMessage = '评估错误';
        if (response.error === 'NO_SPEECH_DETECTED') {
          errorMessage = '未检测到完整发音，请清晰朗读整个单词后重试';
        } else if (response.error) {
          errorMessage = response.error;
        }
        // 服务端发 error（配额超限 / 系统错误等）意味着无法继续，必须硬停录音 + 清资源，
        // 否则本地 AudioRecord 会继续跑，UI 时间条依然前进（与真实状态不一致）
        clearAllTimers();
        isRecordingRef.current = false;
        isStoppingRef.current = false;
        audioBufferRef.current = [];
        AudioRecord.stop().catch(() => {});
        cleanupWebSocket();
        releaseLock();
        safeSetState(prev => ({
          ...prev,
          isRecording: false,
          isAssessing: false,
          isInitializing: false,
          duration: 0,
          result: null,
          recognizingText: '',
          error: errorMessage,
        }));
        break;
    }
  }, [safeSetState, clearAllTimers, cleanupWebSocket, releaseLock]);

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
      console.error('[usePronunciationAssessment] 解析 WebSocket 消息失败:', error);
    }
    return null;
  }, []);

  const connectWebSocket = useCallback((config: PronunciationAssessmentConfig, _retryCount = 0): Promise<void> => {
    return new Promise((resolve, reject) => {
      const session = tryGetSession();
      if (!session) {
        console.warn('[usePronunciationAssessment] 未登录，跳过 WebSocket 连接');
        resolve();
        return;
      }
      const engine = config.engine || 'azure';
      const ws = session.openWebSocket(`/ws/pronunciation/stream?engine=${engine}`);
      pendingWSRef.current = ws;
      let resolved = false;
      // 闭包持有当次握手用的 token —— INVALID_TOKEN 重试时给 invalidate
      let usedToken: string | null = null;

      const isConnectionValid = () => pendingWSRef.current === ws;

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
            console.warn('[usePronunciationAssessment] 未登录，跳过 WebSocket 连接');
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
            referenceText: config.referenceText,
            language: config.language || 'en-US',
            granularity: config.granularity || 'phoneme',
            enableProsody: config.enableProsody !== false,
            enableMiscue: config.enableMiscue !== false,
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

        // 收到 ready 或 started 表示可以开始发送音频
        if ((response.type === 'ready' || response.type === 'started') && !resolved) {
          resolved = true;
          markWSReadyAndFlush(ws);
          resolve();
        }
      };

      ws.onerror = (error) => {
        if (!isConnectionValid() && wsRef.current !== ws) return;

        console.error('[usePronunciationAssessment] WebSocket 错误:', error);
        if (!resolved) {
          resolved = true;
          // 不 reject，继续录音但不发送
          resolve();
        }
      };

      ws.onclose = () => {
        if (wsRef.current === ws) {
          wsRef.current = null;
          isWSReadyRef.current = false;
          safeSetState(prev => ({ ...prev, isConnected: false }));
        }
      };

      // 连接超时 - 不阻塞录音
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          console.warn('[usePronunciationAssessment] WebSocket 连接超时，继续录音');
          resolve();
        }
      }, WS_CONNECT_TIMEOUT);
    });
  }, [handleWSResponse, parseWSMessage, safeSetState, markWSReadyAndFlush]);

  // ============================================================================
  // 核心控制方法
  // ============================================================================

  /**
   * 开始发音评估（立即开始录音，同时连接 WebSocket）
   */
  const start = useCallback(async (config: PronunciationAssessmentConfig) => {
    if (!config.referenceText) {
      safeSetState(prev => ({ ...prev, error: '参考文本不能为空' }));
      return;
    }

    if (isLockedRef.current || isRecordingRef.current) {
      if (isLockedRef.current) {
        safeSetState(prev => ({ ...prev, error: '已有评估正在进行中' }));
      }
      return;
    }

    isLockedRef.current = true;
    isInitializingRef.current = true;
    configRef.current = config;

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

        const volume = calculateVolumeFromBase64(data);
        safeSetState(prev => {
          const newHistory = [...prev.volumeHistory, volume];
          if (newHistory.length > MAX_VOLUME_HISTORY) {
            newHistory.shift();
          }
          return { ...prev, volumeHistory: newHistory };
        });
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

      // 更新计时器
      timerRef.current = setInterval(() => {
        if (isRecordingRef.current) {
          safeSetState(prev => ({ ...prev, duration: Date.now() - startTimeRef.current }));
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
   * 停止发音评估并获取结果
   */
  const stop = useCallback(async (): Promise<PronunciationRecordingResult | null> => {
    if (isStoppingRef.current || !isRecordingRef.current) {
      return null;
    }

    isStoppingRef.current = true;
    clearAllTimers();
    const finalDuration = Date.now() - startTimeRef.current;

    try {
      // 停止录音，获取文件路径
      const filePath = await AudioRecord.stop();

      // 等待最后一批音频数据处理完成
      await new Promise(resolve => setTimeout(resolve, AUDIO_FLUSH_DELAY));

      // 移除音频监听器
      if (audioListenerRef.current) {
        audioListenerRef.current.remove();
        audioListenerRef.current = null;
      }

      // 发送缓冲区中剩余的音频
      if (audioBufferRef.current.length > 0) {
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
        isAssessing: true,
        duration: finalDuration,
        recordingUri: filePath,
      }));

      const ws = wsRef.current;

      // WebSocket 未连接，直接返回
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        releaseLock();
        isStoppingRef.current = false;
        safeSetState(prev => ({ ...prev, isAssessing: false }));
        return {
          filePath,
          duration: finalDuration,
          assessmentPromise: Promise.resolve(null),
        };
      }

      // 释放锁
      releaseLock();
      isStoppingRef.current = false;

      // 创建评估结果 Promise
      const assessmentPromise = new Promise<PronunciationAssessmentResult | null>((resolve) => {
        let resolved = false;
        let finalResult: PronunciationAssessmentResult | null = null;

        // 诊断用：记录收到的关键事件（忽略 recognizing 临时结果，避免噪音）
        const eventTrace: string[] = [];
        const stopAt = Date.now();
        let didTimeout = false;

        const doResolve = (result: PronunciationAssessmentResult | null) => {
          if (resolved) return;
          resolved = true;
          clearTimeout(timeout);

          // 检查是否有有效结果（有识别到的单词）
          const hasValidResult = result && result.words && result.words.length > 0;

          if (hasValidResult) {
            // 有结果，显示结果
            safeSetState(prev => ({
              ...prev,
              isAssessing: false,
              result: result,
              recognizingText: result.recognizedText || prev.recognizingText
            }));
          } else {
            // 没有结果或没有识别到单词 — 打印诊断日志，帮助排查"未检测到完整发音"偶发问题
            console.warn('[usePronunciationAssessment] no valid result', {
              referenceText: configRef.current?.referenceText?.slice(0, 120) ?? '',
              recordingDurationMs: finalDuration,
              elapsedSinceStopMs: Date.now() - stopAt,
              didTimeout,
              events: eventTrace,
              hasResult: !!result,
              wordsCount: result?.words?.length ?? 0,
              recognizedText: result?.recognizedText?.slice(0, 120) ?? '',
              wsReadyState: ws.readyState,
            });
            safeSetState(prev => ({
              ...prev,
              isAssessing: false,
              result: null,
              recognizingText: '',
              duration: 0,
              error: '未检测到完整发音，请清晰朗读后重试'
            }));
          }

          // 延迟关闭 WebSocket，确保消息都发送完毕
          setTimeout(() => {
            try {
              if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                ws.close();
              }
            } catch (e) {
              console.debug('[usePronunciationAssessment] WebSocket close error:', e);
            }
          }, 100);
          resolve(result);
        };

        const timeout = setTimeout(() => {
          didTimeout = true;
          doResolve(finalResult);
        }, WS_STOP_TIMEOUT);

        ws.onmessage = async (event) => {
          const response = await parseWSMessage(event.data);
          if (!response) return;

          // 记录关键事件（忽略 assessing 临时识别推送，避免日志噪音）
          if (response.type !== 'assessing') {
            eventTrace.push(
              response.error ? `${response.type}:${response.error}` : response.type,
            );
          }

          // assessed 事件包含单次评估结果，可作为备选
          if (response.type === 'assessed' && response.assessment && !finalResult) {
            finalResult = {
              pronunciationScore: response.assessment.pronunciationScore,
              accuracyScore: response.assessment.accuracyScore,
              fluencyScore: response.assessment.fluencyScore,
              completenessScore: response.assessment.completenessScore,
              prosodyScore: response.assessment.prosodyScore,
              words: response.assessment.words,
              recognizedText: response.recognizedText || ''
            };
          }

          // finalResult 是累计结果，优先使用
          if (response.type === 'finalResult' && response.cumulativeAssessment) {
            finalResult = response.cumulativeAssessment;
            doResolve(finalResult);
          }

          // 如果只收到 stopped 但没有 finalResult，使用备选结果
          if (response.type === 'stopped' && !resolved) {
            doResolve(finalResult);
          }

          // 处理错误事件（如 NO_SPEECH_DETECTED）
          if (response.type === 'error' && !resolved) {
            // 设置错误状态
            let errorMessage = '评估错误';
            if (response.error === 'NO_SPEECH_DETECTED') {
              errorMessage = '未检测到完整发音，请清晰朗读整个单词后重试';
            } else if (response.error) {
              errorMessage = response.error;
            }
            safeSetState(prev => ({
              ...prev,
              isAssessing: false,
              result: null,
              recognizingText: '',
              error: errorMessage
            }));
            doResolve(null);
          }
        };

        ws.onerror = () => {
          doResolve(finalResult);
        };

        ws.onclose = () => {
          if (!resolved) {
            doResolve(finalResult);
          }
        };

        // 发送停止消息
        ws.send(JSON.stringify({ type: 'stop' } as WSMessage));
      });

      return {
        filePath,
        duration: finalDuration,
        assessmentPromise,
      };

    } catch (error) {
      isRecordingRef.current = false;
      isStoppingRef.current = false;
      cleanupWebSocket();
      releaseLock();

      const errorMessage = error instanceof Error ? error.message : '停止评估失败';
      safeSetState(prev => ({
        ...prev,
        isRecording: false,
        isAssessing: false,
        error: errorMessage,
      }));

      throw error;
    }
  }, [clearAllTimers, cleanupWebSocket, releaseLock, safeSetState, sendAudioData, parseWSMessage]);

  /**
   * 取消发音评估
   */
  const cancel = useCallback(async () => {
    if (isStoppingRef.current) return;

    clearAllTimers();
    isRecordingRef.current = false;
    isStoppingRef.current = false;
    audioBufferRef.current = [];
    isWSReadyRef.current = false;

    safeSetState(() => INITIAL_STATE);
    cleanupWebSocket();

    try {
      await AudioRecord.stop();
    } catch (error) {
      // ignore
    } finally {
      releaseLock();
    }
  }, [cleanupWebSocket, clearAllTimers, releaseLock, safeSetState]);

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
          if (__DEV__) console.warn('[usePronunciationAssessment] 卸载时停止录音失败:', e);
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

    // 方法
    /** 开始发音评估（立即开始录音，同时连接 WebSocket） */
    start,
    /** 停止发音评估并获取结果 */
    stop,
    /** 取消发音评估 */
    cancel,
    /** 重置状态 */
    reset,
  };
};
