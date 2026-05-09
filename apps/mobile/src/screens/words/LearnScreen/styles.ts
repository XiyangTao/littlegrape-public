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
      color: theme.colors.text.tertiary,
      marginTop: 2,
    },
    placeholder: {
      width: theme.scale(40),
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

    // Error / Empty
    errorContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.xl,
    },
    errorEmoji: {
      fontSize: theme.fontScale(64),
      marginBottom: theme.spacing.lg,
    },
    errorTitle: {
      fontSize: theme.typography.fontSize['2xl'],
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.sm,
    },
    errorText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.secondary,
      textAlign: 'center',
    },
    backButton: {
      marginTop: theme.spacing.lg,
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.spacing.borderRadius.base,
      backgroundColor: theme.colors.primary,
    },
    backButtonText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.inverse,
    },

    // Practice
    practiceProgress: {
      paddingHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    practiceProgressBg: {
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.border.light,
    },
    practiceProgressFill: {
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.primary,
    },
    practiceSubmitContainer: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    practiceSubmitButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: 14,
      borderRadius: theme.spacing.borderRadius.base,
      alignItems: 'center',
    },
    practiceSubmitButtonText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.inverse,
    },

    // 答错重试
    feedbackWrongBar: {
      backgroundColor: theme.colors.error + '12',
      borderRadius: theme.spacing.borderRadius.base,
      padding: 12,
      marginBottom: 12,
      alignItems: 'center' as const,
    },
    feedbackWrongText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.error,
    },
    retryButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: 14,
      borderRadius: theme.spacing.borderRadius.base,
      alignItems: 'center' as const,
    },
    retryButtonText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.inverse,
    },

    // 完成页面
    completeContainer: {
      flex: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingHorizontal: theme.spacing.xl,
    },
    completeCircle: {
      width: theme.scale(88),
      height: theme.scale(88),
      borderRadius: theme.scale(44),
      backgroundColor: theme.colors.success,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginBottom: theme.spacing.lg,
    },
    completeTitle: {
      fontSize: theme.typography.fontSize['2xl'],
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.lg,
    },
    completeWordCard: {
      width: '100%' as any,
      backgroundColor: theme.colors.card,
      borderRadius: theme.spacing.borderRadius.md,
      paddingVertical: theme.spacing.lg,
      paddingHorizontal: theme.spacing.xl,
      alignItems: 'center' as const,
      marginBottom: theme.spacing.xl,
      borderWidth: 1,
      borderColor: theme.colors.border.light,
    },
    completeWord: {
      fontSize: theme.typography.fontSize['3xl'],
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.xs,
    },
    completePhonetic: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.tertiary,
      marginBottom: theme.spacing.sm,
    },
    completeMeaning: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.secondary,
    },
    completeButton: {
      width: '100%' as any,
      backgroundColor: theme.colors.primary,
      paddingVertical: 16,
      borderRadius: theme.spacing.borderRadius.base,
      alignItems: 'center' as const,
    },
    completeButtonText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.inverse,
    },
  });
