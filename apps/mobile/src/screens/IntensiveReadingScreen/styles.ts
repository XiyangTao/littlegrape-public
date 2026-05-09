import { StyleSheet } from 'react-native';
import { Theme } from '@/context/ThemeProvider';

export const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  // ==================== 顶部导航栏 ====================
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.background.primary,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border.light,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  headerRight: {
    width: 44,
  },
  // ==================== StepIndicator ====================
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  stepDot: {
    width: theme.scale(28),
    height: theme.scale(28),
    borderRadius: theme.spacing.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.border.light,
  },
  stepDotActive: {
    backgroundColor: theme.colors.primary,
  },
  stepDotCompleted: {
    backgroundColor: theme.colors.success,
  },
  stepDotText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.tertiary,
  },
  stepDotTextActive: {
    color: theme.colors.text.inverse,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: theme.colors.border.light,
    maxWidth: theme.scale(40),
  },
  stepLineCompleted: {
    backgroundColor: theme.colors.success,
  },
  stepLabel: {
    fontSize: theme.typography.fontSize.xxs,
    color: theme.colors.text.tertiary,
    textAlign: 'center',
    marginTop: 2,
  },
  stepLabelActive: {
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  // ==================== 通用内容区域 ====================
  scrollContent: {
    flex: 1,
  },
  contentPadding: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  // ==================== 文章标题区（编辑风格） ====================
  articleHero: {
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  articleTitleEn: {
    fontSize: theme.fontScale(22),
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    lineHeight: theme.fontScale(30),
    letterSpacing: -0.3,
  },
  articleTitleZh: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.sm,
    lineHeight: theme.fontScale(24),
  },
  articleMetaLine: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
    marginTop: theme.spacing.md,
  },
  articleTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  articleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm + 2,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.spacing.borderRadius.full,
    backgroundColor: theme.colors.background.secondary,
    gap: 4,
  },
  articleTagText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.secondary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  articleTagTeacher: {
    backgroundColor: theme.colors.primary + '12',
  },
  teacherAvatar: {
    width: theme.scale(28),
    height: theme.scale(28),
    borderRadius: theme.scale(14),
    borderWidth: 1.5,
    borderColor: theme.colors.primary + '25',
  },
  // ==================== ReadingStep ====================
  paragraphCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.spacing.borderRadius.base,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  paragraphText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.primary,
    lineHeight: theme.fontScale(26),
  },
  sentenceHighlight: {
    backgroundColor: theme.colors.warning + '20',
    color: theme.colors.text.primary,
  },
  paragraphTranslation: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    lineHeight: theme.fontScale(22),
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border.light,
  },
  // ==================== 操作按钮栏（三等分） ====================
  readingActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: theme.scale(38),
    borderRadius: theme.spacing.borderRadius.sm,
    backgroundColor: theme.colors.background.secondary,
    gap: 6,
  },
  actionButtonActive: {
    backgroundColor: theme.colors.primary + '12',
  },
  actionButtonText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  actionButtonTextActive: {
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  vocabSection: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.spacing.borderRadius.base,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  vocabTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  vocabItem: {
    paddingVertical: theme.spacing.sm,
  },
  vocabItemBorder: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.light,
  },
  vocabWordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  vocabPlayButton: {
    width: theme.scale(26),
    height: theme.scale(26),
    borderRadius: theme.spacing.borderRadius.full,
    backgroundColor: theme.colors.primary + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vocabPlayButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  vocabWord: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
  },
  vocabPhonetic: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
  },
  vocabMeaning: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  clickableWord: {
    color: theme.colors.text.primary,
  },
  clickableWordHighlight: {
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.semibold,
    textDecorationLine: 'underline' as const,
    textDecorationColor: theme.colors.primary + '60',
  },
  // ==================== 音频播放器卡片 ====================
  playerCard: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.spacing.borderRadius.base,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm + 2,
  },
  playerTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  playerTimeText: {
    fontSize: 11,
    color: theme.colors.text.tertiary,
    fontVariant: ['tabular-nums'],
    minWidth: theme.scale(34),
    textAlign: 'center',
  },
  playerProgressTrack: {
    flex: 1,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: theme.colors.border.light,
    overflow: 'hidden',
  },
  playerProgressFill: {
    height: '100%' as const,
    borderRadius: 1.5,
    backgroundColor: theme.colors.primary,
  },
  playerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xl,
  },
  playerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerSeekLabel: {
    fontSize: 10,
    color: theme.colors.text.disabled,
    marginTop: 1,
  },
  playerPlayBtn: {
    width: theme.scale(42),
    height: theme.scale(42),
    borderRadius: theme.spacing.borderRadius.full,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ==================== ExplanationStep ====================
  explanationCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.spacing.borderRadius.base,
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  explanationIndex: {
    width: theme.scale(24),
    height: theme.scale(24),
    borderRadius: theme.spacing.borderRadius.full,
    backgroundColor: theme.colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  explanationIndexCompleted: {
    backgroundColor: theme.colors.success + '15',
  },
  explanationIndexText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
  },
  explanationIndexTextCompleted: {
    color: theme.colors.success,
  },
  explanationPreview: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.primary,
    lineHeight: theme.fontScale(20),
  },
  explanationChevron: {
    marginLeft: theme.spacing.xs,
  },
  explanationBody: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  explanationTranslation: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    lineHeight: theme.fontScale(20),
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.spacing.borderRadius.sm,
    padding: theme.spacing.sm,
  },
  explanationSection: {
    marginBottom: theme.spacing.md,
  },
  explanationSectionTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  explanationItem: {
    marginBottom: theme.spacing.xs,
  },
  explanationItemTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
  },
  explanationItemText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    lineHeight: theme.fontScale(20),
  },
  culturalNote: {
    backgroundColor: theme.colors.warning + '10',
    borderRadius: theme.spacing.borderRadius.sm,
    padding: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  culturalNoteText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.warning,
    lineHeight: theme.fontScale(20),
  },
  // ==================== ListeningStep ====================
  listeningContainer: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
  },
  audioControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  audioButton: {
    width: theme.scale(56),
    height: theme.scale(56),
    borderRadius: theme.spacing.borderRadius.full,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioSecondary: {
    width: 44,
    height: 44,
    borderRadius: theme.spacing.borderRadius.full,
    backgroundColor: theme.colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedButton: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.spacing.borderRadius.sm,
    backgroundColor: theme.colors.primary + '15',
  },
  speedText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
  },
  listeningParagraph: {
    padding: theme.spacing.md,
    borderRadius: theme.spacing.borderRadius.sm,
    marginBottom: theme.spacing.sm,
  },
  listeningParagraphActive: {
    backgroundColor: theme.colors.primary + '08',
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  listeningParagraphText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.primary,
    lineHeight: theme.fontScale(26),
  },
  listeningParagraphTextActive: {
    color: theme.colors.primary,
  },
  // ==================== QuizStep ====================
  quizHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  quizProgress: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  quizScoreText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
  },
  quizQuestionCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.spacing.borderRadius.base,
    padding: theme.spacing.lg,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  quizQuestionText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
    lineHeight: theme.fontScale(24),
    marginBottom: theme.spacing.xs,
  },
  quizQuestionZh: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.md,
  },
  quizOption: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.spacing.borderRadius.sm,
    borderWidth: 1.5,
    borderColor: theme.colors.border.medium,
    marginBottom: theme.spacing.sm,
  },
  quizOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '08',
  },
  quizOptionCorrect: {
    borderColor: theme.colors.success,
    backgroundColor: theme.colors.success + '08',
  },
  quizOptionWrong: {
    borderColor: theme.colors.error,
    backgroundColor: theme.colors.error + '08',
  },
  quizOptionText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.primary,
    lineHeight: theme.fontScale(20),
  },
  quizExplanation: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.spacing.borderRadius.sm,
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  quizExplanationText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    lineHeight: theme.fontScale(20),
  },
  // ==================== CompletionStep ====================
  completionContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: theme.scale(48),
    paddingHorizontal: theme.spacing.lg,
  },
  completionEmoji: {
    fontSize: theme.fontScale(64),
    marginBottom: theme.spacing.lg,
  },
  completionTitle: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  completionSubtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xl,
  },
  completionStats: {
    width: '100%',
    backgroundColor: theme.colors.card,
    borderRadius: theme.spacing.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  completionStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  completionStatLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  completionStatValue: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  // ==================== 底部按钮 ====================
  bottomBar: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border.light,
    backgroundColor: theme.colors.background.primary,
  },
  nextButton: {
    width: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.spacing.borderRadius.base,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.inverse,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  secondaryButton: {
    borderRadius: theme.spacing.borderRadius.base,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.sm,
  },
  secondaryButtonText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
});
