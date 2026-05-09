import { useState, useCallback, useRef, useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AudioRecord from 'react-native-audio-record';
import { AudioContext, AudioBufferQueueSourceNode } from 'react-native-audio-api';
import { Buffer } from 'buffer';
import { useSharedValue } from 'react-native-reanimated';
import { File, Paths, FileHandle } from 'expo-file-system';
import { useAuthStore } from '@/stores/AuthStore';
import { useQuotaStore, getQuotaStoreState } from '@/stores';
import { handlePaymentBlockMessage } from '@/utils/paymentBlock';
import { calculateVolumeFromBase64, requestAudioPermission } from '@/utils/audioUtils';
import { tokenManager, isInvalidTokenWsError } from '@/auth/TokenManager';
import { tryGetSession } from '@/session/registry';
import { saveInterpretationRecord } from '@/services/InterpretationRecordService';

// ============================================================================
// 类型定义
// ============================================================================

/** 同传配置 */
export interface InterpretationConfig {
  sourceLanguage: string;
  targetLanguage: string;
  mode?: 's2t' | 's2s';
  /** 火山 speaker_id（仅 s2s 模式生效；未传则火山使用默认音色） */
  speakerId?: string;
}

/** 字幕片段 */
export interface SubtitleSegment {
  id: string;
  sourceText: string;
  translatedText: string;
  isFinal: boolean;
  startTime?: number;
  endTime?: number;
  speakerChanged?: boolean;
}

/** 同传状态 */
export interface InterpretationState {
  isInitializing: boolean;
  isActive: boolean;
  isConnected: boolean;
  /** 错误码（走 i18n 由 UI 层翻译），未知错误为原文 */
  error: string | null;
}

/** 服务端响应类型 */
interface WSResponse {
  type: string;
  text?: string;
  audio?: string;
  startTime?: number;
  endTime?: number;
  speakerChanged?: boolean;
  mutedDurationMs?: number;
  error?: string;
  code?: number;
  quotaExceeded?: boolean;
}

// ============================================================================
// 错误码（UI 层用 t(`interpretation.error.${code}`) 翻译）
// ============================================================================

export const ErrorCode = {
  MIC_PERMISSION_DENIED: 'ERR_MIC_PERMISSION',
  NO_ACCESS_TOKEN: 'ERR_NO_AUTH',
  CONNECT_TIMEOUT: 'ERR_CONNECT_TIMEOUT',
  CONNECT_FAILED: 'ERR_CONNECT_FAILED',
  SERVER: 'ERR_SERVER',
  START_FAILED: 'ERR_START_FAILED',
} as const;

// ============================================================================
// 常量
// ============================================================================

const INITIAL_STATE: InterpretationState = {
  isInitializing: false,
  isActive: false,
  isConnected: false,
  error: null,
};

const MAX_DURATION = 30 * 60 * 1000; // 30分钟
const MAX_VOLUME_HISTORY = 50;
const WS_CONNECT_TIMEOUT = 10000;
const MAX_AUDIO_BUFFER_SIZE = 500; // 录音发送缓冲上限
const STOP_ACK_TIMEOUT = 3000; // stop 后等 'stopped' 的兜底超时

// 录音文件常量
const RECORDING_SAMPLE_RATE = 16000;
const RECORDING_BITS_PER_SAMPLE = 16;
const RECORDING_CHANNELS = 1;

// 音频播放常量
const TTS_SAMPLE_RATE = 16000;
const JITTER_BUFFER_THRESHOLD = 3; // 积攒 3 个 chunk 后开始播放（约 240ms）
const PLAYBACK_INTERVAL = 80; // ms，定时器驱动播放间隔
const MAX_PLAYBACK_PENDING = 50; // 待播放队列上限，超出丢弃最旧的

// ============================================================================
// 工具函数
// ============================================================================

/** 生成 WAV 文件头（44 字节） */
const createWavHeader = (dataSize: number, sampleRate: number, bitsPerSample: number, channels: number): Uint8Array => {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);

  // RIFF chunk
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + dataSize, true); // file size - 8
  view.setUint32(8, 0x57415645, false); // "WAVE"
  // fmt sub-chunk
  view.setUint32(12, 0x666D7420, false); // "fmt "
  view.setUint32(16, 16, true); // sub-chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  // data sub-chunk
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, dataSize, true);

  return new Uint8Array(header);
};

