import { StyleSheet } from 'react-native';
import { Theme } from '@/context/ThemeProvider';

export const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },

  // ==================== Header ====================
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.background.primary,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border.light,
  },
  headerBackButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  headerSubtitle: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
    marginTop: 2,
  },
  headerRight: {
    width: 44,
  },

  // ==================== 内容区域 ====================
  scrollContent: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing['2xl'],
  },

  // ==================== 场景标题卡片 ====================
  sceneCard: {
    backgroundColor: theme.colors.primary + '12',
    borderRadius: theme.spacing.borderRadius.base,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    alignItems: 'center',
  },
  sceneTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
  },
  sceneTitleZh: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
    marginTop: 2,
  },

  // ==================== 旁白 ====================
  narrationContainer: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.spacing.borderRadius.base,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.text.tertiary,
  },
  narrationText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    fontStyle: 'italic',
    lineHeight: theme.fontScale(22),
  },
  translationText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
    marginTop: theme.spacing.xs,
    lineHeight: theme.fontScale(20),
  },

  // ==================== 对话气泡 ====================
  dialogueContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  dialogueAvatar: {
    width: 36,
    height: 36,
    borderRadius: theme.spacing.borderRadius.sm,
    overflow: 'hidden',
  },
  dialogueAvatarImage: {
    width: 36,
    height: 36,
  },
  dialogueBubbleContainer: {
    flex: 1,
  },
  dialogueCharacterName: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xxs,
  },
  dialogueBubble: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.spacing.borderRadius.base,
    borderTopLeftRadius: theme.spacing.borderRadius.none,
    padding: theme.spacing.sm,
    maxWidth: '90%',
  },
  dialogueText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.primary,
    lineHeight: theme.fontScale(22),
  },
  dialogueActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
    gap: theme.spacing.sm,
  },
  dialogueActionButton: {
    padding: theme.spacing.xxs,
  },

  // ==================== 听力气泡（文字隐藏） ====================
  listeningBubble: {
    backgroundColor: theme.colors.primary + '15',
    borderRadius: theme.spacing.borderRadius.base,
    borderTopLeftRadius: theme.spacing.borderRadius.none,
    padding: theme.spacing.sm,
    maxWidth: '90%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  listeningPlayButton: {
    width: 36,
    height: 36,
    borderRadius: theme.spacing.borderRadius.full,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listeningHintText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
    fontStyle: 'italic',
  },

  // ==================== 插图 ====================
  illustrationContainer: {
    marginBottom: theme.spacing.sm,
    borderRadius: theme.spacing.borderRadius.base,
    overflow: 'hidden',
  },
  illustrationImage: {
    width: '100%',
    height: theme.scale(180),
    borderRadius: theme.spacing.borderRadius.base,
  },
  illustrationCaption: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },

  // ==================== 选择题 ====================
  choiceContainer: {
    marginBottom: theme.spacing.sm,
  },
  choicePrompt: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  choicePromptTranslation: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
    marginBottom: theme.spacing.sm,
    marginTop: -theme.spacing.xs,
  },
  choiceOption: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.spacing.borderRadius.sm,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
    borderWidth: 1.5,
    borderColor: theme.colors.border.light,
  },
  choiceOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '10',
  },
  choiceOptionCorrect: {
    borderColor: theme.colors.success,
    backgroundColor: theme.colors.success + '10',
  },
  choiceOptionIncorrect: {
    borderColor: theme.colors.error,
    backgroundColor: theme.colors.error + '10',
  },
  choiceOptionText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.primary,
  },
  choiceFeedback: {
    marginTop: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: theme.spacing.borderRadius.sm,
  },
  choiceFeedbackCorrect: {
    backgroundColor: theme.colors.success + '15',
  },
  choiceFeedbackIncorrect: {
    backgroundColor: theme.colors.error + '15',
  },
  choiceFeedbackText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.primary,
  },
  choiceFeedbackTranslation: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
    marginTop: theme.spacing.xxs,
  },

  // ==================== 跟读 ====================
  readAloudContainer: {
    marginBottom: theme.spacing.sm,
  },
  readAloudCard: {
    backgroundColor: theme.colors.primary + '10',
    borderRadius: theme.spacing.borderRadius.base,
    padding: theme.spacing.md,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  readAloudLabel: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
  },
  readAloudText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
    textAlign: 'center',
    lineHeight: theme.fontScale(28),
  },
  readAloudButtonRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.xs,
  },
  readAloudListenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.card,
    borderRadius: theme.spacing.borderRadius.full,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  readAloudRecordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.spacing.borderRadius.full,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  readAloudButtonText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  readAloudButtonTextWhite: {
    fontSize: theme.typography.fontSize.sm,
    color: '#FFFFFF',
  },
  readAloudSkipButton: {
    marginTop: theme.spacing.xs,
  },
  readAloudSkipText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
  },

  // ==================== 对话题 ====================
  conversationContainer: {
    marginBottom: theme.spacing.sm,
  },
  conversationCard: {
    backgroundColor: theme.colors.warning + '10',
    borderRadius: theme.spacing.borderRadius.base,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.warning + '30',
  },
  conversationGoalLabel: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.warning,
    marginBottom: theme.spacing.xs,
  },
  conversationGoalText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.primary,
    lineHeight: theme.fontScale(22),
  },
  conversationGoalZh: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
    marginTop: theme.spacing.xxs,
  },
  conversationInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  conversationInput: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.spacing.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.primary,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    maxHeight: 80,
  },
  conversationSendButton: {
    width: 36,
    height: 36,
    borderRadius: theme.spacing.borderRadius.full,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  conversationSendButtonDisabled: {
    backgroundColor: theme.colors.text.disabled,
  },
  conversationHintButton: {
    marginTop: theme.spacing.sm,
  },
  conversationHintText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.primary,
  },
  conversationHintContent: {
    marginTop: theme.spacing.xs,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.spacing.borderRadius.sm,
  },
  conversationHintSentence: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.secondary,
    lineHeight: theme.fontScale(20),
    marginBottom: theme.spacing.xxs,
  },
  conversationDoneText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.success,
    fontWeight: theme.typography.fontWeight.semibold,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },

  // ==================== 继续按钮 ====================
  continueButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.spacing.borderRadius.full,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  continueButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: '#FFFFFF',
  },

  // ==================== 总结页 ====================
  summaryContainer: {
    padding: theme.spacing.lg,
  },
  summaryTitle: {
    fontSize: theme.fontScale(24),
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  summaryChapterTitle: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  summaryStarsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  summaryScoreCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.spacing.borderRadius.base,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.spacing.shadows.sm,
  },
  summaryScoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryScoreItem: {
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  summaryScoreValue: {
    fontSize: theme.fontScale(28),
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
  },
  summaryScoreLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
  },
  summaryPhraseCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.spacing.borderRadius.base,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.spacing.shadows.sm,
  },
  summaryPhraseTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  summaryPhraseItem: {
    marginBottom: theme.spacing.sm,
  },
  summaryPhrase: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
  },
  summaryPhraseTranslation: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
    marginTop: 2,
  },
  summaryPhraseExample: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.secondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  summaryBackButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.spacing.borderRadius.full,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  summaryBackButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: '#FFFFFF',
  },
});
