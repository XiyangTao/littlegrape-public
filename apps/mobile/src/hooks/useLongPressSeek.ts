import { useCallback, useEffect, useRef } from 'react';

/**
 * 长按加速 seek：短按跳 5s，长按持续加速（5→10→15s）
 *
 * 返回 { onPressIn, onPressOut } 直接挂到 TouchableOpacity 上。
 */
export function useLongPressSeek(onSeek: (seconds: number) => void) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countRef = useRef(0);
  const pressedRef = useRef(false);

  const start = useCallback(() => {
    pressedRef.current = true;
    countRef.current = 0;
    timerRef.current = setInterval(() => {
      countRef.current += 1;
      const step = countRef.current <= 3 ? 5 : countRef.current <= 6 ? 10 : 15;
      onSeek(step);
    }, 200);
  }, [onSeek]);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (pressedRef.current && countRef.current === 0) {
      onSeek(5);
    }
    pressedRef.current = false;
  }, [onSeek]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  return { onPressIn: start, onPressOut: stop };
}
