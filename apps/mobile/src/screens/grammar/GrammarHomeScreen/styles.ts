import { StyleSheet } from 'react-native';
import { Theme } from '@/context/ThemeProvider';

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },

  // 顶部进度卡片
  headerCard: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: theme.spacing.borderRadius.md,
    padding: 20,
    overflow: 'hidden',
  },
  headerTitle: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.inverse,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 16,
  },
  headerProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerProgressBar: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  headerProgressFill: {
    height: '100%',
    backgroundColor: theme.colors.background.primary,
    borderRadius: 4,
  },
  headerProgressText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.inverse,
  },
  // 等级标签行（顶部卡片下方）
  headerLevelsRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 6,
  },
  headerLevelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  headerLevelChipText: {
    fontSize: 10,
    fontWeight: theme.typography.fontWeight.semibold,
    color: 'rgba(255,255,255,0.9)',
  },

  // 等级分隔线
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 8,
    gap: 10,
  },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.spacing.borderRadius.sm,
  },
  levelBadgeText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.inverse,
  },
  levelName: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  levelProgress: {
    marginLeft: 'auto',
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
  },

  // 学习路径容器
  pathContainer: {
    paddingLeft: 16,
    paddingRight: 16,
  },

  // 单元卡片行（含左侧路径线）
  unitRow: {
    flexDirection: 'row',
  },
  // 左侧路径线区域
  pathLineArea: {
    width: 32,
    alignItems: 'center',
  },
  pathLineTop: {
    width: 2,
    flex: 1,
  },
  pathNode: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: theme.colors.border.medium,
    backgroundColor: theme.colors.background.primary,
  },
  pathNodeCompleted: {
    borderWidth: 0,
  },
  pathLineBottom: {
    width: 2,
    flex: 1,
  },
  pathLineSolid: {
    backgroundColor: theme.colors.border.light,
  },
  pathLineHidden: {
    backgroundColor: 'transparent',
  },

  // 单元卡片
  unitCard: {
    flex: 1,
    marginBottom: 10,
    backgroundColor: theme.colors.card,
    borderRadius: theme.spacing.borderRadius.md,
    overflow: 'hidden',
    ...theme.spacing.shadows.sm,
  },
  unitCardCurrent: {
    borderWidth: 2,
  },
  unitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  unitIconWrap: {
    width: 40,
    height: 40,
    borderRadius: theme.spacing.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  unitContent: {
    flex: 1,
  },
  unitName: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  unitMeta: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.secondary,
  },
  unitArrow: {
    marginLeft: 4,
  },
  // 当前推荐标签
  unitCurrentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 8,
  },
  unitCurrentBadgeText: {
    fontSize: 10,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.inverse,
  },

  // 单元进度条
  unitProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 10,
  },
  unitProgressBar: {
    flex: 1,
    height: 4,
    backgroundColor: theme.colors.border.light,
    borderRadius: 2,
    overflow: 'hidden',
  },
  unitProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  unitProgressText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
    minWidth: 32,
    textAlign: 'right',
  },

  // 展开后的语法点列表
  pointsList: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border.light,
  },
  pointItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border.light,
  },
  pointItemLast: {
    borderBottomWidth: 0,
  },
  pointStatusIcon: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  pointStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.border.medium,
  },
  pointContent: {
    flex: 1,
  },
  pointName: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.primary,
  },
  pointNameEn: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
    marginTop: 1,
  },
  pointScore: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    marginRight: 8,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 8,
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: theme.typography.fontWeight.semibold,
  },
});

export default createStyles;
