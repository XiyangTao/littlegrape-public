import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeProvider';

interface Props {
  current: number;
  total: number;
}

export default function StoryProgressBar({ current, total }: Props) {
  const { theme } = useTheme();
  const progress = total > 0 ? current / total : 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.border.light }]}>
      <View
        style={[
          styles.fill,
          {
            width: `${Math.min(progress * 100, 100)}%`,
            backgroundColor: theme.colors.primary,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
});
