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
    paddingBottom: 12,
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

  // Tips 灯泡按钮
  tipsButton: {
    width: 36,
    height: 36,
    borderRadius: theme.spacing.borderRadius.full,
    backgroundColor: theme.colors.warning + '10',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Tips 结构公式
  tipsStructureBox: {
    backgroundColor: theme.colors.primary + '08',
    borderRadius: theme.spacing.borderRadius.sm,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  tipsStructureText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
    lineHeight: 22,
  },

  // Tips Modal
  tipsModalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'flex-end',
  },
  tipsModalContent: {
    backgroundColor: theme.colors.background.primary,
    borderTopLeftRadius: theme.spacing.borderRadius.xl,
    borderTopRightRadius: theme.spacing.borderRadius.xl,
    maxHeight: '75%',
    paddingBottom: 32,
  },
  tipsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  tipsModalTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },

  // 内容区域
  contentSection: {
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
    marginBottom: theme.spacing.lg,
  },

  // Quick Rule 阶段
  ruleCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.spacing.borderRadius.base,
    padding: theme.spacing.lg,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  ruleTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: 12,
  },
  ruleDefinition: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.secondary,
    lineHeight: 24,
    marginBottom: 16,
  },
  ruleStructureLabel: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
    marginBottom: 6,
  },
  ruleStructure: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.background.secondary,
    padding: 12,
    borderRadius: theme.spacing.borderRadius.sm,
    overflow: 'hidden',
    lineHeight: 22,
    marginBottom: 16,
  },
  ruleExample: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.spacing.borderRadius.sm,
    padding: 12,
    marginBottom: 8,
  },
  ruleExampleEn: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  ruleExampleCn: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },

  // Deep Dive 阶段（用法卡片）
  usageCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.spacing.borderRadius.base,
    padding: 16,
    marginRight: 12,
    width: theme.screen.width - 64,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  usageTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  usageDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  usageExampleEn: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  usageExampleCn: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  errorCard: {
    backgroundColor: theme.colors.error + '08',
    borderRadius: theme.spacing.borderRadius.sm,
    padding: 12,
    marginTop: 12,
  },
  errorWrong: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.error,
    textDecorationLine: 'line-through',
    marginBottom: 4,
  },
  errorCorrect: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.success,
    marginBottom: 4,
  },
  errorExplanation: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.secondary,
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
  wordChipUsed: {
    opacity: 0.3,
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

  // 判断正误题 — 大按钮
  judgmentContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  judgmentButton: {
    flex: 1,
    paddingVertical: 20,
    borderRadius: theme.spacing.borderRadius.base,
    borderWidth: 2,
    borderColor: theme.colors.border.light,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.card,
  },
  judgmentButtonSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '08',
  },
  judgmentButtonCorrectResult: {
    borderColor: theme.colors.success,
    backgroundColor: theme.colors.success + '08',
  },
  judgmentButtonIncorrectResult: {
    borderColor: theme.colors.error,
    backgroundColor: theme.colors.error + '08',
  },
  judgmentButtonText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginTop: 4,
  },

  // 纠错题 — 错误下划线
  sentenceWithError: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
    lineHeight: 28,
    marginBottom: theme.spacing.lg,
  },
  errorUnderline: {
    color: theme.colors.error,
    textDecorationLine: 'underline',
    textDecorationColor: theme.colors.error,
  },
  correctedSentence: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.success,
    fontWeight: theme.typography.fontWeight.medium,
    marginTop: 8,
  },

  // 双空对比题
  dualSentenceContainer: {
    gap: 12,
    marginBottom: 16,
  },
  dualSentenceCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.spacing.borderRadius.base,
    padding: 16,
    borderWidth: 2,
    borderColor: theme.colors.border.light,
  },
  dualSentenceCardActive: {
    borderColor: theme.colors.primary,
  },
  dualSentenceCardCorrect: {
    borderColor: theme.colors.success,
  },
  dualSentenceCardIncorrect: {
    borderColor: theme.colors.error,
  },
  dualSentenceLabel: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  dualSentenceText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.primary,
    lineHeight: 24,
  },
  dualBlankSlot: {
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.bold,
    textDecorationLine: 'underline',
  },

  // 填表题
  tableContainer: {
    borderRadius: theme.spacing.borderRadius.base,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    marginBottom: 16,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  tableHeaderRow: {
    backgroundColor: theme.colors.primary + '10',
  },
  tableCell: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: theme.colors.border.light,
  },
  tableCellLast: {
    borderRightWidth: 0,
  },
  tableHeaderText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
  },
  tableCellText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.primary,
  },
  tableBlankCell: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.spacing.borderRadius.sm,
    paddingVertical: 6,
    paddingHorizontal: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  tableBlankCellActive: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  tableBlankCellCorrect: {
    backgroundColor: theme.colors.success + '10',
  },
  tableBlankCellIncorrect: {
    backgroundColor: theme.colors.error + '10',
  },
  tableBlankText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.primary,
  },

  // 句子重组 / 选词组句
  assemblyArea: {
    minHeight: 60,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.spacing.borderRadius.base,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    borderWidth: 2,
    borderColor: theme.colors.border.light,
    borderStyle: 'dashed',
  },
  assemblyAreaFilled: {
    borderStyle: 'solid',
    borderColor: theme.colors.primary + '30',
  },
  assembledWord: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.spacing.borderRadius.sm,
    backgroundColor: theme.colors.primary + '10',
    borderWidth: 1,
    borderColor: theme.colors.primary + '30',
  },
  assembledWordText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.primary,
  },
  assemblyCorrect: {
    borderColor: theme.colors.success,
    borderStyle: 'solid',
  },
  assemblyIncorrect: {
    borderColor: theme.colors.error,
    borderStyle: 'solid',
  },
  assemblyPlaceholder: {
    color: theme.colors.text.disabled,
    fontSize: theme.typography.fontSize.sm,
  },
  hintButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.spacing.borderRadius.full,
    backgroundColor: theme.colors.warning + '10',
    marginBottom: 12,
    gap: 4,
  },
  hintButtonText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.warning,
  },
  hintText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.warning,
    backgroundColor: theme.colors.warning + '08',
    padding: 12,
    borderRadius: theme.spacing.borderRadius.sm,
    marginBottom: 12,
    lineHeight: 20,
  },
  chineseTranslation: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
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

  // Smart Tip 弹出卡片
  smartTipOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'flex-end',
  },
  smartTipCard: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: theme.spacing.borderRadius.xl,
    borderTopRightRadius: theme.spacing.borderRadius.xl,
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  smartTipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  smartTipTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  smartTipRule: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.primary,
    lineHeight: 24,
    marginBottom: 12,
  },
  smartTipWrong: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.error,
    marginBottom: 4,
  },
  smartTipCorrect: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.success,
    marginBottom: 12,
  },
  smartTipExamples: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    lineHeight: 20,
  },
  smartTipButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.spacing.borderRadius.base,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  smartTipButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.inverse,
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
  starsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  resultTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  resultSubtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.lg,
  },
  resultStats: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
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
