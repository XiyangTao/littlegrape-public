/**
 * 时间分隔组件
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, Theme } from '@/context/ThemeProvider';

interface TimeSeparatorProps {
  /** 格式化后的时间文本 */
  timeText: string;
}

export const TimeSeparator: React.FC<TimeSeparatorProps> = ({ timeText }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{timeText}</Text>
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      marginVertical: theme.spacing.md,
    },
    text: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.disabled,
      backgroundColor: theme.colors.background.tertiary,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xxs,
      borderRadius: theme.spacing.borderRadius.sm,
    },
  });

export default TimeSeparator;
