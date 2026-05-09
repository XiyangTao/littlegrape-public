/**
 * 学新词 Hook
 *
 * 加载未学单词（按难度排序），支持无限加载、实时保存。
 * 两个操作：
 *   - "去练习" → 出题测试，答对后标记 learned，进入艾宾浩斯复习
 *   - "已掌握" → 标记 mastered + skipped，不进入复习
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { FlatList, LayoutChangeEvent, ViewToken, useWindowDimensions } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useI18n } from '@/context/I18nProvider';
import { useAuth } from '@/stores/AuthStore';
import { useUserStore } from '@/stores';
import { getUnlearnedWordIds } from '@/db/word/WordQueryDB';
import { ensureWordDetails, getFullWords } from '@/db/word/WordDetailCacheDB';
import { getFavoritedWordIds } from '@/db/word/FavoritesDB';
import { generateMeaningChoice, generateWordPuzzle, type GeneratedQuestion } from '@/services/QuestionGenerator';
import { getErrorMessage } from '@/utils/errorUtils';
import type { LearnWordWithProgress } from '@/types/word';

const BATCH_SIZE = 20;
const PRELOAD_THRESHOLD = 5; // 距离末尾还剩 5 张时预加载

type SortMode = 'smart' | 'alphabetical' | 'random';

type LearnRouteParams = {
  Learn: { tag: string; sortMode?: SortMode };
};

export function useLearn() {
  const { height: screenHeight } = useWindowDimensions();
  const { t } = useI18n();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<LearnRouteParams, 'Learn'>>();
  const { tag, sortMode = 'smart' } = route.params;

  const learnWord = useUserStore((state) => state.learnWord);
  const skipWord = useUserStore((state) => state.skipWord);
  const vocabularyTest = useUserStore((state) => state.vocabularyTest);

  // 用户 BNC 等级（词汇量 / 1000），用于 smart 排序
  const userBncLevel = vocabularyTest?.estimatedVocabulary
    ? Math.round(vocabularyTest.estimatedVocabulary / 1000)
    : undefined;

  // ==================== 状态 ====================

  const [words, setWords] = useState<LearnWordWithProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cardHeight, setCardHeight] = useState(screenHeight);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const isCardFlippedRef = useRef(false);
  const [isKnownAnimating, setIsKnownAnimating] = useState(false);
  const isKnownAnimatingRef = useRef(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // 计数
  const [learnedCount, setLearnedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);

  // 练习状态
  const [practiceWord, setPracticeWord] = useState<LearnWordWithProgress | null>(null);
  const [practiceQuestions, setPracticeQuestions] = useState<GeneratedQuestion[]>([]);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [practicePhase, setPracticePhase] = useState<'answering' | 'feedback' | 'complete'>('answering');
  const [practiceCorrect, setPracticeCorrect] = useState(false);
  const [practiceAttempt, setPracticeAttempt] = useState(0); // 用于 key 重置组件
  const practiceWordRef = useRef<LearnWordWithProgress | null>(null);
  practiceWordRef.current = practiceWord;

  // 收藏状态
  const [favoritedIds, setFavoritedIds] = useState<Set<string>>(new Set());

  const handleFavoriteChange = useCallback((wordId: string, isFav: boolean) => {
    setFavoritedIds(prev => {
      const next = new Set(prev);
      if (isFav) next.add(wordId); else next.delete(wordId);
      return next;
    });
  }, []);

  // 已处理的词 ID（防止重复标记）
  const processedIdsRef = useRef(new Set<string>());

  // 预加载的 ID 列表 + 批次偏移
  const userIdRef = useRef(user?.id);
  userIdRef.current = user?.id;
  const allWordIdsRef = useRef<string[]>([]);
  const batchOffsetRef = useRef(0);
  const isLoadingMoreRef = useRef(false);

  // ==================== 加载单词 ====================

  /** 初始化：一次性查出排好序的未学词 ID（上限 1000），然后加载第一批详情 */
  const initLoad = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setLoadError(null);

    try {
      const ids = await getUnlearnedWordIds(user.id, [tag], sortMode, userBncLevel);
      allWordIdsRef.current = ids;
      batchOffsetRef.current = 0;

      if (ids.length === 0) {
        setLoadError(t('words.allWordsLearned'));
        return;
      }

      await loadNextBatch();
    } catch (error) {
      console.error('[Learn] 加载单词失败:', error);
      setLoadError(getErrorMessage(error) || t('words.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, tag, sortMode, userBncLevel]); // eslint-disable-line react-hooks/exhaustive-deps

  /** 按批次加载详情（从预加载的 ID 列表中切片） */
  const loadNextBatch = useCallback(async () => {
    if (isLoadingMoreRef.current) return;

    const batchIds = allWordIdsRef.current.slice(
      batchOffsetRef.current,
      batchOffsetRef.current + BATCH_SIZE
    );
    if (batchIds.length === 0) return;

    isLoadingMoreRef.current = true;
    try {
      await ensureWordDetails(batchIds).catch(() => {});
      const fullWords = await getFullWords(batchIds);
      const withProgress: LearnWordWithProgress[] = fullWords.map(w => ({ ...w, progress: null }));
      // 批量查收藏状态
      const userId = userIdRef.current;
      if (userId) {
        const favIds = await getFavoritedWordIds(batchIds, userId);
        if (favIds.size > 0) {
          setFavoritedIds(prev => {
            const next = new Set(prev);
            favIds.forEach(id => next.add(id));
            return next;
          });
        }
      }
      setWords(prev => [...prev, ...withProgress]);
      batchOffsetRef.current += BATCH_SIZE;
    } catch (error) {
      console.error('[Learn] 加载详情失败:', error);
    } finally {
      isLoadingMoreRef.current = false;
    }
  }, []);

  // 初始加载
  useEffect(() => {
    initLoad();
  }, [user?.id, tag]); // eslint-disable-line react-hooks/exhaustive-deps

  // ==================== 布局 ====================

  const onContainerLayout = useCallback((event: LayoutChangeEvent) => {
    setCardHeight(event.nativeEvent.layout.height);
  }, []);

  // ==================== FlatList 回调 ====================

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  // 接近末尾时预加载下一批
  useEffect(() => {
    if (words.length > 0 && currentIndex >= words.length - PRELOAD_THRESHOLD) {
      loadNextBatch();
    }
  }, [currentIndex, words.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ==================== 练习操作 ====================

  /** "去练习" — 生成 2 道题（看词选义 + 拼写拼图），进入练习 */
  const handleEnterPractice = useCallback(async (word: LearnWordWithProgress) => {
    if (!user?.id) return;
    try {
      const q1 = await generateMeaningChoice(word);
      const q2 = generateWordPuzzle(word);
      setPracticeWord(word);
      setPracticeQuestions([q1, q2]);
      setPracticeIndex(0);
      setPracticePhase('answering');
      setPracticeCorrect(false);
      setPracticeAttempt(0);
      submitRef.current = null;
      setCanSubmit(false);
    } catch (error) {
      console.error('[Learn] 生成练习题失败:', error);
    }
  }, [user?.id]);

  // submitRef（供需要手动提交的题型使用）
  const submitRef = useRef<(() => void) | null>(null);
  const [canSubmit, setCanSubmit] = useState(false);

  /** 答题回调 */
  const handlePracticeAnswer = useCallback((correct: boolean) => {
    // word_puzzle 答错时忽略，让组件内部重试
    if (!correct && practiceQuestions[practiceIndex]?.type === 'word_puzzle') return;

    setPracticeCorrect(correct);
    setPracticePhase('feedback');

    if (correct) {
      // 答对 → 延迟后进下一题或完成
      setTimeout(() => {
        const nextIdx = practiceIndex + 1;
        if (nextIdx >= practiceQuestions.length) {
          // 全部完成 → 标记已学习
          setPracticePhase('complete');
          const word = practiceWordRef.current;
          if (word && !processedIdsRef.current.has(word.id)) {
            processedIdsRef.current.add(word.id);
            setLearnedCount(prev => prev + 1);
            setWords(prev => prev.map(w =>
              w.id === word.id
                ? { ...w, progress: { ...(w.progress as any), status: 'learned', isSkipped: 0 } }
                : w
            ));
            learnWord(word.id).catch(err => console.error('[Learn] 标记学习失败:', err));
          }
        } else {
          setPracticeIndex(nextIdx);
          setPracticePhase('answering');
          setPracticeCorrect(false);
          setPracticeAttempt(prev => prev + 1);
          submitRef.current = null;
          setCanSubmit(false);
        }
      }, 1000);
    }
    // 答错停在 feedback，等用户点重试
  }, [practiceQuestions, practiceIndex, learnWord]);

  /** 重试当前题 */
  const handlePracticeRetry = useCallback(() => {
    setPracticePhase('answering');
    setPracticeCorrect(false);
    setPracticeAttempt(prev => prev + 1);
    submitRef.current = null;
    setCanSubmit(false);
  }, []);

  /** 取消练习 */
  const handleCancelPractice = useCallback(() => {
    setPracticeWord(null);
    setPracticeQuestions([]);
    setPracticeIndex(0);
    setPracticePhase('answering');
    setPracticeCorrect(false);
    setPracticeAttempt(0);
  }, []);

  /** 完成后关闭练习 */
  const handlePracticeDismiss = useCallback(() => {
    setPracticeWord(null);
    setPracticeQuestions([]);
    setPracticeIndex(0);
    setPracticePhase('answering');
    setPracticeCorrect(false);
    setPracticeAttempt(0);
  }, []);

  const onSubmitReady = useCallback((ready: boolean) => {
    setCanSubmit(ready);
  }, []);

  // ==================== 标记操作 ====================

  /** "已掌握" — 跳过这个词，不进入复习 */
  const handleSkipWord = useCallback(async (word: LearnWordWithProgress) => {
    if (!user?.id) return;

    const alreadyProcessed = processedIdsRef.current.has(word.id);
    processedIdsRef.current.add(word.id);
    if (!alreadyProcessed) {
      setSkippedCount(prev => prev + 1);
    }

    // 立即更新本地状态，让 UI 反映变化
    setWords(prev => prev.map(w =>
      w.id === word.id
        ? { ...w, progress: { ...(w.progress as any), status: 'mastered', isSkipped: 1 } }
        : w
    ));

    try {
      await skipWord(word.id);
    } catch (error) {
      console.error('[Learn] 标记跳过失败:', error);
    }
  }, [user?.id, skipWord]);

  // ==================== 滚动控制 ====================

  const handleFlipChange = useCallback((flipped: boolean) => {
    isCardFlippedRef.current = flipped;
    const shouldBlock = flipped || isKnownAnimatingRef.current;
    flatListRef.current?.setNativeProps({ scrollEnabled: !shouldBlock });
    setIsCardFlipped(flipped);
  }, []);

  const handleKnownAnimatingChange = useCallback((animating: boolean) => {
    isKnownAnimatingRef.current = animating;
    const shouldBlock = isCardFlippedRef.current || animating;
    flatListRef.current?.setNativeProps({ scrollEnabled: !shouldBlock });
    setIsKnownAnimating(animating);
  }, []);

  const handleScrollBeginDrag = useCallback(() => setIsScrolling(true), []);
  const handleMomentumScrollEnd = useCallback(() => setIsScrolling(false), []);
  const handleScrollEndDrag = useCallback(() => {
    setTimeout(() => setIsScrolling(false), 100);
  }, []);

  // ==================== 退出 ====================

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return {
    // 数据
    words,
    isLoading,
    loadError,
    tag,
    // FlatList
    currentIndex,
    cardHeight,
    isScrolling,
    isCardFlipped,
    isKnownAnimating,
    flatListRef,
    onViewableItemsChanged,
    viewabilityConfig,
    onContainerLayout,
    // 计数
    learnedCount,
    skippedCount,
    totalProcessed: learnedCount + skippedCount,
    // 练习
    isPracticing: practiceQuestions.length > 0,
    practiceWord,
    practiceQuestion: practiceQuestions[practiceIndex] || null,
    practiceIndex,
    practiceTotal: practiceQuestions.length,
    practicePhase,
    practiceCorrect,
    practiceAttempt,
    canSubmit,
    submitRef,
    handleEnterPractice,
    handlePracticeAnswer,
    handlePracticeRetry,
    handleCancelPractice,
    handlePracticeDismiss,
    onSubmitReady,
    // 收藏
    favoritedIds,
    handleFavoriteChange,
    // 操作
    handleSkipWord,
    handleFlipChange,
    handleKnownAnimatingChange,
    handleScrollBeginDrag,
    handleScrollEndDrag,
    handleMomentumScrollEnd,
    handleGoBack,
    // 导航
    navigation,
  };
}
