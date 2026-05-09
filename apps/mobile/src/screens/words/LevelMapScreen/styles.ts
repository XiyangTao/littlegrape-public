import { StyleSheet } from 'react-native';
import { Theme } from '@/theme';

const NODE_SIZE = 56;
const NODES_PER_ROW = 5;

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
    backButton: {
      padding: theme.spacing.xs,
    },
    headerCenter: {
      flex: 1,
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
    placeholder: {
      width: 36,
    },

    // Scroll content
    scrollContent: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.md,
      paddingBottom: 120,
    },

    // Chapter section
    chapterHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: theme.spacing.lg,
      marginBottom: theme.spacing.sm,
    },
    chapterTitle: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.secondary,
      marginLeft: theme.spacing.xs,
    },

    // Level row
    levelRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
    },

    // Level node
    nodeContainer: {
      width: (theme.screen.width - theme.spacing.md * 2 - theme.spacing.sm * (NODES_PER_ROW - 1)) / NODES_PER_ROW,
      alignItems: 'center',
      marginBottom: theme.spacing.xs,
    },
    node: {
      width: NODE_SIZE,
      height: NODE_SIZE,
      borderRadius: NODE_SIZE / 2,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
    },
    nodeCompleted: {
      borderColor: 'transparent',
      backgroundColor: 'transparent',
    },
    nodeCurrent: {
      borderColor: 'transparent',
      backgroundColor: 'transparent',
    },
    nodeLocked: {
      borderColor: theme.colors.border.light,
      backgroundColor: theme.colors.background.secondary,
    },
    nodeNumber: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.inverse,
    },
    nodeNumberLocked: {
      color: theme.colors.text.disabled,
    },
    bossIcon: {
      position: 'absolute',
      top: -8,
      right: -4,
      fontSize: 16,
    },

    // Stars below node
    nodeStars: {
      flexDirection: 'row',
      marginTop: theme.spacing.xxs,
      gap: 1,
    },

    // Bottom floating button
    bottomContainer: {
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
    continueButton: {
      paddingVertical: theme.spacing.md,
      borderRadius: theme.spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    continueButtonText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.inverse,
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
  });
