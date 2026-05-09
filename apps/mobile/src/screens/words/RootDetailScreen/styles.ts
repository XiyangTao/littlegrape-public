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
    backButton: {
      padding: theme.spacing.xs,
    },
    headerTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
    },
    placeholder: {
      width: 36,
    },
    rootInfoCard: {
      marginHorizontal: theme.spacing.md,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    rootTitle: {
      fontSize: theme.typography.fontSize['2xl'],
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.primary,
      marginBottom: 4,
    },
    rootMeaningText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.secondary,
      marginBottom: theme.spacing.md,
    },
    progressSection: {
      gap: theme.spacing.xs,
    },
    progressBarBg: {
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
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.tertiary,
      textAlign: 'right',
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.secondary,
      marginBottom: theme.spacing.sm,
    },
    listContent: {
      paddingHorizontal: theme.spacing.md,
      paddingBottom: 100,
    },
    wordItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.light,
    },
    wordLeft: {
      flex: 1,
    },
    wordText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.text.primary,
    },
    wordTextLearned: {
      color: theme.colors.primary,
    },
    wordPhonetic: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.tertiary,
      marginTop: 2,
    },
    wordRight: {
      alignItems: 'flex-end',
      marginLeft: theme.spacing.sm,
      maxWidth: '50%',
    },
    wordMeaning: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
      marginBottom: 4,
    },
    statusBadge: {
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: 1,
      borderRadius: 4,
      backgroundColor: theme.colors.border.light,
    },
    statusBadgeLearned: {
      backgroundColor: theme.colors.primary + '20',
    },
    statusText: {
      fontSize: 10,
      color: theme.colors.text.tertiary,
    },
    statusTextLearned: {
      color: theme.colors.primary,
    },
    ctaContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
      backgroundColor: theme.colors.background.primary,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border.light,
    },
    ctaButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary,
      borderRadius: theme.spacing.sm,
      paddingVertical: theme.spacing.md,
      gap: theme.spacing.xs,
    },
    ctaText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.inverse,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
