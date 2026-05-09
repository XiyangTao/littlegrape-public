import { StyleSheet } from 'react-native';
import type { Theme } from '@/context/ThemeProvider';

export const createStyles = (theme: Theme, insets: { top: number }) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background.primary,
      paddingTop: insets.top,
    },

    // 顶部导航
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    backButton: {
      width: theme.scale(40),
      height: theme.scale(40),
      borderRadius: theme.scale(20),
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text.primary,
    },
    headerRight: {
      width: theme.scale(40),
    },

    // 介绍页
    introContainer: {
      flex: 1,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.scale(40),
      alignItems: 'center',
    },
    introIconWrap: {
      width: theme.scale(120),
      height: theme.scale(120),
      borderRadius: theme.scale(60),
      backgroundColor: theme.colors.primary + '15',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
    },
    introTitle: {
      fontSize: theme.fontScale(28),
      fontWeight: '700',
      color: theme.colors.text.primary,
      marginBottom: 8,
    },
    introSubtitle: {
      fontSize: 15,
      color: theme.colors.text.secondary,
      marginBottom: theme.scale(40),
    },
    introInfoList: {
      width: '100%',
      gap: 16,
      marginBottom: theme.spacing['2xl'],
    },
    introInfoItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    introInfoText: {
      fontSize: 15,
      color: theme.colors.text.secondary,
      flex: 1,
    },
    startButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary,
      paddingVertical: 16,
      paddingHorizontal: theme.spacing['2xl'],
      borderRadius: theme.scale(28),
      gap: 8,
    },
    startButtonText: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text.inverse,
    },

    // 已有测试结果卡片
    existingResultCard: {
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.scale(20),
      padding: theme.spacing.lg,
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
      width: '100%',
    },
    existingResultLabel: {
      fontSize: 14,
      color: theme.colors.text.secondary,
      marginBottom: 8,
    },
    existingResultValue: {
      fontSize: theme.fontScale(48),
      fontWeight: '800',
      color: theme.colors.primary,
      marginBottom: 12,
    },
    existingLevelBadge: {
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderRadius: theme.spacing.borderRadius.base,
      marginBottom: 12,
    },
    existingLevelText: {
      fontSize: 15,
      fontWeight: '600',
    },
    existingResultDate: {
      fontSize: 13,
      color: theme.colors.text.tertiary,
    },

    // 测试页
    testingContainer: {
      flex: 1,
      paddingHorizontal: theme.scale(20),
    },
    progressHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    progressInfo: {
      gap: 4,
    },
    progressText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text.primary,
    },
    estimateText: {
      fontSize: 12,
      color: theme.colors.text.tertiary,
    },
    progressBar: {
      height: 4,
      backgroundColor: theme.colors.background.secondary,
      borderRadius: 2,
      marginBottom: theme.scale(40),
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: theme.colors.primary,
      borderRadius: 2,
    },

    // 单词卡片
    wordCard: {
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.scale(20),
      padding: theme.spacing.lg,
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
    },
    bncLevelBadge: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.text.tertiary,
      backgroundColor: theme.colors.background.primary,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: theme.spacing.borderRadius.base,
      marginBottom: 16,
    },
    wordText: {
      fontSize: theme.fontScale(32),
      fontWeight: '700',
      color: theme.colors.text.primary,
      marginBottom: 8,
      textAlign: 'center',
    },
    phoneticText: {
      fontSize: 16,
      color: theme.colors.text.tertiary,
      textAlign: 'center',
    },

    // 4选1选项
    optionsContainer: {
      flex: 1,
    },
    questionPrompt: {
      fontSize: 15,
      color: theme.colors.text.secondary,
      marginBottom: 16,
      textAlign: 'center',
    },
    optionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.spacing.borderRadius.base,
      paddingVertical: 14,
      paddingHorizontal: 16,
      marginBottom: 12,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    optionCorrect: {
      backgroundColor: theme.colors.success + '15',
      borderColor: theme.colors.success,
    },
    optionWrong: {
      backgroundColor: theme.colors.error + '15',
      borderColor: theme.colors.error,
    },
    optionDisabled: {
      opacity: 0.5,
    },
    optionIdContainer: {
      width: theme.scale(28),
      height: theme.scale(28),
      borderRadius: theme.spacing.borderRadius.base,
      backgroundColor: theme.colors.background.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    optionId: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text.secondary,
    },
    optionIdCorrect: {
      color: theme.colors.success,
    },
    optionIdWrong: {
      color: theme.colors.error,
    },
    optionText: {
      flex: 1,
      fontSize: 15,
      color: theme.colors.text.primary,
      lineHeight: theme.fontScale(22),
    },
    optionTextCorrect: {
      color: theme.colors.success,
      fontWeight: '600',
    },
    optionTextWrong: {
      color: theme.colors.error,
    },
    optionTextDisabled: {
      color: theme.colors.text.tertiary,
    },

    // 不认识按钮
    skipButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: theme.scale(20),
      borderRadius: theme.spacing.borderRadius.base,
      borderWidth: 1,
      borderColor: theme.colors.border.light,
      borderStyle: 'dashed',
      marginTop: 8,
      gap: 6,
    },
    skipButtonSelected: {
      backgroundColor: theme.colors.text.tertiary,
      borderColor: theme.colors.text.tertiary,
      borderStyle: 'solid',
    },
    skipButtonText: {
      fontSize: 14,
      color: theme.colors.text.tertiary,
    },
    skipButtonTextSelected: {
      color: theme.colors.text.inverse,
    },

    // 结果页
    resultContainer: {
      flex: 1,
      paddingHorizontal: theme.scale(20),
    },
    resultCard: {
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.scale(24),
      padding: theme.spacing.lg,
      marginBottom: 16,
    },
    // 词汇量区域
    vocabSection: {
      alignItems: 'center',
      marginBottom: 8,
    },
    vocabLabel: {
      fontSize: 14,
      color: theme.colors.text.secondary,
      marginBottom: 4,
    },
    vocabValue: {
      fontSize: theme.fontScale(56),
      fontWeight: '800',
      color: theme.colors.primary,
      marginBottom: 4,
    },
    confidenceText: {
      fontSize: 12,
      color: theme.colors.text.tertiary,
    },
    // 分割线
    divider: {
      height: 1,
      backgroundColor: theme.colors.border.light,
      marginVertical: theme.scale(20),
    },
    // 等级说明区域
    levelDescSection: {
      marginBottom: 8,
      alignItems: 'center',
    },
    levelDescText: {
      fontSize: 14,
      color: theme.colors.text.secondary,
      lineHeight: theme.fontScale(22),
      textAlign: 'center',
    },
    // 进阶提示
    nextLevelHint: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.warning + '10',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: theme.spacing.borderRadius.sm,
      marginTop: 12,
      gap: 6,
    },
    nextLevelText: {
      fontSize: 13,
      color: theme.colors.text.secondary,
      lineHeight: 18,
      textAlign: 'center',
    },
    nextLevelHighlight: {
      color: theme.colors.warning,
      fontWeight: '600',
    },
    // 柱状图
    barChartContainer: {
      marginTop: theme.scale(20),
    },
    barChartInner: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      width: '100%',
      height: theme.scale(80),
    },
    barColumn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    barVocab: {
      fontSize: 10,
      color: theme.colors.text.tertiary,
      marginBottom: 3,
    },
    barVocabActive: {
      color: theme.colors.primary,
      fontWeight: '700',
    },
    bar: {
      width: theme.scale(28),
      borderRadius: 5,
    },
    barLabelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
      marginTop: 6,
    },
    barLabelColumn: {
      flex: 1,
      alignItems: 'center',
    },
    barLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.colors.text.tertiary,
    },
    barLabelActive: {
      color: theme.colors.primary,
      fontWeight: '700',
    },
    barDescContainer: {
      marginTop: 2,
      alignItems: 'center',
    },
    barDescChar: {
      fontSize: 10,
      color: theme.colors.text.disabled,
      lineHeight: 13,
    },
    barDescCharActive: {
      color: theme.colors.primary,
    },

    // 统计卡片
    statsCard: {
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.spacing.borderRadius.md,
      padding: theme.scale(20),
      marginBottom: theme.scale(20),
    },
    statsTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text.primary,
      marginBottom: 16,
    },
    statsGrid: {
      flexDirection: 'row',
      justifyContent: 'space-around',
    },
    statItem: {
      alignItems: 'center',
    },
    statValue: {
      fontSize: theme.fontScale(24),
      fontWeight: '700',
      color: theme.colors.text.primary,
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12,
      color: theme.colors.text.tertiary,
    },

    // 答题历史（保留但暂不使用）
    breakdownCard: {
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.spacing.borderRadius.md,
      padding: theme.scale(20),
      marginBottom: theme.scale(20),
    },
    breakdownHint: {
      fontSize: 12,
      color: theme.colors.text.tertiary,
      marginBottom: 16,
    },
    historyChart: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 12,
    },
    historyDot: {
      width: theme.scale(24),
      height: theme.scale(24),
      justifyContent: 'center',
      alignItems: 'center',
    },
    dot: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
    historyLegend: {
      fontSize: 12,
      color: theme.colors.text.tertiary,
      textAlign: 'center',
    },

    // 操作按钮
    resultActions: {
      flexDirection: 'row',
      gap: 16,
    },
    retryButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: theme.spacing.borderRadius.base,
      backgroundColor: theme.colors.primary + '15',
      gap: 8,
    },
    retryButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.primary,
    },
    doneButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: theme.spacing.borderRadius.base,
      backgroundColor: theme.colors.primary,
    },
    doneButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text.inverse,
    },
  });
