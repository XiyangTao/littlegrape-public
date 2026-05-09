import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { PanResponder, GestureResponderEvent, Keyboard } from 'react-native';
import { useRecording } from './useRecording';
import { useCustomAlert } from './useCustomAlert';
import { useI18n } from '@/context/I18nProvider';

/** 取消区域的阈值（上滑距离 80px） */
const CANCEL_THRESHOLD = 80;
/** 最短录音时长（毫秒） */
const MIN_DURATION = 1000;

export type VoiceAction = 'send' | 'cancel' | 'too_short';

/** 语音消息数据 */
export interface VoiceMessageData {
  /** ASR 识别的文本 */
  text: string;
  /** 录音文件路径 */
  filePath: string;
  /** 录音时长（毫秒） */
  duration: number;
}

interface UseVoiceInputOptions {
  /** 语音消息发送回调，返回文本、文件路径、时长 */
  onVoiceMessageSend?: (data: VoiceMessageData) => void;
  /** 用户ID（用于 ASR 用量统计） */
  userId?: string | null;
}

interface UseVoiceInputReturn {
  /** 录音弹窗是否可见 */
  showVoiceModal: boolean;
  /** 是否在取消区域 */
  isInCancelZone: boolean;
  /** 键盘是否可见（用于禁用麦克风） */
  isKeyboardVisible: boolean;
  /** 录音状态（来自 useRecording） */
  recording: ReturnType<typeof useRecording>;
  /** 麦克风按钮的 PanResponder handlers */
  micPanHandlers: ReturnType<typeof PanResponder.create>['panHandlers'];
  /** 录音弹窗退出动画完成后的回调 */
  onVoiceModalExitComplete: () => void;
  /** Toast 组件 */
  AlertComponent: React.ReactNode;
}

/**
 * 语音输入 Hook
 *
 * 封装了录音的完整逻辑：
 * - 按住麦克风开始录音
 * - 上滑进入取消区域
 * - 松开发送或取消
 * - 处理录音太短的情况
 * - 处理 ASR 结果
 */
export const useVoiceInput = (options?: UseVoiceInputOptions): UseVoiceInputReturn => {
  const { t } = useI18n();
  const { toast, AlertComponent } = useCustomAlert();

  // 录音相关状态
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [isInCancelZone, setIsInCancelZone] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const isInCancelZoneRef = useRef(false);
  const isKeyboardVisibleRef = useRef(false);
  const gestureStartY = useRef(0);

  // 监听键盘状态
  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      isKeyboardVisibleRef.current = true;
      setIsKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      isKeyboardVisibleRef.current = false;
      setIsKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // 录音 hook
  const recording = useRecording({ enableASR: true, userId: options?.userId });

  // 待显示的 toast 消息（等动画结束后显示）
  const pendingToastRef = useRef<{ message: string; type: 'info' | 'error' } | null>(null);

  // 手势移动
  const handleGestureMove = useCallback((dy: number) => {
    const inCancelZone = dy < -CANCEL_THRESHOLD;
    isInCancelZoneRef.current = inCancelZone;
    setIsInCancelZone(inCancelZone);
  }, []);

  // 处理录音结束
  const processRecordingEnd = useCallback(async (action: VoiceAction) => {
    if (action === 'too_short') {
      recording.cancel();
      setShowVoiceModal(false);
      pendingToastRef.current = { message: t('voiceRecord.tooShort'), type: 'error' };
      return;
    }

    if (action === 'cancel') {
      recording.cancel();
      setShowVoiceModal(false);
      return;
    }

    // 发送录音
    try {
      const duration = recording.durationShared.value;
      const result = await recording.stop();
      setShowVoiceModal(false);

      if (result.textPromise && result.filePath) {
        const text = await result.textPromise;
        if (text && text.trim()) {
          // 发送语音消息，保留录音文件
          options?.onVoiceMessageSend?.({
            text: text.trim(),
            filePath: result.filePath,
            duration,
          });
        } else {
          // ASR 识别失败，删除录音文件
          recording.deleteFile(result.filePath);
          pendingToastRef.current = { message: t('voiceRecord.noText'), type: 'error' };
        }
      } else if (result.filePath) {
        // 没有 ASR 结果，删除文件
        recording.deleteFile(result.filePath);
        pendingToastRef.current = { message: t('voiceRecord.noText'), type: 'error' };
      }
    } catch (error) {
      setShowVoiceModal(false);
      pendingToastRef.current = { message: t('voiceRecord.stopFailed'), type: 'error' };
    }
  }, [recording, t, options]);

  // 手势释放
  const handleGestureRelease = useCallback((action: VoiceAction) => {
    recording.setPendingAction(action, processRecordingEnd);
  }, [recording, processRecordingEnd]);

  // 开始录音
  const handleVoiceStart = useCallback(async () => {
    setShowVoiceModal(true);
    setIsInCancelZone(false);

    try {
      await recording.start();
    } catch (error) {
      setShowVoiceModal(false);
      pendingToastRef.current = { message: t('voiceRecord.startFailed'), type: 'error' };
    }
  }, [recording, t]);

  // 结束录音
  const handleVoiceEnd = useCallback(() => {
    if (isInCancelZoneRef.current) {
      handleGestureRelease('cancel');
    } else if (recording.durationShared.value < MIN_DURATION) {
      handleGestureRelease('too_short');
    } else {
      handleGestureRelease('send');
    }
  }, [recording.durationShared, handleGestureRelease]);

  // 麦克风按钮的 PanResponder
  const micPanResponder = useMemo(() => {
    return PanResponder.create({
      // 键盘弹出时禁用手势
      onStartShouldSetPanResponder: () => !isKeyboardVisibleRef.current,
      onMoveShouldSetPanResponder: () => !isKeyboardVisibleRef.current,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        // 再次检查键盘状态（双重保险）
        if (isKeyboardVisibleRef.current) return;
        gestureStartY.current = evt.nativeEvent.pageY;
        handleVoiceStart();
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        const dy = evt.nativeEvent.pageY - gestureStartY.current;
        handleGestureMove(dy);
      },
      onPanResponderRelease: () => {
        handleVoiceEnd();
      },
      onPanResponderTerminate: () => {
        handleVoiceEnd();
      },
    });
  }, [handleVoiceStart, handleGestureMove, handleVoiceEnd]);

  // 录音弹窗退出动画完成后的回调
  const onVoiceModalExitComplete = useCallback(() => {
    if (pendingToastRef.current) {
      toast(t('common.tip'), pendingToastRef.current.message, pendingToastRef.current.type);
      pendingToastRef.current = null;
    }
  }, [toast, t]);

  return {
    showVoiceModal,
    isInCancelZone,
    isKeyboardVisible,
    recording,
    micPanHandlers: micPanResponder.panHandlers,
    onVoiceModalExitComplete,
    AlertComponent,
  };
};
