import { Platform } from 'react-native';

export const typography = {
  // 字体系列
  fontFamily: {
    regular: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'System',
    }),
    medium: Platform.select({
      ios: 'System',
      android: 'Roboto-Medium',
      default: 'System',
    }),
    bold: Platform.select({
      ios: 'System',
      android: 'Roboto-Bold',
      default: 'System',
    }),
    mono: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'monospace',
    }),
  },

  // 字体大小
  fontSize: {
    xxs: 10,
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },

  // 行高
  lineHeight: {
    tight: 1.2,
    snug: 1.3,
    normal: 1.5,
    relaxed: 1.6,
    loose: 2.0,
  },

  // 字重
  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },

  // 预定义文本样式
  textStyles: {
    h1: {
      fontSize: 30,
      lineHeight: 36,
      fontWeight: '700' as const,
    },
    h2: {
      fontSize: 24,
      lineHeight: 32,
      fontWeight: '600' as const,
    },
    h3: {
      fontSize: 20,
      lineHeight: 28,
      fontWeight: '600' as const,
    },
    h4: {
      fontSize: 18,
      lineHeight: 24,
      fontWeight: '500' as const,
    },
    body: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '400' as const,
    },
    bodyMedium: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '500' as const,
    },
    caption: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '400' as const,
    },
    small: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '400' as const,
    },
    sectionTitle: {
      fontSize: 18,
      lineHeight: 24,
      fontWeight: '700' as const,
    },
  },
} as const;

export type Typography = typeof typography;

import { fontScale } from '@/utils/responsive';

export function createScaledTypography(screenWidth: number): Typography {
  const scaledFontSize = {
    xxs: fontScale(typography.fontSize.xxs, screenWidth),
    xs: fontScale(typography.fontSize.xs, screenWidth),
    sm: fontScale(typography.fontSize.sm, screenWidth),
    base: fontScale(typography.fontSize.base, screenWidth),
    lg: fontScale(typography.fontSize.lg, screenWidth),
    xl: fontScale(typography.fontSize.xl, screenWidth),
    '2xl': fontScale(typography.fontSize['2xl'], screenWidth),
    '3xl': fontScale(typography.fontSize['3xl'], screenWidth),
    '4xl': fontScale(typography.fontSize['4xl'], screenWidth),
    '5xl': fontScale(typography.fontSize['5xl'], screenWidth),
  };
  const scaledTextStyles = {
    h1: {
      fontSize: fontScale(30, screenWidth),
      lineHeight: fontScale(36, screenWidth),
      fontWeight: '700' as const,
    },
    h2: {
      fontSize: fontScale(24, screenWidth),
      lineHeight: fontScale(32, screenWidth),
      fontWeight: '600' as const,
    },
    h3: {
      fontSize: fontScale(20, screenWidth),
      lineHeight: fontScale(28, screenWidth),
      fontWeight: '600' as const,
    },
    h4: {
      fontSize: fontScale(18, screenWidth),
      lineHeight: fontScale(24, screenWidth),
      fontWeight: '500' as const,
    },
    body: {
      fontSize: fontScale(16, screenWidth),
      lineHeight: fontScale(24, screenWidth),
      fontWeight: '400' as const,
    },
    bodyMedium: {
      fontSize: fontScale(16, screenWidth),
      lineHeight: fontScale(24, screenWidth),
      fontWeight: '500' as const,
    },
    caption: {
      fontSize: fontScale(14, screenWidth),
      lineHeight: fontScale(20, screenWidth),
      fontWeight: '400' as const,
    },
    small: {
      fontSize: fontScale(12, screenWidth),
      lineHeight: fontScale(16, screenWidth),
      fontWeight: '400' as const,
    },
    sectionTitle: {
      fontSize: fontScale(18, screenWidth),
      lineHeight: fontScale(24, screenWidth),
      fontWeight: '700' as const,
    },
  };
  return {
    ...typography,
    fontSize: scaledFontSize,
    textStyles: scaledTextStyles,
  } as unknown as Typography;
}