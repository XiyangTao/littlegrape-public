import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { FlatList, ScrollView, TextInput, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useAuth } from '@/stores/AuthStore';
import { useTheme } from '@/context/ThemeProvider';
import { useCustomAlert } from '@/hooks/useCustomAlert';
import { useI18n } from '@/context/I18nProvider';
import type { LocalWord, LocalProgress, WordStatusFilter } from '@/types/word';
import {
  getWordProgressBatch,
  getLibraryStats,
  getWordsByLetter,
  getWordCountByLetter,
  getWordsByTags,
  getWordCountByTags,
  getAvailableLetters,
  searchWordsByLetter,
  searchWordCountByLetter,
  searchWordsInTags,
  searchWordCountInTags,
} from '@/services/WordService';
import { skipWord } from '@/services/LearningService';
import { LIBRARY_COLORS } from '@/constants/libraryConfig';
import { PICKER_ITEM_HEIGHT, PICKER_HEIGHT } from './styles';

// 每页显示数量
export const PAGE_SIZE = 20;

export type FilterType = 'all' | 'new' | 'learning' | 'mastered';

export const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'new', label: '未学' },
  { key: 'learning', label: '学习中' },
  { key: 'mastered', label: '已掌握' },
];

export interface WordWithProgress extends LocalWord {
  progress?: LocalProgress | null;
}

