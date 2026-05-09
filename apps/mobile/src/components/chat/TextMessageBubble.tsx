/**
 * 文字消息气泡组件
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme, Theme } from '@/context/ThemeProvider';
import Icon, { IconNames } from '@/components/Icon';

interface TextMessageBubbleProps {
  /** 消息文本 */
  text: string;
  /** 是否为用户消息 */
  isUser: boolean;
  /** 是否有 tips */
  hasTips?: boolean;
  /** tips 指示器点击回调 */
  onTipsPress?: () => void;
  /** tips 指示器颜色 */
  tipsColor?: string;
}

export const TextMessageBubble: React.FC<TextMessageBubbleProps> = ({
  text,
  isUser,
  hasTips,
  onTipsPress,
  tipsColor,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
      <Text style={[styles.text, isUser ? styles.userText : styles.aiText]}>
        {text}
      </Text>

      {isUser && hasTips && (
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
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.spacing.borderRadius.sm,
    },
    userBubble: {
      backgroundColor: theme.colors.accent.wechatGreen,
    },
    aiBubble: {
      backgroundColor: theme.colors.background.primary,
    },
    text: {
      fontSize: theme.typography.fontSize.base,
      lineHeight: 20,
    },
    userText: {
      color: theme.colors.text.inverse,
    },
    aiText: {
      color: theme.colors.text.primary,
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

export default TextMessageBubble;
