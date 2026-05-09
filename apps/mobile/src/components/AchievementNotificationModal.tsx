import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
} from 'react-native';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import { useAchievementStore } from '@/stores';
import { navigationRef } from '@/navigation/navigationRef';
import Icon from '@/components/Icon';
import { ConfettiEffect } from '@/components/ConfettiEffect';
import { triggerHaptic, getRarityColors } from '@/utils/achievementEffects';

const LEGENDARY_COLOR = '#F59E0B';

// ==================== 外层：控制挂载 + 导航监听 ====================

export function AchievementNotificationModal() {
  const showModal = useAchievementStore((s) => s.showModal);
  const currentAchievement = useAchievementStore((s) => s.currentAchievement);

  React.useEffect(() => {
    const unsubscribe = navigationRef.addListener('state', () => {
      if (!navigationRef.isReady()) return;
      if (navigationRef.getCurrentRoute()?.name === 'Home') {
        useAchievementStore.getState().onNavigateToHome();
      }
    });
    return () => unsubscribe();
  }, []);

  if (!showModal || !currentAchievement) return null;

  return <AchievementModalContent achievement={currentAchievement} />;
}

// ==================== 内层：动画 + 渲染 ====================

interface ContentProps {
  achievement: NonNullable<ReturnType<typeof useAchievementStore.getState>['currentAchievement']>;
}

function AchievementModalContent({ achievement }: ContentProps) {
  const { theme } = useTheme();
  const { t, effectiveLanguage: locale } = useI18n();
  const styles = createStyles(theme);
  const lang = locale === 'zh-CN' ? 'zh-CN' : 'en';
  const dismiss = useAchievementStore((s) => s.dismiss);

  const scaleValue = React.useRef(new Animated.Value(0)).current;
  const fadeValue = React.useRef(new Animated.Value(0)).current;
  const glowValue = React.useRef(new Animated.Value(0)).current;
  const [showConfetti, setShowConfetti] = React.useState(false);

  const rarity = achievement.rarity as 'common' | 'rare' | 'epic' | 'legendary' | undefined;
  const rarityColors = getRarityColors(rarity);
  const isLegendary = rarity === 'legendary';

  React.useEffect(() => {
    triggerHaptic(rarity);

    if (rarity && rarity !== 'common') {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }

    Animated.parallel([
      Animated.spring(scaleValue, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 5,
      }),
      Animated.timing(fadeValue, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    if (isLegendary) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowValue, { toValue: 1, duration: 1200, useNativeDriver: true }),
          Animated.timing(glowValue, { toValue: 0, duration: 1200, useNativeDriver: true }),
        ])
      ).start();
    }

    return () => {
      scaleValue.stopAnimation();
      fadeValue.stopAnimation();
      glowValue.stopAnimation();
    };
  }, []);

  const title = achievement.name[lang] || achievement.name['zh-CN'];
  const desc = achievement.description[lang] || achievement.description['zh-CN'];

  const isTierUp = achievement.seriesCode && (achievement.tier ?? 1) > 1;
  const isHiddenAchievement = achievement.isHidden;

  let unlockLabel: string;
  if (isHiddenAchievement) {
    unlockLabel = t('achievement.hiddenFound');
  } else if (isTierUp) {
    unlockLabel = t('achievement.tierUp');
  } else {
    unlockLabel = t('achievement.unlocked');
  }

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(scaleValue, {
        toValue: 0.8,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeValue, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      dismiss();
    });
  };

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.overlay, { opacity: fadeValue }]}>
        <ConfettiEffect
          visible={showConfetti}
          colors={rarityColors.particles}
          particleCount={isLegendary ? 40 : rarity === 'epic' ? 25 : 15}
          duration={isLegendary ? 2500 : 2000}
        />

        <Animated.View
          style={[
            styles.container,
            isLegendary && styles.legendaryBorder,
            {
              transform: [{ scale: scaleValue }],
              opacity: fadeValue,
            },
          ]}
        >
          {isLegendary && (
            <Animated.View
              pointerEvents="none"
              style={[styles.legendaryGlow, { opacity: glowValue }]}
            />
          )}

          {/* 图标 */}
          <View style={[styles.iconCircle, { backgroundColor: theme.colors.primary + '12' }]}>
            <Icon name={achievement.icon} size={28} color={theme.colors.primary} />
          </View>

          {/* 解锁标签 */}
          <Text style={[styles.unlockLabel, { color: theme.colors.primary }]}>
            {unlockLabel}
          </Text>

          {/* 成就名称 */}
          <Text style={styles.title}>{title}</Text>

          {/* 描述 */}
          <Text style={styles.description}>{desc}</Text>

          {/* XP 奖励 */}
          {achievement.xpReward > 0 && (
            <Text style={[styles.xpText, { color: theme.colors.primary }]}>
              +{achievement.xpReward} XP
            </Text>
          )}

          {/* 按钮 */}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.colors.primary }]}
            onPress={handleDismiss}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>{t('achievement.continue')}</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.spacing.borderRadius.xl,
    width: theme.screen.width - 96,
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 24,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  legendaryBorder: {
    borderWidth: 1.5,
    borderColor: LEGENDARY_COLOR + '60',
  },
  legendaryGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: theme.spacing.borderRadius.xl,
    backgroundColor: LEGENDARY_COLOR + '08',
  },

  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },

  unlockLabel: {
    fontSize: theme.typography.fontSize.xxs,
    fontWeight: theme.typography.fontWeight.semibold,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  title: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: 6,
  },
  description: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  xpText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    marginBottom: 18,
  },

  button: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: theme.spacing.borderRadius.full,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.inverse,
  },
});
