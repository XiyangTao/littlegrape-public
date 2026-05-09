import { useState, useCallback, useRef, useEffect } from 'react';
import { Platform, PermissionsAndroid, Linking } from 'react-native';
import { usePermissionGuideStore } from '@/stores/PermissionGuideStore';
import AudioRecord from 'react-native-audio-record';
import { RecordingState, RecordingControls } from '@/types/speech';

/**
 * Azure ASR专用录音Hook
 *
 * 特点：
 * - 自动生成符合Azure ASR要求的WAV格式 (16kHz, 单声道, 16位PCM)
 * - 简化的API接口，只保留核心功能
 * - 自动权限管理
 * - 内置错误处理
 */
export const useAzureASRRecording = (): RecordingState & RecordingControls => {
  // 状态管理
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    isInitialized: false,
    duration: 0,
    error: null,
  });

  // 计时器引用
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  // 使用 ref 跟踪初始化状态（同步更新，避免 React setState 延迟问题）
  const isInitializedRef = useRef<boolean>(false);

  // 请求录音权限（先弹引导弹窗，再请求系统权限）
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        // 检查是否已有权限
        const hasPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        );
        if (hasPermission) return true;

        // 先弹引导弹窗说明用途
        const confirmed = await usePermissionGuideStore.getState().showGuide('microphone');
        if (!confirmed) return false;

        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        );
        if (result === PermissionsAndroid.RESULTS.GRANTED) return true;
        if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
          await Linking.openSettings();
        }
        return false;
      } catch (error) {
        console.error('请求录音权限失败:', error);
        return false;
      }
    }
    return true; // iOS在首次使用时自动请求
  }, []);

  // 初始化录音器
  const initialize = useCallback(async (): Promise<void> => {
    try {
      setState((prev: RecordingState) => ({ ...prev, error: null }));

      // 检查权限
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        throw new Error('录音权限被拒绝');
      }

      // Azure ASR优化配置
      const options = {
        sampleRate: 16000,    // Azure ASR要求16kHz
        channels: 1,          // 单声道
        bitsPerSample: 16,    // 16位
        audioSource: 6,       // Android VOICE_RECOGNITION 源，优化语音识别
        wavFile: 'azure_asr_recording.wav', // WAV格式文件名
      };

      AudioRecord.init(options);

      // 先更新 ref（同步），再更新 state（异步）
      isInitializedRef.current = true;
      setState(prev => ({
        ...prev,
        isInitialized: true,
        error: null,
      }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '初始化失败';
      isInitializedRef.current = false;
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isInitialized: false,
      }));
      throw new Error(errorMessage);
    }
  }, [requestPermission]);

  // 开始录音
  const start = useCallback(async (): Promise<void> => {
    // 使用 ref 检查初始化状态（同步值，避免 state 更新延迟）
    if (!isInitializedRef.current) {
      throw new Error('请先初始化录音器');
    }

    if (state.isRecording) {
      console.warn('录音已在进行中');
      return;
    }

    try {
      setState((prev: RecordingState) => ({ ...prev, error: null }));

      // 清理可能残留的旧计时器（多次 start/stop 防积累）
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      AudioRecord.start();
      startTimeRef.current = Date.now();

      // 启动计时器
      timerRef.current = setInterval(() => {
        const duration = Date.now() - startTimeRef.current;
        setState(prev => ({ ...prev, duration }));
      }, 100);

      setState(prev => ({
        ...prev,
        isRecording: true,
        duration: 0,
      }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '开始录音失败';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw new Error(errorMessage);
    }
  }, [state.isRecording]);

  // 停止录音
  const stop = useCallback(async (): Promise<string | null> => {
    if (!state.isRecording) {
      console.warn('当前没有录音');
      return null;
    }

    try {
      const audioFile = await AudioRecord.stop();

      // 清理计时器
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // 最终更新时长
      const finalDuration = Date.now() - startTimeRef.current;

      setState(prev => ({
        ...prev,
        isRecording: false,
        duration: finalDuration,
        error: null,
      }));

      return audioFile;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '停止录音失败';

      // 确保清理计时器
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      setState(prev => ({
        ...prev,
        isRecording: false,
        error: errorMessage,
      }));

      throw new Error(errorMessage);
    }
  }, [state.isRecording]);

  // 清理资源
  const cleanup = useCallback(() => {
    try {
      // 停止录音（如果正在录音）
      if (state.isRecording) {
        AudioRecord.stop().catch(console.error);
      }

      // 清理计时器
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // 重置 ref 和状态
      isInitializedRef.current = false;
      setState({
        isRecording: false,
        isInitialized: false,
        duration: 0,
        error: null,
      });

    } catch (error) {
      console.error('清理录音器失败:', error);
    }
  }, [state.isRecording]);

  // 组件卸载时自动清理
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return {
    // 状态
    ...state,

    // 控制方法
    initialize,
    start,
    stop,
    cleanup,
  };
};