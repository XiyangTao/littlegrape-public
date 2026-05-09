import { StyleSheet } from 'react-native';
import { Theme } from '@/context/ThemeProvider';

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  headerRight: {
    width: 32,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  progressBarContainer: {
    height: 3,
    backgroundColor: theme.colors.border.light,
    marginHorizontal: theme.spacing.md,
    borderRadius: 2,
  },
  progressBar: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },

  // ==================== 加载 / 空状态 ====================

  loadingText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.md,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: theme.spacing.lg,
  },
  emptyTitle: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  emptyDesc: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.lg,
  },
  emptyButton: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.spacing.borderRadius.base,
    backgroundColor: theme.colors.primary,
  },
  emptyButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.inverse,
  },

  // ==================== 选词阶段 ====================

  wordSelectContainer: {
    flex: 1,
  },
  wordSelectContent: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
  },
  wordSelectHint: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginVertical: theme.spacing.md,
    textAlign: 'center',
  },
  wordSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.spacing.borderRadius.base,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  wordSelectInfo: {
    flex: 1,
  },
  wordSelectWord: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xxs,
  },
  wordSelectMeaning: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  wordSelectRemoveBtn: {
    padding: theme.spacing.xs,
    marginLeft: theme.spacing.sm,
  },
  wordSelectFooter: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border.light,
  },
  startReviewButton: {
    paddingVertical: theme.spacing.md,
    borderRadius: theme.spacing.borderRadius.base,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  startReviewButtonDisabled: {
    opacity: 0.5,
  },
  startReviewButtonText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.inverse,
  },

  // ==================== 做题页 ====================

  comboContainer: {
    alignItems: 'flex-end',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  comboText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.warning,
  },
  submitContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
  },
  submitButton: {
    paddingVertical: theme.spacing.md,
    borderRadius: theme.spacing.borderRadius.base,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.inverse,
  },

  // 上一题 / 下一题 导航
  navContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border.light,
    gap: theme.spacing.md,
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm + 2,
    borderRadius: theme.spacing.borderRadius.base,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    gap: 4,
  },
  navButtonNext: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  navButtonDisabled: {
    borderColor: theme.colors.border.light,
    backgroundColor: 'transparent',
  },
  navButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
  },
  navButtonNextText: {
    color: theme.colors.text.inverse,
  },
  navButtonTextDisabled: {
    color: theme.colors.text.disabled,
  },

  // ==================== 结果页 ====================

  resultEmoji: {
    fontSize: 64,
    marginBottom: theme.spacing.md,
  },
  resultTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  resultRate: {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  resultDetail: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.lg,
  },
  masteredSection: {
    width: '100%',
    backgroundColor: theme.colors.success + '08',
    borderRadius: theme.spacing.borderRadius.base,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  masteredSectionTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.success,
    marginBottom: theme.spacing.sm,
  },
  masteredWordItem: {
    marginBottom: theme.spacing.xs,
  },
  masteredWord: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.primary,
  },
  masteredMeaning: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.secondary,
  },
  wrongSection: {
    width: '100%',
    backgroundColor: theme.colors.error + '08',
    borderRadius: theme.spacing.borderRadius.base,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  wrongSectionTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.error,
    marginBottom: theme.spacing.sm,
  },
  wrongWordItem: {
    marginBottom: theme.spacing.xs,
  },
  wrongWord: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.primary,
  },
  wrongMeaning: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.secondary,
  },
  resultButtons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    width: '100%',
  },
  retryButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.spacing.borderRadius.base,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    alignItems: 'center',
  },
  retryButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
  },
  backButton2: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.spacing.borderRadius.base,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.inverse,
  },
});

export default createStyles;
