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
import { getFavoriteWordsPaged, getFavoriteCount } from '@/services/WordService';
import { useUserStore } from '@/stores';
import WordDetailSheet from '@/components/WordDetailSheet';
import { useFocusLoader } from '@/hooks/useDataLoader';

const PAGE_SIZE = 20;

export default function FavoriteWordsScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const { user } = useAuth();
  const { removeFavorite } = useUserStore();
  const navigation = useNavigation<any>();
  const styles = createStyles(theme);
  const flatListRef = useRef<FlatList>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // 分页加载
  const { data: initialData, isLoading } = useFocusLoader(
    async () => {
      if (!user?.id) return { words: [] as LocalWord[], count: 0 };
      const [words, count] = await Promise.all([
        getFavoriteWordsPaged(user.id, PAGE_SIZE, 0),
        getFavoriteCount(user.id),
      ]);
      return { words, count };
    },
    [user?.id],
  );

  const [words, setWords] = useState<LocalWord[]>([]);

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
      getFavoriteWordsPaged(user.id, PAGE_SIZE, offset),
      getFavoriteCount(user.id),
    ]);
    setWords(pageWords);
    setTotalCount(count);
  }, [user?.id]);

  // 刷新当前页
  const refreshCurrentPage = useCallback(async () => {
    if (!user?.id) return;
    const count = await getFavoriteCount(user.id);
    setTotalCount(count);
    if (count === 0) {
      setWords([]);
      setCurrentPage(1);
      return;
    }
    const maxPage = Math.ceil(count / PAGE_SIZE);
    const page = Math.min(currentPage, maxPage);
    setCurrentPage(page);
    const offset = (page - 1) * PAGE_SIZE;
    const pageWords = await getFavoriteWordsPaged(user.id, PAGE_SIZE, offset);
    setWords(pageWords);
  }, [user?.id, currentPage]);

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

  // 单词详情
  const [selectedWord, setSelectedWord] = useState<LocalWord | null>(null);
  const [showWordDetail, setShowWordDetail] = useState(false);

  const handleOpenWord = useCallback((word: LocalWord) => {
    setSelectedWord(word);
    setShowWordDetail(true);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setShowWordDetail(false);
    setSelectedWord(null);
  }, []);

  // 取消收藏
  const handleRemoveFavorite = useCallback(async (wordId: string) => {
    if (!user?.id) return;
    try {
      await removeFavorite(wordId);
      // 关闭详情（如果正在查看）
      if (selectedWord?.id === wordId) {
        setShowWordDetail(false);
        setSelectedWord(null);
      }
      refreshCurrentPage();
    } catch (error) {
      console.error('取消收藏失败:', error);
    }
  }, [user?.id, selectedWord, removeFavorite, refreshCurrentPage]);

  // 渲染单词项
  const renderWordItem = useCallback(({ item }: { item: LocalWord }) => (
    <TouchableOpacity
      style={styles.wordItem}
      onPress={() => handleOpenWord(item)}
      activeOpacity={0.7}
    >
      <View style={styles.wordInfo}>
        <Text style={styles.wordText}>{item.word}</Text>
        <Text style={styles.meaningText} numberOfLines={1}>
          {item.meaningCn}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => handleRemoveFavorite(item.id)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Icon name="star" size={22} color={theme.colors.warning} />
      </TouchableOpacity>
    </TouchableOpacity>
  ), [styles, theme, handleOpenWord, handleRemoveFavorite]);

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
        <Text style={styles.headerTitle}>{t('words.favorites.title')}</Text>
        <View style={styles.headerRight}>
          <Text style={styles.countText}>{t('words.favorites.count', { count: totalCount })}</Text>
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
            ListEmptyComponent={
              <EmptyView
                icon="star-outline"
                title={t('words.favorites.emptyTitle')}
                message={t('words.favorites.emptyMessage')}
              />
            }
            showsVerticalScrollIndicator={false}
          />
          {renderPagination()}
        </>
      )}

      {/* 单词详情抽屉 */}
      {selectedWord && (
        <WordDetailSheet
          visible={showWordDetail}
          word={selectedWord}
          isFavorited={true}
          onClose={handleCloseDetail}
          onFavoriteChange={(isFavorited) => {
            if (!isFavorited) {
              setShowWordDetail(false);
              setSelectedWord(null);
              refreshCurrentPage();
            }
          }}
        />
      )}
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
  },
  countText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginRight: 8,
  },
  list: {
    padding: 16,
  },
  emptyList: {
    flex: 1,
  },
  wordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.spacing.borderRadius.base,
    padding: 14,
    marginBottom: 8,
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
  removeButton: {
    padding: 8,
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
});
