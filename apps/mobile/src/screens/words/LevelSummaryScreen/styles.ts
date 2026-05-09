import { StyleSheet } from 'react-native';
import { Theme } from '@/theme';

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background.primary,
    },
    scrollContent: {
      paddingBottom: 120,
    },

    // Header
    headerSection: {
      alignItems: 'center',
      paddingTop: theme.spacing.xl,
      paddingBottom: theme.spacing.lg,
    },
    titleEmoji: {
      fontSize: theme.fontScale(48),
      marginBottom: theme.spacing.sm,
    },
    title: {
      fontSize: theme.typography.fontSize['2xl'],
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
    },
    headerSubtitle: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.secondary,
      marginTop: theme.spacing.xs,
    },

    // Stars
    starsContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    starIcon: {
      // Animated view wrapper
    },

    // Boss warning
    bossWarningContainer: {
      marginHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.md,
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.error + '15',
      borderRadius: theme.spacing.sm,
      alignItems: 'center',
    },
    bossWarningText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.error,
    },

    // Stats — 三行布局
    statsContainer: {
      marginHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    statRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.sm,
    },
    statRowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    statRowLabel: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.text.primary,
    },
    statRowRight: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
    statRowValue: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
    },
    statRowPercent: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.secondary,
    },
    statRowCheck: {
      fontSize: theme.typography.fontSize.base,
    },
    statRowDivider: {
      height: 1,
      backgroundColor: theme.colors.border.light,
    },
    // XP
    xpContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: theme.spacing.sm,
      marginHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      gap: theme.spacing.xs,
    },
    xpValue: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.secondary,
    },

    // Weak words
    weakSection: {
      marginTop: theme.spacing.lg,
      paddingHorizontal: theme.spacing.md,
    },
    weakTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.sm,
    },
    weakWordCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.xs,
    },
    weakWordText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
      flex: 1,
    },
    weakWordMeaning: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
      flex: 2,
    },

    // Sentence challenge button
    sentenceChallengeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.primary,
      gap: theme.spacing.xs,
    },
    sentenceChallengeText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.primary,
    },

    // Bottom buttons
    bottomContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
      backgroundColor: theme.colors.background.primary,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border.light,
      gap: theme.spacing.sm,
    },
    secondaryButton: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.spacing.sm,
      borderWidth: 2,
      borderColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryButtonText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.primary,
    },
    primaryButton: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.spacing.sm,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButtonText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.inverse,
    },

    // Next level preview
    nextPreviewSection: {
      marginTop: theme.spacing.lg,
      marginHorizontal: theme.spacing.md,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.spacing.sm,
    },
    nextPreviewTitle: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.secondary,
      marginBottom: theme.spacing.sm,
    },
    nextPreviewWords: {
      gap: theme.spacing.sm,
    },
    nextPreviewWordItem: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingVertical: theme.spacing.xs,
    },
    nextPreviewWord: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
    },
    nextPreviewMeaning: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.tertiary,
      flex: 1,
      textAlign: 'right' as const,
      marginLeft: theme.spacing.md,
    },

    // Loading
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
