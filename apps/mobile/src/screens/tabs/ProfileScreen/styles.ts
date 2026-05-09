import { StyleSheet } from 'react-native';
import { Theme } from '@/context/ThemeProvider';

export const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  userSection: {
    backgroundColor: theme.colors.background.primary,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: theme.spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  userName: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.spacing.borderRadius.full,
    paddingVertical: 3,
    paddingHorizontal: theme.spacing.sm,
  },
  planBadgePro: {
    backgroundColor: '#AF52DE',
  },
  planBadgeMax: {
    backgroundColor: '#AF52DE',
  },
  planBadgeText: {
    fontSize: theme.typography.fontSize.xxs,
    fontWeight: theme.typography.fontWeight.bold,
    color: '#FFFFFF',
  },
  userBio: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
    lineHeight: 18,
  },
  userEmail: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  // 社交数据行
  socialStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    marginHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.card,
    borderRadius: theme.spacing.borderRadius.md,
    marginBottom: theme.spacing.md,
    ...theme.spacing.shadows.sm,
  },
  socialStatItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  socialStatValue: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  socialStatLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xxs,
  },
  socialStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: theme.colors.border.light,
  },
  // 学习概览
  overviewSection: {
    backgroundColor: theme.colors.background.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  overviewStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderRadius: theme.spacing.borderRadius.md,
    paddingVertical: theme.spacing.md,
    ...theme.spacing.shadows.sm,
  },
  overviewStatItem: {
    alignItems: 'center',
  },
  overviewStatValue: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
  },
  overviewStatLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xxs,
  },
  overviewStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: theme.colors.border.light,
  },
  // 学习提醒
  reminderSection: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.card,
    borderRadius: theme.spacing.borderRadius.md,
    padding: theme.spacing.lg,
    ...theme.spacing.shadows.sm,
  },
  reminderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  reminderTextWrap: {
    marginLeft: theme.spacing.xs,
  },
  reminderTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  reminderDesc: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.secondary,
  },
  // 配额
  quotaSection: {
    paddingHorizontal: theme.spacing.lg,
  },
  // 分组设置
  settingsGroup: {
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  groupTitle: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.sm,
  },
  settingItem: {
    backgroundColor: theme.colors.card,
    padding: theme.spacing.lg,
    borderRadius: theme.spacing.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
    ...theme.spacing.shadows.sm,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: theme.spacing.borderRadius.sm,
    backgroundColor: theme.colors.primary + '12',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  settingRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    paddingLeft: theme.spacing.sm,
  },
  settingSubtitle: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.secondary,
  },
  logoutSection: {
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  logoutButton: {
    backgroundColor: 'transparent',
    padding: theme.spacing.md,
    borderRadius: theme.spacing.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.error,
    alignItems: 'center',
  },
  logoutText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.error,
  },
});
