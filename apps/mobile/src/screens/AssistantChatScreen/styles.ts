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
    // Header
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
    // 消息列表
    messagesList: {
      flex: 1,
      backgroundColor: theme.colors.background.tertiary,
    },
    messagesContent: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    // 消息气泡
    messageRow: {
      flexDirection: 'row',
      marginBottom: theme.spacing.md,
      alignItems: 'flex-start',
    },
    userMessageRow: {
      justifyContent: 'flex-end',
    },
    assistantMessageRow: {
      justifyContent: 'flex-start',
    },
    assistantAvatar: {
      width: theme.scale(36),
      height: theme.scale(36),
      borderRadius: theme.scale(18),
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.sm,
    },
    avatarText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.inverse,
      fontWeight: theme.typography.fontWeight.bold,
    },
    messageBubble: {
      maxWidth: '75%',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.spacing.borderRadius.sm,
    },
    userBubble: {
      backgroundColor: theme.colors.primary,
      borderTopRightRadius: theme.spacing.borderRadius.none,
    },
    assistantBubble: {
      backgroundColor: theme.colors.background.primary,
      borderTopLeftRadius: theme.spacing.borderRadius.none,
    },
    userMessageText: {
      fontSize: theme.typography.fontSize.base,
      lineHeight: theme.fontScale(22),
      color: theme.colors.text.inverse,
    },
    assistantMessageText: {
      fontSize: theme.typography.fontSize.base,
      lineHeight: theme.fontScale(22),
      color: theme.colors.text.primary,
    },
    // Typing 指示器
    typingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    typingBubble: {
      backgroundColor: theme.colors.background.primary,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.spacing.borderRadius.sm,
      borderTopLeftRadius: theme.spacing.borderRadius.none,
    },
    typingDots: {
      flexDirection: 'row',
      gap: 4,
    },
    typingDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.colors.text.tertiary,
    },
    // 快捷操作
    quickActionsContainer: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.background.primary,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border.light,
    },
    quickActionsScroll: {
      flexDirection: 'row',
    },
    quickActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.spacing.borderRadius.full,
      borderWidth: 1,
      borderColor: theme.colors.border.medium,
      marginRight: theme.spacing.sm,
      backgroundColor: theme.colors.background.secondary,
    },
    quickActionIcon: {
      marginRight: theme.spacing.xs,
    },
    quickActionText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.primary,
    },
    // 欢迎区域
    welcomeContainer: {
      alignItems: 'center',
      paddingVertical: theme.spacing.xl,
      paddingHorizontal: theme.spacing.lg,
    },
    welcomeAvatar: {
      width: theme.scale(64),
      height: theme.scale(64),
      borderRadius: theme.scale(32),
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    welcomeAvatarText: {
      fontSize: theme.typography.fontSize['2xl'],
      color: theme.colors.text.inverse,
      fontWeight: theme.typography.fontWeight.bold,
    },
    welcomeTitle: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.sm,
    },
    welcomeSubtitle: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.secondary,
      textAlign: 'center',
      lineHeight: theme.fontScale(22),
    },
    // 输入区域
    inputContainer: {
      backgroundColor: theme.colors.background.primary,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border.light,
      paddingHorizontal: theme.spacing.sm,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.sm,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    textInput: {
      flex: 1,
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.spacing.borderRadius.lg,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.primary,
      maxHeight: 100,
    },
    sendButton: {
      width: theme.scale(40),
      height: theme.scale(40),
      borderRadius: theme.scale(20),
      justifyContent: 'center',
      alignItems: 'center',
    },
    sendButtonActive: {
      backgroundColor: theme.colors.primary,
    },
    sendButtonInactive: {
      backgroundColor: theme.colors.background.secondary,
    },
    // 加载更多
    loadMoreContainer: {
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
    },
    // 时间分割线
    timeSeparator: {
      alignItems: 'center',
      marginVertical: theme.spacing.md,
    },
    timeSeparatorText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.tertiary,
      backgroundColor: theme.colors.background.tertiary,
      paddingHorizontal: theme.spacing.sm,
    },
    // 建议操作按钮
    suggestedActionsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginLeft: theme.scale(44), // 对齐助手气泡（头像 36 + marginRight 8）
      marginTop: -theme.spacing.sm,
      marginBottom: theme.spacing.md,
      gap: theme.spacing.xs,
    },
    suggestedActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.spacing.borderRadius.full,
      backgroundColor: theme.colors.primaryLight + '20',
      borderWidth: 1,
      borderColor: theme.colors.primaryLight,
    },
    suggestedActionText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.primary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    // 错误提示
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.error + '15',
    },
    errorText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.error,
      marginLeft: theme.spacing.xs,
    },
  });
