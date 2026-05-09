import { Dimensions } from 'react-native';

export const BASE_WIDTH = 375;

// 通用尺寸缩放（spacing、宽高、圆角等），factor=0.5
export function scale(size: number, screenWidth: number, factor = 0.5): number {
  return size + (screenWidth / BASE_WIDTH - 1) * size * factor;
}

// 字体缩放（更保守），factor=0.3
export function fontScale(size: number, screenWidth: number, factor = 0.3): number {
  return size + (screenWidth / BASE_WIDTH - 1) * size * factor;
}

// 批量缩放对象中的数值
export function scaleObject<T extends Record<string, number>>(
  obj: T, screenWidth: number, factor?: number
): T {
  const result = {} as any;
  for (const key in obj) {
    result[key] = scale(obj[key], screenWidth, factor);
  }
  return result;
}

// 获取初始屏幕宽度（仅用于 ThemeProvider 初始值）
export function getScreenWidth(): number {
  return Dimensions.get('window').width;
}
