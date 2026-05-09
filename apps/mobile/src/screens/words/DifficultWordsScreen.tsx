import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import { useAuth } from '@/stores/AuthStore';
import Icon from '@/components/Icon';
import { LoadingView, EmptyView } from '@/components/common';
import type { LocalWord } from '@/types/word';
import { getDifficultWordsPaged, getDifficultCount } from '@/services/WordService';
import { removeDifficultWord, clearAllDifficultWords } from '@/services/DifficultService';
import WordDetailSheet from '@/components/WordDetailSheet';
import { useFocusLoader } from '@/hooks/useDataLoader';
import { useCustomAlert } from '@/hooks/useCustomAlert';

// 本地生词类型
interface DifficultWord extends LocalWord {
  wrongCount: number;
  correctCount: number;
  lastWrongAt: number;
}

type SortMode = 'time' | 'alpha';

const PAGE_SIZE = 20;

const SORT_OPTIONS: { key: SortMode; labelKey: string; icon: string }[] = [
  { key: 'time', labelKey: 'words.difficult.sortByTime', icon: 'schedule' },
  { key: 'alpha', labelKey: 'words.difficult.sortByAlpha', icon: 'sort-by-alpha' },
];

export default function DifficultWordsScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const styles = createStyles(theme);
  const { confirm, toast, AlertComponent } = useCustomAlert();
  const flatListRef = useRef<FlatList>(null);

  const [sortMode, setSortMode] = useState<SortMode>('time');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // 分页加载
  const { data: initialData, isLoading, reload } = useFocusLoader(
    async () => {
      if (!user?.id) return { words: [] as DifficultWord[], count: 0 };
      const [words, count] = await Promise.all([
        getDifficultWordsPaged(user.id, PAGE_SIZE, 0, sortMode),
        getDifficultCount(user.id),
      ]);
      return { words: words as DifficultWord[], count };
    },
    [user?.id],
  );

  const [words, setWords] = useState<DifficultWord[]>([]);

  // 同步 useFocusLoader 数据
  useEffect(() => {
    if (initialData) {
      setWords(initialData.words);
      setTotalCount(initialData.count);
      setCurrentPage(1);
    }
  }, [initialData]);

  // 加载指定页
  const loadWords = useCallback(async (page: number) => {
    if (!user?.id) return;
    const offset = (page - 1) * PAGE_SIZE;
    const [pageWords, count] = await Promise.all([
      getDifficultWordsPaged(user.id, PAGE_SIZE, offset, sortMode),
      getDifficultCount(user.id),
    ]);
    setWords(pageWords as DifficultWord[]);
    setTotalCount(count);
  }, [user?.id, sortMode]);

  // 切换排序时重置为第 1 页
  const handleSortChange = useCallback((mode: SortMode) => {
    if (mode === sortMode) return;
    setSortMode(mode);
  }, [sortMode]);

  // sortMode 变化时重新加载
  useEffect(() => {
    if (!user?.id || isLoading) return;
    setCurrentPage(1);
    loadWords(1);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [sortMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // 翻页
  const handlePrevPage = useCallback(() => {
    if (currentPage > 1) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      loadWords(newPage);
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    }
  }, [currentPage, loadWords]);

  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      loadWords(newPage);
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    }
  }, [currentPage, totalPages, loadWords]);

  // 刷新当前页（删除/批量操作后）
  const refreshCurrentPage = useCallback(async () => {
    if (!user?.id) return;
    const count = await getDifficultCount(user.id);
    setTotalCount(count);
    if (count === 0) {
      setWords([]);
      setCurrentPage(1);
      return;
    }
    // 如果当前页超出范围，跳到最后一页
    const maxPage = Math.ceil(count / PAGE_SIZE);
    const page = Math.min(currentPage, maxPage);
    setCurrentPage(page);
    const offset = (page - 1) * PAGE_SIZE;
    const pageWords = await getDifficultWordsPaged(user.id, PAGE_SIZE, offset, sortMode);
    setWords(pageWords as DifficultWord[]);
  }, [user?.id, currentPage, sortMode]);

  // 单词详情
  const [selectedWord, setSelectedWord] = useState<DifficultWord | null>(null);
  const [showWordDetail, setShowWordDetail] = useState(false);

  const handleOpenWord = useCallback((word: DifficultWord) => {
    setSelectedWord(word);
    setShowWordDetail(true);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setShowWordDetail(false);
    setSelectedWord(null);
  }, []);

  // 清空生词本
  const handleClearAll = useCallback(() => {
    if (totalCount === 0 || !user?.id) return;
    confirm(
      t('words.difficult.clearAllTitle'),
      t('words.difficult.clearAllConfirm', { count: totalCount }),
      async () => {
        try {
          await clearAllDifficultWords(user.id);
          setWords([]);
          setTotalCount(0);
          setCurrentPage(1);
        } catch (error) {
          console.error('[DifficultWords] Clear all failed:', error);
        }
      },
      undefined,
      'error',
    );
  }, [totalCount, user?.id, confirm]);

  // 批量操作
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleBatchMode = useCallback(() => {
    setBatchMode(prev => {
      if (prev) setSelectedIds(new Set());
      return !prev;
    });
  }, []);

  const toggleSelectWord = useCallback((wordId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(wordId)) {
        next.delete(wordId);
      } else {
        next.add(wordId);
      }
      return next;
    });
  }, []);

  const handleBatchRemove = useCallback(() => {
    if (!user?.id || selectedIds.size === 0) return;
    const count = selectedIds.size;
    confirm(
      t('words.difficult.batchRemoveTitle'),
      t('words.difficult.batchRemoveConfirm', { count }),
      async () => {
        try {
          for (const wordId of selectedIds) {
            await removeDifficultWord(user.id, wordId);
          }
          setBatchMode(false);
          setSelectedIds(new Set());
          refreshCurrentPage();
          toast(t('words.difficult.batchRemoveSuccess'), t('words.difficult.batchRemoveSuccessDesc', { count }), 'success');
        } catch (error) {
          console.error('[DifficultWords] 批量移除失败:', error);
        }
      },
    );
  }, [user?.id, selectedIds, confirm, toast, refreshCurrentPage]);

  // 专项练习
  const handlePractice = useCallback(() => {
    if (totalCount === 0) return;
    navigation.navigate('Practice', { source: 'difficult' });
  }, [totalCount, navigation]);

  // 格式化加入时间
  const formatAddedTime = useCallback((timestamp: number) => {
    const d = new Date(timestamp);
    const now = new Date();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    if (d.getFullYear() !== now.getFullYear()) {
      return `${d.getFullYear()}/${month}/${day}`;
    }
    return `${month}/${day}`;
  }, []);

  // 渲染单词项
  const renderWordItem = useCallback(({ item }: { item: DifficultWord }) => (
    <TouchableOpacity
      style={styles.wordItem}
      onPress={() => batchMode ? toggleSelectWord(item.id) : handleOpenWord(item)}
      activeOpacity={0.7}
    >
      {batchMode && (
        <View style={styles.checkboxContainer}>
          <Icon
            name={selectedIds.has(item.id) ? 'check-box' : 'check-box-outline-blank'}
            size={22}
            color={selectedIds.has(item.id) ? theme.colors.primary : theme.colors.text.disabled}
          />
        </View>
      )}
      <View style={styles.wordInfo}>
        <Text style={styles.wordText}>{item.word}</Text>
        <Text style={styles.meaningText} numberOfLines={1}>
          {item.meaningCn}
        </Text>
      </View>
      {!batchMode && item.lastWrongAt > 0 && (
        <Text style={styles.addedTime}>{formatAddedTime(item.lastWrongAt)}</Text>
      )}
    </TouchableOpacity>
  ), [styles, theme, batchMode, selectedIds, handleOpenWord, toggleSelectWord, formatAddedTime]);

  // 排序栏 + 清空按钮
  const renderSortBar = () => (
    <View style={styles.sortBar}>
      <View style={styles.sortOptions}>
        {SORT_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.key}
            style={[
              styles.sortOption,
              sortMode === opt.key && styles.sortOptionActive,
            ]}
            onPress={() => handleSortChange(opt.key)}
            activeOpacity={0.7}
          >
            <Icon
              name={opt.icon}
              size={14}
              color={sortMode === opt.key ? theme.colors.primary : theme.colors.text.tertiary}
            />
            <Text
              style={[
                styles.sortOptionText,
                sortMode === opt.key && styles.sortOptionTextActive,
              ]}
            >
              {t(opt.labelKey)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {!batchMode && totalCount > 0 && (
        <TouchableOpacity
          style={styles.clearAllButton}
          onPress={handleClearAll}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.clearAllText}>{t('words.difficult.clearAll')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // 列表头部
  const renderHeader = () => {
    if (words.length === 0) return null;
    return (
      <View>
        {/* 专项练习入口 */}
        {!batchMode && (
          <TouchableOpacity
            style={styles.practiceButton}
            onPress={handlePractice}
            activeOpacity={0.7}
          >
            <Icon name="fitness-center" size={20} color={theme.colors.text.inverse} />
            <Text style={styles.practiceButtonText}>{t('words.difficult.practice')}</Text>
            <Text style={styles.practiceButtonCount}>{t('words.difficult.practiceCount', { count: totalCount })}</Text>
          </TouchableOpacity>
        )}

        {/* 排序 + 清空 */}
        {renderSortBar()}
      </View>
    );
  };

  // 分页控件
  const renderPagination = useCallback(() => {
    if (totalPages <= 1) return null;
    return (
      <View style={styles.pagination}>
        <TouchableOpacity
          style={[styles.pageButton, currentPage === 1 && styles.pageButtonDisabled]}
          onPress={handlePrevPage}
          disabled={currentPage === 1}
        >
          <Icon
            name="chevron-left"
            size={24}
            color={currentPage === 1 ? theme.colors.text.disabled : theme.colors.primary}
          />
        </TouchableOpacity>
        <View style={styles.pageInfo}>
          <Text style={[styles.pageNumber, { color: theme.colors.primary }]}>{currentPage}</Text>
          <Text style={styles.pageSeparator}>/</Text>
          <Text style={styles.pageTotal}>{totalPages}</Text>
        </View>
        <TouchableOpacity
          style={[styles.pageButton, currentPage === totalPages && styles.pageButtonDisabled]}
          onPress={handleNextPage}
          disabled={currentPage === totalPages}
        >
          <Icon
            name="chevron-right"
            size={24}
            color={currentPage === totalPages ? theme.colors.text.disabled : theme.colors.primary}
          />
        </TouchableOpacity>
      </View>
    );
  }, [totalPages, currentPage, handlePrevPage, handleNextPage, styles, theme]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 头部 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('words.difficult.title')}</Text>
        <View style={styles.headerRight}>
          <Text style={styles.countText}>{t('words.difficult.count', { count: totalCount })}</Text>
          {totalCount > 0 && (
            <TouchableOpacity
              style={styles.batchModeButton}
              onPress={toggleBatchMode}
            >
              <Icon
                name={batchMode ? 'close' : 'checklist'}
                size={24}
                color={batchMode ? theme.colors.primary : theme.colors.text.primary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 内容 */}
      {isLoading ? (
        <LoadingView />
      ) : (
        <>
          <FlatList
            ref={flatListRef}
            data={words}
            keyExtractor={item => item.id}
            renderItem={renderWordItem}
            contentContainerStyle={words.length === 0 ? styles.emptyList : styles.list}
            ListHeaderComponent={renderHeader}
            ListEmptyComponent={
              <EmptyView
                icon="check-circle"
                iconColor={theme.colors.success}
                title={t('words.difficult.emptyTitle')}
                message={t('words.difficult.emptyMessage')}
              />
            }
            showsVerticalScrollIndicator={false}
          />
          {renderPagination()}
        </>
      )}

      {/* 批量操作底部栏 */}
      {batchMode && (
        <View style={styles.batchBar}>
          <Text style={styles.batchBarText}>
            {t('words.difficult.selectedCount', { count: selectedIds.size })}
          </Text>
          <TouchableOpacity
            style={[
              styles.batchBarButton,
              selectedIds.size === 0 && styles.batchBarButtonDisabled,
            ]}
            onPress={handleBatchRemove}
            disabled={selectedIds.size === 0}
            activeOpacity={0.8}
          >
            <Text style={styles.batchBarButtonText}>{t('words.difficult.removeFromList')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 单词详情抽屉 */}
      {selectedWord && (
        <WordDetailSheet
          visible={showWordDetail}
          word={selectedWord}
          onClose={handleCloseDetail}
          onSkipped={() => {
            setShowWordDetail(false);
            setSelectedWord(null);
            refreshCurrentPage();
          }}
        />
      )}

      {AlertComponent}
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
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
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginLeft: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  countText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  batchModeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
  },
  emptyList: {
    flex: 1,
  },
  // 专项练习按钮
  practiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.spacing.borderRadius.base,
    padding: 14,
    marginBottom: 12,
    gap: 8,
  },
  practiceButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.inverse,
  },
  practiceButtonCount: {
    fontSize: 13,
    color: theme.colors.text.inverse + 'CC',
  },
  // 排序栏
  sortBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sortOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.spacing.borderRadius.md,
    backgroundColor: theme.colors.background.secondary,
    gap: 4,
  },
  sortOptionActive: {
    backgroundColor: theme.colors.primary + '15',
  },
  sortOptionText: {
    fontSize: 12,
    color: theme.colors.text.tertiary,
  },
  sortOptionTextActive: {
    color: theme.colors.primary,
    fontWeight: '500',
  },
  clearAllButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearAllText: {
    fontSize: 13,
    color: theme.colors.error,
  },
  // 单词项
  wordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.spacing.borderRadius.base,
    padding: 14,
    marginBottom: 8,
  },
  checkboxContainer: {
    marginRight: 10,
  },
  wordInfo: {
    flex: 1,
  },
  wordText: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  meaningText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  addedTime: {
    fontSize: 12,
    color: theme.colors.text.disabled,
    marginLeft: 8,
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
    marginHorizontal: 20,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  pageNumber: {
    fontSize: 20,
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
  // 批量操作底部栏
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
    backgroundColor: theme.colors.error,
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
