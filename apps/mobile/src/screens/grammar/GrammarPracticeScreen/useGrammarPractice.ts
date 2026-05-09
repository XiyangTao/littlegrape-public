import { useState, useCallback, useEffect } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getGrammarPointByCode } from '@/data/grammarPoints';
import { apiClient } from '@/api';
import { invalidateGrammarCache } from '@/hooks/queries';
import { useAuth } from '@/stores/AuthStore';
import { recordGrammarPracticed, recordGrammarMastered } from '@/services/StatsService';
import type { GrammarPracticeQuestion } from '@/api/modules/grammar';

export type { GrammarPracticeQuestion as GrammarQuestion };

interface PracticeResult {
  totalCount: number;
  correctCount: number;
  incorrectCount: number;
  score: number;
}

interface RouteParams {
  pointCode: string;
  categoryCode: string;
  pointId?: string;
}

export function useGrammarPractice() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const { pointCode, pointId: routePointId } = route.params as RouteParams;

  const [questions, setQuestions] = useState<GrammarPracticeQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFinished, setIsFinished] = useState(false);
  const [answers, setAnswers] = useState<boolean[]>([]);

  const pointData = getGrammarPointByCode(pointCode);
  const point = pointData?.point;

  useEffect(() => {
    loadQuestions();
  }, [pointCode]);

  const loadQuestions = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.getGrammarPractice(pointCode, 10);
      if (response?.success && response.data) {
        setQuestions(response.data);
      }
    } catch (error) {
      console.error('[GrammarPractice] 加载练习题失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const currentQuestion = questions[currentIndex] || null;

  const handleSelectOption = useCallback((option: string) => {
    if (isAnswered) return;
    setSelectedAnswer(option);
  }, [isAnswered]);

  const handleSubmit = useCallback(() => {
    if (!selectedAnswer || !currentQuestion) return;

    const correct = selectedAnswer === currentQuestion.answer;
    setIsCorrect(correct);
    setIsAnswered(true);
    setAnswers(prev => [...prev, correct]);
  }, [selectedAnswer, currentQuestion]);

  const handleNext = useCallback(() => {
    if (currentIndex >= questions.length - 1) {
      setIsFinished(true);
      return;
    }
    setCurrentIndex(prev => prev + 1);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setIsCorrect(false);
  }, [currentIndex, questions.length]);

  const handleRetry = useCallback(() => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setIsCorrect(false);
    setIsFinished(false);
    setAnswers([]);
    loadQuestions();
  }, []);

  const handleDone = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // 提交练习结果
  const submitResult = useCallback(async (finalAnswers: boolean[]) => {
    if (!routePointId) return;
    const correctCount = finalAnswers.filter(a => a).length;
    const score = Math.round((correctCount / finalAnswers.length) * 100);
    try {
      await apiClient.submitGrammarPractice(routePointId, {
        score,
        totalCount: finalAnswers.length,
        correctCount,
      });
      // 失效语法缓存，返回首页时自动刷新
      invalidateGrammarCache();

      // 记录本地学习事件（用于学习统计热力图）
      if (user?.id) {
        if (score >= 80) {
          await recordGrammarMastered(user.id, pointCode);
        } else {
          await recordGrammarPracticed(user.id, pointCode);
        }
      }
    } catch (error) {
      console.warn('[GrammarPractice] 提交结果失败:', error);
    }
  }, [routePointId, user?.id, pointCode]);

  // 练习完成时自动提交结果
  useEffect(() => {
    if (isFinished && answers.length > 0) {
      submitResult(answers);
    }
  }, [isFinished]);

  const result: PracticeResult | null = isFinished ? {
    totalCount: questions.length,
    correctCount: answers.filter(a => a).length,
    incorrectCount: answers.filter(a => !a).length,
    score: Math.round((answers.filter(a => a).length / questions.length) * 100),
  } : null;

  return {
    point,
    questions,
    currentIndex,
    currentQuestion,
    selectedAnswer,
    isAnswered,
    isCorrect,
    isLoading,
    isFinished,
    result,
    handleSelectOption,
    handleSubmit,
    handleNext,
    handleRetry,
    handleDone,
  };
}
