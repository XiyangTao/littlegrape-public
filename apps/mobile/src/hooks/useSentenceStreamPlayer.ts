/**
 * 名著单句讲解流式播放器（句级懒合成）
 *
 * 连接 /ws/classics/sentence-stream：
 *   - 命中 explainAudioUrl 缓存 → cached { audioUrl } → 直接 expo-audio URL 播放
 *   - 未命中 → started + audio*（PCM）→ done { audioUrl }（可选回填 URL）
 *
 * 单句合成没有 bookmark（句内不需要二级高亮）。
 * 完成回调 `onEnded` 让上层（useChapterPlayer）推进到下一句。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioContext, AudioBufferQueueSourceNode } from 'react-native-audio-api';
import { useAudioPlayer } from 'expo-audio';
import { Buffer } from 'buffer';
import { useQuotaStore } from '@/stores';
import { handlePaymentBlockMessage } from '@/utils/paymentBlock';
import { tokenManager } from '@/auth/TokenManager';
import { tryGetSession } from '@/session/registry';

type Mode = 'idle' | 'connecting' | 'stream' | 'url';

const SAMPLE_RATE = 16000;

interface PlayParams {
  slug: string;
  chapterNumber: number;
  paraIndex: number;
  sentenceIndex: number;
  /** 轨道：'en' 原文朗读 / 'ai' 讲解（默认 ai） */
  track?: 'en' | 'ai';
  /** 唯一会话 key（如 "para-3-sent-5"），用于竞态防护 */
  sessionKey: string;
  /** 单句播放自然结束回调（停止、错误不触发） */
  onEnded?: () => void;
  /** 错误回调（quotaExceeded 会自动弹窗，这里只是通知上层） */
  onError?: (err: string) => void;
}

interface PlayerState {
  isLoading: boolean;
  isPlaying: boolean;
  currentSessionKey: string | null;
  error: string | null;
}

