/**
 * 每日任务页样式
 */
import { StyleSheet } from 'react-native';
import type { Theme } from '@/context/ThemeProvider';

export const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.secondary,
  },

  // ==================== Header ====================
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  placeholder: {
    width: theme.scale(32),
  },

  // ==================== Content ====================
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing['2xl'],
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  sectionTitleFirst: {
    marginTop: 0,
  },

  // ==================== Task Card ====================
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.spacing.sm,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  taskCardCompleted: {
    opacity: 0.7,
  },
  taskIcon: {
    fontSize: theme.fontScale(28),
    marginRight: theme.spacing.sm,
  },
  taskInfo: {
    flex: 1,
  },
  taskName: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xxs,
  },
  taskProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  progressBarContainer: {
    flex: 1,
    height: 6,
    backgroundColor: theme.colors.border.light,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 999,
  },
  taskProgressText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
    minWidth: 36,
    textAlign: 'right',
  },
  taskRight: {
    marginLeft: theme.spacing.sm,
    alignItems: 'center',
  },
  xpBadge: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.warning,
    marginBottom: theme.spacing.xxs,
  },
  claimButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: 999,
  },
  claimButtonText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.inverse,
  },
  claimedText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
  },

  // ==================== Daily Bonus ====================
  bonusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.spacing.sm,
    padding: theme.spacing.md,
    marginTop: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  bonusCardActive: {
    borderColor: theme.colors.warning,
  },
  bonusInfo: {
    flex: 1,
  },
  bonusTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xxs,
  },
  bonusDesc: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.secondary,
  },
  bonusRight: {
    alignItems: 'center',
  },
  bonusXp: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.warning,
    marginBottom: theme.spacing.xs,
  },

  // ==================== Empty / Error ====================
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing['2xl'],
  },
  emptyText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.tertiary,
  },
});
