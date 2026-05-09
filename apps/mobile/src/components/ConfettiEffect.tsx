/**
 * 轻量 Confetti 特效组件
 * 使用 React Native Animated API 实现
 * 根据成就 rarity 显示不同颜色和数量的粒子
 */
import React, { useEffect, useRef, useMemo } from 'react';
import { View, Animated, StyleSheet, useWindowDimensions } from 'react-native';

interface ConfettiProps {
  visible: boolean;
  colors: string[];
  particleCount?: number;
  duration?: number;
}

interface Particle {
  x: Animated.Value;
  y: Animated.Value;
  rotation: Animated.Value;
  opacity: Animated.Value;
  color: string;
  size: number;
  startX: number;
}

export function ConfettiEffect({
  visible,
  colors,
  particleCount = 20,
  duration = 2000,
}: ConfettiProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const particles = useRef<Particle[]>([]);
  const animating = useRef(false);

  // 初始化粒子数据
  const particleData = useMemo(() => {
    if (colors.length === 0) return [];
    return Array.from({ length: particleCount }, (_, i) => ({
      color: colors[i % colors.length],
      size: 6 + Math.random() * 6,
      startX: Math.random() * screenWidth,
      startY: -(20 + Math.random() * 40),
      endX: (Math.random() - 0.5) * 100,
      endY: screenHeight + 50,
      rotationEnd: 360 + Math.random() * 720,
    }));
  }, [colors, particleCount, screenWidth, screenHeight]);

  // 创建动画值
  useEffect(() => {
    particles.current = particleData.map((p) => ({
      x: new Animated.Value(p.startX),
      y: new Animated.Value(p.startY),
      rotation: new Animated.Value(0),
      opacity: new Animated.Value(0),
      color: p.color,
      size: p.size,
      startX: p.startX,
    }));
  }, [particleData]);

  useEffect(() => {
    if (!visible || colors.length === 0 || animating.current) return;
    animating.current = true;

    // 重置所有粒子
    particles.current.forEach((p, i) => {
      const data = particleData[i];
      if (!data) return;
      p.x.setValue(data.startX);
      p.y.setValue(data.startY);
      p.rotation.setValue(0);
      p.opacity.setValue(1);
    });

    // 启动动画
    const animations = particles.current.map((p, i) => {
      const data = particleData[i];
      if (!data) return Animated.delay(0);
      const delay = Math.random() * 300;

      return Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(p.y, {
            toValue: data.endY,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(p.x, {
            toValue: data.startX + data.endX,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(p.rotation, {
            toValue: data.rotationEnd,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(p.opacity, {
            toValue: 0,
            duration,
            delay: duration * 0.5,
            useNativeDriver: true,
          }),
        ]),
      ]);
    });

    Animated.parallel(animations).start(() => {
      animating.current = false;
    });
  }, [visible, colors, particleData, duration]);

  if (!visible || colors.length === 0) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.current.map((p, i) => {
        const rotate = p.rotation.interpolate({
          inputRange: [0, 360],
          outputRange: ['0deg', '360deg'],
        });

        return (
          <Animated.View
            key={i}
            style={[
              styles.particle,
              {
                width: p.size,
                height: p.size * 0.6,
                backgroundColor: p.color,
                borderRadius: p.size * 0.15,
                transform: [
                  { translateX: p.x },
                  { translateY: p.y },
                  { rotate },
                ],
                opacity: p.opacity,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
  },
});
