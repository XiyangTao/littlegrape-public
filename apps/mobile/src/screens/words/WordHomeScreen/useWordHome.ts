import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useCustomAlert } from '@/hooks/useCustomAlert';
import { useFocusLoader } from '@/hooks/useDataLoader';
import { setLibrary } from '@/services/LibraryService';
import { useAuth } from '@/stores/AuthStore';
import { useUserStore, useVocabularyTest } from '@/stores';
import {
  getLibraryStats,
  scheduleWordEncounterNotification,
} from '@/services/WordService';
import { getReviewWordCount } from '@/db/word/PracticeDB';
import { getFavoriteCount } from '@/db/word/FavoritesDB';
import { getDifficultCount } from '@/db/word/DifficultDB';
import { getErrorMessage } from '@/utils/errorUtils';
import { LibraryWithStats } from './types';

// ==================== 类型 ====================

export type HomeState = 'A' | 'B' | 'C';

export interface CTAData {
  unlearnedCount: number;
  practiceCount: number;
}

// 词库推荐逻辑
const VOCAB_RECOMMENDATIONS: Record<string, string[]> = {
  A1: ['小学', '初中'],
  A2: ['小学', '初中'],
  B1: ['高中', '四级'],
  B2: ['四级', '六级'],
  C1: ['六级', '考研'],
  C2: ['GRE', '托福'],
};

// ==================== Hook ====================

export function useWordHome() {
  const { user } = useAuth();
  const isUserDataLoading = useUserStore((state) => state.isLoading);
  const refreshUserData = useUserStore((state) => state.refresh);
  const currentLibraryTag = useUserStore((state) => state.currentLibraryTag);
  const learnSortMode = useUserStore((state) => state.learnSortMode);
  const setLearnSortMode = useUserStore((state) => state.setLearnSortMode);
  const { vocabularyTest, hasVocabularyTest } = useVocabularyTest();
  const navigation = useNavigation<any>();
  const { alert, AlertComponent } = useCustomAlert();

  const [isRefreshing, setIsRefreshing] = useState(false);

  // ==================== 数据加载 ====================

  const { data: loadedData, isLoading: isDataLoading, reload: reloadData } = useFocusLoader(
    async () => {
      if (!user?.id) return null;

      let currentLib: LibraryWithStats | null = null;
      let unlearnedCount = 0;
      let practiceWordCount = 0;

      if (currentLibraryTag) {
        const stats = await getLibraryStats(user.id, currentLibraryTag);
        currentLib = {
          tag: currentLibraryTag,
          totalCount: stats.total,
          learnedCount: stats.learned,
          masteredCount: stats.mastered,
          skippedCount: stats.skipped,
        };
        unlearnedCount = currentLib.totalCount - currentLib.learnedCount - currentLib.masteredCount;
        practiceWordCount = await getReviewWordCount(user.id, currentLibraryTag);
      }

      const [favCount, diffCount] = await Promise.all([
        getFavoriteCount(user.id),
        getDifficultCount(user.id),
      ]);

      return {
        currentLibrary: currentLib,
        cta: { unlearnedCount, practiceCount: practiceWordCount } as CTAData,
        favoriteCount: favCount,
        difficultCount: diffCount,
      };
    },
    [user?.id, currentLibraryTag],
  );

  const currentLibrary = loadedData?.currentLibrary ?? null;
  const cta = loadedData?.cta ?? { unlearnedCount: 0, practiceCount: 0 };
  const favoriteCount = loadedData?.favoriteCount ?? 0;
  const difficultCount = loadedData?.difficultCount ?? 0;

  // 调度单词遭遇通知
  useEffect(() => {
    if (user?.id) {
      scheduleWordEncounterNotification(user.id).catch(e =>
        console.warn('[WordHome] 调度遭遇通知失败:', e)
      );
    }
  }, [user?.id]);

  // ==================== 状态判断 ====================

  const hasVocabTest = hasVocabularyTest();
  const homeState: HomeState = useMemo(() => {
    if (currentLibrary) return 'C';
    if (hasVocabTest) return 'B';
    return 'A';
  }, [currentLibrary, hasVocabTest]);

  // 推荐词库（状态 B）
  const recommendedTags = useMemo(() => {
    if (!vocabularyTest?.level) return [];
    const level = vocabularyTest.level.split(' ')[0];
    return VOCAB_RECOMMENDATIONS[level] || ['四级', '六级'];
  }, [vocabularyTest?.level]);

  // ==================== 操作 ====================

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([reloadData(), refreshUserData()]);
    } finally {
      setIsRefreshing(false);
    }
  }, [reloadData, refreshUserData]);

  // 仅首次加载（无数据）时显示全屏 loading，后续聚焦刷新保持旧数据
  const isLoading = (isUserDataLoading || isDataLoading) && !loadedData;

  // 导航
  const handleOpenVocabularyTest = useCallback(() => {
    navigation.navigate('VocabularyTest');
  }, [navigation]);

  const handleSwitchLibrary = useCallback(() => {
    navigation.navigate('LibrarySelect');
  }, [navigation]);

  const handleOpenFavorites = useCallback(() => {
    navigation.navigate('FavoriteWords');
  }, [navigation]);

  const handleOpenDifficult = useCallback(() => {
    navigation.navigate('DifficultWords');
  }, [navigation]);

  const handleOpenWordBook = useCallback(() => {
    if (currentLibrary) {
      navigation.navigate('WordBook', { tag: currentLibrary.tag });
    }
  }, [navigation, currentLibrary]);

  const handleOpenRootMap = useCallback(() => {
    navigation.navigate('RootMap', { tag: currentLibrary?.tag });
  }, [navigation, currentLibrary]);

  const handleOpenSentenceChallenge = useCallback(() => {
    navigation.navigate('SentenceChallenge');
  }, [navigation]);

  const handleStartLearn = useCallback((sortMode: 'smart' | 'alphabetical' | 'random' = 'smart') => {
    if (currentLibrary) {
      setLearnSortMode(sortMode);
      navigation.navigate('Learn', { tag: currentLibrary.tag, sortMode });
    }
  }, [navigation, currentLibrary, setLearnSortMode]);

  const handleStartPractice = useCallback(() => {
    if (currentLibrary) {
      navigation.navigate('Practice', { tag: currentLibrary.tag });
    }
  }, [navigation, currentLibrary]);

  // 推荐词库直接选择
  const handleAddRecommendedLibrary = useCallback(async (tag: string) => {
    try {
      await setLibrary(tag);
    } catch (error) {
      alert('添加失败', getErrorMessage(error) || '请稍后重试', 'error');
    }
  }, [alert]);

  return {
    // 状态
    isLoading,
    isRefreshing,
    homeState,
    currentLibrary,
    vocabularyTest,
    learnSortMode,
    // CTA 数据
    cta,
    favoriteCount,
    difficultCount,
    // 推荐词库
    recommendedTags,
    // 导航
    navigation,
    // 操作
    handleRefresh,
    handleOpenVocabularyTest,
    handleSwitchLibrary,
    handleOpenFavorites,
    handleOpenDifficult,
    handleOpenWordBook,
    handleOpenRootMap,
    handleOpenSentenceChallenge,
    handleStartLearn,
    handleStartPractice,
    handleAddRecommendedLibrary,
    // Alert
    AlertComponent,
  };
}
