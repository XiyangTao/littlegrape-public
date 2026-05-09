import { StyleSheet } from 'react-native';
import { Theme } from '@/context/ThemeProvider';

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background.primary,
    },
    keyboardAvoidingView: {
      flex: 1,
    },
    mainContent: {
      flex: 1,
      backgroundColor: theme.colors.background.tertiary,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.colors.background.primary,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.light,
      minHeight: 48,
    },
    backButton: {
      padding: theme.spacing.xs,
      zIndex: 1,
    },
    headerTitleContainer: {
      position: 'absolute',
      left: 48,
      right: 48,
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
      textAlign: 'center',
    },
    settingsButton: {
      position: 'absolute',
      right: theme.spacing.sm,
      padding: theme.spacing.xs,
      zIndex: 1,
    },
    messagesContainer: {
      flex: 1,
      paddingHorizontal: theme.spacing.sm,
    },
    messagesContent: {
      paddingVertical: theme.spacing.sm,
    },
    messageContainer: {
      flexDirection: 'row',
      marginBottom: theme.spacing.md,
      alignItems: 'flex-start',
      gap: theme.spacing.xxs,
    },
    userMessage: {
      justifyContent: 'flex-end',
    },
    aiMessage: {
      justifyContent: 'flex-start',
    },
    // 会话信息弹窗
    modalOverlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
      justifyContent: 'flex-end',
    },
    sessionInfoContainer: {
      backgroundColor: theme.colors.background.primary,
      borderTopLeftRadius: theme.spacing.borderRadius.lg,
      borderTopRightRadius: theme.spacing.borderRadius.lg,
      padding: theme.spacing.lg,
      maxHeight: '80%',
    },
    sessionInfoHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.lg,
    },
    sessionInfoTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
      flex: 1,
      textAlign: 'center',
      marginLeft: -20,
    },
    sessionInfoContent: {
      marginBottom: theme.spacing.lg,
    },
    sessionInfoItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.light,
    },
    sessionInfoLabel: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.secondary,
    },
    sessionInfoValue: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.primary,
      fontWeight: theme.typography.fontWeight.medium,
      maxWidth: '60%',
      textAlign: 'right',
    },
  });
