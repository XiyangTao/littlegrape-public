/**
 * 每日挑战赛样式
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

  // ==================== Lobby ====================
  lobbyContainer: {
    flex: 1,
  },
  lobbyContent: {
    padding: theme.spacing.md,
  },
  lobbyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  lobbyHeaderTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  placeholder: {
    width: theme.scale(32),
  },

  // Challenge info card
  challengeCard: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.spacing.md,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    alignItems: 'center',
  },
  challengeDate: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xs,
  },
  challengeTitle: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  challengeInfo: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
  },
  challengeInfoItem: {
    alignItems: 'center',
  },
  challengeInfoValue: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
  },
  challengeInfoLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
    marginTop: 2,
  },

  // Start button
  startButton: {
    paddingVertical: theme.spacing.md,
    borderRadius: theme.spacing.sm,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  startButtonText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.inverse,
  },
  disabledButton: {
    opacity: 0.5,
  },
  alreadyPlayedText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
    textAlign: 'center',
    marginTop: -theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },

  // My stats
  statsSection: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  statCard: {
    flex: 1,
    minWidth: '45%' as any,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.spacing.sm,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
  },
  statLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
    marginTop: 4,
  },

  // Leaderboard
  leaderboardSection: {
    marginBottom: theme.spacing.lg,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  leaderboardItemHighlight: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  rankBadge: {
    width: theme.scale(28),
    height: theme.scale(28),
    borderRadius: theme.spacing.borderRadius.base,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  rankText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.inverse,
  },
  rankTextNormal: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.secondary,
    width: theme.scale(28),
    textAlign: 'center',
    marginRight: theme.spacing.sm,
  },
  leaderboardName: {
    flex: 1,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
  },
  leaderboardScore: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
  },
  myRankText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },

  // ==================== Playing ====================
  playingContainer: {
    flex: 1,
  },
  playingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timerText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  timerTextWarning: {
    color: theme.colors.error,
  },
  scoreText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
  },
  progressText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },

  // Combo indicator
  comboContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  comboText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.warning,
  },

  // Progress bar
  progressBarBg: {
    height: 4,
    backgroundColor: theme.colors.border.light,
    marginHorizontal: theme.spacing.md,
    borderRadius: 2,
  },
  progressBarFill: {
    height: 4,
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },

  // Question card
  questionCard: {
    flex: 1,
    padding: theme.spacing.lg,
    justifyContent: 'center',
  },
  questionTypeBadge: {
    alignSelf: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xxs,
    borderRadius: theme.spacing.sm,
    backgroundColor: theme.colors.background.tertiary,
    marginBottom: theme.spacing.md,
  },
  questionTypeText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.secondary,
  },
  questionPrompt: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  questionSubPrompt: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  sentenceText: {
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    lineHeight: theme.fontScale(28),
  },
  listenButton: {
    alignSelf: 'center',
    width: theme.scale(64),
    height: theme.scale(64),
    borderRadius: theme.scale(32),
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },

  // Options
  optionsContainer: {
    gap: theme.spacing.sm,
  },
  optionButton: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.spacing.sm,
    borderWidth: 2,
    borderColor: theme.colors.border.medium,
    backgroundColor: theme.colors.background.secondary,
  },
  optionButtonSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.background.secondary,
  },
  optionButtonCorrect: {
    borderColor: theme.colors.success,
    backgroundColor: `${theme.colors.success}15`,
  },
  optionButtonWrong: {
    borderColor: theme.colors.error,
    backgroundColor: `${theme.colors.error}15`,
  },
  optionText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  optionTextCorrect: {
    color: theme.colors.success,
    fontWeight: theme.typography.fontWeight.bold,
  },
  optionTextWrong: {
    color: theme.colors.error,
  },

  // ==================== Result ====================
  resultContainer: {
    flex: 1,
  },
  resultContent: {
    flex: 1,
    padding: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultEmoji: {
    fontSize: theme.fontScale(64),
    marginBottom: theme.spacing.md,
  },
  resultTitle: {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  resultScore: {
    fontSize: theme.typography.fontSize['5xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.lg,
  },
  resultStatsRow: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  resultStatItem: {
    alignItems: 'center',
  },
  resultStatValue: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  resultStatLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
    marginTop: 2,
  },
  rankCard: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.spacing.md,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    width: '100%',
  },
  rankTitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xs,
  },
  rankValue: {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
  },
  resultButtons: {
    width: '100%',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
  },
  resultButtonPrimary: {
    paddingVertical: theme.spacing.md,
    borderRadius: theme.spacing.sm,
    alignItems: 'center',
  },
  resultButtonPrimaryText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.inverse,
  },
  resultButtonSecondary: {
    paddingVertical: theme.spacing.md,
    borderRadius: theme.spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border.medium,
  },
  resultButtonSecondaryText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
  },
});
