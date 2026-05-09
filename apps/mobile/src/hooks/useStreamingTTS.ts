import { useState, useCallback, useRef, useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { AudioContext, AudioBufferQueueSourceNode } from 'react-native-audio-api';
import { Buffer } from 'buffer';
import { File } from 'expo-file-system';
import { useQuotaStore } from '@/stores';
import { handlePaymentBlockMessage } from '@/utils/paymentBlock';
import { tokenManager, isInvalidTokenWsError } from '@/auth/TokenManager';
import { tryGetSession } from '@/session/registry';
import {
  ensureCacheDir,
  getHashedCacheFile,
  hashString,
} from '@/services/CacheService';
import { getErrorMessage } from '@/utils/errorUtils';

/**
 * 流式 TTS 语音合成和播放 Hook
 *
 * 架构设计：
 * - TTS 合成层：独立运行，一旦开始就运行到完成，多个消息可并行合成
 * - 播放层：同一时间只能播放一个消息，stop() 只停止播放不影响合成
 */

// ============================================================================
// 类型定义
// ============================================================================

interface StreamingTTSState {
  isLoading: boolean;
  isPlaying: boolean;
  currentMessageId: string | null;
  error: string | null;
}

interface StreamingTTSControls {
  speak: (messageId: string, text: string, voice: string) => Promise<void>;
  stop: () => void;
}

interface SynthesisTask {
  ws: WebSocket | null;
  audioChunks: string[];
  isCompleted: boolean;
}

interface WSResponse {
  type: 'started' | 'audio' | 'completed' | 'error' | 'stopped';
  audio?: string;
  error?: string;
  requestId?: string;
}

// ============================================================================
// 常量
// ============================================================================

const WS_CONNECT_TIMEOUT = 10000;
const SAMPLE_RATE = 16000;
const PLAYBACK_CHUNK_SAMPLES = 1600; // 约 100ms
const PLAYBACK_INTERVAL = 80; // ms
const MAX_CACHED_TASKS = 20; // 最大缓存合成任务数（防内存累积）

// ============================================================================
// 工具函数
// ============================================================================

const getTaskKey = (text: string, voice: string): string => {
  return hashString(`streaming_tts_pcm_${text}_${voice}`);
};

const getCacheFile = (text: string, voice: string): File => {
  return getHashedCacheFile('audio', `streaming_tts_pcm_${text}_${voice}`, 'pcm');
};

const int16ToFloat32 = (int16Array: Int16Array): Float32Array => {
  const float32Array = new Float32Array(int16Array.length);
  for (let i = 0; i < int16Array.length; i++) {
    float32Array[i] = int16Array[i] / 32768.0;
  }
  return float32Array;
};

const base64PcmToFloat32 = (base64: string): Float32Array => {
  const buffer = Buffer.from(base64, 'base64');
  const int16Array = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.length / 2);
  return int16ToFloat32(int16Array);
};

/** 统一关闭 WebSocket（吞错；session.openWebSocket 通过 close 事件自动清 registry） */
const closeWS = (ws: WebSocket | null | undefined): void => {
  if (!ws) return;
  try { ws.close(); } catch { /* ignore */ }
};

// ============================================================================
// Hook 实现
// ============================================================================

