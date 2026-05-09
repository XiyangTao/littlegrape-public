import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
  runOnJS,
  SharedValue,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeProvider';
import Icon, { IconNames } from '@/components/Icon';
import { useI18n } from '@/context/I18nProvider';
import type { Theme } from '@/theme';

// 底部面板高度
const PANEL_HEIGHT = 200;
// 动画时长（优化为更快的 250ms）
const ANIMATION_DURATION = 250;

// 波形条数量
const WAVEFORM_BARS = 20;

interface VoiceRecordingModalProps {
  /** 是否可见 */
  visible: boolean;
  /** 录音时长 SharedValue（毫秒） */
  durationShared: SharedValue<number>;
  /** 是否在取消区域 */
  isInCancelZone: boolean;
  /** 录音是否正在初始化中 */
  isInitializing?: boolean;
  /** 音量历史 SharedValue */
  volumeHistoryShared: SharedValue<number[]>;
  /** 退出动画完成回调 */
  onExitComplete?: () => void;
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubbleWrapper: {
    alignItems: 'center',
    marginBottom: PANEL_HEIGHT,
  },
  recordBubble: {
    minHeight: 100,
    borderRadius: theme.spacing.borderRadius.base,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleTriangle: {
    position: 'absolute',
    bottom: -10,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderLeftColor: 'transparent',
    borderRightWidth: 10,
    borderRightColor: 'transparent',
    borderTopWidth: 12,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    gap: 3,
  },
  waveformBar: {
    width: 3,
    height: 40,
    borderRadius: 1.5,
  },
  durationContainer: {
    marginTop: 15,
  },
  durationText: {
    fontSize: 18,
    fontWeight: '500',
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  halfArea: {
    width: '100%',
    height: PANEL_HEIGHT / 2 - 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  areaContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintText: {
    fontSize: 14,
    marginTop: 8,
  },
  sendText: {
    fontSize: 17,
    fontWeight: '500',
  },
});

// 波形条组件 - 使用 useAnimatedStyle 驱动
const WaveformBar: React.FC<{
  index: number;
  volumeHistoryShared: SharedValue<number[]>;
  color: string;
  styles: ReturnType<typeof createStyles>;
}> = React.memo(({ index, volumeHistoryShared, color, styles }) => {
  const animatedStyle = useAnimatedStyle(() => {
    const history = volumeHistoryShared.value;
    const historyLength = history.length;
    const startIndex = Math.max(0, historyLength - WAVEFORM_BARS);
    const historyIndex = startIndex + index;
    const volume = historyIndex < historyLength ? history[historyIndex] : 0;
    // 将音量 (0-1) 映射到波形高度 (0.15-1.0)
    const targetValue = 0.15 + volume * 0.85;

    return {
      transform: [{ scaleY: withTiming(targetValue, { duration: 50 }) }],
    };
  });

  return (
    <Animated.View
      style={[
        styles.waveformBar,
        { backgroundColor: color },
        animatedStyle,
      ]}
    />
  );
});

// 时长显示组件 - 使用 useDerivedValue
const DurationDisplay: React.FC<{
  durationShared: SharedValue<number>;
  isInitializing: boolean;
  preparingText: string;
  color: string;
  styles: ReturnType<typeof createStyles>;
}> = React.memo(({ durationShared, isInitializing, preparingText, color, styles }) => {
  // 使用 state 来显示时长（因为 Text 需要字符串）
  const [displayText, setDisplayText] = React.useState('00:00');

  // 监听 SharedValue 变化
  useDerivedValue(() => {
    if (isInitializing) {
      runOnJS(setDisplayText)(preparingText);
    } else {
      const ms = durationShared.value;
      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      const formatted = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
      runOnJS(setDisplayText)(formatted);
    }
  });

  return (
    <View style={styles.durationContainer}>
      <Text style={[styles.durationText, { color }]}>
        {displayText}
      </Text>
    </View>
  );
});

/**
 * 微信风格的录音弹窗
 * 使用 Reanimated 实现高性能动画
 */
export const VoiceRecordingModal: React.FC<VoiceRecordingModalProps> = ({
  visible,
  durationShared,
  isInCancelZone,
  isInitializing = false,
  volumeHistoryShared,
  onExitComplete,
}) => {
  const { theme } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const styles = createStyles(theme);

  // 动画值
  const slideAnim = useSharedValue(PANEL_HEIGHT);
  const overlayOpacity = useSharedValue(0);
  const bubbleScale = useSharedValue(0.8);
  const shouldRender = useSharedValue(false);

  // React state 控制渲染（需要和 shouldRender 同步）
  const [isRendered, setIsRendered] = React.useState(false);

  // 设置渲染状态
  const setRenderState = useCallback((value: boolean) => {
    setIsRendered(value);
  }, []);

  // 执行出场动画
  const startExitAnimation = useCallback(() => {
    slideAnim.value = withTiming(PANEL_HEIGHT, {
      duration: ANIMATION_DURATION,
      easing: Easing.out(Easing.ease),
    });
    overlayOpacity.value = withTiming(0, {
      duration: ANIMATION_DURATION,
      easing: Easing.out(Easing.ease),
    }, (finished) => {
      if (finished) {
        shouldRender.value = false;
        runOnJS(setRenderState)(false);
        // 重置动画值
        bubbleScale.value = 0.8;
        slideAnim.value = PANEL_HEIGHT;
        overlayOpacity.value = 0;
        if (onExitComplete) {
          runOnJS(onExitComplete)();
        }
      }
    });
  }, [slideAnim, overlayOpacity, bubbleScale, shouldRender, onExitComplete, setRenderState]);

  // 入场/出场动画控制
  useEffect(() => {
    if (visible) {
      shouldRender.value = true;
      setIsRendered(true);

      // 入场动画
      slideAnim.value = withTiming(0, {
        duration: ANIMATION_DURATION,
        easing: Easing.out(Easing.ease),
      });
      overlayOpacity.value = withTiming(1, {
        duration: ANIMATION_DURATION,
        easing: Easing.out(Easing.ease),
      });
      bubbleScale.value = withTiming(1, {
        duration: ANIMATION_DURATION,
        easing: Easing.out(Easing.ease),
      });
    } else if (isRendered) {
      startExitAnimation();
    }
  }, [visible]);

  // 动画样式
  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const bubbleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bubbleScale.value }],
  }));

  const bottomPanelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideAnim.value }],
  }));

  if (!isRendered) return null;

  const waveformColor = isInCancelZone
    ? theme.colors.recording.waveformCancel
    : theme.colors.recording.waveform;

  const bubbleBackgroundColor = isInitializing
    ? theme.colors.recording.bubbleInitializing
    : isInCancelZone
      ? theme.colors.recording.bubbleCancel
      : theme.colors.recording.bubble;

  return (
    <View style={styles.container} pointerEvents="none">
      {/* 半透明背景 */}
      <Animated.View
        style={[
          styles.overlay,
          { backgroundColor: theme.colors.recording.overlay },
          overlayStyle,
        ]}
      >
        {/* 录音气泡 */}
        <View style={styles.bubbleWrapper}>
          <Animated.View
            style={[
              styles.recordBubble,
              { backgroundColor: bubbleBackgroundColor, width: screenWidth * 0.55 },
              bubbleStyle,
            ]}
          >
            {/* 气泡三角形 */}
            <View
              style={[
                styles.bubbleTriangle,
                { borderTopColor: bubbleBackgroundColor },
              ]}
            />

            {isInitializing ? (
              <View style={styles.waveformContainer}>
                <ActivityIndicator size="large" color={theme.colors.recording.waveform} />
              </View>
            ) : (
              <View style={styles.waveformContainer}>
                {Array.from({ length: WAVEFORM_BARS }).map((_, index) => (
                  <WaveformBar
                    key={index}
                    index={index}
                    volumeHistoryShared={volumeHistoryShared}
                    color={waveformColor}
                    styles={styles}
                  />
                ))}
              </View>
            )}
          </Animated.View>

          {/* 时长显示 */}
          <DurationDisplay
            durationShared={durationShared}
            isInitializing={isInitializing}
            preparingText={t('voiceRecord.preparing')}
            color={theme.colors.recording.durationText}
            styles={styles}
          />
        </View>
      </Animated.View>

      {/* 底部面板 */}
      <Animated.View
        style={[
          styles.bottomPanel,
          {
            backgroundColor: theme.colors.recording.panelBackground,
            paddingBottom: insets.bottom,
          },
          bottomPanelStyle,
        ]}
      >
        {/* 上滑取消区域 */}
        <View
          style={[
            styles.halfArea,
            isInCancelZone && { backgroundColor: theme.colors.recording.cancelAreaActive },
          ]}
        >
          <View style={styles.areaContent}>
            {isInitializing ? (
              <>
                <ActivityIndicator size="small" color={theme.colors.recording.hintText} />
                <Text style={[styles.hintText, { color: theme.colors.recording.hintText }]}>
                  {t('voiceRecord.connecting')}
                </Text>
              </>
            ) : (
              <>
                <Icon
                  name={IconNames.up}
                  size={18}
                  color={isInCancelZone ? theme.colors.recording.cancelText : theme.colors.recording.hintText}
                />
                <Text
                  style={[
                    styles.hintText,
                    { color: isInCancelZone ? theme.colors.recording.cancelText : theme.colors.recording.hintText },
                  ]}
                >
                  {isInCancelZone ? t('voiceRecord.releaseToCancel') : t('voiceRecord.slideUpToCancel')}
                </Text>
              </>
            )}
          </View>
        </View>

        {/* 松开发送区域 */}
        <View
          style={[
            styles.halfArea,
            { backgroundColor: isInCancelZone ? 'transparent' : theme.colors.recording.sendAreaBackground },
          ]}
        >
          <View style={styles.areaContent}>
            <Text
              style={[
                styles.sendText,
                { color: isInCancelZone ? 'transparent' : theme.colors.recording.sendText },
              ]}
            >
              {isInitializing
                ? t('voiceRecord.preparingHint')
                : isInCancelZone
                  ? ''
                  : t('voiceRecord.releaseToSend')}
            </Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
};
