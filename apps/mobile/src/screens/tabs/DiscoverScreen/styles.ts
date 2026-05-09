import { StyleSheet } from 'react-native';
import { Theme } from '@/context/ThemeProvider';

export const createStyles = (theme: Theme) => {
  const BANNER_PADDING = 24;
  const BANNER_CARD_WIDTH = theme.screen.width - BANNER_PADDING * 2;

  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  // 搜索框
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing['2xl'],
    marginBottom: theme.spacing.md,
    borderRadius: theme.spacing.borderRadius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
    ...theme.spacing.shadows.sm,
  },
  searchText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.tertiary,
    flex: 1,
  },
  // section 标题
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  viewAllText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary,
  },
  // Banner 轮播
  bannerContainer: {
    marginBottom: theme.spacing.md,
  },
  bannerPage: {
    width: theme.screen.width,
    paddingHorizontal: BANNER_PADDING,
  },
  bannerCard: {
    width: BANNER_CARD_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.spacing.borderRadius.lg,
    padding: theme.spacing.lg,
  },
  bannerIconWrap: {
    width: theme.scale(56),
    height: theme.scale(56),
    borderRadius: theme.spacing.borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.inverse,
    marginBottom: theme.spacing.xs,
  },
  bannerDesc: {
    fontSize: theme.typography.fontSize.sm,
    color: 'rgba(255,255,255,0.85)',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.border.medium,
  },
  dotActive: {
    width: 18,
    backgroundColor: theme.colors.primary,
  },
  // 每日一词
  dailyWordCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderRadius: theme.spacing.borderRadius.lg,
    padding: theme.spacing.lg,
    ...theme.spacing.shadows.sm,
  },
  dailyWordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  dailyWordBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  dailyWordBadgeText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
  },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  wordText: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  phoneticText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  meaningText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  exampleText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    fontStyle: 'italic',
    lineHeight: 20,
    marginBottom: theme.spacing.xxs,
  },
  exampleTranslation: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
    marginBottom: theme.spacing.md,
  },
  dailyWordActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  dailyWordActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.spacing.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border.medium,
  },
  dailyWordActionBtnActive: {
    backgroundColor: theme.colors.primary + '15',
    borderColor: theme.colors.primary,
  },
  dailyWordActionText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  dailyWordActionTextActive: {
    color: theme.colors.primary,
  },
  // 学习内容 2×2
  contentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: theme.spacing.lg,
    gap: 12,
    marginBottom: theme.spacing.md,
  },
  contentCard: {
    width: '47%' as any,
    flexGrow: 1,
    backgroundColor: theme.colors.card,
    borderRadius: theme.spacing.borderRadius.lg,
    padding: theme.spacing.md,
    ...theme.spacing.shadows.sm,
  },
  contentIconWrap: {
    width: 44,
    height: 44,
    borderRadius: theme.spacing.borderRadius.base,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  contentTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  contentDesc: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.secondary,
  },
  // 挑战赛场
  challengeCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.spacing.borderRadius.lg,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  challengeContent: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.inverse,
    marginBottom: theme.spacing.xs,
  },
  challengeDesc: {
    fontSize: theme.typography.fontSize.sm,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: theme.spacing.sm,
  },
  challengeBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.spacing.borderRadius.full,
    alignSelf: 'flex-start',
  },
  challengeBtnText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.inverse,
  },
  challengeIconWrap: {
    width: theme.scale(56),
    height: theme.scale(56),
    borderRadius: theme.scale(28),
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: theme.spacing.md,
  },
  challengeEntryRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    gap: 12,
    marginBottom: theme.spacing.md,
  },
  challengeEntryCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.spacing.borderRadius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    ...theme.spacing.shadows.sm,
  },
  challengeEntryIcon: {
    width: theme.scale(36),
    height: theme.scale(36),
    borderRadius: theme.spacing.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  challengeEntryText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
  },
  // 推荐关注
  recommendScroll: {
    paddingLeft: theme.spacing.lg,
    paddingRight: theme.spacing.sm,
    gap: 12,
    marginBottom: theme.spacing.md,
  },
  recommendCard: {
    width: 120,
    backgroundColor: theme.colors.card,
    borderRadius: theme.spacing.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    ...theme.spacing.shadows.sm,
  },
  recommendAvatar: {
    width: theme.scale(48),
    height: theme.scale(48),
    borderRadius: theme.scale(24),
    backgroundColor: theme.colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  recommendAvatarText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
  },
  recommendName: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xxs,
  },
  recommendStreak: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
  },
  followButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.spacing.borderRadius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  followButtonText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.inverse,
  },
  // 本周学习之星
  weeklyStarList: {
    marginHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.card,
    borderRadius: theme.spacing.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.spacing.shadows.sm,
  },
  weeklyStarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  starRank: {
    fontSize: theme.typography.fontSize.lg,
    width: 32,
    textAlign: 'center',
  },
  starName: {
    flex: 1,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
    marginLeft: theme.spacing.sm,
  },
  starCount: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.light,
    marginTop: theme.spacing.xs,
    gap: theme.spacing.xs,
  },
  viewAllButtonText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  });
};
