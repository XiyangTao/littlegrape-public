import { StyleSheet } from 'react-native';
import { Theme } from '@/context/ThemeProvider';

export const DRAG_THRESHOLD = 50;

export const createStyles = (theme: Theme, bottomInset: number) => StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.overlay,
  },
  backdropTouchable: {
    flex: 1,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.background.primary,
    borderTopLeftRadius: theme.spacing.borderRadius.lg,
    borderTopRightRadius: theme.spacing.borderRadius.lg,
    paddingBottom: bottomInset,
    maxHeight: theme.screen.height * 0.85,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: theme.colors.border.medium,
    borderRadius: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },

  // 头部
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  wordText: {
    fontSize: theme.fontScale(32),
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    letterSpacing: -0.5,
    flex: 1,
  },
  starButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // 音标区域
  phoneticSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
  },
  phoneticItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  phoneticPlayButton: {
    width: theme.scale(32),
    height: theme.scale(32),
    borderRadius: theme.scale(16),
    backgroundColor: theme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  phoneticPlayButtonLoading: {
    backgroundColor: theme.colors.primary + '30',
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
  },
  phoneticPlayButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  phoneticLabel: {
    fontSize: 12,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
  },
  phoneticText: {
    fontSize: 15,
    color: theme.colors.text.secondary,
  },

  // 标签行
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.spacing.borderRadius.base,
  },
  statusText: {
    fontSize: 12,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  tagBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.spacing.borderRadius.base,
  },
  tagText: {
    fontSize: 12,
    fontWeight: theme.typography.fontWeight.medium,
  },
  tagBadgeMore: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: theme.colors.background.tertiary,
    borderRadius: theme.spacing.borderRadius.base,
  },
  tagTextMore: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    fontWeight: theme.typography.fontWeight.medium,
  },

  // 义项列表
  meaningsSection: {
    marginBottom: 16,
  },
  meaningItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  meaningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  meaningIndex: {
    fontSize: 12,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.inverse,
    backgroundColor: theme.colors.primary,
    width: 20,
    height: 20,
    borderRadius: theme.spacing.borderRadius.sm,
    textAlign: 'center',
    lineHeight: 20,
    marginRight: 8,
    overflow: 'hidden',
  },
  posText: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.semibold,
    marginRight: 8,
  },
  registerBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
    backgroundColor: theme.colors.warning + '20',
  },
  registerBadgeSlang: {
    backgroundColor: theme.colors.error + '20',
  },
  registerBadgeInformal: {
    backgroundColor: theme.colors.warning + '20',
  },
  registerBadgeFormal: {
    backgroundColor: theme.colors.primary + '20',
  },
  registerBadgeDated: {
    backgroundColor: theme.colors.text.disabled + '40',
  },
  registerText: {
    fontSize: 10,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.secondary,
  },
  meaningText: {
    fontSize: 16,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
    flex: 1,
  },
  meaningEn: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginTop: 4,
    marginLeft: theme.scale(28),
    fontStyle: 'italic',
  },
  exampleContainer: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.spacing.borderRadius.sm,
    padding: 12,
    marginTop: 10,
    marginLeft: 28,
  },
  exampleEn: {
    fontSize: 14,
    color: theme.colors.text.primary,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  exampleCn: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    marginTop: 6,
    lineHeight: 20,
  },

  // 可折叠区域
  foldableSection: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.spacing.borderRadius.base,
    marginBottom: 12,
    overflow: 'hidden',
  },
  foldableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  foldableTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  foldableIcon: {
    fontSize: 16,
  },
  foldableTitle: {
    fontSize: 15,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },

  // 词根词缀内容
  etymologyContent: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 10,
  },
  etymologyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  etymologyLabelBadge: {
    backgroundColor: theme.colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 10,
  },
  etymologyLabelRoot: {
    backgroundColor: theme.colors.success + '20',
  },
  etymologyLabelSuffix: {
    backgroundColor: theme.colors.warning + '20',
  },
  etymologyLabel: {
    fontSize: 11,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.secondary,
  },
  etymologyValue: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    flex: 1,
  },
  etymologyPart: {
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  etymologyAnalysis: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    lineHeight: 20,
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.light,
  },

  // 常用搭配内容
  collocationsContent: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 8,
  },
  collocationItem: {
    backgroundColor: theme.colors.background.tertiary,
    borderRadius: theme.spacing.borderRadius.sm,
    padding: 10,
  },
  collocationPattern: {
    fontSize: 14,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  collocationMeaning: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    marginTop: 4,
  },
  collocationExamples: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.light,
  },
  collocationExample: {
    fontSize: 13,
    color: theme.colors.text.primary,
    lineHeight: 20,
    marginBottom: 4,
  },

  // 跳过按钮
  skipButton: {
    marginTop: 8,
    marginBottom: 8,
    paddingVertical: 12,
    borderRadius: theme.spacing.borderRadius.base,
    borderWidth: 1.5,
    borderColor: theme.colors.border.medium,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.secondary,
  },
});