export const useStreamingTTS = (): StreamingTTSState & StreamingTTSControls => {
  // ============================================================================
  // State
  // ============================================================================

  const [state, setState] = useState<StreamingTTSState>({
    isLoading: false,
    isPlaying: false,
    currentMessageId: null,
    error: null,
  });

  // ============================================================================
  // Refs
  // ============================================================================

  const isMountedRef = useRef(true);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // 合成任务管理（多个并行）
  const synthesisTasksRef = useRef<Map<string, SynthesisTask>>(new Map());

  // 播放状态（只有一个）
  const isPlayingRef = useRef(false);
  const currentMessageIdRef = useRef<string | null>(null);
  const currentTaskKeyRef = useRef<string | null>(null);

  // Audio API
  const audioContextRef = useRef<AudioContext | null>(null);
  const bufferQueueSourceRef = useRef<AudioBufferQueueSourceNode | null>(null);

  // 播放定时器
  const playbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playbackCompleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ============================================================================
  // 基础工具函数
  // ============================================================================

  const clearPlaybackTimers = useCallback(() => {
    if (playbackTimerRef.current) {
      clearTimeout(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
    if (playbackCompleteTimerRef.current) {
      clearTimeout(playbackCompleteTimerRef.current);
      playbackCompleteTimerRef.current = null;
    }
  }, []);

  const initAudioContext = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ sampleRate: SAMPLE_RATE });
    }
  }, []);

  const createBufferQueueSource = useCallback(() => {
    if (!audioContextRef.current) return;

    if (bufferQueueSourceRef.current) {
      try {
        bufferQueueSourceRef.current.stop();
      } catch (e) {
        // ignore
      }
    }

    bufferQueueSourceRef.current = audioContextRef.current.createBufferQueueSource();
    bufferQueueSourceRef.current.connect(audioContextRef.current.destination);
    bufferQueueSourceRef.current.start();
  }, []);

  const stopAudioPlayback = useCallback(() => {
    if (bufferQueueSourceRef.current) {
      try {
        bufferQueueSourceRef.current.stop();
      } catch (e) {
        // ignore
      }
      bufferQueueSourceRef.current = null;
    }
  }, []);

  // ============================================================================
  // 停止播放（只停止播放，不停止合成）
  // ============================================================================

  const stop = useCallback(() => {
    clearPlaybackTimers();
    stopAudioPlayback();

    isPlayingRef.current = false;
    currentMessageIdRef.current = null;
    currentTaskKeyRef.current = null;

    if (isMountedRef.current) {
      setState(prev => ({
        ...prev,
        isPlaying: false,
        isLoading: false,
        currentMessageId: null,
      }));
    }
  }, [clearPlaybackTimers, stopAudioPlayback]);

  // ============================================================================
  // 缓存相关
  // ============================================================================

  const saveToCache = useCallback((text: string, voice: string, audioChunks: string[]) => {
    if (audioChunks.length === 0) return;

    try {
      ensureCacheDir('audio');
      const cacheFile = getCacheFile(text, voice);

      const buffers = audioChunks.map(chunk => Buffer.from(chunk, 'base64'));
      const totalLength = buffers.reduce((sum, buf) => sum + buf.length, 0);
      const combined = Buffer.concat(buffers, totalLength);
      const combinedBase64 = combined.toString('base64');

      cacheFile.write(combinedBase64, { encoding: 'base64' });
    } catch (error) {
      console.error('[StreamingTTS] 缓存失败:', error);
    }
  }, []);

  const playFromCache = useCallback(async (cacheFile: File, messageId: string): Promise<boolean> => {
    try {
      const base64Data = await cacheFile.base64();
      if (!base64Data) return false;

      const float32Data = base64PcmToFloat32(base64Data);

      await initAudioContext();
      createBufferQueueSource();

      if (!audioContextRef.current || !bufferQueueSourceRef.current) return false;

      let offset = 0;

      const playNextChunk = () => {
        if (!isPlayingRef.current || currentMessageIdRef.current !== messageId) {
          return;
        }

        if (offset >= float32Data.length) {
          if (playbackCompleteTimerRef.current) {
            clearTimeout(playbackCompleteTimerRef.current);
          }
          playbackCompleteTimerRef.current = setTimeout(() => {
            if (isMountedRef.current && isPlayingRef.current && currentMessageIdRef.current === messageId) {
              stop();
            }
          }, 500);
          return;
        }

        const chunkEnd = Math.min(offset + PLAYBACK_CHUNK_SAMPLES, float32Data.length);
        const chunk = float32Data.slice(offset, chunkEnd);
        offset = chunkEnd;

        if (audioContextRef.current && bufferQueueSourceRef.current) {
          const audioBuffer = audioContextRef.current.createBuffer(1, chunk.length, SAMPLE_RATE);
          audioBuffer.copyToChannel(chunk, 0);
          bufferQueueSourceRef.current.enqueueBuffer(audioBuffer);
        }

        playbackTimerRef.current = setTimeout(playNextChunk, PLAYBACK_INTERVAL);
      };

      playNextChunk();
      return true;
    } catch (error) {
      console.error('[StreamingTTS] 缓存播放失败:', error);
      return false;
    }
  }, [initAudioContext, createBufferQueueSource, stop]);

  // ============================================================================
  // 播放已收到的音频块
  // ============================================================================

  const playAudioChunks = useCallback((
    audioChunks: string[],
    messageId: string,
    taskKey: string,
    startIndex: number = 0
  ) => {
    if (!audioContextRef.current || !bufferQueueSourceRef.current) return;

    let currentIndex = startIndex;

    const playNextChunk = () => {
      if (!isPlayingRef.current || currentMessageIdRef.current !== messageId) {
        return;
      }

      const task = synthesisTasksRef.current.get(taskKey);
      if (!task) {
        return;
      }

      if (currentIndex < task.audioChunks.length) {
        const base64Audio = task.audioChunks[currentIndex];
        const float32Data = base64PcmToFloat32(base64Audio);

        if (audioContextRef.current && bufferQueueSourceRef.current) {
          const audioBuffer = audioContextRef.current.createBuffer(1, float32Data.length, SAMPLE_RATE);
          audioBuffer.copyToChannel(float32Data, 0);
          bufferQueueSourceRef.current.enqueueBuffer(audioBuffer);
        }

        currentIndex++;
        playbackTimerRef.current = setTimeout(playNextChunk, PLAYBACK_INTERVAL);
      } else if (task.isCompleted) {
        if (playbackCompleteTimerRef.current) {
          clearTimeout(playbackCompleteTimerRef.current);
        }
        playbackCompleteTimerRef.current = setTimeout(() => {
          if (isMountedRef.current && isPlayingRef.current && currentMessageIdRef.current === messageId) {
            stop();
          }
        }, 500);
      } else {
        playbackTimerRef.current = setTimeout(playNextChunk, PLAYBACK_INTERVAL);
      }
    };

    playNextChunk();
  }, [stop]);

  // ============================================================================
  // 合成任务管理
  // ============================================================================

  const startSynthesisTask = useCallback((
    text: string,
    voice: string,
    taskKey: string,
    _retryCount = 0,
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const session = tryGetSession();
      if (!session) {
        reject(new Error('未登录，请重新登录'));
        return;
      }
      const ws = session.openWebSocket('/ws/tts/stream');
      let resolved = false;

      // 淘汰旧任务，防止内存累积
      if (synthesisTasksRef.current.size >= MAX_CACHED_TASKS) {
        for (const [key, t] of synthesisTasksRef.current) {
          if (t.isCompleted && currentTaskKeyRef.current !== key) {
            synthesisTasksRef.current.delete(key);
            if (synthesisTasksRef.current.size < MAX_CACHED_TASKS) break;
          }
        }
        if (synthesisTasksRef.current.size >= MAX_CACHED_TASKS) {
          for (const [key, t] of synthesisTasksRef.current) {
            if (currentTaskKeyRef.current !== key) {
              closeWS(t.ws);
              t.ws = null;
              synthesisTasksRef.current.delete(key);
              if (synthesisTasksRef.current.size < MAX_CACHED_TASKS) break;
            }
          }
        }
      }

      const task: SynthesisTask = {
        ws,
        audioChunks: [],
        isCompleted: false,
      };
      synthesisTasksRef.current.set(taskKey, task);

      // 闭包持有当次握手用的 token —— INVALID_TOKEN 重试时传给 invalidate 区分 stale
      let usedToken: string | null = null;

      ws.onopen = () => {
        clearTimeout(connectTimer);
        const accessToken = tokenManager.peek();
        if (!accessToken) {
          task.isCompleted = true;
          closeWS(ws);
          task.ws = null;
          synthesisTasksRef.current.delete(taskKey);
          if (!resolved) {
            resolved = true;
            reject(new Error('未登录，请重新登录'));
          }
          return;
        }
        usedToken = accessToken;
        ws.send(JSON.stringify({ type: 'auth', token: accessToken }));
        ws.send(JSON.stringify({
          type: 'config',
          config: { voice, speed: 1.1, format: 'pcm' },
        }));
      };

      ws.onmessage = (event) => {
        if (typeof event.data !== 'string') return;

        try {
          const response: WSResponse = JSON.parse(event.data);

          // 认证失败 → 让 TokenManager 决定是否刷新 → 重连一次
          if (response.type === 'error' && isInvalidTokenWsError(response) && _retryCount === 0) {
            clearTimeout(connectTimer);
            task.isCompleted = true;
            closeWS(ws);
            task.ws = null;
            synthesisTasksRef.current.delete(taskKey);
            tokenManager.invalidate(usedToken ?? '').then(() => {
              startSynthesisTask(text, voice, taskKey, 1).then(resolve).catch(reject);
            }).catch((err) => {
              if (!resolved) { resolved = true; reject(err); }
            });
            return;
          }

          switch (response.type) {
            case 'started':
              ws.send(JSON.stringify({ type: 'synthesize', text }));
              if (!resolved) {
                resolved = true;
                resolve();
              }
              break;

            case 'audio':
              if (response.audio) {
                task.audioChunks.push(response.audio);
                if (isPlayingRef.current && currentTaskKeyRef.current === taskKey) {
                  const float32Data = base64PcmToFloat32(response.audio);
                  if (audioContextRef.current && bufferQueueSourceRef.current) {
                    const audioBuffer = audioContextRef.current.createBuffer(1, float32Data.length, SAMPLE_RATE);
                    audioBuffer.copyToChannel(float32Data, 0);
                    bufferQueueSourceRef.current.enqueueBuffer(audioBuffer);
                  }
                }
              }
              break;

            case 'completed':
              task.isCompleted = true;
              closeWS(ws);
              task.ws = null;

              saveToCache(text, voice, task.audioChunks);

              const totalBytes = task.audioChunks.reduce((sum, chunk) => {
                return sum + Math.floor(chunk.length * 3 / 4);
              }, 0);
              const totalSamples = totalBytes / 2;
              const estimatedDurationMs = (totalSamples / SAMPLE_RATE) * 1000;

              if (isPlayingRef.current && currentTaskKeyRef.current === taskKey) {
                if (isMountedRef.current) {
                  setState(prev => ({ ...prev, isLoading: false }));
                }
                if (playbackCompleteTimerRef.current) {
                  clearTimeout(playbackCompleteTimerRef.current);
                }
                playbackCompleteTimerRef.current = setTimeout(() => {
                  if (isMountedRef.current && isPlayingRef.current && currentTaskKeyRef.current === taskKey) {
                    stop();
                  }
                }, Math.max(estimatedDurationMs - 500, 500));
              }
              break;

            case 'error':
              console.error('[StreamingTTS] 服务端错误:', response.error);
              handlePaymentBlockMessage(response);
              task.isCompleted = true;
              closeWS(ws);
              task.ws = null;
              if (!resolved) {
                resolved = true;
                reject(new Error(response.error || '合成失败'));
              }
              break;
          }
        } catch (error) {
          console.error('[StreamingTTS] 解析消息失败:', error);
        }
      };

      ws.onerror = (error) => {
        clearTimeout(connectTimer);
        console.error('[StreamingTTS] WebSocket 错误:', error);
        task.isCompleted = true;
        closeWS(ws);
        task.ws = null;
        synthesisTasksRef.current.delete(taskKey);
        if (!resolved) {
          resolved = true;
          reject(new Error('WebSocket 连接失败'));
        }
      };

      ws.onclose = () => {
        clearTimeout(connectTimer);
        task.ws = null;
        if (task.isCompleted && currentTaskKeyRef.current !== taskKey) {
          synthesisTasksRef.current.delete(taskKey);
        }
      };

      const connectTimer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          closeWS(ws);
          synthesisTasksRef.current.delete(taskKey);
          reject(new Error('连接超时'));
        }
      }, WS_CONNECT_TIMEOUT);
    });
  }, [saveToCache, stop]);

  // ============================================================================
  // 核心播放方法
  // ============================================================================

  const speak = useCallback(async (messageId: string, text: string, voice: string): Promise<void> => {
    const taskKey = getTaskKey(text, voice);

    if (currentMessageIdRef.current === messageId && isPlayingRef.current) {
      stop();
      return;
    }

    if (isPlayingRef.current) {
      stop();
    }

    currentMessageIdRef.current = messageId;
    currentTaskKeyRef.current = taskKey;
    isPlayingRef.current = true;

    setState({
      isLoading: true,
      isPlaying: true,
      error: null,
      currentMessageId: messageId,
    });

    try {
      await initAudioContext();

      ensureCacheDir('audio');
      const cacheFile = getCacheFile(text, voice);

      if (cacheFile.exists) {
        const success = await playFromCache(cacheFile, messageId);
        if (success) {
          setState(prev => ({ ...prev, isLoading: false }));
          return;
        }
      }

      const existingTask = synthesisTasksRef.current.get(taskKey);

      if (existingTask) {
        createBufferQueueSource();
        if (existingTask.isCompleted) {
          playAudioChunks(existingTask.audioChunks, messageId, taskKey, 0);
          setState(prev => ({ ...prev, isLoading: false }));
        } else {
          playAudioChunks(existingTask.audioChunks, messageId, taskKey, 0);
        }
        return;
      }

      createBufferQueueSource();
      await startSynthesisTask(text, voice, taskKey);

    } catch (error) {
      console.error('[StreamingTTS] speak 失败:', error);
      isPlayingRef.current = false;
      currentMessageIdRef.current = null;
      currentTaskKeyRef.current = null;
      if (isMountedRef.current) {
        setState({
          isLoading: false,
          isPlaying: false,
          currentMessageId: null,
          error: getErrorMessage(error),
        });
      }
    }
  }, [stop, initAudioContext, playFromCache, createBufferQueueSource, playAudioChunks, startSynthesisTask]);

  // ============================================================================
  // 生命周期
  // ============================================================================

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appStateRef.current === 'active' && nextAppState.match(/inactive|background/)) {
        stop();
        for (const [key, task] of synthesisTasksRef.current) {
          if (task.ws) {
            closeWS(task.ws);
            task.ws = null;
          }
          if (!task.isCompleted) {
            synthesisTasksRef.current.delete(key);
          }
        }
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [stop]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      clearPlaybackTimers();
      stopAudioPlayback();

      synthesisTasksRef.current.forEach((task) => {
        if (task.ws) {
          closeWS(task.ws);
          task.ws = null;
        }
      });
      synthesisTasksRef.current.clear();

      if (audioContextRef.current) {
        try { audioContextRef.current.close(); } catch (e) { /* ignore */ }
        audioContextRef.current = null;
      }
    };
  }, [clearPlaybackTimers, stopAudioPlayback]);

  // ============================================================================
  // 返回
  // ============================================================================

  return {
    ...state,
    speak,
    stop,
  };
};
