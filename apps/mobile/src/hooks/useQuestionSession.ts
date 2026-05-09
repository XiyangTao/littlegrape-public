/**
 * 通用做题引擎 Hook
 *
 * 管理做题流程中的共用状态：题目队列、答题反馈、连击、分数、错词。
 * 供闯关、复习、巩固练习共用。
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { GeneratedQuestion } from '@/services/QuestionGenerator';

// ==================== 类型定义 ====================

export interface SessionResult {
  correctCount: number;
  totalCount: number;
  comboMax: number;
  wrongWordIds: string[];
}

export type SessionPhase = 'answering' | 'feedback';

interface UseQuestionSessionOptions {
  questions: GeneratedQuestion[];
  onComplete: (result: SessionResult) => void;
  feedbackDelayMs?: number;
  /** false = 手动导航模式（答题后不自动跳转，支持上/下一题），默认 true */
  autoAdvance?: boolean;
}

interface UseQuestionSessionReturn {
  /** 当前题目 */
  currentQuestion: GeneratedQuestion | null;
  /** 当前题目索引 */
  currentIndex: number;
  /** 总题数 */
  totalCount: number;
  /** 当前阶段：答题中 / 反馈中 */
  phase: SessionPhase;
  /** 本题是否答对（feedback 阶段有效） */
  isCorrect: boolean;
  /** 当前连击数 */
  combo: number;
  /** 最大连击数 */
  comboMax: number;
  /** 累计答对数 */
  correctCount: number;
  /** 错词 ID 列表 */
  wrongWordIds: string[];
  /** 答题回调 */
  onAnswer: (correct: boolean) => void;
  /** 手动跳到下一题（通常反馈结束后自动调用） */
  goNext: () => void;
  /** 手动跳到上一题（仅 autoAdvance=false 时有效） */
  goPrev: () => void;
  /** 是否可以回到上一题 */
  hasPrev: boolean;
  /** 是否可以前进到下一题（已答完当前题） */
  canGoNext: boolean;
  /** submitRef（供需要手动提交的题型使用） */
  submitRef: React.MutableRefObject<(() => void) | null>;
  /** 是否可以提交（供需要手动提交的题型使用） */
  canSubmit: boolean;
  /** 设置是否可以提交 */
  onSubmitReady: (ready: boolean) => void;
}

// ==================== Hook ====================

