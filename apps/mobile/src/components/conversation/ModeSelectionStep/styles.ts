import { StyleSheet } from 'react-native';
import { Theme } from '@/context/ThemeProvider';

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background.tertiary,
    },
    content: {
      flex: 1,
    },
    modeSection: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      gap: theme.spacing.lg,
    },
    modeCardWrapper: {
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 6,
    },
    modeCard: {
      position: 'relative',
      borderRadius: theme.spacing.borderRadius.xl,
      padding: theme.spacing.lg,
      minHeight: 160,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    modeCardActive: {
      borderColor: theme.colors.background.primary + '4D',
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 10,
    },
    // 背景装饰圆圈
    decorationCircle1: {
      position: 'absolute',
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: theme.colors.background.primary + '1A',
      top: -40,
      right: -30,
    },
    decorationCircle2: {
      position: 'absolute',
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.colors.background.primary + '14',
      bottom: -20,
      left: -20,
    },
    // 选中标签
    badge: {
      position: 'absolute',
      top: theme.spacing.md,
      right: theme.spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.background.primary + '40',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xxs,
      borderRadius: theme.spacing.borderRadius.full,
      gap: theme.spacing.xxs,
      zIndex: 1,
    },
    badgeText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.inverse,
    },
    // 内容区域
    modeContent: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.md,
      zIndex: 1,
      marginTop: theme.spacing.md,
    },
    iconContainer: {
      width: 70,
      height: 70,
      borderRadius: theme.spacing.borderRadius.lg,
      overflow: 'hidden',
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    iconContainerActive: {
      shadowColor: theme.colors.background.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
    },
    iconGradient: {
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    modeInfo: {
      flex: 1,
      gap: theme.spacing.sm,
    },
    modeTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingRight: theme.spacing.xl,
    },
    modeTitle: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
    },
    modeTitleActive: {
      color: theme.colors.text.inverse,
    },
    recommendBadge: {
      backgroundColor: theme.colors.background.primary + '30',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 2,
      borderRadius: theme.spacing.borderRadius.full,
    },
    recommendText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.primary,
    },
    modeDescription: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
      lineHeight: 20,
    },
    modeDescriptionActive: {
      color: theme.colors.text.inverse + 'E6',
    },
    // 特点标签
    featureTags: {
      flexDirection: 'row',
      gap: theme.spacing.xs,
      marginTop: theme.spacing.xs,
    },
    featureTag: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.background.secondary,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xxs,
      borderRadius: theme.spacing.borderRadius.full,
      gap: theme.spacing.xxs,
    },
    featureTagActive: {
      backgroundColor: theme.colors.background.primary + '30',
    },
    featureTagText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.text.secondary,
    },
    featureTagTextActive: {
      color: theme.colors.text.inverse,
    },
    // 场景选择区域
    scenarioSection: {
      marginTop: theme.spacing.lg,
    },
    tabContainer: {
      flexDirection: 'row',
      paddingHorizontal: theme.spacing.lg,
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.md,
      backgroundColor: theme.colors.background.primary,
      borderRadius: theme.spacing.borderRadius.md,
      borderWidth: 2,
      borderColor: 'transparent',
      gap: theme.spacing.xs,
    },
    tabActive: {
      backgroundColor: theme.colors.primary + '10',
      borderColor: theme.colors.primary,
    },
    tabText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.text.secondary,
    },
    tabTextActive: {
      color: theme.colors.primary,
    },
    // 预定义场景列表
    scenarioList: {
      paddingHorizontal: theme.spacing.lg,
    },
    // 分类下拉选择器
    dropdownContainer: {
      marginBottom: theme.spacing.lg,
      zIndex: 100,
    },
    dropdownTrigger: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.background.primary,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.spacing.borderRadius.md,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 2,
    },
    dropdownTriggerPressed: {
      backgroundColor: theme.colors.background.secondary,
    },
    dropdownTriggerOpen: {
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      shadowOpacity: 0,
      elevation: 0,
    },
    dropdownTriggerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    dropdownSelectedIcon: {
      width: 32,
      height: 32,
      borderRadius: theme.spacing.borderRadius.md,
      backgroundColor: theme.colors.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
    },
    dropdownSelectedText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.text.primary,
    },
    dropdownMenu: {
      backgroundColor: theme.colors.background.primary,
      borderBottomLeftRadius: theme.spacing.borderRadius.md,
      borderBottomRightRadius: theme.spacing.borderRadius.md,
      overflow: 'hidden',
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 10,
      elevation: 5,
    },
    dropdownItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      height: 48,
      gap: theme.spacing.sm,
    },
    dropdownItemActive: {
      backgroundColor: theme.colors.primary + '08',
    },
    dropdownItemPressed: {
      backgroundColor: theme.colors.background.secondary,
    },
    dropdownItemBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border.light,
    },
    dropdownItemIcon: {
      width: 28,
      height: 28,
      borderRadius: theme.spacing.borderRadius.base,
      backgroundColor: theme.colors.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
    },
    dropdownItemIconActive: {
      backgroundColor: theme.colors.primary,
    },
    dropdownItemText: {
      flex: 1,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.text.primary,
    },
    dropdownItemTextActive: {
      color: theme.colors.primary,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    loadingContainer: {
      alignItems: 'center',
      paddingVertical: theme.spacing.xl * 2,
      gap: theme.spacing.md,
    },
    loadingText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
    },
    emptyContainer: {
      alignItems: 'center',
      paddingVertical: theme.spacing.xl * 2,
      gap: theme.spacing.md,
    },
    emptyText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
    },
    scenarioCard: {
      flexDirection: 'row',
      backgroundColor: theme.colors.background.primary,
      borderRadius: theme.spacing.borderRadius.lg,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: 'transparent',
      marginBottom: theme.spacing.sm,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    scenarioCardActive: {
      borderColor: theme.colors.primary,
      shadowOpacity: 0.15,
      elevation: 6,
    },
    scenarioImageContainer: {
      width: 100,
      height: 100,
      position: 'relative',
      overflow: 'hidden',
    },
    scenarioImageWrapper: {
      width: '117.6%',  // 100/85~=1.176，只显示左边85%
      height: '117.6%', // 100/85~=1.176，只显示上部85%
    },
    scenarioImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    selectedOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(99, 102, 241, 0.4)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkCircle: {
      width: 32,
      height: 32,
      borderRadius: theme.spacing.borderRadius.md,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scenarioInfo: {
      flex: 1,
      padding: theme.spacing.md,
      justifyContent: 'center',
    },
    scenarioTitle: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.xxs,
    },
    scenarioDescription: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
      lineHeight: 18,
    },
    // 自定义场景表单
    customForm: {
      paddingHorizontal: theme.spacing.lg,
      gap: theme.spacing.lg,
    },
    formGroup: {
      gap: theme.spacing.xs,
    },
    label: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
    },
    input: {
      backgroundColor: theme.colors.background.primary,
      borderWidth: 1,
      borderColor: theme.colors.border.light,
      borderRadius: theme.spacing.borderRadius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.primary,
      minHeight: 48,
    },
    textArea: {
      minHeight: 120,
      paddingTop: theme.spacing.sm,
      textAlignVertical: 'top',
    },
    charCount: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.secondary,
      textAlign: 'right',
      marginTop: theme.spacing.xxs,
    },
    // 下一步按钮
    nextButtonContainer: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.lg,
    },
    nextButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.spacing.borderRadius.lg,
      gap: theme.spacing.xs,
    },
    nextButtonDisabled: {
      backgroundColor: theme.colors.border.light,
      opacity: 0.6,
    },
    nextButtonText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.inverse,
    },
  });
