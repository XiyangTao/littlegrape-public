import { StyleSheet } from 'react-native';
import { Theme } from '@/context/ThemeProvider';

export const createStyles = (theme: Theme, themeColor: string) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ==================== 顶部栏 ====================
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarTitle: {
    flex: 1,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginLeft: theme.spacing.xs,
  },
  topBarProgress: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },

  // ==================== 章节卡片滑动区 ====================
  chapterSection: {
    marginBottom: theme.spacing.md,
  },
  chapterScrollContent: {
    paddingLeft: theme.spacing.lg,
    paddingRight: theme.spacing.lg - theme.spacing.sm, // 最后一张卡片右侧留白
  },
  chapterCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.spacing.borderRadius.lg,
    overflow: 'hidden',
    marginRight: theme.spacing.sm, // 卡片间距
    ...theme.spacing.shadows.sm,
  },
  chapterCoverWrap: {
    width: '100%',
    aspectRatio: 2.4,
  },
  chapterCoverImage: {
    width: '100%',
    height: '100%',
  },
  chapterCoverPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chapterCoverEmoji: {
    fontSize: theme.fontScale(36),
  },
  chapterCoverGradient: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  chapterLabel: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    color: 'rgba(255,255,255,0.9)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // 章节信息区
  chapterInfoArea: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm + 2,
  },
  chapterTitleEn: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  chapterTitleZh: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  chapterDesc: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
    marginTop: theme.spacing.xs,
    lineHeight: theme.typography.fontSize.xs * 1.5,
  },
  chapterProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  chapterProgressBg: {
    flex: 1,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: theme.colors.border.light,
    overflow: 'hidden',
  },
  chapterProgressFill: {
    height: '100%',
    borderRadius: 2.5,
  },
  chapterProgressText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.tertiary,
  },

  // 分页圆点
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: theme.colors.border.medium,
  },
  dotActive: {
    width: 20,
    borderRadius: 3.5,
  },

  // ==================== 剧集列表 ====================
  episodeList: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing['2xl'],
  },
  episodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm + 2,
    paddingHorizontal: theme.spacing.sm,
    gap: theme.spacing.md,
  },

  // 状态圆点
  episodeStatusDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // 标题
  episodeTitleWrap: {
    flex: 1,
  },
  episodeTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
  },
  episodeTitleZh: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
    marginTop: 2,
  },

  // 星星
  starsRow: {
    flexDirection: 'row',
    gap: 1,
  },
});
