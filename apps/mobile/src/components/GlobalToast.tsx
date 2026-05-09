import React, { useEffect, useRef, useCallback } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeProvider';
import type { Theme } from '@/context/ThemeProvider';
import Icon from '@/components/Icon';
import { useToastStore } from '@/stores/ToastStore';

const ICON_MAP = {
  info: 'information-circle',
  success: 'checkmark-circle',
  error: 'close-circle',
  warning: 'warning',
} as const;

export function GlobalToast() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const current = useToastStore(s => s.current);
  const dismiss = useToastStore(s => s.dismiss);
  const styles = createStyles(theme, insets.top);

  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const hideToast = useCallback(() => {
    clearTimer();
    Animated.parallel([
      Animated.timing(translateY, { toValue: -120, duration: 250, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => {
      dismiss();
    });
  }, [clearTimer, translateY, opacity, dismiss]);

  useEffect(() => {
    if (current) {
      // 入场
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();

      // 自动关闭
      clearTimer();
      timerRef.current = setTimeout(hideToast, current.duration);
    }

    return clearTimer;
  }, [current, clearTimer, hideToast]);

  if (!current) return null;

  const colorMap = {
    info: theme.colors.primary,
    success: theme.colors.success,
    error: theme.colors.error,
    warning: theme.colors.warning,
  };
  const accentColor = colorMap[current.type];

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.container,
          { borderLeftColor: accentColor, transform: [{ translateY }], opacity },
        ]}
      >
        <TouchableOpacity
          style={styles.content}
          activeOpacity={0.8}
          onPress={hideToast}
        >
          <Icon name={ICON_MAP[current.type]} size={20} color={accentColor} />
          <Text style={styles.message} numberOfLines={2}>{current.message}</Text>
          <TouchableOpacity onPress={hideToast} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon name="close" size={18} color={theme.colors.text.tertiary} />
          </TouchableOpacity>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const createStyles = (theme: Theme, topInset: number) => StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
    paddingTop: topInset + theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  container: {
    width: '100%',
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.spacing.borderRadius.base,
    borderLeftWidth: 4,
    ...theme.spacing.shadows.sm,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  message: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.primary,
    lineHeight: theme.fontScale(20),
  },
});
