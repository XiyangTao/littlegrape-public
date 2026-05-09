import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { Theme } from '@/context/ThemeProvider';

interface Props {
  segments: readonly string[];
  activeIndex: number;
  onChange: (index: number) => void;
  theme: Theme;
}

export default function SegmentedControl({ segments, activeIndex, onChange, theme }: Props) {
  const slideAnim = useRef(new Animated.Value(activeIndex)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: activeIndex,
      useNativeDriver: false,
      tension: 300,
      friction: 30,
    }).start();
  }, [activeIndex]);

  const styles = createStyles(theme, segments.length);

  return (
    <View style={styles.container}>
      <View style={styles.track}>
        {/* 滑动指示器 */}
        <Animated.View
          style={[
            styles.indicator,
            {
              left: slideAnim.interpolate({
                inputRange: segments.map((_, i) => i),
                outputRange: segments.map((_, i) => `${(i / segments.length) * 100}%`),
              }),
            },
          ]}
        />
        {/* 按钮 */}
        {segments.map((label, index) => (
          <TouchableOpacity
            key={label}
            style={styles.segment}
            onPress={() => onChange(index)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.label,
                activeIndex === index && styles.labelActive,
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const createStyles = (theme: Theme, count: number) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    track: {
      flexDirection: 'row',
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.spacing.borderRadius.base,
      padding: 3,
      position: 'relative',
    },
    indicator: {
      position: 'absolute',
      top: 3,
      bottom: 3,
      width: `${100 / count}%` as any,
      backgroundColor: theme.colors.card,
      borderRadius: theme.spacing.borderRadius.sm,
      ...theme.spacing.shadows.sm,
    },
    segment: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      zIndex: 1,
    },
    label: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.text.secondary,
    },
    labelActive: {
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
    },
  });
