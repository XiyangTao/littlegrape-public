import { StyleSheet } from 'react-native';
import { Theme } from '@/context/ThemeProvider';

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },

  // 顶部导航 + 进度
  progressHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: theme.spacing.borderRadius.lg,
    backgroundColor: theme.colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: theme.colors.border.light,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 3,
  },
  progressText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.secondary,
    minWidth: 36,
    textAlign: 'right',
  },

  // 题目区域
  questionSection: {
    flex: 1,
    paddingHorizontal: 16,
  },
  questionType: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
    marginBottom: 8,
  },
  questionText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
    lineHeight: 28,
    marginBottom: 24,
  },

  // 选择题选项
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.spacing.borderRadius.base,
    padding: 16,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: theme.colors.border.light,
  },
  optionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '08',
  },
  optionCorrect: {
    borderColor: theme.colors.success,
    backgroundColor: theme.colors.success + '08',
  },
  optionIncorrect: {
    borderColor: theme.colors.error,
    backgroundColor: theme.colors.error + '08',
  },
  optionLabel: {
    width: 28,
    height: 28,
    borderRadius: theme.spacing.borderRadius.base,
    backgroundColor: theme.colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionLabelText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.secondary,
  },
  optionText: {
    flex: 1,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.primary,
  },
  optionIcon: {
    marginLeft: 8,
  },

  // 选词填空 Word Bank
  wordBankContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  wordChip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: theme.spacing.borderRadius.lg,
    backgroundColor: theme.colors.card,
    borderWidth: 2,
    borderColor: theme.colors.border.light,
  },
  wordChipSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '10',
  },
  wordChipCorrect: {
    borderColor: theme.colors.success,
    backgroundColor: theme.colors.success + '10',
  },
  wordChipIncorrect: {
    borderColor: theme.colors.error,
    backgroundColor: theme.colors.error + '10',
  },
  wordChipText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
  },
  wordChipTextSelected: {
    color: theme.colors.primary,
  },
  wordChipTextCorrect: {
    color: theme.colors.success,
  },
  wordChipTextIncorrect: {
    color: theme.colors.error,
  },

  // 解析区域
  explanationCard: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.spacing.borderRadius.base,
    padding: 16,
    marginTop: 16,
  },
  explanationTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  explanationTitleText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  explanationText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    lineHeight: 22,
  },
  correctAnswer: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.success,
    marginBottom: 4,
  },

  // 底部按钮
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 32,
  },
  nextButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.spacing.borderRadius.base,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonDisabled: {
    backgroundColor: theme.colors.border.light,
  },
  nextButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.inverse,
  },

  // 结果页
  resultContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  resultScoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  resultScore: {
    fontSize: 36,
    fontWeight: theme.typography.fontWeight.bold,
  },
  resultScoreUnit: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  resultTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  resultStats: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 32,
  },
  resultStatItem: {
    alignItems: 'center',
  },
  resultStatValue: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
  },
  resultStatLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  resultButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  retryButton: {
    flex: 1,
    borderRadius: theme.spacing.borderRadius.base,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  retryButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
  },
  doneButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.spacing.borderRadius.base,
    paddingVertical: 14,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.inverse,
  },

  // 加载
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default createStyles;