/** PCM int16 base64 → Float32Array，解码后立即可入队播放 */
const base64PcmToFloat32 = (base64: string): Float32Array => {
  const buffer = Buffer.from(base64, 'base64');
  const int16Array = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.length / 2);
  const float32Array = new Float32Array(int16Array.length);
  for (let i = 0; i < int16Array.length; i++) {
    float32Array[i] = int16Array[i] / 32768.0;
  }
  return float32Array;
};

// ============================================================================
// Hook 实现
// ============================================================================

export const useSimultaneousInterpretation = () => {
  const [state, setState] = useState<InterpretationState>(INITIAL_STATE);
  const [segments, setSegments] = useState<SubtitleSegment[]>([]);
  const segmentsRef = useRef<SubtitleSegment[]>([]);

  // SharedValues
  const volumeHistoryShared = useSharedValue<number[]>([]);
  const durationShared = useSharedValue<number>(0);

  // Refs — 通用
  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const maxDurationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const stopSendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopAckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number>(0);
  const isActiveRef = useRef<boolean>(false);
  const isInitializingRef = useRef<boolean>(false);
  const audioListenerRef = useRef<any>(null);
  const isMountedRef = useRef<boolean>(true);
  const audioBufferRef = useRef<string[]>([]);
  const isWSReadyRef = useRef<boolean>(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const isLockedRef = useRef<boolean>(false);
  const isFinalizedRef = useRef<boolean>(false);
  const currentConfigRef = useRef<InterpretationConfig | null>(null);
  const currentUserIdRef = useRef<string | null>(null);

  // Refs — 字幕
  const currentSourceSegmentIdRef = useRef<number>(0);
  const currentSegmentRef = useRef<{
    sourceText: string;
    translatedText: string;
    startTime?: number;
    speakerChanged?: boolean;
  } | null>(null);

  // Refs — TTS 音频播放（Jitter Buffer + AudioBufferQueue）
  const audioContextRef = useRef<AudioContext | null>(null);
  const bufferQueueSourceRef = useRef<AudioBufferQueueSourceNode | null>(null);
  const pendingAudioRef = useRef<Float32Array[]>([]); // jitter buffer + 待播放队列
  const playbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPlaybackStartedRef = useRef<boolean>(false); // jitter 阶段是否已开始播放
  const isTTSActiveRef = useRef<boolean>(false); // 当前是否有 TTS 句在播放中
  const isAudioPlaybackEnabledRef = useRef<boolean>(false); // 是否启用TTS播放（耳机断开时关闭）

  // Refs — 录音文件（流式写入）
  const sourceFileHandleRef = useRef<FileHandle | null>(null); // 原始录音
  const translationFileHandleRef = useRef<FileHandle | null>(null); // 翻译录音
  const sourceDataSizeRef = useRef<number>(0); // 原始录音 PCM 数据量
  const translationDataSizeRef = useRef<number>(0); // 翻译录音 PCM 数据量
  const recordingFilesRef = useRef<{ sourceAudioPath: string | null; translationAudioPath: string | null }>({
    sourceAudioPath: null,
    translationAudioPath: null,
  });

  // ============================================================================
  // 工具函数
  // ============================================================================

  const safeSetState = useCallback((updater: (prev: InterpretationState) => InterpretationState) => {
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
    if (stopSendTimerRef.current) {
      clearTimeout(stopSendTimerRef.current);
      stopSendTimerRef.current = null;
    }
    if (stopAckTimerRef.current) {
      clearTimeout(stopAckTimerRef.current);
      stopAckTimerRef.current = null;
    }
  }, []);

  // ============================================================================
  // 录音文件管理
  // ============================================================================

  /** 创建录音文件并打开 FileHandle，预留 44 字节 WAV 头 */
  const openRecordingFiles = useCallback(() => {
    let sourceHandle: FileHandle | null = null;
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const sourceFile = new File(Paths.cache, `interpretation_source_${timestamp}.wav`);
      const translationFile = new File(Paths.cache, `interpretation_translation_${timestamp}.wav`);

      // 写入占位 WAV 头（44 字节零数据，结束时用真实头覆盖）
      const placeholderHeader = new Uint8Array(44);
      sourceFile.write(placeholderHeader);
      translationFile.write(placeholderHeader);

      sourceHandle = sourceFile.open();
      const translationHandle = translationFile.open();
      sourceFileHandleRef.current = sourceHandle;
      translationFileHandleRef.current = translationHandle;
      sourceDataSizeRef.current = 0;
      translationDataSizeRef.current = 0;

      recordingFilesRef.current = {
        sourceAudioPath: sourceFile.uri,
        translationAudioPath: translationFile.uri,
      };

      console.log('[Interpretation] Recording files opened:', sourceFile.uri);
    } catch (err) {
      console.error('[Interpretation] Failed to open recording files:', err);
      // 异常时释放已打开的句柄，避免泄漏
      try { sourceHandle?.close(); } catch { /* ignore */ }
      sourceFileHandleRef.current = null;
      translationFileHandleRef.current = null;
      recordingFilesRef.current = { sourceAudioPath: null, translationAudioPath: null };
    }
  }, []);

  /** 关闭 FileHandle 并回写真实 WAV 头。无 PCM 数据的占位文件直接清理，防止 UI 误显示录音入口。 */
  const closeRecordingFiles = useCallback(async () => {
    try {
      // 关闭 handles
      if (sourceFileHandleRef.current) {
        sourceFileHandleRef.current.close();
        sourceFileHandleRef.current = null;
      }
      if (translationFileHandleRef.current) {
        translationFileHandleRef.current.close();
        translationFileHandleRef.current = null;
      }

      // 回写 WAV 头到文件开头（用 ref 避免闭包过期）
      const { sourceAudioPath, translationAudioPath } = recordingFilesRef.current;

      if (sourceAudioPath) {
        if (sourceDataSizeRef.current > 0) {
          const sourceFile = new File(sourceAudioPath);
          const wavHeader = createWavHeader(sourceDataSizeRef.current, RECORDING_SAMPLE_RATE, RECORDING_BITS_PER_SAMPLE, RECORDING_CHANNELS);
          const existingData = await sourceFile.bytes();
          const pcmData = existingData.slice(44); // 去掉占位头
          const fullFile = new Uint8Array(wavHeader.length + pcmData.length);
          fullFile.set(wavHeader, 0);
          fullFile.set(pcmData, 44);
          sourceFile.write(fullFile);
          console.log('[Interpretation] Source WAV saved:', sourceDataSizeRef.current, 'bytes PCM');
        } else {
          try { new File(sourceAudioPath).delete(); } catch { /* ignore */ }
          recordingFilesRef.current.sourceAudioPath = null;
        }
      }

      if (translationAudioPath) {
        if (translationDataSizeRef.current > 0) {
          const translationFile = new File(translationAudioPath);
          const wavHeader = createWavHeader(translationDataSizeRef.current, RECORDING_SAMPLE_RATE, RECORDING_BITS_PER_SAMPLE, RECORDING_CHANNELS);
          const existingData = await translationFile.bytes();
          const pcmData = existingData.slice(44);
          const fullFile = new Uint8Array(wavHeader.length + pcmData.length);
          fullFile.set(wavHeader, 0);
          fullFile.set(pcmData, 44);
          translationFile.write(fullFile);
          console.log('[Interpretation] Translation WAV saved:', translationDataSizeRef.current, 'bytes PCM');
        } else {
          // s2t 模式或 s2s 未产生 TTS 音频时，清理空占位文件
          try { new File(translationAudioPath).delete(); } catch { /* ignore */ }
          recordingFilesRef.current.translationAudioPath = null;
        }
      }
    } catch (err) {
      console.error('[Interpretation] Failed to close recording files:', err);
    }
  }, []);

  /** 追加麦克风 PCM 数据到原始录音文件 */
  const writeSourceAudio = useCallback((base64Pcm: string) => {
    if (!sourceFileHandleRef.current) return;
    try {
      const bytes = Uint8Array.from(Buffer.from(base64Pcm, 'base64'));
      sourceFileHandleRef.current.writeBytes(bytes);
      sourceDataSizeRef.current += bytes.length;
    } catch { /* 静默忽略，不影响主流程 */ }
  }, []);

  /** 追加 TTS PCM 数据到翻译录音文件 */
  const writeTranslationAudio = useCallback((base64Pcm: string) => {
    if (!translationFileHandleRef.current) return;
    try {
      const bytes = Uint8Array.from(Buffer.from(base64Pcm, 'base64'));
      translationFileHandleRef.current.writeBytes(bytes);
      translationDataSizeRef.current += bytes.length;
    } catch { /* 静默忽略 */ }
  }, []);

  // ============================================================================
  // TTS 音频播放系统
  // ============================================================================

  const clearPlaybackTimer = useCallback(() => {
    if (playbackTimerRef.current) {
      clearTimeout(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
  }, []);

  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ sampleRate: TTS_SAMPLE_RATE });
    }
  }, []);

  const createBufferQueueSource = useCallback(() => {
    if (!audioContextRef.current) return;
    // 停止旧的
    if (bufferQueueSourceRef.current) {
      try { bufferQueueSourceRef.current.stop(); } catch { /* ignore */ }
    }
    bufferQueueSourceRef.current = audioContextRef.current.createBufferQueueSource();
    bufferQueueSourceRef.current.connect(audioContextRef.current.destination);
    bufferQueueSourceRef.current.start();
  }, []);

  const stopAudioPlayback = useCallback(() => {
    clearPlaybackTimer();
    if (bufferQueueSourceRef.current) {
      try { bufferQueueSourceRef.current.stop(); } catch { /* ignore */ }
      bufferQueueSourceRef.current = null;
    }
    pendingAudioRef.current = [];
    isPlaybackStartedRef.current = false;
    isTTSActiveRef.current = false;
    isAudioPlaybackEnabledRef.current = false;
  }, [clearPlaybackTimer]);

  /** 定时器驱动：从 pending 队列取 chunk → 入队 AudioBufferQueue */
  const drainPendingAudio = useCallback(() => {
    if (!audioContextRef.current || !bufferQueueSourceRef.current) return;
    if (!isActiveRef.current) return;

    const pending = pendingAudioRef.current;
    if (pending.length > 0) {
      const chunk = pending.shift()!;
      const audioBuffer = audioContextRef.current.createBuffer(1, chunk.length, TTS_SAMPLE_RATE);
      audioBuffer.copyToChannel(chunk, 0);
      bufferQueueSourceRef.current.enqueueBuffer(audioBuffer);
    }

    // 持续调度，直到队列空且 TTS 句已结束
    if (pending.length > 0 || isTTSActiveRef.current) {
      playbackTimerRef.current = setTimeout(drainPendingAudio, PLAYBACK_INTERVAL);
    } else {
      isPlaybackStartedRef.current = false;
    }
  }, []);

  /** 收到 ttsAudio chunk 时调用 */
  const enqueueTTSAudio = useCallback((base64Audio: string) => {
    const float32 = base64PcmToFloat32(base64Audio);
    const pending = pendingAudioRef.current;

    // 内存保护：超出上限丢弃最旧的
    if (pending.length >= MAX_PLAYBACK_PENDING) {
      pending.shift();
    }
    pending.push(float32);

    // Jitter Buffer：积攒到阈值后才开始播放
    if (!isPlaybackStartedRef.current && pending.length >= JITTER_BUFFER_THRESHOLD) {
      isPlaybackStartedRef.current = true;
      initAudioContext();
      createBufferQueueSource();
      drainPendingAudio();
    }
  }, [initAudioContext, createBufferQueueSource, drainPendingAudio]);

  // ============================================================================
  // WebSocket 清理
  // ============================================================================

  const cleanupWebSocket = useCallback(() => {
    if (audioListenerRef.current) {
      audioListenerRef.current.remove();
      audioListenerRef.current = null;
    }
    const ws = wsRef.current;
    if (ws) {
      try {
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close();
        }
      } catch { /* ignore */ }
      wsRef.current = null;
    }
    isWSReadyRef.current = false;
  }, []);

  const cleanupAll = useCallback(() => {
    cleanupWebSocket();
    stopAudioPlayback();
    clearAllTimers();
  }, [cleanupWebSocket, stopAudioPlayback, clearAllTimers]);

  // ============================================================================
  // 会话终结 - 幂等保存记录 + 清理
  // ============================================================================

  /**
   * 一次同传会话的唯一收尾点：保存记录（若有字幕）→ cleanup。
   * 使用 isFinalizedRef 保证每次会话仅执行一次。
   *
   * 任意触发路径：'stopped' 事件、stop() 后超时兜底、ws.onclose、'error'、组件卸载。
   */
  const finalizeSession = useCallback(async (): Promise<void> => {
    if (isFinalizedRef.current) return;
    isFinalizedRef.current = true;

    isActiveRef.current = false;
    safeSetState(prev => ({ ...prev, isActive: false, isConnected: false }));

    const duration = startTimeRef.current > 0 ? Date.now() - startTimeRef.current : 0;
    const userId = currentUserIdRef.current;
    const cfg = currentConfigRef.current;
    const segs = segmentsRef.current;

    try {
      await closeRecordingFiles();
    } catch (err) {
      console.error('[Interpretation] closeRecordingFiles failed:', err);
    }

    if (userId && cfg && segs.length > 0) {
      try {
        await saveInterpretationRecord({
          userId,
          sourceLanguage: cfg.sourceLanguage,
          targetLanguage: cfg.targetLanguage,
          mode: cfg.mode || 's2t',
          durationMs: duration,
          segments: segs,
          sourceAudioCacheUri: recordingFilesRef.current.sourceAudioPath,
          translationAudioCacheUri: recordingFilesRef.current.translationAudioPath,
        });
      } catch (err) {
        console.error('[Interpretation] Save record failed:', err);
      }
    }

    stopAudioPlayback();
    cleanupWebSocket();
    clearAllTimers();
    isLockedRef.current = false;
  }, [safeSetState, closeRecordingFiles, stopAudioPlayback, cleanupWebSocket, clearAllTimers]);

  // ============================================================================
  // 音频初始化
  // ============================================================================

  const initializeAudioRecorder = useCallback(async () => {
    const hasPermission = await requestAudioPermission('同声传译');
    if (!hasPermission) {
      throw new Error(ErrorCode.MIC_PERMISSION_DENIED);
    }
    AudioRecord.init({
      sampleRate: 16000,
      channels: 1,
      bitsPerSample: 16,
      audioSource: 6,
      wavFile: `interpretation_${Date.now()}.wav`,
    });
  }, []);

  // ============================================================================
  // WebSocket 处理
  // ============================================================================

  const sendAudioData = useCallback((ws: WebSocket, data: string) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'audio', audio: data }));
    }
  }, []);

  const flushBuffer = useCallback(() => {
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

  const updateSegments = useCallback((updater: (prev: SubtitleSegment[]) => SubtitleSegment[]) => {
    if (isMountedRef.current) {
      setSegments(prev => {
        const next = updater(prev);
        segmentsRef.current = next;
        return next;
      });
    }
  }, []);

  const handleWSResponse = useCallback((response: WSResponse) => {
    switch (response.type) {
      case 'started':
        safeSetState(prev => ({ ...prev, isConnected: true }));
        isWSReadyRef.current = true;
        flushBuffer();
        break;

      // ===== 字幕事件 =====
      case 'sourceSubtitleStart': {
        const segId = ++currentSourceSegmentIdRef.current;
        currentSegmentRef.current = {
          sourceText: '',
          translatedText: '',
          startTime: response.startTime,
          speakerChanged: response.speakerChanged,
        };
        updateSegments(prev => [
          ...prev,
          {
            id: `seg-${segId}`,
            sourceText: '',
            translatedText: '',
            isFinal: false,
            startTime: response.startTime,
            speakerChanged: response.speakerChanged,
          },
        ]);
        break;
      }

      case 'sourceSubtitle': {
        const text = response.text || '';
        if (currentSegmentRef.current) {
          currentSegmentRef.current.sourceText = text;
        }
        const segId = currentSourceSegmentIdRef.current;
        updateSegments(prev => {
          const updated = [...prev];
          const idx = updated.findIndex(s => s.id === `seg-${segId}`);
          if (idx >= 0) {
            updated[idx] = { ...updated[idx], sourceText: text };
          }
          return updated;
        });
        break;
      }

      case 'sourceSubtitleEnd': {
        const text = response.text || '';
        if (currentSegmentRef.current) {
          currentSegmentRef.current.sourceText = text;
        }
        const segId = currentSourceSegmentIdRef.current;
        updateSegments(prev => {
          const updated = [...prev];
          const idx = updated.findIndex(s => s.id === `seg-${segId}`);
          if (idx >= 0) {
            updated[idx] = { ...updated[idx], sourceText: text, endTime: response.endTime };
          }
          return updated;
        });
        break;
      }

      case 'translationSubtitleStart':
        break;

      case 'translationSubtitle': {
        const text = response.text || '';
        if (currentSegmentRef.current) {
          currentSegmentRef.current.translatedText = text;
        }
        const segId = currentSourceSegmentIdRef.current;
        updateSegments(prev => {
          const updated = [...prev];
          const idx = updated.findIndex(s => s.id === `seg-${segId}`);
          if (idx >= 0) {
            updated[idx] = { ...updated[idx], translatedText: text };
          }
          return updated;
        });
        break;
      }

      case 'translationSubtitleEnd': {
        const text = response.text || '';
        const segId = currentSourceSegmentIdRef.current;
        updateSegments(prev => {
          const updated = [...prev];
          const idx = updated.findIndex(s => s.id === `seg-${segId}`);
          if (idx >= 0) {
            updated[idx] = { ...updated[idx], translatedText: text, isFinal: true };
          }
          return updated;
        });
        currentSegmentRef.current = null;
        break;
      }

      // ===== TTS 音频事件（S2S 模式，耳机降级后跳过） =====
      case 'ttsSentenceStart':
        if (isAudioPlaybackEnabledRef.current) {
          isTTSActiveRef.current = true;
        }
        break;

      case 'ttsAudio':
        if (response.audio) {
          // 无论是否播放，都写入翻译录音文件（确保导出完整）
          writeTranslationAudio(response.audio);
          if (isAudioPlaybackEnabledRef.current) {
            enqueueTTSAudio(response.audio);
          }
        }
        break;

      case 'ttsSentenceEnd':
        if (isAudioPlaybackEnabledRef.current) {
          isTTSActiveRef.current = false;
          if (!isPlaybackStartedRef.current && pendingAudioRef.current.length > 0) {
            isPlaybackStartedRef.current = true;
            initAudioContext();
            createBufferQueueSource();
            drainPendingAudio();
          }
        }
        break;

      // ===== 其他事件 =====
      case 'audioMuted':
        break;

      case 'stopped': {
        finalizeSession();
        break;
      }

      case 'error':
        console.error('[Interpretation] Server error:', response.error);
        handlePaymentBlockMessage(response);
        safeSetState(prev => ({
          ...prev,
          error: response.error || ErrorCode.SERVER,
        }));
        finalizeSession();
        break;
    }
  }, [
    safeSetState, updateSegments, flushBuffer,
    enqueueTTSAudio, writeTranslationAudio, initAudioContext, createBufferQueueSource, drainPendingAudio,
    finalizeSession,
  ]);

  const connectWebSocket = useCallback((cfg: InterpretationConfig, retryCount: number = 0): Promise<void> => {
    return new Promise((resolve, reject) => {
      const accessToken = tokenManager.peek();
      if (!accessToken) {
        reject(new Error(ErrorCode.NO_ACCESS_TOKEN));
        return;
      }
      const session = tryGetSession();
      if (!session) {
        reject(new Error(ErrorCode.NO_ACCESS_TOKEN));
        return;
      }

      const ws = session.openWebSocket('/ws/interpretation/stream');
      // 闭包持有当次握手用的 token —— INVALID_TOKEN 重试时给 invalidate
      let usedToken: string | null = null;

      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error(ErrorCode.CONNECT_TIMEOUT));
      }, WS_CONNECT_TIMEOUT);

      ws.onopen = () => {
        clearTimeout(timeout);
        wsRef.current = ws;
        usedToken = accessToken;
        ws.send(JSON.stringify({ type: 'auth', token: accessToken }));
        ws.send(JSON.stringify({
          type: 'config',
          config: {
            sourceLanguage: cfg.sourceLanguage,
            targetLanguage: cfg.targetLanguage,
            mode: cfg.mode || 's2t',
            ...(cfg.speakerId ? { speakerId: cfg.speakerId } : {}),
          },
        }));
        resolve();
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data as string) as WSResponse;

          // 认证失败 → 让 TokenManager 决定是否刷新 → 重连一次
          if (data.type === 'error' && isInvalidTokenWsError(data) && retryCount === 0) {
            clearTimeout(timeout);
            // 解绑旧 ws 的所有 handler，让它静默关闭——否则 onclose 会触发 finalizeSession
            // 终结整个 session，导致新 WS 建立后 UI 已退出激活状态、AudioRecord 不再发送音频。
            ws.onopen = null;
            ws.onmessage = null;
            ws.onerror = null;
            ws.onclose = null;
            try { ws.close(); } catch { /* ignore */ }
            wsRef.current = null;
            try {
              await tokenManager.invalidate(usedToken ?? '');
              connectWebSocket(cfg, 1).then(resolve).catch(reject);
            } catch (err) {
              reject(err);
            }
            return;
          }

          if ((data as any).quotaUpdate) {
            // 防御式：WS 消息可能在 logout 后到达，noop on 无 session。
            // 只取用量三件套，丢弃 ai-service 可能多塞的会员字段（让 piggyback 通道纯粹）。
            const u = (data as any).quotaUpdate;
            if (u && typeof u === 'object' && u.quotaStatus) {
              getQuotaStoreState()?.updateUsage({
                quotaStatus: u.quotaStatus,
                usagePercentage: Number(u.usagePercentage) || 0,
                costConsumed: Number(u.costConsumed) || 0,
              });
            }
          }
          handleWSResponse(data);
        } catch (err) {
          console.error('[Interpretation] Parse WS message error:', err);
        }
      };

      ws.onerror = (err) => {
        clearTimeout(timeout);
        console.error('[Interpretation] WebSocket error:', err);
        reject(err);
      };

      ws.onclose = (event) => {
        clearTimeout(timeout);
        if (event.reason && event.reason.includes('INVALID_TOKEN')) {
          tokenManager.invalidate(usedToken ?? '').catch(() => {});
        }
        // WS 任何方式关闭都触发兜底（若已 finalized 则无效）
        finalizeSession();
      };
    });
  }, [handleWSResponse, finalizeSession]);

  // ============================================================================
  // 核心方法
  // ============================================================================

  const stop = useCallback(() => {
    if (!isActiveRef.current || isFinalizedRef.current) return;

    console.log('[Interpretation] Stopping...');

    try { AudioRecord.stop(); } catch { /* ignore */ }

    if (audioListenerRef.current) {
      audioListenerRef.current.remove();
      audioListenerRef.current = null;
    }

    // 立即切断 TTS 播放链路——防止服务端队列中残留的 ttsAudio
    // 继续从扬声器播出（尤其在耳机断开场景下会造成回音循环）
    stopAudioPlayback();

    // 停止时长/最大时长定时器（保留兜底定时器）
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (maxDurationTimerRef.current) {
      clearTimeout(maxDurationTimerRef.current);
      maxDurationTimerRef.current = null;
    }

    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      // 先发剩余音频
      if (audioBufferRef.current.length > 0) {
        const buffer = audioBufferRef.current;
        audioBufferRef.current = [];
        for (const data of buffer) {
          sendAudioData(ws, data);
        }
      }
      // 延迟发 stop 给服务端一点时间接收最后的音频
      stopSendTimerRef.current = setTimeout(() => {
        stopSendTimerRef.current = null;
        if (ws.readyState === WebSocket.OPEN) {
          try { ws.send(JSON.stringify({ type: 'stop' })); } catch { /* ignore */ }
        }
      }, 100);
      // 兜底：若服务端迟迟不返回 'stopped'，本地自行完成保存
      stopAckTimerRef.current = setTimeout(() => {
        stopAckTimerRef.current = null;
        console.warn('[Interpretation] Stop ack timeout, finalizing locally');
        finalizeSession();
      }, STOP_ACK_TIMEOUT);
    } else {
      // WS 未连上，直接本地终结
      finalizeSession();
    }
  }, [sendAudioData, finalizeSession, stopAudioPlayback]);

  const start = useCallback(async (cfg: InterpretationConfig) => {
    if (isLockedRef.current || isActiveRef.current) {
      console.warn('[Interpretation] Already active or locked');
      return;
    }
    isLockedRef.current = true;
    isFinalizedRef.current = false;

    safeSetState(prev => ({ ...prev, isInitializing: true, error: null }));
    isInitializingRef.current = true;

    // 清理上一次会话遗留状态（防止 segmentsRef 残留导致保存出重复记录）
    setSegments([]);
    segmentsRef.current = [];
    currentSourceSegmentIdRef.current = 0;
    currentSegmentRef.current = null;
    recordingFilesRef.current = { sourceAudioPath: null, translationAudioPath: null };
    sourceDataSizeRef.current = 0;
    translationDataSizeRef.current = 0;

    try {
      const userId = useAuthStore.getState().user?.id;
      if (!userId) {
        throw new Error(ErrorCode.NO_ACCESS_TOKEN);
      }
      currentUserIdRef.current = userId;

      await initializeAudioRecorder();

      audioBufferRef.current = [];
      pendingAudioRef.current = [];
      isPlaybackStartedRef.current = false;
      isTTSActiveRef.current = false;
      isAudioPlaybackEnabledRef.current = cfg.mode === 's2s';
      currentConfigRef.current = cfg;

      // 创建录音文件
      openRecordingFiles();

      AudioRecord.start();
      isActiveRef.current = true;

      audioListenerRef.current = AudioRecord.on('data', (data: string) => {
        if (!isActiveRef.current) return;

        const volume = calculateVolumeFromBase64(data);
        volumeHistoryShared.value = [
          ...volumeHistoryShared.value.slice(-(MAX_VOLUME_HISTORY - 1)),
          volume,
        ];

        // 写入原始录音文件
        writeSourceAudio(data);

        if (isWSReadyRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
          sendAudioData(wsRef.current, data);
        } else {
          if (audioBufferRef.current.length < MAX_AUDIO_BUFFER_SIZE) {
            audioBufferRef.current.push(data);
          }
        }
      });

      startTimeRef.current = Date.now();
      durationShared.value = 0;
      timerRef.current = setInterval(() => {
        durationShared.value = Date.now() - startTimeRef.current;
      }, 200);

      maxDurationTimerRef.current = setTimeout(() => {
        console.log('[Interpretation] Max duration reached, stopping');
        stop();
      }, MAX_DURATION);

      safeSetState(prev => ({ ...prev, isInitializing: false, isActive: true }));
      isInitializingRef.current = false;

      connectWebSocket(cfg).catch(err => {
        console.error('[Interpretation] WS connect failed:', err);
        const code = err?.message && typeof err.message === 'string' && err.message.startsWith('ERR_')
          ? err.message
          : ErrorCode.CONNECT_FAILED;
        safeSetState(prev => ({ ...prev, error: code }));
      });

    } catch (err: any) {
      console.error('[Interpretation] Start failed:', err);
      const code = err?.message && typeof err.message === 'string' && err.message.startsWith('ERR_')
        ? err.message
        : ErrorCode.START_FAILED;
      safeSetState(prev => ({
        ...prev,
        isInitializing: false,
        error: code,
      }));
      isInitializingRef.current = false;
      isActiveRef.current = false;
      isLockedRef.current = false;
    }
  }, [safeSetState, initializeAudioRecorder, connectWebSocket, sendAudioData, writeSourceAudio, openRecordingFiles, volumeHistoryShared, durationShared, stop]);

  const clearSegments = useCallback(() => {
    setSegments([]);
    segmentsRef.current = [];
    currentSourceSegmentIdRef.current = 0;
    currentSegmentRef.current = null;
  }, []);

  // ============================================================================
  // 生命周期
  // ============================================================================

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appStateRef.current.match(/active/) && nextState.match(/inactive|background/)) {
        if (isActiveRef.current) {
          console.log('[Interpretation] App going to background, stopping');
          stop();
        }
      }
      appStateRef.current = nextState;
    });
    return () => subscription.remove();
  }, [stop]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (isActiveRef.current) {
        try { AudioRecord.stop(); } catch { /* ignore */ }
        // 卸载时兜底保存（同步触发，finalizeSession 内部幂等）
        finalizeSession();
      } else {
        cleanupAll();
      }
    };
  }, [cleanupAll, finalizeSession]);

  // ============================================================================
  // 返回
  // ============================================================================

  return {
    ...state,
    segments,
    volumeHistoryShared,
    durationShared,
    start,
    stop,
    clearSegments,
    /** 仅停止TTS音频播放（不停止同传会话），用于耳机断开降级 */
    stopAudioPlaybackOnly: stopAudioPlayback,
  };
};
