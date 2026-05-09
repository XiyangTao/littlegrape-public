/**
 * 新用户试用欢迎弹窗
 *
 * 触发时机：用户首次登录且 isTrial=true 时展示
 * 仅展示一次：AsyncStorage key `trial_welcome_shown`
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Pressable,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@react-native-vector-icons/material-icons';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import { useQuota } from '@/stores';
import { useUserStore } from '@/stores';
import { navigate } from '@/navigation/navigationRef';

const TRIAL_DAYS = 3;

const FEATURES = [
  { icon: 'auto-awesome',  labelKey: 'trialWelcome.feature1' },
  { icon: 'movie',         labelKey: 'trialWelcome.feature2' },
  { icon: 'menu-book',     labelKey: 'trialWelcome.feature3' },
  { icon: 'translate',     labelKey: 'trialWelcome.feature4' },
  { icon: 'mic',           labelKey: 'trialWelcome.feature5' },
  { icon: 'school',        labelKey: 'trialWelcome.feature6' },
];

export function TrialWelcomeModal() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const { quota } = useQuota();
  const styles = createStyles(theme);

  const userId = useUserStore((s) => s.userId);
  const [visible, setVisible] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!quota?.isTrial || !userId) return;
    const key = `trial_welcome_shown_${userId}`;
    AsyncStorage.getItem(key).then((val) => {
      if (!val) setVisible(true);
    });
  }, [quota?.isTrial, userId]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 70,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const dismiss = () => {
    if (userId) AsyncStorage.setItem(`trial_welcome_shown_${userId}`, '1');
    setVisible(false);
  };

  const handleUpgrade = () => {
    dismiss();
    navigate('PlanSelect');
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={dismiss}>
      <Pressable style={styles.backdrop} onPress={dismiss}>
        <Animated.View
          style={[
            styles.card,
            { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
          ]}
        >
          <Pressable onPress={() => {}}>
            {/* 顶部标题 */}
            <View style={styles.header}>
              <Text style={styles.title}>{t('trialWelcome.title')}</Text>
              <Text style={styles.subtitle}>{t('trialWelcome.subtitle')}</Text>
            </View>

            {/* 两个礼包 */}
            <View style={styles.packagesRow}>
              <View style={[styles.packageCard, styles.packageCardLeft]}>
                <View style={[styles.packageIconWrap, styles.packageIconWrapLeft]}>
                  <Text style={styles.packageEmoji}>⚡</Text>
                </View>
                <Text style={[styles.packageTitle, styles.packageTitleLeft]}>{t('trialWelcome.pkg1Title')}</Text>
                <Text style={styles.packageDesc}>{t('trialWelcome.pkg1Desc')}</Text>
              </View>
              <View style={[styles.packageCard, styles.packageCardRight]}>
                <View style={[styles.packageIconWrap, styles.packageIconWrapRight]}>
                  <Text style={styles.packageEmoji}>🌟</Text>
                </View>
                <Text style={[styles.packageTitle, styles.packageTitleRight]}>{t('trialWelcome.pkg2Title')}</Text>
                <Text style={styles.packageDesc}>{t('trialWelcome.pkg2Desc')}</Text>
              </View>
            </View>

            {/* 功能列表 */}
            <View style={styles.featureSection}>
              <Text style={styles.featureSectionTitle}>{t('trialWelcome.featuresTitle')}</Text>
              <View style={styles.featureGrid}>
                {FEATURES.map((f) => (
                  <View key={f.labelKey} style={styles.featureItem}>
                    <View style={styles.featureIconWrap}>
                      <MaterialIcons name={f.icon as any} size={16} color={theme.colors.primary} />
                    </View>
                    <Text style={styles.featureLabel}>{t(f.labelKey)}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* 按钮区 */}
            <TouchableOpacity style={styles.primaryBtn} onPress={dismiss} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>{t('trialWelcome.startBtn', { days: TRIAL_DAYS })}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryBtn} onPress={handleUpgrade} activeOpacity={0.7}>
              <Text style={styles.secondaryBtnText}>{t('trialWelcome.upgradeBtn')}</Text>
              <MaterialIcons name="chevron-right" size={16} color={theme.colors.primary} />
            </TouchableOpacity>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const AMBER = '#FF9F0A';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
    },
    card: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.spacing.borderRadius.xl,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.xl,
      paddingBottom: theme.spacing.md,
      width: '100%',
      maxWidth: 360,
      ...theme.spacing.shadows.sm,
    },
    closeBtn: {
      position: 'absolute',
      top: -theme.spacing.md,
      right: 0,
      padding: theme.spacing.xs,
    },

    // —— 顶部 ——
    header: {
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    giftBadge: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: theme.colors.primary + '18',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.primary + '25',
    },
    giftEmoji: {
      fontSize: 28,
    },
    title: {
      fontSize: theme.typography.fontSize['2xl'],
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
      textAlign: 'center',
      marginBottom: theme.spacing.xs,
    },
    subtitle: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
      textAlign: 'center',
      lineHeight: 20,
    },

    // —— 两个礼包卡片 ——
    packagesRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    packageCard: {
      flex: 1,
      borderRadius: theme.spacing.borderRadius.md,
      padding: theme.spacing.md,
      alignItems: 'center',
      borderWidth: 1,
    },
    packageCardLeft: {
      backgroundColor: theme.colors.primary + '0C',
      borderColor: theme.colors.primary + '35',
    },
    packageCardRight: {
      backgroundColor: AMBER + '0C',
      borderColor: AMBER + '35',
    },
    packageIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.xs,
    },
    packageIconWrapLeft: {
      backgroundColor: theme.colors.primary + '18',
    },
    packageIconWrapRight: {
      backgroundColor: AMBER + '18',
    },
    packageEmoji: {
      fontSize: 20,
    },
    packageTitle: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
      textAlign: 'center',
      marginBottom: 3,
    },
    packageTitleLeft: {
      color: theme.colors.primary,
    },
    packageTitleRight: {
      color: AMBER,
    },
    packageDesc: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.secondary,
      textAlign: 'center',
      lineHeight: 16,
    },

    // —— 功能列表 ——
    featureSection: {
      marginBottom: theme.spacing.md,
    },
    featureSectionTitle: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.tertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: theme.spacing.sm,
    },
    featureGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    featureItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      width: '45%',
    },
    featureIconWrap: {
      width: 26,
      height: 26,
      borderRadius: 7,
      backgroundColor: theme.colors.primary + '12',
      alignItems: 'center',
      justifyContent: 'center',
    },
    featureLabel: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.secondary,
      flex: 1,
    },

    // —— 按钮 ——
    primaryBtn: {
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.spacing.borderRadius.md,
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    primaryBtnText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
      color: '#FFFFFF',
    },
    secondaryBtn: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
      gap: 2,
    },
    secondaryBtnText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.primary,
    },
  });
