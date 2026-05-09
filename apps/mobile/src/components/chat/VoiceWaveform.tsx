/**
 * 语音波形动画组件
 */
import React, { useRef, useEffect } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeProvider';

interface VoiceWaveformProps {
  /** 是否正在播放 */
  isPlaying: boolean;
  /** 波形条颜色 */
  color?: string;
}

const BAR_HEIGHTS = [10, 14, 8, 16, 12];

export const VoiceWaveform: React.FC<VoiceWaveformProps> = React.memo(
  ({ isPlaying, color }) => {
    const { theme } = useTheme();
    const barColor = color || theme.colors.text.inverse;
    const animValues = useRef(BAR_HEIGHTS.map(() => new Animated.Value(1))).current;
    const animationRef = useRef<Animated.CompositeAnimation | null>(null);

    useEffect(() => {
      if (isPlaying) {
        const animations = animValues.map((anim, index) => {
          return Animated.loop(
            Animated.sequence([
              Animated.timing(anim, {
                toValue: 0.5 + Math.random() * 0.5,
                duration: 150 + index * 50,
                useNativeDriver: true,
              }),
              Animated.timing(anim, {
                toValue: 1 + Math.random() * 0.5,
                duration: 150 + index * 50,
                useNativeDriver: true,
              }),
            ])
          );
        });
        animationRef.current = Animated.parallel(animations);
        animationRef.current.start();
      } else {
        animationRef.current?.stop();
        animValues.forEach((anim) => anim.setValue(1));
      }

      return () => {
        animationRef.current?.stop();
      };
    }, [isPlaying, animValues]);

    return (
      <View style={styles.container}>
        {BAR_HEIGHTS.map((h, i) => (
          <Animated.View
            key={i}
            style={[
              styles.bar,
              {
                height: h,
                backgroundColor: barColor,
                transform: [{ scaleY: animValues[i] }],
              },
            ]}
          />
        ))}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flex: 1,
  },
  bar: {
    width: 3,
    borderRadius: 1.5,
    opacity: 0.8,
  },
});

export default VoiceWaveform;
