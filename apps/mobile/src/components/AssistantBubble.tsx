/**
 * AI 学习助手悬浮球
 *
 * - 全局 Overlay，可拖拽
 * - 点击导航到 AssistantChatScreen
 * - 红点角标显示未读推送数
 * - 在 LoginScreen / AssistantChatScreen 自动隐藏
 * - 向边缘快速滑动可半隐藏（贴边收起），点击恢复
 *
 * 注意：本组件不在 Navigator Screen 内，使用全局 navigationRef 而非 hooks
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  PanResponder,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { useAssistantUnread } from '@/stores';
import { navigationRef, navigate } from '@/navigation/navigationRef';
import Icon, { IconNames } from '@/components/Icon';

const BUBBLE_SIZE = 48;
const BADGE_SIZE = 18;
const DOCK_PEEK = 24; // 半隐藏时露出的宽度
const MINI_PEEK = 10; // 进一步最小化后露出的宽度
const DOCK_VELOCITY = 0.8; // 触发贴边收起的滑动速度阈值
const MINI_DELAY = 3000; // 贴边后进一步最小化的延迟(ms)
const STORAGE_KEY = '@assistant_bubble_dock';

// 需要隐藏悬浮球的页面
const HIDDEN_ROUTES = ['AssistantChat', 'Login'];

interface DockState {
  side: 'left' | 'right';
  y: number;
}

export function AssistantBubble() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { unreadCount } = useAssistantUnread();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [currentRoute, setCurrentRoute] = useState('');

  // 用 ref 存储最新布局值，供 PanResponder 闭包读取
  const layoutRef = useRef({
    screenWidth,
    screenHeight,
    insetsTop: insets.top,
    insetsBottom: insets.bottom,
  });
  layoutRef.current = {
    screenWidth,
    screenHeight,
    insetsTop: insets.top,
    insetsBottom: insets.bottom,
  };

  // 收起状态（ref 保证 PanResponder 闭包能读到最新值）
  const isDocked = useRef(false);
  const dockedSide = useRef<'left' | 'right'>('right');
  const isMinimized = useRef(false);
  const miniTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, forceRender] = useState(0);

  // 位置 + 透明度动画值
  const position = useRef(
    new Animated.ValueXY({
      x: screenWidth - BUBBLE_SIZE - 16,
      y: screenHeight - BUBBLE_SIZE - insets.bottom - 80,
    }),
  ).current;
  const opacity = useRef(new Animated.Value(1)).current;

  // ── 路由监听 ─────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = navigationRef.addListener('state', () => {
      setCurrentRoute(navigationRef.getCurrentRoute()?.name || '');
    });
    if (navigationRef.isReady()) {
      setCurrentRoute(navigationRef.getCurrentRoute()?.name || '');
    }
    return unsubscribe;
  }, []);

  // ── 恢复持久化的收起状态 ──────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const saved: DockState = JSON.parse(raw);
        isDocked.current = true;
        dockedSide.current = saved.side;
        isMinimized.current = true;
        const miniX =
          saved.side === 'left'
            ? -(BUBBLE_SIZE - MINI_PEEK)
            : screenWidth - MINI_PEEK;
        position.setValue({ x: miniX, y: saved.y });
        opacity.setValue(0.3);
        forceRender((n) => n + 1);
      } catch {}
    });
  }, []);

  // ── 清理定时器 ───────────────────────────────────────
  useEffect(() => {
    return () => {
      if (miniTimer.current) clearTimeout(miniTimer.current);
    };
  }, []);

  // ── 贴边收起 ─────────────────────────────────────────
  const dockToEdge = useCallback((side: 'left' | 'right', y: number) => {
    const { screenWidth: sw } = layoutRef.current;

    isDocked.current = true;
    dockedSide.current = side;
    isMinimized.current = false;
    if (miniTimer.current) clearTimeout(miniTimer.current);
    forceRender((n) => n + 1);

    const dockX =
      side === 'left' ? -(BUBBLE_SIZE - DOCK_PEEK) : sw - DOCK_PEEK;

    Animated.parallel([
      Animated.spring(position, {
        toValue: { x: dockX, y },
        useNativeDriver: false,
        friction: 7,
      }),
      Animated.timing(opacity, {
        toValue: 0.4,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();

    // 3 秒后进一步最小化
    miniTimer.current = setTimeout(() => {
      isMinimized.current = true;
      const miniX =
        side === 'left' ? -(BUBBLE_SIZE - MINI_PEEK) : sw - MINI_PEEK;
      Animated.parallel([
        Animated.spring(position, {
          toValue: { x: miniX, y },
          useNativeDriver: false,
          friction: 7,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start();
    }, MINI_DELAY);

    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ side, y }));
  }, []);

  // ── 恢复显示 ─────────────────────────────────────────
  const undock = useCallback(() => {
    const { screenWidth: sw, screenHeight: sh, insetsBottom } = layoutRef.current;

    isDocked.current = false;
    isMinimized.current = false;
    if (miniTimer.current) clearTimeout(miniTimer.current);
    forceRender((n) => n + 1);

    const currentY =
      (position.y as any)._value ??
      sh - BUBBLE_SIZE - insetsBottom - 80;
    const targetX =
      dockedSide.current === 'left' ? 16 : sw - BUBBLE_SIZE - 16;

    Animated.parallel([
      Animated.spring(position, {
        toValue: { x: targetX, y: currentY },
        useNativeDriver: false,
        friction: 7,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();

    AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  // 用 ref 转发给 PanResponder
  const dockRef = useRef(dockToEdge);
  dockRef.current = dockToEdge;
  const undockRef = useRef(undock);
  undockRef.current = undock;

  // ── PanResponder ─────────────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => {
        return Math.abs(gs.dx) > 5 || Math.abs(gs.dy) > 5;
      },
      onPanResponderGrant: () => {
        // 拖拽开始时如果处于收起状态，先恢复透明度
        if (isDocked.current) {
          isDocked.current = false;
          isMinimized.current = false;
          if (miniTimer.current) clearTimeout(miniTimer.current);
          opacity.setValue(1);
        }
        position.extractOffset();
      },
      onPanResponderMove: Animated.event(
        [null, { dx: position.x, dy: position.y }],
        { useNativeDriver: false },
      ),
      onPanResponderRelease: (_, gs) => {
        position.flattenOffset();
        const layout = layoutRef.current;

        const currentX = (position.x as any)._value || 0;
        let currentY = (position.y as any)._value || 0;
        const minY = layout.insetsTop + 60;
        const maxY =
          layout.screenHeight - BUBBLE_SIZE - layout.insetsBottom - 80;
        currentY = Math.max(minY, Math.min(maxY, currentY));

        // 判断是否触发贴边收起
        const isFlickLeft =
          gs.vx < -DOCK_VELOCITY && currentX < layout.screenWidth / 2;
        const isFlickRight =
          gs.vx > DOCK_VELOCITY && currentX >= layout.screenWidth / 2;
        const isPushedLeft = currentX < -10;
        const isPushedRight = currentX > layout.screenWidth - BUBBLE_SIZE + 10;

        if (isFlickLeft || isPushedLeft) {
          dockRef.current('left', currentY);
        } else if (isFlickRight || isPushedRight) {
          dockRef.current('right', currentY);
        } else {
          // 正常吸附到左/右侧
          const targetX =
            currentX < layout.screenWidth / 2
              ? 16
              : layout.screenWidth - BUBBLE_SIZE - 16;

          Animated.parallel([
            Animated.spring(position, {
              toValue: { x: targetX, y: currentY },
              useNativeDriver: false,
              friction: 7,
            }),
            Animated.timing(opacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: false,
            }),
          ]).start();

          AsyncStorage.removeItem(STORAGE_KEY);
        }
      },
    }),
  ).current;

  // ── 点击处理 ─────────────────────────────────────────
  const handlePress = useCallback(() => {
    if (isDocked.current) {
      undockRef.current();
    } else {
      navigate('AssistantChat');
    }
  }, []);

  const shouldHide = HIDDEN_ROUTES.includes(currentRoute);
  if (shouldHide) return null;

  const styles = createStyles(theme);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: position.getTranslateTransform(),
          opacity,
        },
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        style={styles.bubble}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <Icon name={IconNames.psychology} size={26} color={theme.colors.text.inverse} />

        {/* 未读角标 */}
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      zIndex: 999,
    },
    bubble: {
      width: BUBBLE_SIZE,
      height: BUBBLE_SIZE,
      borderRadius: BUBBLE_SIZE / 2,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 8,
    },
    badge: {
      position: 'absolute',
      top: -2,
      right: -2,
      minWidth: BADGE_SIZE,
      height: BADGE_SIZE,
      borderRadius: BADGE_SIZE / 2,
      backgroundColor: theme.colors.error,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 4,
    },
    badgeText: {
      fontSize: 10,
      fontWeight: 'bold',
      color: theme.colors.text.inverse,
    },
  });
