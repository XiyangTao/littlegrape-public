import { StyleSheet } from 'react-native';
import { Theme } from '@/context/ThemeProvider';

export const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },

  // ==================== 顶部导航 ====================
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  // 导航栏右侧日期按钮
  headerDateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: theme.spacing.sm + 2,
    paddingVertical: theme.spacing.xs + 2,
    borderRadius: theme.spacing.borderRadius.full,
  },
  headerDateButtonActive: {
    backgroundColor: theme.colors.primary + '12',
  },
  headerDateText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  headerDateTextActive: {
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.semibold,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ==================== 筛选区 ====================
  filterSection: {
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border.light,
  },

  // Row 1: 级别
  filterLevelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    gap: theme.spacing.sm,
  },
  filterChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs + 2,
    borderRadius: theme.spacing.borderRadius.full,
    backgroundColor: theme.colors.background.secondary,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
  },
  filterChipText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  filterChipTextActive: {
    color: theme.colors.text.inverse,
    fontWeight: theme.typography.fontWeight.semibold,
  },

  // Row 2: 分类
  filterScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    gap: theme.spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: theme.spacing.sm + 2,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.spacing.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    backgroundColor: 'transparent',
  },
  categoryChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '10',
  },
  categoryChipText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  categoryChipTextActive: {
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.semibold,
  },

  // ==================== 年月选择器弹窗 ====================
  pickerOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: theme.colors.background.primary,
    borderTopLeftRadius: theme.spacing.borderRadius.xl,
    borderTopRightRadius: theme.spacing.borderRadius.xl,
    paddingBottom: theme.spacing['2xl'],
    maxHeight: '70%',
  },
  pickerHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border.medium,
    alignSelf: 'center',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  pickerTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  // "全部时间"行（紧凑）
  pickerAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.spacing.borderRadius.sm,
    backgroundColor: theme.colors.background.secondary,
  },
  pickerAllRowActive: {
    backgroundColor: theme.colors.primary + '10',
  },
  pickerAllText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  pickerAllTextActive: {
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  // 年份分区标题
  pickerYearHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  pickerYearBar: {
    width: 3,
    height: 16,
    borderRadius: 1.5,
    backgroundColor: theme.colors.primary,
    marginRight: theme.spacing.sm,
  },
  pickerYearTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  // 月份网格
  pickerMonthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: theme.spacing.md,
  },
  pickerMonthCell: {
    width: '25%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm + 2,
    borderRadius: theme.spacing.borderRadius.sm,
  },
  pickerMonthCellSelected: {
    backgroundColor: theme.colors.primary + '15',
  },
  pickerMonthCellCurrent: {
    borderWidth: 1.5,
    borderColor: theme.colors.primary + '40',
  },
  pickerMonthCellDisabled: {
    opacity: 0.25,
  },
  pickerMonthName: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.primary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  pickerMonthNameSelected: {
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.bold,
  },
  pickerMonthNameDisabled: {
    color: theme.colors.text.disabled,
  },
  pickerMonthCount: {
    fontSize: 10,
    color: theme.colors.text.disabled,
    marginTop: 2,
  },
  pickerMonthCountSelected: {
    color: theme.colors.primary,
  },

  // ==================== 列表 ====================
  listContent: {
    paddingTop: theme.spacing.xs,
    paddingBottom: theme.spacing.lg,
  },

  // 筛选结果提示
  resultHint: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  resultHintText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
  },

  // ==================== 月份分组标题 ====================
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  sectionBar: {
    width: 3,
    height: 14,
    borderRadius: 1.5,
    backgroundColor: theme.colors.primary,
    marginRight: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.primary,
    fontWeight: theme.typography.fontWeight.bold,
  },
  sectionLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border.light,
    marginHorizontal: theme.spacing.sm,
  },
  sectionCount: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.disabled,
  },

  // ==================== 今日精选卡片 ====================
  featuredCard: {
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    borderRadius: theme.spacing.borderRadius.base,
    overflow: 'hidden',
    backgroundColor: theme.colors.card,
    ...theme.spacing.shadows.sm,
  },
  featuredImageWrap: {
    width: '100%',
    height: theme.scale(170),
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredImageFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: theme.scale(80),
    justifyContent: 'flex-end',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  featuredBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
    borderRadius: theme.spacing.borderRadius.full,
    marginBottom: theme.spacing.xs,
  },
  featuredBadgeText: {
    fontSize: 11,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.inverse,
  },
  featuredTitleOnImage: {
    fontSize: theme.fontScale(18),
    fontWeight: theme.typography.fontWeight.bold,
    color: '#FFFFFF',
    lineHeight: theme.fontScale(24),
  },
  featuredContent: {
    padding: theme.spacing.md,
  },
  featuredTitleZh: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
  },
  featuredMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  featuredMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  featuredMetaText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
  },
  featuredMetaDivider: {
    width: 1,
    height: 12,
    backgroundColor: theme.colors.border.light,
  },

  // ==================== 文章卡片 ====================
  articleCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: theme.spacing.borderRadius.base,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm + 2,
    padding: theme.spacing.md,
    ...theme.spacing.shadows.sm,
  },

  articleImageWrap: {
    position: 'relative',
  },
  articleImage: {
    width: theme.scale(88),
    height: theme.scale(88),
    borderRadius: theme.spacing.borderRadius.sm,
    backgroundColor: theme.colors.background.tertiary,
  },
  articleImageFallback: {
    width: theme.scale(88),
    height: theme.scale(88),
    borderRadius: theme.spacing.borderRadius.sm,
    backgroundColor: theme.colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // 已完成：封面图下方标签（颜色由组件动态设置）
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 2,
    paddingHorizontal: theme.spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: theme.spacing.borderRadius.full,
    marginTop: theme.spacing.xs,
  },
  completedBadgeText: {
    fontSize: 9,
    fontWeight: theme.typography.fontWeight.bold,
  },

  articleContent: {
    flex: 1,
    marginLeft: theme.spacing.md,
    justifyContent: 'space-between',
  },
  articleTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    lineHeight: theme.fontScale(20),
  },
  articleTitleZh: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },

  articleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
    gap: theme.spacing.xs,
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: theme.typography.fontSize.xxs,
    color: theme.colors.text.tertiary,
  },
  metaDivider: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: theme.colors.border.medium,
  },
  levelBadge: {
    paddingHorizontal: theme.spacing.xs + 2,
    paddingVertical: 1,
    borderRadius: theme.spacing.borderRadius.full,
  },
  levelText: {
    fontSize: theme.typography.fontSize.xxs,
    fontWeight: theme.typography.fontWeight.semibold,
  },

  articleBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.xs,
  },
  articleBottomLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  readTimeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  readTimeText: {
    fontSize: theme.typography.fontSize.xxs,
    color: theme.colors.text.disabled,
  },
  wordCount: {
    fontSize: theme.typography.fontSize.xxs,
    color: theme.colors.text.disabled,
  },
  sourceText: {
    fontSize: theme.typography.fontSize.xxs,
    color: theme.colors.text.disabled,
    fontStyle: 'italic',
  },

  progressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  progressCompleted: {
    fontSize: theme.typography.fontSize.xxs,
    color: theme.colors.success,
    fontWeight: theme.typography.fontWeight.medium,
  },
  progressBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  progressBarTrack: {
    width: theme.scale(48),
    height: 3,
    borderRadius: 1.5,
    backgroundColor: theme.colors.border.light,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 1.5,
    backgroundColor: theme.colors.primary,
  },
  progressBarText: {
    fontSize: theme.typography.fontSize.xxs,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.medium,
  },

  // ==================== 底部状态 ====================
  footerContainer: {
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
  },
  footerText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.disabled,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
    marginTop: theme.spacing.md,
  },
});
