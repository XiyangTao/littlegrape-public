import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
} from 'react-native';
import { navigate } from '@/navigation/navigationRef';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import { useQuotaStore } from '@/stores';
import Icon from '@/components/Icon';

export function QuotaExceededModal() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme);

  const showExceededModal = useQuotaStore((s) => s.showExceededModal);
  const quota = useQuotaStore((s) => s.quota);
  const dismissExceededModal = useQuotaStore((s) => s.dismissExceededModal);

  const scaleValue = React.useRef(new Animated.Value(0)).current;
  const fadeValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (showExceededModal) {
      Animated.parallel([
        Animated.spring(scaleValue, {
          toValue: 1,
          useNativeDriver: true,
          tension: 150,
          friction: 6,
        }),
        Animated.timing(fadeValue, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleValue.setValue(0);
      fadeValue.setValue(0);
    }
  }, [showExceededModal]);

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
      dismissExceededModal();
    });
  };

  const handleUpgrade = () => {
    handleDismiss();
    setTimeout(() => {
      navigate('PlanSelect');
    }, 200);
  };

  const usagePercentage = quota ? Math.min(quota.usagePercentage, 100) : 100;

  return (
    <Modal visible={showExceededModal} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.overlay, { opacity: fadeValue }]}>
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ scale: scaleValue }],
              opacity: fadeValue,
            },
          ]}
        >
          {/* 错误图标 */}
          <View style={styles.iconContainer}>
            <Icon name="error" size={40} color={theme.colors.error} />
          </View>

          {/* 标题 */}
          <Text style={styles.title}>{t('quota.modalTitle')}</Text>

          {/* 描述 */}
          <Text style={styles.description}>{t('quota.modalDescription')}</Text>

          {/* 按钮 */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={handleDismiss}
              activeOpacity={0.8}
            >
              <Text style={styles.dismissButtonText}>{t('quota.understood')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={handleUpgrade}
              activeOpacity={0.8}
            >
              <Text style={styles.upgradeButtonText}>{t('quota.upgradePlan')}</Text>
            </TouchableOpacity>
          </View>
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
    paddingHorizontal: 32,
  },
  container: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.spacing.borderRadius.md,
    paddingHorizontal: 24,
    paddingVertical: 24,
    width: theme.screen.width - 64,
    alignItems: 'center',
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  iconContainer: {
    marginBottom: 12,
  },
  title: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  progressSection: {
    width: '100%',
    marginBottom: 20,
  },
  progressBar: {
    height: 6,
    backgroundColor: theme.colors.background.tertiary,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  usageText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  dismissButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: theme.spacing.borderRadius.sm,
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  dismissButtonText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.secondary,
  },
  upgradeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: theme.spacing.borderRadius.sm,
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
  },
  upgradeButtonText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.inverse,
  },
});
