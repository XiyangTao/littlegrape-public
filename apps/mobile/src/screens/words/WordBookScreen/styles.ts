import { StyleSheet } from 'react-native';
import type { Theme } from '@/context/ThemeProvider';

// 页码选择器配置
export const PICKER_ITEM_HEIGHT = 44;
export const PICKER_VISIBLE_ITEMS = 5;
export const PICKER_HEIGHT = PICKER_ITEM_HEIGHT * PICKER_VISIBLE_ITEMS;

export const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },

  // 顶部导航
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // 搜索栏
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.spacing.borderRadius.base,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text.primary,
    marginLeft: 8,
    marginRight: 8,
  },

  // 统计信息
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.scale(20),
    paddingVertical: 12,
    backgroundColor: theme.colors.background.secondary,
    marginHorizontal: 16,
    borderRadius: theme.spacing.borderRadius.base,
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: theme.fontScale(20),
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: theme.scale(30),
    backgroundColor: theme.colors.border.light,
  },

  // 字母导航栏
  letterNavContainer: {
    marginBottom: 8,
  },
  letterNavContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  letterNavItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.spacing.borderRadius.base,
    backgroundColor: theme.colors.background.secondary,
    alignItems: 'center',
    minWidth: 44,
  },
  letterNavItemDisabled: {
    opacity: 0.4,
  },
  letterNavText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  letterNavTextSelected: {
    color: theme.colors.text.inverse,
  },
  letterNavTextDisabled: {
    color: theme.colors.text.disabled,
  },
  letterNavCount: {
    fontSize: 10,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  letterNavCountSelected: {
    color: theme.colors.text.inverse + 'CC',
  },

  // 当前字母信息
  letterInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  letterInfoText: {
    fontSize: 16,
    fontWeight: '600',
  },
  letterInfoCount: {
    fontSize: 13,
    color: theme.colors.text.secondary,
  },

  // 过滤标签
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.scale(20),
    backgroundColor: theme.colors.background.secondary,
  },
  filterTabActive: {
    backgroundColor: theme.colors.primary,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.secondary,
  },
  filterTabTextActive: {
    color: theme.colors.text.inverse,
  },

  // 主体内容
  contentContainer: {
    flex: 1,
  },

  // 列表
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: theme.scale(20),
  },
  wordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.spacing.borderRadius.base,
    padding: 12,
    marginBottom: 8,
  },
  wordItemLeft: {
    flex: 1,
    marginRight: 12,
  },
  wordItemText: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  wordItemTextSmall: {
    fontSize: 15,
  },
  wordItemMeaning: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    lineHeight: theme.fontScale(20),
  },
  wordPos: {
    color: theme.colors.primary,
    fontWeight: '500',
  },
  wordItemRight: {
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.spacing.borderRadius.sm,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // 加载状态
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // 分页控件
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.light,
    backgroundColor: theme.colors.background.primary,
  },
  pageButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
  },
  pageButtonDisabled: {
    opacity: 0.5,
  },
  pageInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginHorizontal: theme.scale(20),
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  pageNumber: {
    fontSize: theme.fontScale(20),
    fontWeight: '700',
  },
  pageSeparator: {
    fontSize: 16,
    color: theme.colors.text.disabled,
    marginHorizontal: 8,
  },
  pageTotal: {
    fontSize: 16,
    color: theme.colors.text.secondary,
  },

  // 空状态
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.scale(60),
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.text.disabled,
    marginTop: 16,
  },

  // 页码跳转底部弹窗
  pagePickerOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'flex-end',
  },
  pagePickerDismissArea: {
    flex: 1,
  },
  pagePickerContainer: {
    backgroundColor: theme.colors.background.primary,
    borderTopLeftRadius: theme.spacing.borderRadius.md,
    borderTopRightRadius: theme.spacing.borderRadius.md,
    paddingBottom: theme.scale(34),
  },
  pagePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  pagePickerCancel: {
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
  pagePickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  pagePickerConfirm: {
    fontSize: 16,
    fontWeight: '600',
  },
  pagePickerContent: {
    paddingVertical: 16,
    position: 'relative',
  },
  pagePickerHighlight: {
    position: 'absolute',
    top: 16 + PICKER_HEIGHT / 2 - PICKER_ITEM_HEIGHT / 2,
    left: theme.scale(20),
    right: theme.scale(20),
    height: PICKER_ITEM_HEIGHT,
    borderRadius: theme.spacing.borderRadius.sm,
    borderWidth: 1.5,
    backgroundColor: theme.colors.background.secondary,
    zIndex: 0,
  },
  pagePickerList: {
    height: PICKER_HEIGHT,
    width: '100%',
    zIndex: 1,
  },
  pagePickerItem: {
    height: PICKER_ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pagePickerItemText: {
    fontSize: theme.fontScale(20),
    color: theme.colors.text.secondary,
  },
  pagePickerItemTextSelected: {
    fontSize: theme.fontScale(22),
    fontWeight: '700',
  },
  pagePickerTotalLabel: {
    fontSize: 14,
    color: theme.colors.text.disabled,
    marginTop: 8,
    textAlign: 'center',
  },

  // 批量操作
  checkboxContainer: {
    marginRight: 10,
  },
  batchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.light,
    backgroundColor: theme.colors.background.primary,
  },
  batchBarText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  batchBarButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.spacing.borderRadius.sm,
    backgroundColor: theme.colors.primary,
  },
  batchBarButtonDisabled: {
    opacity: 0.4,
  },
  batchBarButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.inverse,
  },
});
