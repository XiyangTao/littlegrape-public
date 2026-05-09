/**
 * 复习 Hook
 *
 * 选词（轻量查询）→ 用户确认/换词 → API 获取预生成题目 → 做题 → 结果
 * 全对 → mastered，有错 → 进生词本
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useAuth } from '@/stores/AuthStore';
import { useUserStore } from '@/stores';
import { generateMeaningChoice, type GeneratedQuestion } from '@/services/QuestionGenerator';
import { useQuestionSession, type SessionResult } from '@/hooks/useQuestionSession';
import { getReviewCandidates, getDifficultReviewCandidates, type ReviewCandidate } from '@/db/word/PracticeDB';
import { ensureWordDetails, getFullWords } from '@/db/word/WordDetailCacheDB';
import { apiClient } from '@/api';
import type { LearnWordWithProgress, LocalWord } from '@/types/word';

const QUESTIONS_PER_WORD = 2;

// ==================== 常量 ====================

const MAX_REVIEW_WORDS = 10;

// ==================== 类型 ====================

export type PracticePhase = 'loading' | 'wordSelect' | 'practicing' | 'result' | 'empty';

export interface PracticeResult extends SessionResult {
  masteredCount: number;
  difficultCount: number;
}

type PracticeRouteParams = {
  Practice: { tag?: string; source?: 'difficult' };
};

// ==================== Hook ====================

export function usePractice() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<PracticeRouteParams, 'Practice'>>();
  const tag = route.params?.tag;
  const source = route.params?.source;
  const { user } = useAuth();
  const masterWord = useUserStore((s) => s.masterWord);
  const storeRecordWrong = useUserStore((s) => s.recordWrongAnswer);

  const [phase, setPhase] = useState<PracticePhase>('loading');
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [practiceResult, setPracticeResult] = useState<PracticeResult | null>(null);

  // 选词状态（轻量数据）
  const [allCandidates, setAllCandidates] = useState<ReviewCandidate[]>([]);
  const [selectedCandidates, setSelectedCandidates] = useState<ReviewCandidate[]>([]);

  // 做题阶段的完整词数据（开始复习时加载）
  const reviewWordsRef = useRef<LearnWordWithProgress[]>([]);

  // ==================== 加载候选词（轻量） ====================

  const loadCandidates = useCallback(async () => {
    if (!user?.id) return;

    setPhase('loading');
    try {
      const candidates = source === 'difficult'
        ? await getDifficultReviewCandidates(user.id, 1000, tag)
        : await getReviewCandidates(user.id, 1000, tag);
      if (candidates.length === 0) {
        setPhase('empty');
        return;
      }

      setAllCandidates(candidates);
      setSelectedCandidates(candidates.slice(0, MAX_REVIEW_WORDS));
      setPhase('wordSelect');
    } catch (error) {
      console.error('[Practice] 加载候选词失败:', error);
      setPhase('empty');
    }
  }, [user?.id, tag, source]);

  // 初始加载
  useEffect(() => {
    loadCandidates();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ==================== 选词操作 ====================

  /** 原位替换，被换掉的词移到候选池末尾 */
  const handleRemoveWord = useCallback((wordId: string) => {
    setSelectedCandidates(prev => {
      const selectedIds = new Set(prev.map(w => w.id));
      const replacement = allCandidates.find(w => !selectedIds.has(w.id));

      if (replacement) {
        return prev.map(w => w.id === wordId ? replacement : w);
      }
      return prev.filter(w => w.id !== wordId);
    });

    // 被换掉的词移到候选池末尾
    setAllCandidates(prev => {
      const removed = prev.find(w => w.id === wordId);
      if (!removed) return prev;
      return [...prev.filter(w => w.id !== wordId), removed];
    });
  }, [allCandidates]);

  // ==================== 开始复习 ====================

  const handleStartReview = useCallback(async () => {
    if (selectedCandidates.length === 0) return;

    setPhase('loading');
    try {
      const wordIds = selectedCandidates.map(c => c.id);

      // 加载完整详情（用于结果页展示错词 + 本地生成看词选意）
      await ensureWordDetails(wordIds).catch(() => {});
      const fullWords = await getFullWords(wordIds);
      const wordsWithProgress: LearnWordWithProgress[] = fullWords.map(w => ({
        ...w,
        progress: null,
      }));

      reviewWordsRef.current = wordsWithProgress;

      // 从 API 获取预生成题目（每词 2 道）
      const resp = await apiClient.getWordPracticesBatch(wordIds, QUESTIONS_PER_WORD);
      const apiQuestions = resp.success && resp.data
        ? convertApiPracticesToQuestions(resp.data, selectedCandidates)
        : [];

      if (apiQuestions.length === 0) {
        setPhase('empty');
        return;
      }

      // 第 3 轮：本地生成"看词选意"（打乱顺序）
      const meaningQuestions: GeneratedQuestion[] = [];
      for (const word of fullWords) {
        meaningQuestions.push(await generateMeaningChoice(word));
      }
      // 打乱
      for (let i = meaningQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [meaningQuestions[i], meaningQuestions[j]] = [meaningQuestions[j], meaningQuestions[i]];
      }

      setQuestions([...apiQuestions, ...meaningQuestions]);
      setPhase('practicing');
    } catch (error) {
      console.error('[Practice] 加载详情/生成题目失败:', error);
      setPhase('empty');
    }
  }, [selectedCandidates]);

  // ==================== 复习完成 ====================

  const handlePracticeComplete = useCallback(async (result: SessionResult) => {
    if (!user?.id) return;

    const wrongSet = new Set(result.wrongWordIds);
    let masteredCount = 0;
    let difficultCount = 0;

    for (const word of reviewWordsRef.current) {
      try {
        if (!wrongSet.has(word.id)) {
          // 全对 → mastered（自动记录事件 + 移出生词本 + 同步）
          await masterWord(word.id);
          masteredCount++;
        } else {
          // 有错 → 进生词本（自动 Outbox 同步 + 更新 difficultCount）
          await storeRecordWrong(word.id);
          difficultCount++;
        }
      } catch (error) {
        console.error('[Practice] 更新结果失败:', error);
      }
    }

    setPracticeResult({ ...result, masteredCount, difficultCount });
    setPhase('result');
  }, [user?.id]);

  // ==================== 做题引擎 ====================

  const session = useQuestionSession({
    questions,
    onComplete: handlePracticeComplete,
    autoAdvance: false,
  });

  // ==================== 再来一组 ====================

  const handleRetry = useCallback(() => {
    setQuestions([]);
    setPracticeResult(null);
    setSelectedCandidates([]);
    setAllCandidates([]);
    reviewWordsRef.current = [];
    loadCandidates();
  }, [loadCandidates]);

  // ==================== 工具函数 ====================

  const getWrongWords = useCallback((): LocalWord[] => {
    if (!practiceResult) return [];
    return reviewWordsRef.current.filter(w => practiceResult.wrongWordIds.includes(w.id));
  }, [practiceResult]);

  const getMasteredWords = useCallback((): LocalWord[] => {
    if (!practiceResult) return [];
    return reviewWordsRef.current.filter(w => !practiceResult.wrongWordIds.includes(w.id));
  }, [practiceResult]);

  // 候选词超过当前选中数才允许换词
  const canSwap = allCandidates.length > selectedCandidates.length;

  return {
    navigation,
    phase,
    // 选词
    selectedCandidates,
    canSwap,
    handleRemoveWord,
    handleStartReview,
    // 做题
    session,
    // 结果
    practiceResult,
    getWrongWords,
    getMasteredWords,
    handleRetry,
  };
}

