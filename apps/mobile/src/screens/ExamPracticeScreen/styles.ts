import { StyleSheet } from 'react-native';
import { Theme } from '@/context/ThemeProvider';

export const createStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background.primary },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: theme.typography.fontSize.base, color: theme.colors.text.secondary },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm,
  },
  backButton: { width: theme.scale(40), height: theme.scale(40), justifyContent: 'center', alignItems: 'center' },
  headerTitle: {
    fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },

  // 介绍页
  introContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.lg },
  introIconWrap: {
    width: theme.scale(80), height: theme.scale(80), borderRadius: theme.scale(40),
    backgroundColor: theme.colors.primary + '15',
    justifyContent: 'center', alignItems: 'center', marginBottom: theme.spacing.lg,
  },
  introTitle: {
    fontSize: theme.typography.fontSize['2xl'], fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary, marginBottom: theme.spacing.sm,
  },
  introDesc: {
    fontSize: theme.typography.fontSize.sm, color: theme.colors.text.secondary,
    textAlign: 'center', marginBottom: theme.spacing.xl,
  },
  introStats: { flexDirection: 'row', gap: theme.spacing.xl, marginBottom: theme.spacing.xl },
  introStatItem: { alignItems: 'center' },
  introStatValue: {
    fontSize: theme.typography.fontSize.xl, fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
  },
  introStatLabel: { fontSize: theme.typography.fontSize.xs, color: theme.colors.text.secondary, marginTop: 2 },
  startButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing['2xl'], paddingVertical: theme.spacing.md,
    borderRadius: theme.spacing.borderRadius.lg,
  },
  startButtonText: {
    fontSize: theme.typography.fontSize.base, fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.inverse,
  },

  // 答题页
  testHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm,
  },
  timerText: {
    fontSize: theme.typography.fontSize.base, fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
  },
  progressLabel: { fontSize: theme.typography.fontSize.sm, color: theme.colors.text.secondary },
  progressBarBg: { height: 4, backgroundColor: theme.colors.border.light },
  progressBarFill: { height: 4, backgroundColor: theme.colors.primary },
  testContent: { flex: 1, paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.md },
  sectionLabel: {
    fontSize: theme.typography.fontSize.xs, color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.medium, marginBottom: theme.spacing.sm,
  },
  questionWrap: { marginBottom: theme.spacing.lg, alignItems: 'center' },
  questionWord: {
    fontSize: theme.typography.fontSize['3xl'], fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary, marginBottom: theme.spacing.sm,
  },
  questionSentence: {
    fontSize: theme.typography.fontSize.base, color: theme.colors.text.primary,
    lineHeight: theme.fontScale(24), textAlign: 'center', marginBottom: theme.spacing.sm,
  },
  questionHint: { fontSize: theme.typography.fontSize.xs, color: theme.colors.text.tertiary },

  optionsContainer: { gap: theme.spacing.sm },
  optionButton: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.spacing.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 2, borderColor: 'transparent',
  },
  optionSelected: { borderColor: theme.colors.primary },
  optionCorrect: { borderColor: theme.colors.success, backgroundColor: theme.colors.success + '10' },
  optionWrong: { borderColor: theme.colors.error, backgroundColor: theme.colors.error + '10' },
  optionIndex: {
    width: theme.scale(28), height: theme.scale(28), borderRadius: theme.spacing.borderRadius.base,
    backgroundColor: theme.colors.border.light,
    justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.sm,
  },
  optionIndexText: {
    fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.secondary,
  },
  optionText: { fontSize: theme.typography.fontSize.sm, color: theme.colors.text.primary, flex: 1 },

  // 结果页
  resultContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.lg },
  scoreCircle: {
    width: theme.scale(120), height: theme.scale(120), borderRadius: theme.scale(60),
    borderWidth: 4, justifyContent: 'center', alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  scoreValue: { fontSize: theme.typography.fontSize['4xl'], fontWeight: theme.typography.fontWeight.bold },
  scoreUnit: { fontSize: theme.typography.fontSize.sm, color: theme.colors.text.secondary },
  resultTitle: {
    fontSize: theme.typography.fontSize.xl, fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary, marginBottom: theme.spacing.lg,
  },
  resultStats: { flexDirection: 'row', gap: theme.spacing.xl, marginBottom: theme.spacing.xl },
  resultStatItem: { alignItems: 'center' },
  resultStatValue: {
    fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  resultStatLabel: { fontSize: theme.typography.fontSize.xs, color: theme.colors.text.secondary, marginTop: 2 },
  retryButton: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl, paddingVertical: theme.spacing.md,
    borderRadius: theme.spacing.borderRadius.lg, marginBottom: theme.spacing.md,
  },
  retryButtonText: { fontSize: theme.typography.fontSize.base, fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.text.inverse },
  backButtonLarge: {
    paddingHorizontal: theme.spacing.xl, paddingVertical: theme.spacing.sm,
  },
  backButtonLargeText: { fontSize: theme.typography.fontSize.sm, color: theme.colors.text.secondary },
});