export function useSentenceStreamPlayer() {
  const [state, setState] = useState<PlayerState>({
    isLoading: false,
    isPlaying: false,
    currentSessionKey: null,
    error: null,
  });

  const modeRef = useRef<Mode>('idle');
  const sessionKeyRef = useRef<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const isMountedRef = useRef(true);
  const onEndedRef = useRef<(() => void) | null>(null);

  // --- 流式 ---
  const audioContextRef = useRef<AudioContext | null>(null);
  const bufferSourceRef = useRef<AudioBufferQueueSourceNode | null>(null);
  const streamFirstAudioArrivedRef = useRef(false);
  const streamDoneReceivedRef = useRef(false);
  const streamCompletionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamTotalBytesRef = useRef(0);
  const terminalReceivedRef = useRef(false);

  // --- URL ---
  const urlPlayer = useAudioPlayer();
  const urlStatusListenerRef = useRef<{ remove: () => void } | null>(null);

  const ensureAudioContext = useCallback(async () => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new AudioContext({ sampleRate: SAMPLE_RATE });
      } catch (err) {
        console.error('[SentStream] AudioContext 创建失败', err);
        return;
      }
    }
    if (audioContextRef.current.state === 'suspended') {
      try { await audioContextRef.current.resume(); } catch { /* ignore */ }
    }
  }, []);

  const createBufferSource = useCallback(() => {
    if (!audioContextRef.current) return;
    if (bufferSourceRef.current) {
      try { bufferSourceRef.current.stop(); } catch { /* ignore */ }
    }
    try {
      bufferSourceRef.current = audioContextRef.current.createBufferQueueSource();
      bufferSourceRef.current.connect(audioContextRef.current.destination);
      bufferSourceRef.current.start();
    } catch (err) {
      console.error('[SentStream] createBufferQueueSource 失败', err);
    }
  }, []);

  const enqueuePcm = useCallback((base64: string) => {
    if (!audioContextRef.current || !bufferSourceRef.current) return;
    try {
      const buf = Buffer.from(base64, 'base64');
      streamTotalBytesRef.current += buf.length;
      const int16 = new Int16Array(buf.buffer, buf.byteOffset, buf.length / 2);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768.0;
      const audioBuffer = audioContextRef.current.createBuffer(1, float32.length, SAMPLE_RATE);
      audioBuffer.copyToChannel(float32, 0);
      bufferSourceRef.current.enqueueBuffer(audioBuffer);
    } catch (err) {
      console.error('[SentStream] enqueuePcm 失败', err);
    }
  }, []);

  const removeUrlStatusListener = useCallback(() => {
    if (urlStatusListenerRef.current) {
      urlStatusListenerRef.current.remove();
      urlStatusListenerRef.current = null;
    }
  }, []);

  const stopAllAudio = useCallback(() => {
    if (bufferSourceRef.current) {
      try { bufferSourceRef.current.stop(); } catch { /* ignore */ }
      bufferSourceRef.current = null;
    }
    if (streamCompletionTimerRef.current) {
      clearTimeout(streamCompletionTimerRef.current);
      streamCompletionTimerRef.current = null;
    }
    try { urlPlayer.pause(); } catch { /* ignore */ }
    removeUrlStatusListener();
  }, [urlPlayer, removeUrlStatusListener]);

  const closeWs = useCallback(() => {
    if (wsRef.current) {
      try { wsRef.current.close(); } catch { /* ignore */ }
      wsRef.current = null;
    }
  }, []);

  const resetRefs = useCallback(() => {
    streamFirstAudioArrivedRef.current = false;
    streamDoneReceivedRef.current = false;
    streamTotalBytesRef.current = 0;
    terminalReceivedRef.current = false;
    modeRef.current = 'idle';
    sessionKeyRef.current = null;
    onEndedRef.current = null;
  }, []);

  /** 停止当前播放（不触发 onEnded） */
  const stop = useCallback(() => {
    closeWs();
    stopAllAudio();
    resetRefs();
    if (isMountedRef.current) {
      setState({
        isLoading: false,
        isPlaying: false,
        currentSessionKey: null,
        error: null,
      });
    }
  }, [closeWs, stopAllAudio, resetRefs]);

  /** 仅暂停，保留会话、状态 */
  const pause = useCallback(() => {
    if (modeRef.current === 'stream') {
      if (audioContextRef.current && audioContextRef.current.state === 'running') {
        audioContextRef.current.suspend().catch(() => {});
      }
      if (streamCompletionTimerRef.current) {
        clearTimeout(streamCompletionTimerRef.current);
        streamCompletionTimerRef.current = null;
      }
    } else if (modeRef.current === 'url') {
      try { urlPlayer.pause(); } catch { /* ignore */ }
    }
    if (isMountedRef.current) setState((prev) => ({ ...prev, isPlaying: false }));
  }, [urlPlayer]);

  const resume = useCallback(() => {
    if (modeRef.current === 'stream') {
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(() => {});
      }
    } else if (modeRef.current === 'url') {
      try { urlPlayer.play(); } catch { /* ignore */ }
    }
    if (isMountedRef.current) setState((prev) => ({ ...prev, isPlaying: true }));
  }, [urlPlayer]);

  /** 触发自然结束回调（供 URL 模式 didJustFinish / 流式 setTimeout 调用） */
  const triggerEnded = useCallback(() => {
    const cb = onEndedRef.current;
    stop();
    try { cb?.(); } catch (err) { console.error('[SentStream] onEnded 抛错', err); }
  }, [stop]);

  const setupUrlPlayback = useCallback(async (audioUrl: string) => {
    removeUrlStatusListener();
    try {
      await urlPlayer.replace({ uri: audioUrl });
      urlPlayer.play();
    } catch (err) {
      console.error('[SentStream] urlPlayer 启动失败', err);
      stop();
      if (isMountedRef.current) {
        setState((prev) => ({ ...prev, error: 'URL 播放失败' }));
      }
      return;
    }
    setState((prev) => ({ ...prev, isLoading: false, isPlaying: true }));
    urlStatusListenerRef.current = urlPlayer.addListener('playbackStatusUpdate', (status) => {
      if (!isMountedRef.current || modeRef.current !== 'url') return;
      if (status.didJustFinish) {
        triggerEnded();
      }
    });
  }, [urlPlayer, removeUrlStatusListener, stop, triggerEnded]);

  const setupStreamPlayback = useCallback(async () => {
    await ensureAudioContext();
    createBufferSource();
    streamFirstAudioArrivedRef.current = false;
    streamTotalBytesRef.current = 0;
    streamDoneReceivedRef.current = false;
    setState((prev) => ({ ...prev, isLoading: true, isPlaying: false }));
  }, [ensureAudioContext, createBufferSource]);

  const play = useCallback(async ({
    slug, chapterNumber, paraIndex, sentenceIndex, track, sessionKey, onEnded, onError,
  }: PlayParams) => {
    stop();

    const accessToken = tokenManager.peek();
    const session = tryGetSession();
    if (!accessToken || !session) {
      onError?.('未登录');
      setState((prev) => ({ ...prev, error: '未登录' }));
      return;
    }

    modeRef.current = 'connecting';
    sessionKeyRef.current = sessionKey;
    onEndedRef.current = onEnded ?? null;
    setState({
      isLoading: true,
      isPlaying: false,
      currentSessionKey: sessionKey,
      error: null,
    });

    const ws = session.openWebSocket('/ws/classics/sentence-stream');
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'init',
        token: accessToken,
        slug,
        chapterNumber,
        paraIndex,
        sentenceIndex,
        track: track ?? 'ai',
      }));
    };

    ws.onmessage = (event) => {
      if (typeof event.data !== 'string') return;
      if (sessionKeyRef.current !== sessionKey) return; // 旧会话丢弃

      let msg: any;
      try { msg = JSON.parse(event.data); } catch { return; }

      switch (msg.type) {
        case 'cached': {
          terminalReceivedRef.current = true;
          modeRef.current = 'url';
          setupUrlPlayback(String(msg.audioUrl || ''));
          closeWs();
          break;
        }
        case 'started': {
          modeRef.current = 'stream';
          setupStreamPlayback();
          break;
        }
        case 'audio': {
          if (modeRef.current !== 'stream' || !msg.audio) break;
          enqueuePcm(msg.audio);
          if (!streamFirstAudioArrivedRef.current) {
            streamFirstAudioArrivedRef.current = true;
            setState((prev) => ({ ...prev, isLoading: false, isPlaying: true }));
          }
          break;
        }
        case 'done': {
          streamDoneReceivedRef.current = true;
          terminalReceivedRef.current = true;
          // 流式模式：根据已收 PCM 总字节估算剩余时长（16kHz 16bit mono → 32000 bytes/s）
          // 加 500ms 缓冲让最后的声音播完
          if (modeRef.current === 'stream') {
            const totalMs = Math.round(streamTotalBytesRef.current / 32);
            if (streamCompletionTimerRef.current) clearTimeout(streamCompletionTimerRef.current);
            streamCompletionTimerRef.current = setTimeout(() => {
              triggerEnded();
            }, Math.max(500, totalMs));
          }
          closeWs();
          break;
        }
        case 'error': {
          console.error('[SentStream] server error:', msg.error);
          handlePaymentBlockMessage(msg);
          setState((prev) => ({ ...prev, error: String(msg.error || '合成失败'), isLoading: false }));
          const errText = String(msg.error || '合成失败');
          onError?.(errText);
          stop();
          break;
        }
      }
    };

    ws.onerror = () => {
      if (terminalReceivedRef.current) return;
      if (sessionKeyRef.current !== sessionKey) return;
      setState((prev) => ({ ...prev, error: '连接失败', isLoading: false }));
      onError?.('连接失败');
      stop();
    };

    ws.onclose = () => {
      if (wsRef.current === ws) wsRef.current = null;
    };
  }, [stop, setupUrlPlayback, setupStreamPlayback, enqueuePcm, closeWs, triggerEnded]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      closeWs();
      stopAllAudio();
      if (audioContextRef.current) {
        try { audioContextRef.current.close(); } catch { /* ignore */ }
        audioContextRef.current = null;
      }
    };
  }, [closeWs, stopAllAudio]);

  return {
    ...state,
    play,
    stop,
    pause,
    resume,
  };
}