// ==================== API 数据转换 ====================

/**
 * 将 API 返回的 practices 数据转为 GeneratedQuestion[]
 * 轮次交叉排列：第1轮所有词的第1题打乱，第2轮第2题打乱...
 */
function convertApiPracticesToQuestions(
  data: Record<string, Array<{ id: string; type: string; [key: string]: any }>>,
  candidates: ReviewCandidate[],
): GeneratedQuestion[] {
  // 按 wordId 构建 { wordId → questions[] }
  const wordQMap = new Map<string, Array<{ type: string; data: any; wordId: string; word: string }>>();

  for (const candidate of candidates) {
    const practices = data[candidate.id] || [];
    if (practices.length === 0) continue;

    wordQMap.set(candidate.id, practices
      .map(p => ({
        type: p.type,
        data: p,
        wordId: candidate.id,
        word: candidate.word,
      })));
  }

  // 轮次交叉：第 N 轮取每个词的第 N 题，每轮内打乱
  const result: GeneratedQuestion[] = [];
  const maxRounds = Math.max(...Array.from(wordQMap.values()).map(qs => qs.length), 0);

  for (let round = 0; round < maxRounds; round++) {
    const roundQuestions: GeneratedQuestion[] = [];
    for (const [, wordQuestions] of wordQMap) {
      if (round < wordQuestions.length) {
        const q = wordQuestions[round];
        roundQuestions.push({
          type: q.type,
          question: q.data,
          wordId: q.wordId,
          word: q.word,
        });
      }
    }
    // 每轮内打乱
    for (let i = roundQuestions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [roundQuestions[i], roundQuestions[j]] = [roundQuestions[j], roundQuestions[i]];
    }
    result.push(...roundQuestions);
  }

  return result;
}
