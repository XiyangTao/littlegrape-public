import { useState, useCallback, useRef, useEffect } from 'react';
import { useAudioPlayer as useExpoAudioPlayer } from 'expo-audio';

/**
 * 音频播放 Hook (使用 expo-audio)
 *
 * 用于播放语音预览、TTS 音频等
 * 特点：
 * - 支持播放网络 URL 音频
 * - 支持同时只播放一个音频
 * - 自动清理资源
 * - 手动管理播放状态，确保准确性
 */

interface AudioPlayerState {
  isPlaying: boolean;
  isLoading: boolean;
  currentUri: string | null;
  error: string | null;
}

interface AudioPlayerControls {
  play: (uri: string) => Promise<void>;
  stop: () => Promise<void>;
  cleanup: () => Promise<void>;
}

export const useAudioPlayer = (): AudioPlayerState & AudioPlayerControls => {
  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    isLoading: false,
    currentUri: null,
    error: null,
  });

  // 使用 expo-audio 的 hook
  const player = useExpoAudioPlayer();

  // 播放状态监听器
  const statusListenerRef = useRef<{ remove: () => void } | null>(null);
  // 标记播放是否真正开始过，用于过滤 replace() 产生的瞬态 !status.playing 事件
  const playbackStartedRef = useRef(false);
  // 追踪当前播放的 URI，用于在异步操作中检查是否被取消
  const activeUriRef = useRef<string | null>(null);

  // 清除播放状态监听
  const clearStatusListener = useCallback(() => {
    if (statusListenerRef.current) {
      statusListenerRef.current.remove();
      statusListenerRef.current = null;
    }
  }, []);

  // 播放结束处理（清 ref + state + listener）
  const handlePlaybackFinished = useCallback((expectedUri: string) => {
    activeUriRef.current = null;
    setState(prev => {
      if (prev.isPlaying && prev.currentUri === expectedUri) {
        return { ...prev, isPlaying: false };
      }
      return prev;
    });
    clearStatusListener();
  }, [clearStatusListener]);

  // 启动播放状态监听（事件驱动，替代轮询）
  const startStatusListener = useCallback((expectedUri: string) => {
    clearStatusListener();
    // 始终从 false 开始，等待真正的 {playing: true} 事件确认播放已开始
    // 避免 replace() 产生的瞬态 {playing: false} 事件误触发结束处理
    playbackStartedRef.current = false;

    statusListenerRef.current = player.addListener('playbackStatusUpdate', (status) => {
      // didJustFinish 是确定的播放完成信号，无条件处理
      if (status.didJustFinish) {
        handlePlaybackFinished(expectedUri);
        return;
      }

      // 标记播放已真正开始
      if (status.playing) {
        playbackStartedRef.current = true;
        return;
      }

      // 播放开始后收到 !playing → 播放被外部中断
      if (playbackStartedRef.current && !status.playing) {
        handlePlaybackFinished(expectedUri);
      }
    });
  }, [player, clearStatusListener, handlePlaybackFinished]);

  // 播放音频
  const play = useCallback(async (uri: string): Promise<void> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // 如果当前正在播放，先停止
      try {
        if (player?.playing) {
          player.pause();
        }
      } catch (err) {
        // 忽略错误
      }

      // 检查 player 是否有效
      if (!player) {
        console.warn('播放器已释放，跳过播放');
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      // 标记当前要播放的 URI
      activeUriRef.current = uri;

      try {
        await player.replace({ uri });
        // replace 期间可能被 stop/其他 play 取消
        if (activeUriRef.current !== uri) return;
        player.play();
      } catch (playError: unknown) {
        const errorMsg = playError instanceof Error ? playError.message : '';
        if (errorMsg.includes('released') || errorMsg.includes('rejected')) {
          console.warn('播放器已释放，跳过播放');
          setState(prev => ({ ...prev, isLoading: false }));
          return;
        }
        throw playError;
      }

      setState(prev => ({
        ...prev,
        isPlaying: true,
        isLoading: false,
        currentUri: uri,
      }));

      startStatusListener(uri);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '播放失败';
      console.error('播放音频失败:', error);

      setState(prev => ({
        ...prev,
        isPlaying: false,
        isLoading: false,
        error: errorMessage,
      }));

      clearStatusListener();
    }
  }, [player, startStatusListener, clearStatusListener]);

  // 停止播放
  const stop = useCallback(async (): Promise<void> => {
    try {
      clearStatusListener();
      activeUriRef.current = null;

      try {
        if (player?.playing) {
          player.pause();
        }
      } catch (err) {
        // 忽略 player 已释放的错误
      }

      setState(prev => ({
        ...prev,
        isPlaying: false,
        currentUri: null,
      }));
    } catch (error) {
      console.error('停止播放失败:', error);
    }
  }, [player, clearStatusListener]);

  // 清理资源
  const cleanup = useCallback(async (): Promise<void> => {
    try {
      clearStatusListener();
      activeUriRef.current = null;

      try {
        if (player?.playing) {
          player.pause();
        }
      } catch (err) {
        // player 可能已经被释放，忽略错误
      }

      setState({
        isPlaying: false,
        isLoading: false,
        currentUri: null,
        error: null,
      });
    } catch (error) {
      console.error('清理音频播放器失败:', error);
    }
  }, [player, clearStatusListener]);

  // 组件卸载时自动清理
  useEffect(() => {
    return () => {
      clearStatusListener();
      activeUriRef.current = null;
      try {
        if (player?.playing) {
          player.pause();
        }
      } catch (err) {
        // 忽略 player 已释放的错误
      }
    };
  }, [player, clearStatusListener]);

  return {
    ...state,
    play,
    stop,
    cleanup,
  };
};
