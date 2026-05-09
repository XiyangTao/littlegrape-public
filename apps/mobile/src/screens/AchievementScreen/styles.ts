import { StyleSheet } from 'react-native';
import { Theme } from '@/context/ThemeProvider';

export const createStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background.primary },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: {
    fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  content: { flex: 1, paddingHorizontal: theme.spacing.md },

  // 等级卡片
  levelCard: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.spacing.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  levelHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md },
  levelBadge: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  levelNumber: {
    fontSize: theme.typography.fontSize['2xl'], fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.inverse,
  },
  levelInfo: { flex: 1 },
  levelTitle: {
    fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.inverse,
  },
  levelSubtitle: {
    fontSize: theme.typography.fontSize.sm, color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  xpBarContainer: { alignItems: 'flex-end' },
  xpBarBackground: {
    width: '100%', height: 8, backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4, overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%', backgroundColor: theme.colors.background.primary, borderRadius: 4,
  },
  xpText: {
    fontSize: theme.typography.fontSize.xxs, color: 'rgba(255,255,255,0.7)',
    marginTop: theme.spacing.xs,
  },

  // 统计
  statsRow: { marginBottom: theme.spacing.md },
  statsText: {
    fontSize: theme.typography.fontSize.sm, color: theme.colors.text.secondary,
  },

  // 分类
  categorySection: { marginBottom: theme.spacing.lg },
  categoryTitle: {
    fontSize: theme.typography.fontSize.base, fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary, marginBottom: theme.spacing.sm,
  },
  achievementGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  achievementCard: {
    width: '48%',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.spacing.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    position: 'relative',
  },
  achievementCardLocked: { opacity: 0.5 },
  achievementIconWrap: {
    width: 52, height: 52, borderRadius: 26,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  achievementName: {
    fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary, marginBottom: theme.spacing.xxs,
    textAlign: 'center',
  },
  achievementNameLocked: { color: theme.colors.text.disabled },
  achievementDesc: {
    fontSize: theme.typography.fontSize.xxs, color: theme.colors.text.tertiary,
    textAlign: 'center', lineHeight: 16,
  },
  xpReward: {
    fontSize: theme.typography.fontSize.xxs, color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.medium, marginTop: theme.spacing.xs,
  },

  // 进度条
  progressContainer: {
    width: '100%', marginTop: theme.spacing.xs, alignItems: 'center',
  },
  progressBarBg: {
    width: '100%', height: 4, backgroundColor: theme.colors.border.light,
    borderRadius: 2, overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%', backgroundColor: theme.colors.primary, borderRadius: 2,
  },
  progressText: {
    fontSize: theme.typography.fontSize.xxs, color: theme.colors.text.tertiary,
    marginTop: 2,
  },

  // 稀有度徽章
  rarityBadge: {
    position: 'absolute', top: 6, right: 6,
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 4,
  },
  rarityText: {
    fontSize: 9, color: theme.colors.text.inverse, fontWeight: theme.typography.fontWeight.bold,
  },
  rarityPercentText: {
    fontSize: theme.typography.fontSize.xxs, color: theme.colors.text.tertiary,
    marginTop: 2,
  },

  // 阶梯 tier 进度点
  tierDots: {
    flexDirection: 'row', gap: 4, marginBottom: theme.spacing.xs,
  },
  tierDot: {
    width: 8, height: 8, borderRadius: 4,
  },

  // Tab 过滤栏
  filterRow: {
    flexDirection: 'row', gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  filterTab: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: 999,
    backgroundColor: theme.colors.background.secondary,
  },
  filterTabActive: {
    backgroundColor: theme.colors.primary,
  },
  filterTabText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.secondary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  filterTabTextActive: {
    color: theme.colors.text.inverse,
  },

  // 限时倒计时标签
  countdownBadge: {
    position: 'absolute', top: 6, left: 6,
    paddingHorizontal: 5, paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  countdownText: {
    fontSize: 9, color: theme.colors.text.inverse, fontWeight: theme.typography.fontWeight.bold,
  },
});
