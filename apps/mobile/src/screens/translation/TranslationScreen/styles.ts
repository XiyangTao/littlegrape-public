import { StyleSheet } from 'react-native';
import { Theme } from '@/context/ThemeProvider';

export const createStyles = (theme: Theme, insets: { bottom: number }) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background.primary,
    },
    keyboardAvoidingView: {
      flex: 1,
    },

    // 顶部导航
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.light,
    },
    backButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text.primary,
      marginRight: theme.spacing.sm,
    },
    headerRight: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: theme.spacing.xs,
    },
    headerSettingsButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },

    // 主内容区域
    mainContent: {
      flex: 1,
      backgroundColor: theme.colors.background.tertiary,
    },

    // 翻译历史列表
    historyList: {
      flex: 1,
    },
    historyListContent: {
      padding: 16,
      paddingBottom: 8,
    },

    // 空状态
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingBottom: theme.scale(60),
    },
    emptyIconContainer: {
      width: theme.scale(80),
      height: theme.scale(80),
      borderRadius: theme.scale(40),
      backgroundColor: theme.colors.primary + '15',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.tertiary,
      textAlign: 'center',
      paddingHorizontal: theme.scale(40),
    },

    // 翻译卡片
    cardContainer: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.spacing.borderRadius.lg,
      marginBottom: 12,
      overflow: 'hidden',
    },
    // 源文本区域
    sourceSection: {
      padding: 16,
      paddingBottom: 12,
    },
    sourceLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    languageLabel: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.secondary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    voiceBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: 8,
      backgroundColor: theme.colors.primary + '15',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: theme.spacing.borderRadius.sm,
      gap: 3,
    },
    voiceBadgeText: {
      fontSize: 10,
      color: theme.colors.primary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    sourceText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.primary,
      lineHeight: theme.fontScale(22),
    },
    // 分隔线区域
    dividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
    },
    dividerAccent: {
      width: 3,
      height: theme.scale(20),
      backgroundColor: theme.colors.primary,
      borderRadius: 1.5,
      marginRight: 12,
    },
    dividerLine: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border.light,
    },
    // 翻译文本区域
    translationSection: {
      padding: 16,
      paddingTop: 12,
    },
    translationLabel: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.primary,
      fontWeight: theme.typography.fontWeight.medium,
      marginBottom: 8,
    },
    translationText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.primary,
      fontWeight: '500',
      lineHeight: theme.fontScale(22),
    },
    translationError: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.error,
      lineHeight: theme.fontScale(22),
    },
    pendingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    pendingText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.tertiary,
    },
    // 操作栏
    actionBar: {
      flexDirection: 'row',
      alignItems: 'center',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border.light,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    voicePlayBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.primary + '15',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: theme.spacing.borderRadius.base,
      gap: 4,
    },
    voicePlayBtnText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.primary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    actionSpacer: {
      flex: 1,
    },
    actionBtnGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: theme.spacing.borderRadius.sm,
      gap: 4,
    },
    actionBtnText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.tertiary,
    },
    actionBtnTextCopied: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.success,
    },
    ttsBtn: {
      width: 32,
      height: 32,
      borderRadius: theme.spacing.borderRadius.md,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 4,
    },

    // 底部输入区域
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.background.primary,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border.light,
      paddingHorizontal: 12,
      paddingTop: 12,
      paddingBottom: Math.max(insets.bottom, 12),
      gap: 10,
    },
    modeToggleButton: {
      width: theme.scale(40),
      height: theme.scale(40),
      justifyContent: 'center',
      alignItems: 'center',
    },
    holdToTalkButton: {
      flex: 1,
      height: theme.scale(40),
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.scale(20),
      justifyContent: 'center',
      alignItems: 'center',
    },
    holdToTalkText: {
      fontSize: 16,
      color: theme.colors.text.primary,
      fontWeight: '500',
    },
    textInput: {
      flex: 1,
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.scale(20),
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 16,
      color: theme.colors.text.primary,
      maxHeight: theme.scale(80),
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

    // 设置弹窗
    modalOverlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.spacing.borderRadius.md,
      padding: theme.scale(20),
      width: '85%',
      maxWidth: 360,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text.primary,
      textAlign: 'center',
      marginBottom: theme.scale(20),
    },
    autoPlayRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
    },
    autoPlayLabel: {
      fontSize: 16,
      color: theme.colors.text.primary,
    },
    autoPlayHint: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.tertiary,
      marginTop: 4,
    },
    modalDivider: {
      height: 1,
      backgroundColor: theme.colors.border.light,
      marginVertical: 16,
    },
    voiceSectionTitle: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.text.secondary,
      marginBottom: 10,
      marginTop: 10,
    },
    voiceOptions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    voiceOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: theme.scale(20),
      backgroundColor: theme.colors.background.secondary,
      borderWidth: 1,
      borderColor: theme.colors.border.light,
    },
    voiceAvatar: {
      width: 24,
      height: 24,
      borderRadius: 12,
    },
    voiceOptionSelected: {
      backgroundColor: theme.colors.primary + '20',
      borderColor: theme.colors.primary,
    },
    voiceOptionText: {
      fontSize: 14,
      color: theme.colors.text.secondary,
    },
    voiceOptionTextSelected: {
      color: theme.colors.primary,
      fontWeight: '500',
    },
    modalCloseButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.spacing.borderRadius.sm,
      paddingVertical: 12,
      marginTop: theme.scale(24),
      alignItems: 'center',
    },
    modalCloseButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text.inverse,
    },
  });
