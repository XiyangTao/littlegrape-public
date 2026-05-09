import { StyleSheet } from 'react-native';
import { Theme } from '@/context/ThemeProvider';

export const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  // 顶部导航栏
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backButton: {
    width: theme.scale(40),
    height: theme.scale(40),
    borderRadius: theme.scale(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },

  scrollView: {
    flex: 1,
  },

  // 标题区
  titleSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: theme.scale(20),
  },
  titleZh: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  titleEn: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.secondary,
    marginBottom: 12,
  },
  difficultyBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.spacing.borderRadius.sm,
  },
  difficultyText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
  },

  // 讲解内容区
  explanationSection: {
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },

  // AI 讲解 Header Row
  aiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  aiLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  aiLabelText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
  },
  ttsButton: {
    width: theme.scale(36),
    height: theme.scale(36),
    borderRadius: theme.scale(18),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
  },
  ttsButtonActive: {
    backgroundColor: theme.colors.primary,
  },

  // Section Card
  sectionCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.spacing.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  bodyText: {
    fontSize: theme.typography.fontSize.base,
    lineHeight: theme.fontScale(24),
    color: theme.colors.text.primary,
  },

  // 基本结构高亮框
  structureBox: {
    backgroundColor: theme.colors.primary + '10',
    borderRadius: theme.spacing.borderRadius.sm,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  structureText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
    lineHeight: theme.fontScale(24),
  },

  // 用法说明
  usageItem: {
    marginBottom: theme.spacing.md,
  },
  usageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  usageNumberBadge: {
    width: theme.scale(22),
    height: theme.scale(22),
    borderRadius: theme.scale(11),
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  usageNumberText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.inverse,
  },
  usageTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    flex: 1,
  },
  usageDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xs,
    marginLeft: theme.scale(30),
  },

  // 双语例句卡片
  bilingualCard: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.spacing.borderRadius.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  bilingualEn: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.primary,
    fontWeight: theme.typography.fontWeight.medium,
    marginBottom: theme.spacing.xxs,
    lineHeight: theme.fontScale(22),
  },
  bilingualCn: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    lineHeight: theme.fontScale(20),
  },
  highlightText: {
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.bold,
  },

  // 常见错误卡片
  errorCard: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.spacing.borderRadius.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xxs,
  },
  errorWrongText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.error,
    textDecorationLine: 'line-through',
    flex: 1,
  },
  errorCorrectText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.success,
    flex: 1,
  },
  errorExplanation: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
    marginLeft: theme.scale(20),
    lineHeight: theme.fontScale(20),
  },

  // 记忆技巧
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  tipText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.primary,
    flex: 1,
    lineHeight: theme.fontScale(22),
  },

  // 底部按钮
  bottomSection: {
    paddingHorizontal: 16,
    paddingBottom: theme.scale(32),
  },
  practiceButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.spacing.borderRadius.base,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  practiceButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.inverse,
  },

  // 加载状态
  loadingContainer: {
    padding: theme.scale(40),
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
  },

  // 骨架屏
  skeletonLine: {
    height: 16,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 4,
    marginBottom: 10,
  },
  skeletonShort: {
    width: '60%' as any,
  },
  skeletonMedium: {
    width: '80%' as any,
  },
});
