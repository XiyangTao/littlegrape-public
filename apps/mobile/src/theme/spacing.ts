export const spacing = {
  // 基础间距单位：4px
  unit: 4,

  // 间距值
  spacing: {
    0: 0,
    1: 4,    // 4px
    2: 8,    // 8px
    3: 12,   // 12px
    4: 16,   // 16px
    5: 20,   // 20px
    6: 24,   // 24px
    8: 32,   // 32px
    10: 40,  // 40px
    12: 48,  // 48px
    16: 64,  // 64px
    20: 80,  // 80px
    24: 96,  // 96px
    32: 128, // 128px
  },

  // 常用快捷属性
  xxs: 2,    // 2px
  xs: 4,    // 4px
  sm: 8,    // 8px
  md: 16,   // 16px
  lg: 24,   // 24px
  xl: 32,   // 32px
  '2xl': 48,  // 48px



  // 圆角 — 更圆润柔和
  borderRadius: {
    none: 0,
    sm: 8,
    base: 12,
    md: 16,
    lg: 20,
    xl: 24,
    '2xl': 32,
    full: 9999,
  },

  // 边框宽度
  borderWidth: {
    0: 0,
    1: 1,
    2: 2,
    4: 4,
  },

  // 阴影 — 极轻柔和，营造浮起感
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 3,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 20,
      elevation: 5,
    },
  },
} as const;

export type Spacing = typeof spacing;

import { scale, scaleObject } from '@/utils/responsive';

export function createScaledSpacing(screenWidth: number): Spacing {
  return {
    unit: scale(spacing.unit, screenWidth),
    spacing: scaleObject(spacing.spacing, screenWidth),
    xxs: scale(spacing.xxs, screenWidth),
    xs: scale(spacing.xs, screenWidth),
    sm: scale(spacing.sm, screenWidth),
    md: scale(spacing.md, screenWidth),
    lg: scale(spacing.lg, screenWidth),
    xl: scale(spacing.xl, screenWidth),
    '2xl': scale(spacing['2xl'], screenWidth),
    borderRadius: {
      ...scaleObject({
        none: spacing.borderRadius.none,
        sm: spacing.borderRadius.sm,
        base: spacing.borderRadius.base,
        md: spacing.borderRadius.md,
        lg: spacing.borderRadius.lg,
        xl: spacing.borderRadius.xl,
        '2xl': spacing.borderRadius['2xl'],
      }, screenWidth),
      full: spacing.borderRadius.full, // full (9999) 不缩放
    },
    borderWidth: spacing.borderWidth,
    shadows: spacing.shadows,
  } as unknown as Spacing;
}