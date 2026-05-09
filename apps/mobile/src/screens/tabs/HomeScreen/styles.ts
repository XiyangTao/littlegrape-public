import { StyleSheet } from 'react-native';
import { Theme } from '@/context/ThemeProvider';

export const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },

  // ==================== 问候 ====================
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  greeting: {
    flex: 1,
    fontSize: theme.fontScale(22),
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    letterSpacing: -0.3,
    lineHeight: theme.fontScale(30),
  },
  subGreeting: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
    lineHeight: theme.fontScale(20),
    height: theme.fontScale(20) * 2, // 固定两行高度，避免中英文切换时跳动
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.warning + '12',
    borderRadius: theme.spacing.borderRadius.full,
    paddingVertical: theme.spacing.xs + 2,
    paddingHorizontal: theme.spacing.sm + 2,
    gap: 4,
  },
  streakFire: {
    fontSize: 16,
  },
  streakNum: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.warning,
  },

  // ==================== 通用 Section ====================
  sectionTitle: {
    fontSize: theme.fontScale(18),
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    letterSpacing: -0.2,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  viewAll: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
  },

  // ==================== 名著精读入口 ====================
  classicsSection: {
    marginBottom: theme.spacing.lg,
  },
  classicsScroll: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  classicsCard: {
    width: 110,
  },
  classicsCover: {
    width: 110,
    height: 165,
    borderRadius: theme.spacing.borderRadius.sm,
    backgroundColor: theme.colors.background.secondary,
    marginBottom: theme.spacing.xs,
    ...theme.spacing.shadows.sm,
  },
  classicsCoverFallback: {
    width: 110,
    height: 165,
    borderRadius: theme.spacing.borderRadius.sm,
    backgroundColor: theme.colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  classicsTitle: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    lineHeight: 16,
  },
  classicsAuthor: {
    marginTop: 2,
    fontSize: theme.typography.fontSize.xxs,
    color: theme.colors.text.tertiary,
    fontStyle: 'italic',
  },

  // ==================== 互动故事 ====================
  storySection: {
    marginBottom: theme.spacing.lg,
  },
  storyCardsWrap: {
    paddingHorizontal: theme.spacing.lg,
  },
  storyCard: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: theme.spacing.borderRadius.lg,
    borderTopRightRadius: theme.spacing.borderRadius.lg,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    overflow: 'hidden',
  },
  storyCoverWrap: {
    width: '100%',
    aspectRatio: 2.2,
    position: 'relative',
  },
  storyCoverImage: {
    width: '100%',
    height: '100%',
  },
  storyCoverPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyCoverEmoji: {
    fontSize: theme.fontScale(40),
  },
  storyAvatarWrap: {
    position: 'absolute',
    bottom: -24,
    left: theme.spacing.lg,
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: theme.colors.card,
    overflow: 'hidden',
    ...theme.spacing.shadows.sm,
  },
  storyAvatar: {
    width: '100%',
    height: '100%',
  },
  storyInfoArea: {
    paddingTop: theme.spacing.lg + 4,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  storyCardTitle: {
    fontSize: theme.fontScale(18),
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  storyCardChapter: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginTop: 4,
  },
  storyProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  storyProgressBarBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.border.light,
    overflow: 'hidden',
  },
  storyProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  storyProgressText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.tertiary,
    minWidth: 36,
    textAlign: 'right',
  },
  storyCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.spacing.borderRadius.base,
    gap: 4,
  },
  storyCtaButtonText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    color: '#FFFFFF',
  },

  // ==================== 每日精读 — 轮播 Banner ====================
  readingSection: {
    marginBottom: theme.spacing.lg,
  },
  bannerWrap: {
    paddingHorizontal: theme.spacing.lg,
  },
  bannerScroll: {
    // no extra padding; cards fill bannerWrap
  },
  bannerCard: {
    height: theme.scale(200),
    borderRadius: theme.spacing.borderRadius.xl,
    overflow: 'hidden',
  },
  bannerImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  bannerImagePlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerGradient: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
  },
  bannerTitle: {
    fontSize: theme.fontScale(18),
    fontWeight: theme.typography.fontWeight.bold,
    color: '#FFFFFF',
    lineHeight: theme.fontScale(24),
  },
  bannerSubtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
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
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
  },
});
