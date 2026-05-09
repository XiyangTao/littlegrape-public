import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import { useQuota } from '@/stores';

export function QuotaCard() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { theme } = useTheme();
  const { t } = useI18n();
  const { quota } = useQuota();
  const styles = createStyles(theme);

  if (!quota) return null;

  const isWarning = quota.quotaStatus === 'warning';
  const isExceeded = quota.quotaStatus === 'exceeded';
  const isFree = quota.planType === 'free';
  const isTrial = quota.isTrial;

  // 到期剩余天数由后端统一计算
  const daysLeft = quota.daysLeft;
  const isExpiringSoon = daysLeft !== null && daysLeft <= 3 && daysLeft > 0;

  const progressColor = isExceeded
    ? theme.colors.error
    : isWarning || isExpiringSoon
    ? theme.colors.warning
    : theme.colors.primary;

  const handlePress = () => {
    navigation.navigate('PlanSelect');
  };

  // 格式化日期
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress} activeOpacity={0.7}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('quota.title')}</Text>
        <View style={[
          styles.planBadge,
          isExceeded && styles.planBadgeExceeded,
        ]}>
          <Text style={[
            styles.planText,
            isExceeded && styles.planTextExceeded,
          ]}>
            {isTrial ? t('quota.trial') : quota.planName}
          </Text>
        </View>
      </View>

      {/* 免费用户：不显示进度条，只显示升级引导 */}
      {isFree && !isTrial && (
        <View style={styles.upgradeRow}>
          <Text style={styles.upgradeHint}>{t('quota.freeHint')}</Text>
          <Text style={styles.upgradeLink}>{t('quota.upgradePlan')}</Text>
        </View>
      )}

      {/* 非免费用户：显示进度条和各种状态 */}
      {!isFree && (
        <>
          {/* 进度条 */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(quota.usagePercentage, 100)}%`,
                    backgroundColor: progressColor,
                  },
                ]}
              />
            </View>
            <Text style={[styles.percentText, { color: progressColor }]}>
              {Math.min(quota.usagePercentage, 100)}%
            </Text>
          </View>

          {/* 有效期（体验期由下方单独展示） */}
          {quota.periodStart && quota.periodEnd && !isExceeded && !isTrial && (
            <Text style={[styles.expiryText, isExpiringSoon && styles.expiryTextWarning]}>
              {isExpiringSoon
                ? t('quota.expiringSoon', { days: daysLeft })
                : t('quota.periodRange', { start: formatDate(quota.periodStart), end: formatDate(quota.periodEnd) })
              }
            </Text>
          )}

          {/* 已续费提示 */}
          {quota.nextPlanType && quota.periodEnd && (
            <Text style={styles.renewedHint}>
              {t('quota.renewedHint', { date: formatDate(quota.periodEnd) })}
            </Text>
          )}

          {/* 体验期提示 */}
          {isTrial && (
            <View style={styles.upgradeRow}>
              <Text style={styles.trialHint}>
                {t('quota.trialQuotaHint', { budget: 1, days: daysLeft })}
              </Text>
              <Text style={styles.upgradeLink}>{t('quota.upgradePlan')}</Text>
            </View>
          )}

          {/* 用量警告 */}
          {isWarning && !isExpiringSoon && (
            <Text style={styles.warningText}>
              {t('quota.warningMessage', { percentage: Math.min(quota.usagePercentage, 100) })}
            </Text>
          )}

          {/* 用量超限（体验期内由体验提示行承担 CTA，超限信息由 100% 进度条表达） */}
          {isExceeded && !isTrial && (
            <View style={styles.upgradeRow}>
              <Text style={styles.exceededText}>{t('quota.exceededMessage')}</Text>
              <Text style={styles.upgradeLink}>{t('quota.upgradePlan')}</Text>
            </View>
          )}


        </>
      )}
    </TouchableOpacity>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.spacing.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.spacing.shadows.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  title: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  planBadge: {
    backgroundColor: theme.colors.primary + '20',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xxs,
    borderRadius: theme.spacing.borderRadius.sm,
  },
  planBadgeExceeded: {
    backgroundColor: theme.colors.error + '20',
  },
  planText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.primary,
  },
  planTextExceeded: {
    color: theme.colors.error,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: theme.colors.border.light,
    borderRadius: theme.spacing.borderRadius.full,
    marginRight: theme.spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: theme.spacing.borderRadius.full,
  },
  percentText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    minWidth: 40,
    textAlign: 'right',
  },
  expiryText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
    marginTop: theme.spacing.xs,
  },
  expiryTextWarning: {
    color: theme.colors.warning,
  },
  renewedHint: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.success,
    marginTop: theme.spacing.xxs,
  },
  upgradeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
  },
  upgradeHint: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
  },
  trialHint: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.primary,
  },
  upgradeLink: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
  },
  warningText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.warning,
    marginTop: theme.spacing.xs,
  },
  exceededText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.error,
  },
});
