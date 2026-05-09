import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';

/** 徽章等级：未来可按套餐区分样式 */
export type BadgeLevel = 'basic' | 'pro' | 'max';

interface PremiumBadgeProps {
  /** 徽章等级，默认 'basic'（当前统一显示"会员"） */
  level?: BadgeLevel;
  /** 尺寸：xs=内联小标签, sm=标准, md=醒目卡片角标 */
  size?: 'xs' | 'sm' | 'md';
}

// 等级对应的颜色和 i18n key
const LEVEL_CONFIG: Record<BadgeLevel, { colorKey: 'primary' | 'warning' | 'error'; labelKey: string }> = {
  basic: { colorKey: 'primary', labelKey: 'premium.badge.basic' },
  pro:   { colorKey: 'warning', labelKey: 'premium.badge.pro' },
  max:   { colorKey: 'error',   labelKey: 'premium.badge.max' },
};

const SIZE_CONFIG = {
  xs:  { px: 4, py: 1, radius: 4, fontSize: 9,  lineHeight: 13, fontWeight: '600' as const },
  sm:  { px: 6, py: 2, radius: 6, fontSize: 10, lineHeight: 14, fontWeight: '600' as const },
  md:  { px: 8, py: 3, radius: 8, fontSize: 11, lineHeight: 16, fontWeight: '700' as const },
};

export function PremiumBadge({ level = 'basic', size = 'sm' }: PremiumBadgeProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const config = LEVEL_CONFIG[level];
  const s = SIZE_CONFIG[size];
  const bgColor = theme.colors[config.colorKey];

  return (
    <View style={[
      styles.badge,
      {
        backgroundColor: bgColor,
        paddingHorizontal: s.px,
        paddingVertical: s.py,
        borderRadius: s.radius,
      },
    ]}>
      <Text style={{
        color: '#FFFFFF',
        fontSize: s.fontSize,
        lineHeight: s.lineHeight,
        fontWeight: s.fontWeight,
      }}>
        {t(config.labelKey)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
  },
});
