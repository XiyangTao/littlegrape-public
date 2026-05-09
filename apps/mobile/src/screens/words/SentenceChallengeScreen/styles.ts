import { StyleSheet } from 'react-native';
import { Theme } from '@/theme';

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
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
    backButton: { padding: theme.spacing.xs },
    headerTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
    },
    placeholder: { width: 36 },
    scrollContent: {
      padding: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
    },

    // Word card
    wordCard: {
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.spacing.sm,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    wordText: {
      fontSize: theme.typography.fontSize['2xl'],
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
    },
    meaningText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.secondary,
      marginTop: 4,
    },
    collocationsContainer: {
      marginTop: theme.spacing.sm,
      paddingTop: theme.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border.light,
    },
    collocationsTitle: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.tertiary,
      marginBottom: 4,
    },
    collocationText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.primary,
      marginBottom: 2,
    },

    // Input
    inputSection: {
      gap: theme.spacing.sm,
    },
    inputPrompt: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.text.primary,
    },
    textInput: {
      borderWidth: 1,
      borderColor: theme.colors.border.medium,
      borderRadius: theme.spacing.sm,
      padding: theme.spacing.md,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.primary,
      minHeight: 100,
      backgroundColor: theme.colors.background.secondary,
    },
    errorText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.error,
    },
    submitButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary,
      borderRadius: theme.spacing.sm,
      paddingVertical: theme.spacing.md,
      gap: theme.spacing.xs,
    },
    submitButtonDisabled: {
      opacity: 0.5,
    },
    submitButtonText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.inverse,
    },

    // Evaluating
    evaluatingSection: {
      alignItems: 'center',
      paddingVertical: theme.spacing.xl,
    },
    evaluatingText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.secondary,
      marginTop: theme.spacing.md,
    },

    // Result
    resultSection: {
      gap: theme.spacing.md,
    },
    overallScoreCard: {
      alignItems: 'center',
      backgroundColor: theme.colors.primary + '10',
      borderRadius: theme.spacing.sm,
      padding: theme.spacing.md,
    },
    overallScoreValue: {
      fontSize: 48,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.primary,
    },
    overallScoreLabel: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
    },
    scoreBarsContainer: {
      gap: theme.spacing.sm,
    },
    scoreBarRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    scoreLabel: {
      width: 50,
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
    },
    scoreBarBg: {
      flex: 1,
      height: 8,
      backgroundColor: theme.colors.border.light,
      borderRadius: 4,
      overflow: 'hidden',
    },
    scoreBarFill: {
      height: '100%',
      borderRadius: 4,
    },
    scoreValue: {
      width: 36,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
      textAlign: 'right',
    },
    feedbackCard: {
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.spacing.sm,
      padding: theme.spacing.md,
    },
    feedbackTitle: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.xs,
    },
    feedbackText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
      lineHeight: 20,
    },
    improvedCard: {
      backgroundColor: theme.colors.secondary + '10',
      borderRadius: theme.spacing.sm,
      padding: theme.spacing.md,
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.secondary,
    },
    improvedTitle: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.secondary,
      marginBottom: theme.spacing.xs,
    },
    improvedText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.primary,
      fontStyle: 'italic',
    },
    actionsRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    retryButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.primary,
      borderRadius: theme.spacing.sm,
      paddingVertical: theme.spacing.md,
      gap: theme.spacing.xs,
    },
    retryButtonText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.primary,
    },
    doneButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary,
      borderRadius: theme.spacing.sm,
      paddingVertical: theme.spacing.md,
    },
    doneButtonText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.inverse,
    },
  });