export default function useWordBook() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { t } = useI18n();
  const route = useRoute<any>();

  // 从路由参数获取词库 tag（必须传入）
  const tag = route.params?.tag as string;
  const currentTags = [tag];
  const themeColor = LIBRARY_COLORS[tag] || theme.colors.primary;

  const [searchText, setSearchText] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [words, setWords] = useState<WordWithProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, learned: 0, mastered: 0 });

  // 单词详情抽屉状态
  const [selectedWord, setSelectedWord] = useState<WordWithProgress | null>(null);
  const [showWordDetail, setShowWordDetail] = useState(false);

  // 批量操作状态
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { confirm, AlertComponent } = useCustomAlert();

  // 字母导航状态（null 表示不过滤字母，显示全部）
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [letterCounts, setLetterCounts] = useState<Map<string, number>>(new Map());
  const [currentLetterCount, setCurrentLetterCount] = useState(0);

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(currentLetterCount / PAGE_SIZE);
  const [showPagePicker, setShowPagePicker] = useState(false);
  const [pickerPage, setPickerPage] = useState(1);
  const pagePickerRef = useRef<FlatList>(null);

  const flatListRef = useRef<FlatList>(null);
  const letterScrollRef = useRef<ScrollView>(null);
  const searchInputRef = useRef<TextInput>(null);

  // 加载字母统计
  useEffect(() => {
    async function loadLetterCounts() {
      if (!tag) {
        setLetterCounts(new Map());
        return;
      }

      const letters = await getAvailableLetters(currentTags);
      const counts = new Map<string, number>();
      for (const { letter, count } of letters) {
        counts.set(letter, count);
      }
      setLetterCounts(counts);
    }
    loadLetterCounts();
  }, [tag]);

  // 加载统计数据
  useEffect(() => {
    async function loadStats() {
      if (!user?.id || !tag) return;

      const libraryStats = await getLibraryStats(user.id, tag);
      setStats(libraryStats);
    }
    loadStats();
  }, [tag, user?.id]);

  // 加载当前字母的单词数量（支持搜索过滤和状态过滤）
  useEffect(() => {
    async function loadLetterCount() {
      if (!tag || !user?.id) {
        setCurrentLetterCount(0);
        return;
      }

      let count: number;
      const statusFilter: WordStatusFilter = activeFilter;

      if (searchText.trim()) {
        if (selectedLetter === null) {
          count = await searchWordCountInTags(searchText.trim(), currentTags, user.id, statusFilter);
        } else {
          count = await searchWordCountByLetter(selectedLetter, searchText.trim(), currentTags, user.id, statusFilter);
        }
      } else {
        if (selectedLetter === null) {
          count = await getWordCountByTags(currentTags, user.id, statusFilter);
        } else {
          count = await getWordCountByLetter(selectedLetter, currentTags, user.id, statusFilter);
        }
      }
      setCurrentLetterCount(count);
    }
    loadLetterCount();
  }, [selectedLetter, tag, searchText, letterCounts, activeFilter, user?.id]);

  // 加载单词列表
  const loadWords = useCallback(async (page: number) => {
    if (!user?.id || !tag) return;

    setIsLoading(true);

    try {
      let loadedWords: LocalWord[];
      const offset = (page - 1) * PAGE_SIZE;
      const statusFilter: WordStatusFilter = activeFilter;

      if (searchText.trim()) {
        if (selectedLetter === null) {
          loadedWords = await searchWordsInTags(
            searchText.trim(),
            currentTags,
            offset,
            PAGE_SIZE,
            user.id,
            statusFilter
          );
        } else {
          loadedWords = await searchWordsByLetter(
            selectedLetter,
            searchText.trim(),
            currentTags,
            offset,
            PAGE_SIZE,
            user.id,
            statusFilter
          );
        }
      } else {
        if (selectedLetter === null) {
          loadedWords = await getWordsByTags(
            currentTags,
            offset,
            PAGE_SIZE,
            user.id,
            statusFilter
          );
        } else {
          loadedWords = await getWordsByLetter(
            selectedLetter,
            currentTags,
            offset,
            PAGE_SIZE,
            user.id,
            statusFilter
          );
        }
      }

      // 批量获取学习进度
      const wordIds = loadedWords.map(w => w.id);
      const progressMap = await getWordProgressBatch(user.id, wordIds);

      // 组合单词和进度
      const wordsWithProgress: WordWithProgress[] = loadedWords.map(word => ({
        ...word,
        progress: progressMap.get(word.id) || null,
      }));

      setWords(wordsWithProgress);
    } catch (error) {
      console.error('加载单词失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [tag, selectedLetter, searchText, user?.id, currentTags, activeFilter]);

  // 切换字母/搜索/状态过滤时重置为第一页
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedLetter, searchText, activeFilter]);

  // 加载当前页数据
  useEffect(() => {
    loadWords(currentPage);
    // 滚动到顶部
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [currentPage, selectedLetter, searchText, activeFilter]);

  // 上一页
  const handlePrevPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  }, [currentPage]);

  // 下一页
  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  }, [currentPage, totalPages]);

  // 页码列表数据
  const pageNumbers = useMemo(() => {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }, [totalPages]);

  // 打开页码选择器
  const openPagePicker = useCallback(() => {
    setPickerPage(currentPage);
    setShowPagePicker(true);
    // 滚动到当前页码位置
    setTimeout(() => {
      pagePickerRef.current?.scrollToOffset({
        offset: (currentPage - 1) * PICKER_ITEM_HEIGHT,
        animated: false,
      });
    }, 100);
  }, [currentPage]);

  // 处理滚动结束
  const handlePickerScrollEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / PICKER_ITEM_HEIGHT);
    const page = Math.max(1, Math.min(index + 1, totalPages));
    setPickerPage(page);
  }, [totalPages]);

  // 提交页码跳转
  const submitPageJump = useCallback(() => {
    setCurrentPage(pickerPage);
    setShowPagePicker(false);
  }, [pickerPage]);

  // 切换字母（点击已选中的字母取消选择）
  const handleLetterPress = useCallback((letter: string) => {
    if ((letterCounts.get(letter) || 0) > 0) {
      setSelectedLetter(selectedLetter === letter ? null : letter);
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    }
  }, [letterCounts, selectedLetter]);

  // 切换搜索
  const toggleSearch = useCallback(() => {
    setShowSearch(!showSearch);
    if (!showSearch) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else {
      setSearchText('');
    }
  }, [showSearch]);

  // 关闭单词详情
  const closeWordDetail = useCallback(() => {
    setShowWordDetail(false);
    setSelectedWord(null);
  }, []);

  // 选择单词
  const selectWord = useCallback((word: WordWithProgress) => {
    setSelectedWord(word);
    setShowWordDetail(true);
  }, []);

  // ==================== 批量操作 ====================

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

  const handleBatchSkip = useCallback(() => {
    if (!user?.id || selectedIds.size === 0) return;
    confirm(
      t('words.markMasteredBatchTitle', { count: selectedIds.size }),
      t('words.markMasteredDesc'),
      async () => {
        try {
          for (const wordId of selectedIds) {
            await skipWord(user.id, wordId);
          }
          // 刷新列表和统计
          setBatchMode(false);
          setSelectedIds(new Set());
          loadWords(currentPage);
          const libraryStats = await getLibraryStats(user.id, tag);
          setStats(libraryStats);
        } catch (error) {
          console.error('[WordBook] 批量跳过失败:', error);
        }
      },
    );
  }, [user?.id, selectedIds, confirm, loadWords, currentPage]);

  // 单词详情中跳过后刷新列表和统计
  const handleWordSkipped = useCallback(async () => {
    loadWords(currentPage);
    if (user?.id && tag) {
      const libraryStats = await getLibraryStats(user.id, tag);
      setStats(libraryStats);
    }
  }, [loadWords, currentPage, user?.id, tag]);

  return {
    // 路由参数
    tag,
    themeColor,
    // 状态
    searchText,
    setSearchText,
    showSearch,
    activeFilter,
    setActiveFilter,
    words,
    isLoading,
    stats,
    selectedWord,
    showWordDetail,
    selectedLetter,
    letterCounts,
    currentLetterCount,
    currentPage,
    totalPages,
    showPagePicker,
    setShowPagePicker,
    pickerPage,
    pageNumbers,
    // refs
    flatListRef,
    letterScrollRef,
    searchInputRef,
    pagePickerRef,
    // handlers
    handlePrevPage,
    handleNextPage,
    openPagePicker,
    handlePickerScrollEnd,
    submitPageJump,
    handleLetterPress,
    toggleSearch,
    closeWordDetail,
    selectWord,
    // 批量操作
    batchMode,
    selectedIds,
    toggleBatchMode,
    toggleSelectWord,
    handleBatchSkip,
    handleWordSkipped,
    AlertComponent,
  };
}
