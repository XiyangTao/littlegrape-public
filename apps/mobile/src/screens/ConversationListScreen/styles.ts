import { StyleSheet } from 'react-native';
import { Theme } from '@/context/ThemeProvider';

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background.primary,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background.primary,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.light,
    },
    backButton: {
      padding: theme.spacing.xs,
    },
    headerTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
    },
    headerRight: {
      width: 32,
    },
    headerButton: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    headerButtonText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.primary,
    },
    newConversationButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary,
      marginHorizontal: theme.spacing.lg,
      marginVertical: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.spacing.borderRadius.lg,
    },
    newConversationText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.inverse,
      marginLeft: theme.spacing.sm,
    },
    sessionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      backgroundColor: theme.colors.background.primary,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.light,
    },
    sessionItemLoading: {
      opacity: 0.7,
    },
    sessionItemSelected: {
      backgroundColor: theme.colors.background.secondary,
    },
    deleteButton: {
      backgroundColor: theme.colors.error,
      justifyContent: 'center',
      alignItems: 'center',
      width: 80,
    },
    deleteButtonText: {
      color: theme.colors.text.inverse,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
    },
    sessionIcon: {
      width: 48,
      height: 48,
      borderRadius: 6,
      backgroundColor: theme.colors.background.secondary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.md,
      overflow: 'hidden',
    },
    sessionAvatar: {
      width: 48,
      height: 48,
      borderRadius: 6,
    },
    sessionContent: {
      flex: 1,
      marginRight: theme.spacing.sm,
    },
    sessionTitle: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
      marginBottom: 2,
    },
    sessionScenario: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
      marginBottom: 4,
    },
    sessionMeta: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    sessionMetaText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.disabled,
    },
    sessionMetaDot: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.disabled,
      marginHorizontal: 4,
    },
    sessionLastMessage: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.disabled,
      flex: 1,
    },
    sessionRight: {
      alignItems: 'flex-end',
    },
    sessionTime: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.disabled,
      marginBottom: 4,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.xl,
    },
    emptyText: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.text.secondary,
      marginTop: theme.spacing.lg,
    },
    emptySubtext: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.disabled,
      marginTop: theme.spacing.sm,
      textAlign: 'center',
    },
    emptyList: {
      flexGrow: 1,
    },
    loadingMore: {
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
    },
    noMore: {
      paddingVertical: theme.spacing.lg,
      alignItems: 'center',
    },
    noMoreText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.disabled,
    },
    checkbox: {
      marginRight: theme.spacing.md,
      padding: theme.spacing.xs,
    },
    checkboxInner: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: theme.colors.border.light,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkboxChecked: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    bottomBar: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border.light,
      backgroundColor: theme.colors.background.primary,
    },
    batchDeleteButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.error,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.spacing.borderRadius.md,
    },
    batchDeleteButtonDisabled: {
      opacity: 0.5,
    },
    batchDeleteButtonText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.inverse,
      marginLeft: theme.spacing.sm,
    },
  });
