/**
 * 成就解锁特效工具
 * - 触觉反馈（expo-haptics）
 * - 根据 rarity 选择不同强度的反馈
 */
import * as Haptics from 'expo-haptics';
import { RARITY_COLORS, RARITY_PARTICLE_COLORS } from '@/constants/colors';

type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

/**
 * 根据成就稀有度触发触觉反馈
 */
export function triggerHaptic(rarity?: Rarity): void {
  try {
    switch (rarity) {
      case 'legendary':
        // 重度反馈 + 延迟二次反馈
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        setTimeout(() => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }, 200);
        break;
      case 'epic':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case 'rare':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      default:
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
    }
  } catch {
    // 触觉反馈不可用时忽略
  }
}

/**
 * 获取稀有度对应的颜色配置
 */
export function getRarityColors(rarity?: Rarity): {
  accent: string;
  glow: string;
  particles: string[];
} {
  switch (rarity) {
    case 'legendary':
      return {
        accent: RARITY_COLORS.legendary,
        glow: 'rgba(245, 158, 11, 0.3)',
        particles: RARITY_PARTICLE_COLORS.legendary,
      };
    case 'epic':
      return {
        accent: RARITY_COLORS.epic,
        glow: 'rgba(139, 92, 246, 0.25)',
        particles: RARITY_PARTICLE_COLORS.epic,
      };
    case 'rare':
      return {
        accent: RARITY_COLORS.rare,
        glow: 'rgba(59, 130, 246, 0.2)',
        particles: RARITY_PARTICLE_COLORS.rare,
      };
    default:
      return {
        accent: RARITY_COLORS.common,
        glow: 'rgba(16, 185, 129, 0.15)',
        particles: [],
      };
  }
}
