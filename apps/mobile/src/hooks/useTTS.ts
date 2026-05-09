import { useState, useCallback, useRef, useEffect } from 'react';
import { File } from 'expo-file-system';
import { useAudioPlayer } from 'expo-audio';
import { apiClient } from '@/api';
import {
  ensureCacheDir,
  getHashedCacheFile,
} from '@/services/CacheService';
import { getErrorMessage } from '@/utils/errorUtils';

/**
 * TTS 语音合成和播放 Hook
 *
 * 设计原则：
 * - isPlaying 由控制方法（play/pause/resume/stop）显式管理，不从 status 事件推导
 * - 状态监听器仅负责：更新进度（currentTime/duration）、检测播放完成（didJustFinish）
 * - 对 OS 级音频中断等外部暂停，用 300ms 防抖兜底
 * - 支持播放预录音频 URL（优先）+ TTS 合成降级
 * - 缓存到本地 cacheDirectory（通过 CacheService 管理）
 */

interface TTSState {
  isLoading: boolean;
  isPlaying: boolean;
  isFinished: boolean;
  currentMessageId: string | null;
  error: string | null;
  currentTime: number;
  duration: number;
}

interface TTSControls {
  /** 播放预录音频 URL（有本地缓存） */
  playUrl: (messageId: string, audioUrl: string) => Promise<void>;
  /** 使用 TTS 合成并播放（降级方案） */
  speak: (messageId: string, text: string, voice: string, phonemeIpa?: string) => Promise<void>;
  /** 完全停止并重置（切换音频源/关闭时） */
  stop: () => void;
  /** 暂停播放（保持进度和控制条） */
  pause: () => void;
  /** 恢复播放（播完时自动从头重播） */
  resume: () => void;
  cleanup: () => Promise<void>;
  /** 跳转到指定位置（秒） */
  seekTo: (seconds: number) => void;
  /** 相对跳转（秒，正数快进/负数后退） */
  seekBy: (seconds: number) => void;
}

// 获取 TTS 缓存文件
const getTTSCacheFile = (text: string, voice: string, phonemeIpa?: string): File => {
  const key = phonemeIpa ? `tts_${text}_${voice}_ph_${phonemeIpa}` : `tts_${text}_${voice}`;
  return getHashedCacheFile('audio', key, 'mp3');
};

// 获取 URL 缓存文件
const getUrlCacheFile = (url: string): File => {
  return getHashedCacheFile('audio', `url_${url}`, 'mp3');
};

/** 将 ArrayBuffer 保存为 base64 缓存文件 */
function saveAudioToCache(cacheFile: File, data: ArrayBuffer): void {
  const uint8Array = new Uint8Array(data);
  if (uint8Array.length === 0) {
    throw new Error('音频文件为空');
  }
  let binary = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  cacheFile.write(btoa(binary), { encoding: 'base64' });
}

/** 从缓存文件播放音频，返回是否成功启动播放 */
async function playFromCache(
  player: ReturnType<typeof useAudioPlayer>,
  cacheFile: File,
  messageId: string,
  currentIdRef: React.MutableRefObject<string | null>,
): Promise<boolean> {
  if (currentIdRef.current !== messageId) return false;
  if (!player) {
    console.warn('播放器已释放，跳过播放');
    return false;
  }
  try {
    await player.replace({ uri: cacheFile.uri });
    if (currentIdRef.current !== messageId) return false;
    player.play();
    return true;
  } catch (playError) {
    const msg = getErrorMessage(playError);
    if (msg.includes('released') || msg.includes('rejected')) {
      console.warn('播放器已释放，跳过播放');
      return false;
    }
    throw playError;
  }
}

