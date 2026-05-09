import { StyleSheet } from 'react-native';
import { Theme } from '@/context/ThemeProvider';

export const createStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background.primary },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: {
    fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary, flex: 1, textAlign: 'center',
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modeTabs: {
    flexDirection: 'row', paddingHorizontal: theme.spacing.md, gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  modeTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: theme.spacing.xs, paddingVertical: theme.spacing.sm,
    borderRadius: theme.spacing.borderRadius.md,
    backgroundColor: theme.colors.background.secondary,
  },
  modeTabActive: {
    backgroundColor: theme.colors.primary + '15',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  modeTabText: { fontSize: theme.typography.fontSize.sm, color: theme.colors.text.secondary },
  modeTabTextActive: { color: theme.colors.primary, fontWeight: theme.typography.fontWeight.semibold },
  speedBar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  speedLabel: {
    fontSize: theme.typography.fontSize.xs, color: theme.colors.text.secondary,
    marginRight: theme.spacing.sm,
  },
  speedOptions: { flexDirection: 'row', gap: theme.spacing.xs },
  speedButton: {
    paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs,
    borderRadius: theme.spacing.borderRadius.sm,
    backgroundColor: theme.colors.background.secondary,
  },
  speedButtonActive: { backgroundColor: theme.colors.primary },
  speedButtonText: { fontSize: theme.typography.fontSize.xs, color: theme.colors.text.secondary },
  speedButtonTextActive: { color: theme.colors.text.inverse, fontWeight: theme.typography.fontWeight.semibold },
  content: { flex: 1, paddingHorizontal: theme.spacing.md },
  progressText: {
    fontSize: theme.typography.fontSize.sm, color: theme.colors.text.secondary,
    textAlign: 'center', marginBottom: theme.spacing.md,
  },
  playButton: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center', alignItems: 'center',
    alignSelf: 'center', marginVertical: theme.spacing.md,
  },
  playHint: {
    fontSize: theme.typography.fontSize.xs, color: theme.colors.text.tertiary,
    textAlign: 'center', marginBottom: theme.spacing.lg,
  },
  dictationInput: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.spacing.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.primary,
    minHeight: 80, textAlignVertical: 'top',
    borderWidth: 1, borderColor: theme.colors.border.light,
    marginBottom: theme.spacing.md,
  },
  answerSection: {
    backgroundColor: theme.colors.primary + '08',
    borderRadius: theme.spacing.borderRadius.md,
    padding: theme.spacing.md,
    borderLeftWidth: 3, borderLeftColor: theme.colors.primary,
    marginBottom: theme.spacing.md,
  },
  answerLabel: {
    fontSize: theme.typography.fontSize.xs, color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.semibold, marginBottom: theme.spacing.xs,
  },
  answerText: {
    fontSize: theme.typography.fontSize.base, color: theme.colors.text.primary,
    lineHeight: 24, marginBottom: theme.spacing.xs,
  },
  translationText: {
    fontSize: theme.typography.fontSize.sm, color: theme.colors.text.secondary,
    lineHeight: 20,
  },
  actionRow: { marginBottom: theme.spacing.md },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.spacing.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  primaryButtonDisabled: { opacity: 0.5 },
  primaryButtonText: {
    fontSize: theme.typography.fontSize.base, fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.inverse,
  },
  questionCard: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.spacing.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  questionNumber: {
    fontSize: theme.typography.fontSize.xs, color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.bold, marginBottom: theme.spacing.xs,
  },
  questionText: {
    fontSize: theme.typography.fontSize.base, color: theme.colors.text.primary,
    fontWeight: theme.typography.fontWeight.medium,
    lineHeight: 22, marginBottom: theme.spacing.md,
  },
  optionButton: {
    borderWidth: 1, borderColor: theme.colors.border.light,
    borderRadius: theme.spacing.borderRadius.sm,
    paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  optionText: { fontSize: theme.typography.fontSize.sm, color: theme.colors.text.primary },
  optionSelected: {
    borderColor: theme.colors.primary, backgroundColor: theme.colors.primary + '10',
  },
  optionTextSelected: { color: theme.colors.primary, fontWeight: theme.typography.fontWeight.medium },
  optionCorrect: {
    borderColor: theme.colors.success, backgroundColor: theme.colors.success + '10',
  },
  optionTextCorrect: { color: theme.colors.success, fontWeight: theme.typography.fontWeight.medium },
  optionWrong: {
    borderColor: theme.colors.error, backgroundColor: theme.colors.error + '10',
  },
  optionTextWrong: { color: theme.colors.error },
  resultContainer: { alignItems: 'center', paddingVertical: theme.spacing.xl },
  resultTitle: {
    fontSize: theme.typography.fontSize.xl, fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary, marginTop: theme.spacing.md, marginBottom: theme.spacing.sm,
  },
  resultDesc: {
    fontSize: theme.typography.fontSize.base, color: theme.colors.text.secondary,
    marginBottom: theme.spacing.lg,
  },
});
