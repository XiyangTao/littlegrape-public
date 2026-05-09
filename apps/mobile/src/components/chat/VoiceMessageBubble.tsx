/**
 * 语音消息气泡组件
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme, Theme } from '@/context/ThemeProvider';
import Icon, { IconNames } from '@/components/Icon';
import { VoiceWaveform } from './VoiceWaveform';
import { formatVoiceDuration } from '@/utils/formatters';

interface VoiceMessageBubbleProps {
  /** 语音时长（毫秒） */
  duration: number;
  /** 是否正在播放 */
  isPlaying: boolean;
  /** 播放/暂停回调 */
  onPlayPress: () => void;
  /** 长按回调 */
  onLongPress?: (pageX: number, pageY: number) => void;
  /** 是否有 tips */
  hasTips?: boolean;
  /** tips 指示器点击回调 */
  onTipsPress?: () => void;
  /** tips 指示器颜色 */
  tipsColor?: string;
}

export const VoiceMessageBubble: React.FC<VoiceMessageBubbleProps> = ({
  duration,
  isPlaying,
  onPlayPress,
  onLongPress,
  hasTips,
  onTipsPress,
  tipsColor,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.bubble}>
      <TouchableOpacity
        style={styles.content}
        onLongPress={(e) => onLongPress?.(e.nativeEvent.pageX, e.nativeEvent.pageY)}
        delayLongPress={300}
        activeOpacity={0.9}
      >
        <TouchableOpacity
          style={styles.playButton}
          onPress={onPlayPress}
          activeOpacity={0.7}
        >
          <Icon
            name={isPlaying ? IconNames.pause : IconNames.play}
            size={16}
            color={theme.colors.text.inverse}
          />
        </TouchableOpacity>
        <VoiceWaveform isPlaying={isPlaying} />
        <Text style={styles.duration}>{formatVoiceDuration(duration)}</Text>
      </TouchableOpacity>

      {hasTips && (
        <TouchableOpacity
          style={styles.tipsIndicator}
          onPress={onTipsPress}
          activeOpacity={0.7}
        >
          <Icon
            name={IconNames.lightbulb}
            size={12}
            color={tipsColor || theme.colors.primary}
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    bubble: {
      minWidth: 120,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.accent.wechatGreen,
      borderRadius: theme.spacing.borderRadius.sm,
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    playButton: {
      padding: 4,
    },
    duration: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.inverse,
      marginLeft: theme.spacing.xs,
    },
    tipsIndicator: {
      position: 'absolute',
      top: -10,
      right: -2,
      width: 20,
      height: 20,
      borderRadius: theme.spacing.borderRadius.sm,
      backgroundColor: theme.colors.background.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 2,
      elevation: 2,
    },
  });

export default VoiceMessageBubble;