export const useTTS = (): TTSState & TTSControls => {
  const [state, setState] = useState<TTSState>({
    isLoading: false,
    isPlaying: false,
    isFinished: false,
    currentMessageId: null,
    error: null,
    currentTime: 0,
    duration: 0,
  });

  const player = useAudioPlayer();
  const currentMessageIdRef = useRef<string | null>(null);
  const statusListenerRef = useRef<{ remove: () => void } | null>(null);
  const isFinishedRef = useRef(false);
  // 防抖定时器：检测 OS 级音频中断等外部暂停
  const pauseDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // 清除防抖定时器
  const clearPauseDebounce = useCallback(() => {
    if (pauseDebounceRef.current) {
      clearTimeout(pauseDebounceRef.current);
      pauseDebounceRef.current = null;
    }
  }, []);

  // 清除播放状态监听
  const clearStatusListener = useCallback(() => {
    clearPauseDebounce();
    if (statusListenerRef.current) {
      statusListenerRef.current.remove();
      statusListenerRef.current = null;
    }
  }, [clearPauseDebounce]);

  // 播放自然结束处理（保留 currentMessageId 以支持重播）
  const handlePlaybackFinished = useCallback((messageId: string) => {
    clearPauseDebounce();
    isFinishedRef.current = true;
    setState(prev => {
      if (prev.currentMessageId === messageId) {
        return { ...prev, isPlaying: false, isFinished: true };
      }
      return prev;
    });
  }, [clearPauseDebounce]);

  // 启动播放状态监听
  // 职责单一：仅更新进度 + 检测播放完成，不推导 isPlaying
  const startStatusListener = useCallback((messageId: string) => {
    clearStatusListener();

    statusListenerRef.current = player.addListener('playbackStatusUpdate', (status) => {
      // 播放完成（最可靠的信号）
      if (status.didJustFinish) {
        handlePlaybackFinished(messageId);
        return;
      }

      // 更新进度
      setState(prev => ({
        ...prev,
        currentTime: status.currentTime,
        duration: status.duration,
      }));

      if (status.playing) {
        // 播放中 → 取消待处理的暂停检测
        clearPauseDebounce();
        return;
      }

      // !playing 事件 — 可能是 seek 瞬态、OS 中断、或接近末尾的完成
      // 用 300ms 防抖：seek 瞬态会在 300ms 内恢复 playing，自动取消；
      // 真正的外部暂停会持续 300ms 以上，触发状态更新
      if (!pauseDebounceRef.current) {
        const ct = status.currentTime;
        const dur = status.duration;
        pauseDebounceRef.current = setTimeout(() => {
          pauseDebounceRef.current = null;
          // 接近末尾 → 视为完成（didJustFinish 的兜底）
          if (dur > 0 && ct >= Math.max(dur - 1, dur * 0.9)) {
            handlePlaybackFinished(messageId);
          } else {
            setState(prev => prev.isPlaying ? { ...prev, isPlaying: false } : prev);
          }
        }, 300);
      }
    });
  }, [player, clearStatusListener, clearPauseDebounce, handlePlaybackFinished]);

  // 完全停止播放并重置
  const stop = useCallback(() => {
    clearStatusListener();
    currentMessageIdRef.current = null;
    isFinishedRef.current = false;

    try {
      if (player) {
        player.pause();
      }
    } catch (err) {
      // 忽略错误
    }

    setState(prev => ({
      ...prev,
      isLoading: false,
      isPlaying: false,
      isFinished: false,
      currentMessageId: null,
      currentTime: 0,
      duration: 0,
    }));
  }, [player, clearStatusListener]);

  // 暂停播放（保持进度和控制条）
  const pause = useCallback(() => {
    if (!player) return;
    clearPauseDebounce();
    player.pause();
    setState(prev => ({ ...prev, isPlaying: false }));
  }, [player, clearPauseDebounce]);

  // 恢复播放（播完时从头重播）
  const resume = useCallback(() => {
    if (!player) return;
    clearPauseDebounce();
    if (isFinishedRef.current) {
      player.seekTo(0);
      isFinishedRef.current = false;
    }
    player.play();
    setState(prev => ({ ...prev, isPlaying: true, isFinished: false }));
  }, [player, clearPauseDebounce]);

  // 通用播放逻辑：缓存检查 → 获取音频 → 播放
  const playWithCache = useCallback(async (
    messageId: string,
    getCacheFile: () => File,
    fetchAudio: () => Promise<ArrayBuffer>,
  ): Promise<void> => {
    // 点击同一消息 → 切换停止
    if (currentMessageIdRef.current === messageId) {
      stop();
      return;
    }

    stop();
    currentMessageIdRef.current = messageId;

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      currentMessageId: messageId,
    }));

    try {
      ensureCacheDir('audio');
      const cacheFile = getCacheFile();

      if (!cacheFile.info().exists) {
        const audioData = await fetchAudio();
        // 异步操作后检查是否已取消
        if (currentMessageIdRef.current !== messageId) return;
        saveAudioToCache(cacheFile, audioData);
      }

      const started = await playFromCache(player, cacheFile, messageId, currentMessageIdRef);
      if (!started) return;

      setState(prev => ({
        ...prev,
        isLoading: false,
        isPlaying: true,
      }));

      startStatusListener(messageId);
    } catch (error) {
      if (error instanceof Error && (error.name === 'AbortError' || error.name === 'CanceledError')) return;

      console.error('播放音频失败:', error);
      currentMessageIdRef.current = null;
      setState(prev => ({
        ...prev,
        isLoading: false,
        isPlaying: false,
        currentMessageId: null,
        error: getErrorMessage(error),
      }));
    }
  }, [stop, player, startStatusListener]);

  // 播放预录音频 URL（优先本地缓存）
  const playUrl = useCallback(async (messageId: string, audioUrl: string): Promise<void> => {
    await playWithCache(
      messageId,
      () => getUrlCacheFile(audioUrl),
      async () => {
        const response = await fetch(audioUrl);
        if (!response.ok) throw new Error(`下载音频失败: ${response.status}`);
        return response.arrayBuffer();
      },
    );
  }, [playWithCache]);

  // 合成并播放语音（TTS 降级方案）
  const speak = useCallback(async (messageId: string, text: string, voice: string, phonemeIpa?: string): Promise<void> => {
    await playWithCache(
      messageId,
      () => getTTSCacheFile(text, voice, phonemeIpa),
      () => apiClient.synthesizeSpeech({ text, voice, format: 'mp3', phonemeIpa }),
    );
  }, [playWithCache]);

  // 跳转到指定位置（绝对）
  const seekTo = useCallback((seconds: number) => {
    if (!player || !currentMessageIdRef.current) return;
    clearPauseDebounce();
    isFinishedRef.current = false;
    player.seekTo(Math.max(0, seconds));
    setState(prev => prev.isFinished ? { ...prev, isFinished: false } : prev);
  }, [player, clearPauseDebounce]);

  // 相对跳转（直接读 player.currentTime，避免闭包捕获陈旧 state）
  const seekBy = useCallback((seconds: number) => {
    if (!player || !currentMessageIdRef.current) return;
    clearPauseDebounce();
    isFinishedRef.current = false;
    player.seekTo(Math.max(0, player.currentTime + seconds));
    setState(prev => prev.isFinished ? { ...prev, isFinished: false } : prev);
  }, [player, clearPauseDebounce]);

  // 清理（停止播放，缓存由 CacheService 统一管理）
  const cleanup = useCallback(async (): Promise<void> => {
    stop();
  }, [stop]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      clearStatusListener();
      try {
        if (player?.playing) {
          player.pause();
        }
      } catch (err) {
        // 忽略错误
      }
    };
  }, [player, clearStatusListener]);

  return {
    ...state,
    playUrl,
    speak,
    stop,
    pause,
    resume,
    cleanup,
    seekTo,
    seekBy,
  };
};
