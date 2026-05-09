import { StyleSheet } from 'react-native';
import { Theme } from '@/theme';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background.primary,
    },
    scrollView: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // ==================== 搜索栏 ====================

    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: theme.spacing.md,
      marginTop: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.spacing.borderRadius.base,
      gap: theme.spacing.sm,
    },
    searchBarText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.disabled,
    },

    // ==================== 状态 A ====================

    stateACard: {
      marginHorizontal: theme.spacing.md,
      marginTop: theme.spacing.lg,
      padding: theme.spacing.xl,
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.spacing.borderRadius.lg,
      alignItems: 'center',
    },
    stateAEmoji: {
      fontSize: 48,
      marginBottom: theme.spacing.md,
    },
    stateATitle: {
      fontSize: theme.typography.fontSize['2xl'],
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.sm,
    },
    stateADesc: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.secondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    stateAFeatures: {
      marginTop: theme.spacing.lg,
      marginBottom: theme.spacing.lg,
      alignSelf: 'flex-start',
      gap: theme.spacing.xs,
    },
    stateAFeatureItem: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.tertiary,
    },
    stateAButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary,
      borderRadius: theme.spacing.borderRadius.base,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      gap: theme.spacing.xs,
    },
    stateAButtonText: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.inverse,
    },

    skipTestCard: {
      marginHorizontal: theme.spacing.md,
      marginTop: theme.spacing.md,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.spacing.borderRadius.base,
      alignItems: 'center',
    },
    skipTestText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.tertiary,
      marginBottom: theme.spacing.xxs,
    },
    skipTestLink: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
    },

    // ==================== 状态 B ====================

    stateBGuideCard: {
      marginHorizontal: theme.spacing.md,
      marginTop: theme.spacing.md,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.spacing.borderRadius.base,
    },
    stateBGuideTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.xs,
    },
    stateBGuideDesc: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
      marginBottom: theme.spacing.md,
    },
    stateBLibraryItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.sm,
      borderRadius: theme.spacing.borderRadius.sm,
      marginBottom: theme.spacing.xs,
      gap: theme.spacing.sm,
    },
    stateBLibraryItemHighlight: {
      backgroundColor: theme.colors.primary + '08',
      borderWidth: 1,
      borderColor: theme.colors.primary + '30',
    },
    stateBLibraryIcon: {
      width: 40,
      height: 40,
      borderRadius: theme.spacing.borderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stateBLibraryInfo: {
      flex: 1,
    },
    stateBLibraryTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    stateBStarBadge: {
      fontSize: 14,
    },
    stateBLibraryName: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
    },
    stateBLibraryDesc: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.tertiary,
      marginTop: theme.spacing.xxs,
    },
    stateBViewAll: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      gap: theme.spacing.xxs,
    },
    stateBViewAllText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.primary,
      fontWeight: theme.typography.fontWeight.semibold,
    },

    // ==================== 状态 C ====================

    // 区域标题
    sectionTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
      marginHorizontal: theme.spacing.md,
      marginTop: theme.spacing.lg,
      marginBottom: theme.spacing.sm,
    },

    // 词库信息卡片
    libCard: {
      marginHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.card,
      borderRadius: theme.spacing.borderRadius.lg,
      padding: theme.spacing.lg,
      ...theme.spacing.shadows.md,
    },
    libCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    libCardIcon: {
      width: 40,
      height: 40,
      borderRadius: theme.spacing.borderRadius.base,
      justifyContent: 'center',
      alignItems: 'center',
    },
    libCardName: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
    },

    // 百分比 + 统计区域
    libBody: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: theme.spacing.md,
    },
    libPercentCol: {
      alignItems: 'center',
      paddingRight: theme.spacing.lg,
    },
    libPercentRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
    libPercent: {
      fontSize: 40,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.primaryDark,
    },
    libPercentSign: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.primaryDark,
      marginLeft: theme.spacing.xxs,
    },
    libPercentLabel: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.tertiary,
      marginTop: theme.spacing.xxs,
    },
    libStatsDivider: {
      width: 1,
      height: 48,
      backgroundColor: theme.colors.border.light,
    },
    libStatsCol: {
      flex: 1,
      paddingLeft: theme.spacing.lg,
      gap: theme.spacing.xs,
    },
    libStatItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    libStatNum: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.secondary,
    },
    libStatLabel: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.tertiary,
    },

    // 操作卡片容器
    actionSection: {
      marginHorizontal: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    actionCard: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.spacing.borderRadius.lg,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      ...theme.spacing.shadows.md,
    },
    actionIcon: {
      width: 44,
      height: 44,
      borderRadius: theme.spacing.borderRadius.base,
      justifyContent: 'center',
      alignItems: 'center',
    },
    actionContent: {
      flex: 1,
    },
    actionTitle: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
    },
    actionDesc: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.tertiary,
      marginTop: theme.spacing.xxs,
    },
    completedCard: {
      backgroundColor: theme.colors.success + '08',
      borderRadius: theme.spacing.borderRadius.lg,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },

    // 工具箱
    toolGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    toolCard: {
      width: '31%',
      alignItems: 'center',
      backgroundColor: theme.colors.card,
      borderRadius: theme.spacing.borderRadius.base,
      paddingVertical: theme.spacing.md,
      ...theme.spacing.shadows.md,
    },
    toolIcon: {
      width: 36,
      height: 36,
      borderRadius: theme.spacing.borderRadius.base,
      alignItems: 'center',
      justifyContent: 'center',
    },
    toolLabel: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.secondary,
      fontWeight: theme.typography.fontWeight.medium,
      marginTop: theme.spacing.xs,
    },
    toolCount: {
      fontSize: theme.typography.fontSize.xxs,
      color: theme.colors.text.tertiary,
      marginTop: theme.spacing.xxs,
    },

    // ==================== 模式选择弹窗 ====================

    modalOverlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: theme.colors.background.primary,
      borderTopLeftRadius: theme.spacing.borderRadius.xl,
      borderTopRightRadius: theme.spacing.borderRadius.xl,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing['2xl'],
      paddingHorizontal: theme.spacing.md,
    },
    modalTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.md,
      paddingHorizontal: theme.spacing.xs,
    },
    modalOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm + 4,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.spacing.borderRadius.base,
      gap: theme.spacing.sm,
    },
    modalOptionActive: {
      backgroundColor: theme.colors.primary + '08',
    },
    modalOptionIcon: {
      width: 44,
      height: 44,
      borderRadius: theme.spacing.borderRadius.base,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalOptionContent: {
      flex: 1,
    },
    modalOptionLabel: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
    },
    modalOptionDesc: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.tertiary,
      marginTop: theme.spacing.xxs,
    },
    modalStartButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.spacing.borderRadius.base,
      paddingVertical: theme.spacing.sm + 4,
      alignItems: 'center',
      marginTop: theme.spacing.lg,
      marginHorizontal: theme.spacing.xs,
    },
    modalStartButtonText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.inverse,
    },
  });

export default createStyles;
