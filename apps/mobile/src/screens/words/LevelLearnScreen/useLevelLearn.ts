/**
 * 关卡学习逻辑 Hook — 三段式
 *
 * 阶段一（认识）：WordCard 卡片，"学习这个词" / "已掌握"
 * 阶段二（理解）：看词选义 + 重点词额外题
 * 阶段三（运用）：句子级题型
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  FlatList,
  ViewToken,
  useWindowDimensions,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useI18n } from '@/context/I18nProvider';
import { useAuth } from '@/stores/AuthStore';
import { useUserStore } from '@/stores';
import { getLevelByIndex, getWordsByIds, getBossLevelWordIds } from '@/db/word/LevelDB';
import { ensureWordDetails } from '@/db/word/WordDetailCacheDB';
import { getFavoritedWordIds } from '@/db/word/FavoritesDB';
import { getErrorMessage } from '@/utils/errorUtils';
import type { LearnWordWithProgress, LocalWord } from '@/types/word';
import type { LevelResult } from '@/types/level';
import {
  generateStage2Questions,
  generateStage3Questions,
  type GeneratedQuestion,
} from '@/services/QuestionGenerator';
import { useQuestionSession, type SessionResult } from '@/hooks/useQuestionSession';

// ==================== 类型 ====================

export type LevelPhase =
  | 'recognition'
  | 'transition1'
  | 'understanding'
  | 'transition2'
  | 'application'
  | 'completed';

type LevelLearnRouteParams = {
  LevelLearn: {
    tag: string;
    levelIndex: number;
  };
};

// ==================== Hook ====================

export function useLevelLearn() {
  const { height: screenHeight } = useWindowDimensions();
  const { t } = useI18n();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<LevelLearnRouteParams, 'LevelLearn'>>();

  const learnWord = useUserStore((state) => state.learnWord);
  const skipWord = useUserStore((state) => state.skipWord);

  const { tag, levelIndex } = route.params;

  // ==================== 状态 ====================

  // 通用状态
  const [words, setWords] = useState<LearnWordWithProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isBoss, setIsBoss] = useState(false);
  const [phase, setPhase] = useState<LevelPhase>('recognition');

  // 收藏状态
  const [favoritedIds, setFavoritedIds] = useState<Set<string>>(new Set());

  const handleFavoriteChange = useCallback((wordId: string, isFav: boolean) => {
    setFavoritedIds(prev => {
      const next = new Set(prev);
      if (isFav) next.add(wordId); else next.delete(wordId);
      return next;
    });
  }, []);

  // 阶段一状态
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cardHeight, setCardHeight] = useState(screenHeight);
  const [learnedWordIds, setLearnedWordIds] = useState<string[]>([]);
  const [skippedWordIds, setSkippedWordIds] = useState<string[]>([]);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const isCardFlippedRef = useRef(false);
  const [isKnownAnimating, setIsKnownAnimating] = useState(false);
  const isKnownAnimatingRef = useRef(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // 阶段二/三状态
  const [stage2Questions, setStage2Questions] = useState<GeneratedQuestion[]>([]);
  const [stage3Questions, setStage3Questions] = useState<GeneratedQuestion[]>([]);
  const [stage2Result, setStage2Result] = useState<SessionResult | null>(null);
  const [stage3Result, setStage3Result] = useState<SessionResult | null>(null);
  const [weakWordIds, setWeakWordIds] = useState<string[]>([]);

  // ==================== 加载关卡 ====================

  useEffect(() => {
    const loadLevelWords = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);

        if (!user?.id) {
          setLoadError(t('words.pleaseLogin'));
          return;
        }

        const level = await getLevelByIndex(tag, levelIndex);
        if (!level) {
          setLoadError(t('words.levelNotExist'));
          return;
        }

        const boss = level.isBoss;
        setIsBoss(boss);

        const wordIdsToLoad = boss
          ? await getBossLevelWordIds(tag, levelIndex)
          : level.wordIds;

        const loadedWords = await getWordsByIds(wordIdsToLoad, user.id);
        if (loadedWords.length === 0) {
          setLoadError(t('words.levelNoWords'));
          return;
        }

        // 批量查收藏状态
        const favIds = await getFavoritedWordIds(loadedWords.map(w => w.id), user.id);
        setFavoritedIds(favIds);

        setWords(loadedWords);
      } catch (error) {
        console.error('[LevelLearn] 加载关卡单词失败:', error);
        setLoadError(getErrorMessage(error) || t('words.loadFailed'));
      } finally {
        setIsLoading(false);
      }
    };

    loadLevelWords();
  }, [user?.id, tag, levelIndex]);

  // ==================== 布局 ====================

  const onContainerLayout = useCallback((event: any) => {
    setCardHeight(event.nativeEvent.layout.height);
  }, []);

  // ==================== FlatList 回调 ====================

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  // ==================== 阶段一操作 ====================

  /** "学习这个词" — 标记为学习中 */
  const handleLearnWord = useCallback(async (word: LearnWordWithProgress) => {
    if (!user?.id) return;

    try {
      setLearnedWordIds(prev => {
        if (prev.includes(word.id)) return prev;
        return [...prev, word.id];
      });
      await learnWord(word.id);
    } catch (error) {
      console.error('标记学习失败:', error);
    }
  }, [user?.id, learnWord]);

  /** "已掌握" — 跳过这个词 */
  const handleSkipWord = useCallback(async (word: LearnWordWithProgress) => {
    if (!user?.id) return;

    try {
      setSkippedWordIds(prev => {
        if (prev.includes(word.id)) return prev;
        return [...prev, word.id];
      });
      await skipWord(word.id);
    } catch (error) {
      console.error('标记跳过失败:', error);
    }
  }, [user?.id, skipWord]);

  const processedCount = learnedWordIds.length + skippedWordIds.length;
  const isLastWord = currentIndex === words.length - 1;

  /** 阶段一完成 → 进入过渡或直接结算 */
  const handleRecognitionComplete = useCallback(async () => {
    // 全跳过 → 直接跳到 LevelSummary
    if (learnedWordIds.length === 0) {
      navigation.replace('LevelSummary', {
        tag,
        levelIndex,
        result: {
          learnedCount: 0,
          skippedCount: words.length,
          stage2Correct: 0,
          stage2Total: 0,
          stage3Correct: 0,
          stage3Total: 0,
          comboMax: 0,
          wrongWordIds: [],
        } satisfies LevelResult,
      });
      return;
    }

    setPhase('transition1');

    // 生成阶段二题目
    try {
      const learnedWords: LocalWord[] = words
        .filter(w => learnedWordIds.includes(w.id))
        .map(w => w as LocalWord);

      // 确保详情数据就绪（题目生成需要 meanings 等字段）
      await ensureWordDetails(learnedWords.map(w => w.id));

      const questions = await generateStage2Questions(learnedWords);
      setStage2Questions(questions);
    } catch (error) {
      console.error('[LevelLearn] 生成阶段二题目失败:', error);
    }
  }, [learnedWordIds, words, navigation, tag, levelIndex]);

  /** 过渡1 → 阶段二 */
  const handleStartStage2 = useCallback(() => {
    setPhase('understanding');
  }, []);

  // ==================== 阶段二完成 ====================

  const handleStage2Complete = useCallback(async (result: SessionResult) => {
    setStage2Result(result);
    setWeakWordIds(result.wrongWordIds);

    setPhase('transition2');

    // 生成阶段三题目
    try {
      const learnedWords: LocalWord[] = words
        .filter(w => learnedWordIds.includes(w.id))
        .map(w => w as LocalWord);

      // 确保详情数据就绪
      await ensureWordDetails(learnedWords.map(w => w.id));

      const questions = await generateStage3Questions(learnedWords, result.wrongWordIds);
      setStage3Questions(questions);
    } catch (error) {
      console.error('[LevelLearn] 生成阶段三题目失败:', error);
    }
  }, [words, learnedWordIds]);

  /** 过渡2 → 阶段三 */
  const handleStartStage3 = useCallback(() => {
    setPhase('application');
  }, []);

  // ==================== 阶段三完成 ====================

  const handleStage3Complete = useCallback((result: SessionResult) => {
    setStage3Result(result);

    // 收集最终结果 → 跳转 LevelSummary
    const finalResult: LevelResult = {
      learnedCount: learnedWordIds.length,
      skippedCount: skippedWordIds.length,
      stage2Correct: stage2Result?.correctCount ?? 0,
      stage2Total: stage2Result?.totalCount ?? 0,
      stage3Correct: result.correctCount,
      stage3Total: result.totalCount,
      comboMax: Math.max(stage2Result?.comboMax ?? 0, result.comboMax),
      wrongWordIds: [...new Set([
        ...(stage2Result?.wrongWordIds ?? []),
        ...result.wrongWordIds,
      ])],
    };

    navigation.replace('LevelSummary', {
      tag,
      levelIndex,
      result: finalResult,
    });
  }, [learnedWordIds, words, stage2Result, navigation, tag, levelIndex]);

  // ==================== 阶段二/三题目会话 ====================

  const stage2Session = useQuestionSession({
    questions: stage2Questions,
    onComplete: handleStage2Complete,
  });

  const stage3Session = useQuestionSession({
    questions: stage3Questions,
    onComplete: handleStage3Complete,
  });

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

  return {
    // 通用
    words,
    isLoading,
    loadError,
    tag,
    levelIndex,
    isBoss,
    phase,
    navigation,

    // 收藏
    favoritedIds,
    handleFavoriteChange,

    // 阶段一
    currentIndex,
    cardHeight,
    isScrolling,
    isCardFlipped,
    isKnownAnimating,
    learnedWordIds,
    skippedWordIds,
    processedCount,
    isLastWord,
    flatListRef,
    onViewableItemsChanged,
    viewabilityConfig,
    onContainerLayout,
    handleLearnWord,
    handleSkipWord,
    handleFlipChange,
    handleKnownAnimatingChange,
    handleScrollBeginDrag,
    handleScrollEndDrag,
    handleMomentumScrollEnd,
    handleRecognitionComplete,

    // 过渡
    handleStartStage2,
    handleStartStage3,

    // 阶段二/三
    stage2Session,
    stage3Session,
    stage2Questions,
    stage3Questions,
    weakWordIds,
  };
}
