import { StyleSheet } from 'react-native';
import { Theme } from '@/theme';

export const createStyles = (theme: Theme) => {
  const CARD_GAP = theme.scale(12);
  const CARD_WIDTH = (theme.screen.width - theme.spacing.md * 2 - CARD_GAP) / 2;

  return StyleSheet.create({
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
    statsRow: {
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
    },
    statsText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.tertiary,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: theme.spacing.md,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.spacing.sm,
      gap: theme.spacing.xs,
    },
    searchInput: {
      flex: 1,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.primary,
      padding: 0,
    },
    filterRow: {
      flexDirection: 'row',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    filterTab: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xxs,
      borderRadius: theme.spacing.sm,
      backgroundColor: theme.colors.background.secondary,
    },
    filterTabActive: {
      backgroundColor: theme.colors.primary,
    },
    filterTabText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
    },
    filterTabTextActive: {
      color: theme.colors.text.inverse,
    },
    gridRow: {
      paddingHorizontal: theme.spacing.md,
      gap: CARD_GAP,
      marginBottom: CARD_GAP,
    },
    gridContent: {
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.xl,
    },
    rootCard: {
      width: CARD_WIDTH,
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.spacing.sm,
      padding: theme.spacing.sm,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    rootCardLit: {
      borderColor: theme.colors.warning,
      backgroundColor: theme.colors.warning + '08',
    },
    litIcon: {
      position: 'absolute',
      top: 8,
      right: 8,
    },
    rootName: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
      marginBottom: 2,
    },
    rootNameLit: {
      color: theme.colors.warning,
    },
    rootMeaning: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.tertiary,
      marginBottom: theme.spacing.sm,
    },
    rootProgressBar: {
      height: 4,
      backgroundColor: theme.colors.border.light,
      borderRadius: 2,
      overflow: 'hidden',
      marginBottom: 4,
    },
    rootProgressFill: {
      height: '100%',
      backgroundColor: theme.colors.primary,
      borderRadius: 2,
    },
    rootCount: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.tertiary,
      textAlign: 'right',
    },
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
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: theme.spacing.xl,
    },
    emptyText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.tertiary,
    },
  });
};
