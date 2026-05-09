import { StyleSheet } from 'react-native';
import { Theme } from '@/context/ThemeProvider';

export const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },

  // ==================== 返回按钮 ====================
  backButton: {
    padding: theme.spacing.sm,
  },
  backButtonText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.primary,
    marginLeft: theme.spacing.xs,
  },

  // ==================== IntroView 介绍页 ====================
  introBackBtn: {
    padding: theme.spacing.md,
    alignSelf: 'flex-start',
  },
  introHeader: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  introSymbolLarge: {
    fontSize: theme.fontScale(56),
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  introNameText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.secondary,
  },
  introPlayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.spacing.borderRadius.lg,
    padding: theme.spacing.lg,
    ...theme.spacing.shadows.sm,
  },
  introPlayIconWrap: {
    width: theme.scale(48),
    height: theme.scale(48),
    borderRadius: theme.scale(24),
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  introPlayInfo: {
    flex: 1,
  },
  introPlayWord: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  introPlayPhonetic: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.secondary,
  },
  introTipsCard: {
    backgroundColor: theme.colors.background.secondary,
    marginHorizontal: theme.spacing.lg,
    borderRadius: theme.spacing.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  introTipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  introTipLabel: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  introTipText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    lineHeight: theme.fontScale(22),
    marginLeft: 18 + theme.spacing.sm,
  },
  introStartBtn: {
    backgroundColor: theme.colors.primary,
    marginHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.spacing.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introStartBtnText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.inverse,
  },

  // ==================== Session 顶部栏（新版多邻国风格） ====================
  sessionTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  closeButton: {
    width: theme.scale(36),
    height: theme.scale(36),
    borderRadius: theme.scale(18),
    backgroundColor: theme.colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    flex: 1,
  },
  progressBar: {
    height: 8,
    backgroundColor: theme.colors.background.tertiary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginLeft: theme.spacing.sm,
  },

  // ==================== 目标音素卡片（紧凑） ====================
  targetPhonemeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary + '10',
    marginHorizontal: theme.spacing.lg,
    borderRadius: theme.spacing.borderRadius.base,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.primary + '30',
  },
  targetPhonemeSymbol: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
    marginRight: theme.spacing.sm,
  },
  targetPhonemeHint: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    flex: 1,
  },

  // ==================== PhonemeTip 可折叠 ====================
  tipCard: {
    backgroundColor: theme.colors.background.secondary,
    marginHorizontal: theme.spacing.lg,
    borderRadius: theme.spacing.borderRadius.base,
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
  },
  tipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  tipHeaderText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.secondary,
  },
  tipBody: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  tipRow: {
    marginBottom: theme.spacing.sm,
  },
  tipLabel: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
    marginBottom: 2,
  },
  tipContent: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    lineHeight: theme.fontScale(20),
  },
  tipMistake: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.error,
    lineHeight: theme.fontScale(20),
  },

  // ==================== 单词卡片 ====================
  practiceWordCard: {
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    marginHorizontal: theme.spacing.lg,
    borderRadius: theme.spacing.borderRadius.lg,
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  practiceWordText: {
    fontSize: theme.fontScale(36),
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  practiceWordPhonetic: {
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xs,
  },
  practiceWordPosition: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.primary,
  },

  // ==================== 步骤区域 ====================
  stepSection: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  stepHint: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },

  // Listen 步骤
  listenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.spacing.borderRadius.full,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  listenButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.inverse,
  },

  startRecordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.spacing.borderRadius.full,
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  startRecordBtnText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.primary,
  },

  // Record 步骤
  recordButtonWrapper: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRing: {
    position: 'absolute',
  },
  recordButton: {
    width: theme.scale(80),
    height: theme.scale(80),
    borderRadius: theme.scale(40),
    backgroundColor: theme.colors.background.secondary,
    borderWidth: 3,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  recordButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  recordButtonDisabled: {
    opacity: 0.6,
  },
  recordTip: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
    marginTop: theme.spacing.md,
  },
  replayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  replayButtonText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary,
  },

  // ==================== 鼓励式 Feedback 区域 ====================
  feedbackSection: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.spacing.borderRadius.lg,
    padding: theme.spacing.lg,
    marginHorizontal: theme.spacing.lg,
  },

  // 等级词 + emoji
  feedbackLevelContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  feedbackEmoji: {
    fontSize: theme.fontScale(32),
    marginBottom: theme.spacing.xs,
  },
  feedbackLevelText: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
  },

  // 音素高亮条
  phonemeHighlightBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.sm,
  },
  phonemeHighlightChip: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.spacing.borderRadius.sm,
    minWidth: 44,
  },
  phonemeHighlightChipGood: {
    backgroundColor: theme.colors.info,
  },
  phonemeHighlightChipWeak: {
    backgroundColor: theme.colors.background.tertiary,
  },
  phonemeHighlightChipText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  phonemeHighlightChipTextGood: {
    color: theme.colors.text.inverse,
  },
  phonemeHighlightChipTextWeak: {
    color: theme.colors.text.tertiary,
  },
  phonemeTargetIndicator: {
    height: 3,
    borderRadius: 1.5,
    backgroundColor: theme.colors.primary,
    marginTop: 4,
    width: '80%',
  },

  // 目标音素简要反馈
  targetFeedbackText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    lineHeight: theme.fontScale(20),
  },

  // 播放录音
  playRecordingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.tertiary,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.spacing.borderRadius.md,
    marginBottom: theme.spacing.lg,
  },
  playRecordingText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginLeft: theme.spacing.xs,
  },

  // 操作按钮
  feedbackActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  retryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.spacing.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  retryButtonText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.medium,
    marginLeft: theme.spacing.xs,
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.spacing.borderRadius.md,
  },
  nextButtonText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.inverse,
    fontWeight: theme.typography.fontWeight.medium,
    marginRight: theme.spacing.xs,
  },

  // ==================== 听辨题区域 ====================
  listenDrillContainer: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  listenDrillContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  listenDrillPrompt: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  listenDrillPlayBtn: {
    alignSelf: 'center',
    width: theme.scale(72),
    height: theme.scale(72),
    borderRadius: theme.scale(36),
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xl,
    elevation: 4,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  listenDrillOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.spacing.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  listenDrillOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '10',
  },
  listenDrillOptionCorrect: {
    borderColor: theme.colors.success,
    backgroundColor: theme.colors.success + '10',
  },
  listenDrillOptionWrong: {
    borderColor: theme.colors.warning,
    backgroundColor: theme.colors.warning + '10',
  },
  listenDrillOptionWord: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginRight: theme.spacing.sm,
  },
  listenDrillOptionPhonetic: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.secondary,
  },
  listenDrillFeedback: {
    marginTop: theme.spacing.lg,
    padding: theme.spacing.md,
    borderRadius: theme.spacing.borderRadius.base,
  },
  listenDrillFeedbackCorrect: {
    backgroundColor: theme.colors.success + '15',
  },
  listenDrillFeedbackWrong: {
    backgroundColor: theme.colors.warning + '15',
  },
  listenDrillFeedbackTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    marginBottom: theme.spacing.xs,
  },
  listenDrillFeedbackHint: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    lineHeight: theme.fontScale(20),
  },
  listenDrillContinueBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.spacing.borderRadius.md,
    marginTop: theme.spacing.lg,
  },
  listenDrillContinueText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.inverse,
  },

  // 最小对题：播放行
  minimalPairPlayRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  minimalPairPlayItem: {
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  minimalPairPlayBtn: {
    width: theme.scale(56),
    height: theme.scale(56),
    borderRadius: theme.scale(28),
    backgroundColor: theme.colors.background.secondary,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  minimalPairPlayLabel: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
  },
  minimalPairPlayPhonetic: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  // 最小对题：选择按钮行
  minimalPairChoiceRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.md,
  },
  minimalPairChoiceBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.secondary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.spacing.borderRadius.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  minimalPairChoiceBtnCorrect: {
    borderColor: theme.colors.success,
    backgroundColor: theme.colors.success + '10',
  },
  minimalPairChoiceBtnWrong: {
    borderColor: theme.colors.warning,
    backgroundColor: theme.colors.warning + '10',
  },
  minimalPairChoiceText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },

  // ==================== Same/Different 辨音题 ====================
  sameDiffPlayRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  sameDiffPlayBtn: {
    width: theme.scale(56),
    height: theme.scale(56),
    borderRadius: theme.scale(28),
    backgroundColor: theme.colors.background.secondary,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sameDiffPlayLabel: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
    marginTop: theme.spacing.xs,
  },
  sameDiffChoiceRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.md,
  },
  sameDiffChoiceBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.secondary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.spacing.borderRadius.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  sameDiffChoiceBtnCorrect: {
    borderColor: theme.colors.success,
    backgroundColor: theme.colors.success + '10',
  },
  sameDiffChoiceBtnWrong: {
    borderColor: theme.colors.warning,
    backgroundColor: theme.colors.warning + '10',
  },
  sameDiffChoiceText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },

  // ==================== 错误提示 ====================
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.error + '20',
    padding: theme.spacing.md,
    borderRadius: theme.spacing.borderRadius.md,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  errorText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.error,
    marginLeft: theme.spacing.sm,
    flex: 1,
  },

  // ==================== Summary 总结页（鼓励式） ====================
  summaryHeader: {
    alignItems: 'center',
    paddingTop: theme.spacing['2xl'],
    paddingBottom: theme.spacing.md,
  },
  summaryEmoji: {
    fontSize: theme.fontScale(48),
    marginBottom: theme.spacing.sm,
  },
  summaryTitle: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },

  // 音素信息卡片
  summaryPhonemeCard: {
    backgroundColor: theme.colors.background.secondary,
    marginHorizontal: theme.spacing.lg,
    borderRadius: theme.spacing.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    alignItems: 'center',
  },
  summaryPhonemeLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xs,
  },
  summaryPhonemeSymbol: {
    fontSize: theme.fontScale(32),
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
  },
  summaryPhonemeName: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
  },

  // 练习概要卡片
  summarySection: {
    backgroundColor: theme.colors.background.secondary,
    marginHorizontal: theme.spacing.lg,
    borderRadius: theme.spacing.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  summarySectionTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },

  // 听辨概要行
  summaryStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
  },
  summaryStatLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    flex: 1,
  },
  summaryStatDots: {
    flexDirection: 'row',
    gap: 4,
    marginRight: theme.spacing.md,
  },
  summaryStatDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  summaryStatDotCorrect: {
    backgroundColor: theme.colors.success,
  },
  summaryStatDotWrong: {
    backgroundColor: theme.colors.border.medium,
  },
  summaryStatValue: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  summaryStatLevel: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },

  // 跟读详情列表
  summaryWordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  summaryWordItemLast: {
    borderBottomWidth: 0,
  },
  summaryWordLeft: {
    flex: 1,
  },
  summaryWordText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
  },
  summaryWordPhonetic: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
  },
  summaryWordLevel: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
  },

  // 发音小贴士
  summaryTip: {
    backgroundColor: theme.colors.primary + '0D',
    marginHorizontal: theme.spacing.lg,
    borderRadius: theme.spacing.borderRadius.base,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  summaryTipTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  summaryTipText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    lineHeight: theme.fontScale(20),
  },

  // 操作按钮
  summaryActions: {
    flexDirection: 'row',
    marginHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  summaryRestartBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.secondary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.spacing.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    gap: theme.spacing.xs,
  },
  summaryRestartText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  summaryBackBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.spacing.borderRadius.md,
  },
  summaryBackText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.inverse,
    fontWeight: theme.typography.fontWeight.medium,
  },

  // ==================== 鼓励气泡 ====================
  encourageBubble: {
    position: 'absolute',
    bottom: theme.spacing.xl,
    alignSelf: 'center',
    backgroundColor: theme.colors.success,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.spacing.borderRadius.full,
  },
  encourageBubbleText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.inverse,
  },

  // ==================== 通用辅助 ====================
  bottomSpacer: {
    height: theme.spacing['2xl'],
  },
  phonemeChipContainer: {
    alignItems: 'center' as const,
  },
});