export function useQuestionSession({
  questions,
  onComplete,
  feedbackDelayMs = 1500,
  autoAdvance = true,
}: UseQuestionSessionOptions): UseQuestionSessionReturn {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<SessionPhase>('answering');
  const [isCorrect, setIsCorrect] = useState(false);
  const [combo, setCombo] = useState(0);
  const [comboMax, setComboMax] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongWordIds, setWrongWordIds] = useState<string[]>([]);
  const [canSubmit, setCanSubmit] = useState(false);

  // 手动导航模式：记录每题的答题结果 (index → isCorrect)
  const [answeredMap, setAnsweredMap] = useState<Map<number, boolean>>(new Map());

  const submitRef = useRef<(() => void) | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completedRef = useRef(false);

  // 使用 refs 保持最新值，避免闭包捕获旧值
  const correctCountRef = useRef(correctCount);
  const comboMaxRef = useRef(comboMax);
  const comboRef = useRef(combo);
  const wrongWordIdsRef = useRef(wrongWordIds);
  correctCountRef.current = correctCount;
  comboMaxRef.current = comboMax;
  comboRef.current = combo;
  wrongWordIdsRef.current = wrongWordIds;

  const totalCount = questions.length;
  const currentQuestion = currentIndex < totalCount ? questions[currentIndex] : null;

  // 题目列表变化时重置状态（支持同一 hook 实例复用）
  const prevQuestionsRef = useRef(questions);
  useEffect(() => {
    if (prevQuestionsRef.current !== questions && questions.length > 0) {
      setCurrentIndex(0);
      setPhase('answering');
      setIsCorrect(false);
      setCombo(0);
      setComboMax(0);
      setCorrectCount(0);
      setWrongWordIds([]);
      setCanSubmit(false);
      setAnsweredMap(new Map());
      submitRef.current = null;
      completedRef.current = false;
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
      }
    }
    prevQuestionsRef.current = questions;
  }, [questions]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
      }
    };
  }, []);

  // 题目变化时重置 submitRef 和 canSubmit，并恢复已答题状态
  useEffect(() => {
    submitRef.current = null;
    setCanSubmit(false);

    // 手动导航模式：切换到已答过的题时恢复 feedback 状态
    if (!autoAdvance && answeredMap.has(currentIndex)) {
      setPhase('feedback');
      setIsCorrect(answeredMap.get(currentIndex)!);
    }
  }, [currentIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const triggerComplete = useCallback(() => {
    if (!completedRef.current) {
      completedRef.current = true;
      onComplete({
        correctCount: correctCountRef.current,
        totalCount,
        comboMax: comboMaxRef.current,
        wrongWordIds: wrongWordIdsRef.current,
      });
    }
  }, [totalCount, onComplete]);

  const goNext = useCallback(() => {
    const nextIndex = currentIndex + 1;

    if (nextIndex >= totalCount) {
      triggerComplete();
      return;
    }

    setCurrentIndex(nextIndex);
    // 同步恢复状态，确保子组件首次渲染就拿到正确的 phase
    if (!autoAdvance && answeredMap.has(nextIndex)) {
      setPhase('feedback');
      setIsCorrect(answeredMap.get(nextIndex)!);
    } else {
      setPhase('answering');
      setIsCorrect(false);
    }
  }, [currentIndex, totalCount, autoAdvance, answeredMap, triggerComplete]);

  const goPrev = useCallback(() => {
    if (currentIndex <= 0) return;
    const prevIndex = currentIndex - 1;
    setCurrentIndex(prevIndex);
    // 同步恢复状态，确保子组件首次渲染就拿到正确的 phase
    if (!autoAdvance && answeredMap.has(prevIndex)) {
      setPhase('feedback');
      setIsCorrect(answeredMap.get(prevIndex)!);
    } else {
      setPhase('answering');
      setIsCorrect(false);
    }
  }, [currentIndex, autoAdvance, answeredMap]);

  const onAnswer = useCallback((correct: boolean) => {
    if (phase !== 'answering') return;

    setPhase('feedback');
    setIsCorrect(correct);

    // 记录答题结果
    if (!autoAdvance) {
      setAnsweredMap(prev => new Map(prev).set(currentIndex, correct));
    }

    if (correct) {
      setCorrectCount(prev => prev + 1);
      setCombo(prev => {
        const newCombo = prev + 1;
        setComboMax(prevMax => Math.max(prevMax, newCombo));
        return newCombo;
      });
    } else {
      setCombo(0);
      if (currentQuestion) {
        setWrongWordIds(prev => {
          if (prev.includes(currentQuestion.wordId)) return prev;
          return [...prev, currentQuestion.wordId];
        });
      }
    }

    // 自动模式：延时跳下一题
    if (autoAdvance) {
      feedbackTimerRef.current = setTimeout(() => {
        const nextIndex = currentIndex + 1;
        if (nextIndex >= totalCount) {
          triggerComplete();
        } else {
          setCurrentIndex(nextIndex);
          setPhase('answering');
          setIsCorrect(false);
        }
      }, feedbackDelayMs);
    } else {
      // 手动模式 + 最后一题答完 → 自动完成
      if (currentIndex === totalCount - 1) {
        // 检查是否所有题都已答完
        const newMap = new Map(answeredMap).set(currentIndex, correct);
        if (newMap.size >= totalCount) {
          setTimeout(() => triggerComplete(), 800);
        }
      }
    }
  }, [
    phase, currentQuestion, currentIndex, totalCount,
    feedbackDelayMs, autoAdvance, answeredMap, triggerComplete,
  ]);

  const onSubmitReady = useCallback((ready: boolean) => {
    setCanSubmit(ready);
  }, []);

  // 手动导航模式的状态
  const hasPrev = currentIndex > 0;
  const currentAnswered = answeredMap.has(currentIndex) || phase === 'feedback';
  const canGoNext = currentAnswered && currentIndex < totalCount - 1;

  return {
    currentQuestion,
    currentIndex,
    totalCount,
    phase,
    isCorrect,
    combo,
    comboMax,
    correctCount,
    wrongWordIds,
    onAnswer,
    goNext,
    goPrev,
    hasPrev,
    canGoNext,
    submitRef,
    canSubmit,
    onSubmitReady,
  };
}
