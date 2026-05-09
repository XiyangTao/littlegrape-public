import { StyleSheet } from 'react-native';
import { Theme } from '@/theme';

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background.primary,
    },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    closeButton: {
      padding: theme.spacing.xs,
    },
    headerCenter: {
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
    },
    headerSubtitle: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.secondary,
      marginTop: theme.spacing.xxs,
    },
    startButton: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.spacing.sm,
      backgroundColor: theme.colors.primary,
    },
    startButtonText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.inverse,
    },
    placeholder: {
      width: 60,
    },

    // Phase Indicator
    phaseIndicator: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: theme.spacing.xs,
      gap: theme.spacing.lg,
    },
    phaseItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    phaseDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.border.light,
    },
    phaseDotActive: {
      backgroundColor: theme.colors.primary,
    },
    phaseLabel: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.disabled,
    },
    phaseLabelActive: {
      color: theme.colors.primary,
      fontWeight: theme.typography.fontWeight.semibold,
    },

    // Progress Bar
    progressContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      gap: theme.spacing.sm,
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
    comboText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.warning,
      minWidth: 50,
      textAlign: 'right',
    },

    // Loading
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.secondary,
      marginTop: theme.spacing.md,
    },

    // Error
    errorContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.xl,
    },
    errorText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.secondary,
      textAlign: 'center',
    },
    retryButton: {
      marginTop: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.spacing.sm,
      backgroundColor: theme.colors.primary,
    },
    retryButtonText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.inverse,
    },

    // Transition Pages
    transitionContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.xl,
    },
    transitionEmoji: {
      fontSize: 64,
      marginBottom: theme.spacing.lg,
    },
    transitionTitle: {
      fontSize: theme.typography.fontSize['2xl'],
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.sm,
    },
    transitionStats: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.primary,
      marginBottom: theme.spacing.sm,
    },
    transitionSubtitle: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.secondary,
      marginBottom: theme.spacing.xl,
    },
    transitionButton: {
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.spacing.borderRadius.base,
      backgroundColor: theme.colors.primary,
    },
    transitionButtonText: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.inverse,
    },

    // Submit Button
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
  });
