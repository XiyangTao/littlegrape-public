import { StyleSheet } from 'react-native';
import type { Theme } from '@/context/ThemeProvider';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background.primary,
    },

    // 导航栏
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    backButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
    },
    headerPlaceholder: {
      width: 40,
    },

    // [1] 总览渐变卡片
    overviewCard: {
      marginHorizontal: theme.spacing.md,
      marginTop: theme.spacing.sm,
      borderRadius: theme.spacing.borderRadius.lg,
      padding: theme.spacing.lg,
    },
    overviewTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: theme.spacing.md,
    },
    overviewLabel: {
      fontSize: theme.typography.fontSize.sm,
      color: 'rgba(255,255,255,0.8)',
      marginBottom: theme.spacing.xs,
    },
    overviewCost: {
      fontSize: theme.typography.fontSize['3xl'],
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.inverse,
    },
    overviewBudget: {
      alignItems: 'flex-end',
    },
    overviewBudgetLabel: {
      fontSize: theme.typography.fontSize.xs,
      color: 'rgba(255,255,255,0.7)',
      marginBottom: theme.spacing.xxs,
    },
    overviewBudgetValue: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.inverse,
    },
    progressBarOuter: {
      height: 6,
      backgroundColor: 'rgba(255,255,255,0.3)',
      borderRadius: theme.spacing.borderRadius.full,
      overflow: 'hidden',
      marginBottom: theme.spacing.md,
    },
    progressBarInner: {
      height: '100%',
      borderRadius: theme.spacing.borderRadius.full,
      backgroundColor: theme.colors.background.primary,
    },
    overviewBottom: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    planBadge: {
      backgroundColor: 'rgba(255,255,255,0.2)',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xxs,
      borderRadius: theme.spacing.borderRadius.sm,
    },
    planBadgeText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.text.inverse,
    },
    upgradeButton: {
      backgroundColor: theme.colors.background.primary,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.spacing.borderRadius.sm,
    },
    upgradeButtonText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.primary,
    },

    // [2] Tab 切换
    tabContainer: {
      flexDirection: 'row',
      marginHorizontal: theme.spacing.md,
      marginTop: theme.spacing.lg,
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.spacing.borderRadius.sm,
      padding: 3,
    },
    tab: {
      flex: 1,
      paddingVertical: theme.spacing.sm,
      alignItems: 'center',
      borderRadius: theme.spacing.borderRadius.sm - 2,
    },
    tabActive: {
      backgroundColor: theme.colors.card,
      ...theme.spacing.shadows.sm,
    },
    tabText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.text.tertiary,
    },
    tabTextActive: {
      color: theme.colors.primary,
      fontWeight: theme.typography.fontWeight.semibold,
    },

    // [3] 图表区域
    chartCard: {
      marginHorizontal: theme.spacing.md,
      marginTop: theme.spacing.md,
      backgroundColor: theme.colors.card,
      borderRadius: theme.spacing.borderRadius.md,
      padding: theme.spacing.md,
      ...theme.spacing.shadows.sm,
    },
    chartTitle: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.md,
    },
    donutContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    donutCenter: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    donutCenterValue: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
      textAlign: 'center',
    },
    donutCenterLabel: {
      fontSize: theme.typography.fontSize.xxs,
      color: theme.colors.text.tertiary,
      textAlign: 'center',
      marginTop: 2,
    },
    legendContainer: {
      flex: 1,
      marginLeft: theme.spacing.lg,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    legendDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginRight: theme.spacing.sm,
    },
    legendText: {
      flex: 1,
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.secondary,
    },
    legendPercent: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
    },
    barChartWrapper: {
      alignItems: 'center',
      marginTop: theme.spacing.sm,
    },
    areaChartWrapper: {
      marginTop: theme.spacing.sm,
      marginLeft: -theme.spacing.sm,
    },
    emptyChart: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.xl,
    },
    emptyChartText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.tertiary,
    },

    // [5] 服务用量卡片
    serviceSection: {
      paddingHorizontal: theme.spacing.md,
      marginTop: theme.spacing.md,
    },
    serviceCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.card,
      borderRadius: theme.spacing.borderRadius.md,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.sm,
      ...theme.spacing.shadows.sm,
    },
    serviceIconWrap: {
      width: 44,
      height: 44,
      borderRadius: theme.spacing.borderRadius.base,
      alignItems: 'center',
      justifyContent: 'center',
    },
    serviceInfo: {
      flex: 1,
      marginLeft: theme.spacing.md,
    },
    serviceName: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.xxs,
    },
    serviceAmount: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.tertiary,
    },
    serviceCost: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },

    // [4] 收费说明
    pricingSection: {
      marginHorizontal: theme.spacing.md,
      marginTop: theme.spacing.lg,
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.spacing.borderRadius.md,
      padding: theme.spacing.md,
    },
    pricingSectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    pricingSectionTitle: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
      marginLeft: theme.spacing.xs,
    },
    pricingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border.light,
    },
    pricingRowLast: {
      borderBottomWidth: 0,
    },
    pricingName: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
    },
    pricingValue: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.text.primary,
    },
    pricingNote: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.tertiary,
      marginTop: theme.spacing.md,
      lineHeight: 18,
    },
  });

export default createStyles;
