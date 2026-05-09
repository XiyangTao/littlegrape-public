/**
 * AI 正在输入指示器组件
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import { ChatAvatar } from './ChatAvatar';

interface TypingIndicatorProps {
  /** AI 头像 URL */
  avatarUrl?: string | null;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ avatarUrl }) => {
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <ChatAvatar type="ai" avatarUrl={avatarUrl} />
      <View style={styles.bubbleWrapper}>
        <View style={styles.bubble}>
          <Text style={styles.text}>{t('conversation.typing')}</Text>
        </View>
        <View style={styles.triangle} />
      </View>
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      marginBottom: theme.spacing.sm,
      alignItems: 'flex-start',
    },
    bubbleWrapper: {
      position: 'relative',
      maxWidth: '70%',
      marginLeft: theme.spacing.sm,
    },
    bubble: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.spacing.borderRadius.sm,
      backgroundColor: theme.colors.background.primary,
      opacity: 0.7,
    },
    text: {
      fontSize: theme.typography.fontSize.base,
      lineHeight: 20,
      color: theme.colors.text.primary,
      fontStyle: 'italic',
    },
    triangle: {
      position: 'absolute',
      left: -6,
      top: 12,
      width: 0,
      height: 0,
      borderTopWidth: 6,
      borderTopColor: 'transparent',
      borderBottomWidth: 6,
      borderBottomColor: 'transparent',
      borderRightWidth: 6,
      borderRightColor: theme.colors.background.primary,
    },
  });

export default TypingIndicator;
