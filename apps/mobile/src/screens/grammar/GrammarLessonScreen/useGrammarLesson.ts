import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getGrammarPointByCode } from '@/data/grammarPoints';
import { apiClient } from '@/api';
import { useGrammarLesson as useGrammarLessonQuery, invalidateGrammarCache } from '@/hooks/queries';
import { useAuth } from '@/stores/AuthStore';
import { recordGrammarPracticed, recordGrammarMastered } from '@/services/StatsService';
import type { LessonQuestion, SmartTip, StructuredExplanation, CognitiveLevel } from '@/api/modules/grammar';

export type LessonStage = 'tips' | 'quiz' | 'result';

interface LessonResult {
  totalCount: number;
  correctCount: number;
  incorrectCount: number;
  score: number;
  starRating: number;
}

interface RouteParams {
  pointCode: string;
  categoryCode: string;
  pointId?: string;
  isFirstTime?: boolean;
}

function calculateStarRating(correctRate: number): number {
  if (correctRate >= 0.9) return 5;
  if (correctRate >= 0.8) return 4;
  if (correctRate >= 0.6) return 3;
  if (correctRate >= 0.4) return 2;
  return 1;
}

export function useGrammarLesson() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const { pointCode, pointId: routePointId, isFirstTime } = route.params as RouteParams;

  const pointData = getGrammarPointByCode(pointCode);
  const point = pointData?.point;

  // 使用 React Query 加载课程数据
  const { data: lessonData, isLoading, error } = useGrammarLessonQuery(pointCode);

  // 阶段控制
  const [stage, setStage] = useState<LessonStage>(isFirstTime ? 'tips' : 'quiz');

  // Tips Modal
  const [showTipsModal, setShowTipsModal] = useState(false);

  // 题目和答题状态
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  // Smart Tip
  const [showSmartTip, setShowSmartTip] = useState(false);
  const [currentSmartTip, setCurrentSmartTip] = useState<SmartTip | null>(null);
  const smartTipShownRef = useRef<Set<string>>(new Set());

  // 答题记录
  const [answers, setAnswers] = useState<{ correct: boolean }[]>([]);

  // 结果
  const [isFinished, setIsFinished] = useState(false);

  // 扁平化排序题目：recognition → understanding → production
  const allQuestions = useMemo(() => {
    if (!lessonData?.questions) return [];
    const levelOrder: Record<string, number> = { recognition: 0, understanding: 1, production: 2 };
    return [...lessonData.questions].sort(
      (a, b) => (levelOrder[a.cognitiveLevel] ?? 1) - (levelOrder[b.cognitiveLevel] ?? 1)
    );
  }, [lessonData?.questions]);

  const currentQuestion = allQuestions[currentQuestionIdx] || null;

  // 讲解数据（安全解析：必须是带 sections 的结构化对象才可用）
  const explanation = useMemo<StructuredExplanation | null>(() => {
    const raw = lessonData?.explanation;
    if (!raw || typeof raw !== 'object') return null;
    if (!(raw as any).sections) return null;
    return raw as StructuredExplanation;
  }, [lessonData?.explanation]);

  // 进度
  const totalSteps = allQuestions.length;
  const currentStep = currentQuestionIdx + 1;

  // 题型标签
  const getQuestionTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      choice: 'learn.chooseAnswer',
      fill_blank: 'learn.fillInBlank',
      error_judgment: 'learn.errorJudgment',
      error_correction: 'learn.errorCorrection',
      dual_blank: 'learn.dualBlank',
      table_fill: 'learn.tableFill',
      sentence_reorder: 'learn.sentenceReorder',
      word_assembly: 'learn.wordAssembly',
    };
    return labels[type] || 'learn.chooseAnswer';
  };

  // 选择答案
  const handleSelectOption = useCallback((option: string) => {
    if (isAnswered) return;
    setSelectedAnswer(option);

    if (currentQuestion) {
      const needAutoSubmit = ['error_judgment', 'sentence_reorder'].includes(currentQuestion.type);
      if (needAutoSubmit) {
        const correct = checkAnswer(currentQuestion, option);
        setIsCorrect(correct);
        setIsAnswered(true);
        setAnswers(prev => [...prev, { correct }]);

        if (!correct && currentQuestion.smartTip) {
          maybeShowSmartTip(currentQuestion.smartTip);
        }
      }
    }
  }, [isAnswered, currentQuestion]);

  // 检查答案
  const checkAnswer = (q: LessonQuestion, answer: string): boolean => {
    switch (q.type) {
      case 'error_judgment':
        return answer === q.answer;
      case 'choice':
      case 'fill_blank':
      case 'error_correction':
        return answer === q.answer;
      case 'dual_blank': {
        const [a1, a2] = answer.split('|');
        return a1 === q.answer && a2 === q.answer2;
      }
      case 'table_fill': {
        const expectedAnswers = q.tableData?.blanks.map(b => b.answer).join(',');
        return answer === expectedAnswers;
      }
      case 'sentence_reorder':
      case 'word_assembly': {
        const normalize = (s: string) => s.trim().toLowerCase().replace(/[,;.!?]/g, '').replace(/\s+/g, ' ');
        if (normalize(answer) === normalize(q.answer)) return true;
        return (q.acceptableAnswers || []).some(a => normalize(answer) === normalize(a));
      }
      default:
        return answer === q.answer;
    }
  };

  // 提交答案（手动提交按钮）
  const handleSubmit = useCallback(() => {
    if (!selectedAnswer || !currentQuestion || isAnswered) return;

    const correct = checkAnswer(currentQuestion, selectedAnswer);
    setIsCorrect(correct);
    setIsAnswered(true);
    setAnswers(prev => [...prev, { correct }]);

    if (!correct && currentQuestion.smartTip) {
      maybeShowSmartTip(currentQuestion.smartTip);
    }
  }, [selectedAnswer, currentQuestion, isAnswered]);

  // Smart Tip 显示逻辑（同一规则最多 2 次）
  const maybeShowSmartTip = (tip: SmartTip) => {
    const key = tip.rule;
    const count = smartTipShownRef.current.has(key) ? 2 : 0;
    if (count < 2) {
      smartTipShownRef.current.add(key);
      setCurrentSmartTip(tip);
      setShowSmartTip(true);
    }
  };

  const handleCloseSmartTip = useCallback(() => {
    setShowSmartTip(false);
    setCurrentSmartTip(null);
  }, []);

  // 下一步
  const handleNext = useCallback(() => {
    if (currentQuestionIdx < allQuestions.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
      resetQuestionState();
    } else {
      setIsFinished(true);
      setStage('result');
    }
  }, [currentQuestionIdx, allQuestions.length]);

  const resetQuestionState = () => {
    setSelectedAnswer(null);
    setIsAnswered(false);
    setIsCorrect(false);
  };

  // Tips 阶段没有 explanation 时，自动跳到 quiz
  useEffect(() => {
    if (stage === 'tips' && !isLoading && !explanation) {
      setStage('quiz');
    }
  }, [stage, isLoading, explanation]);

  // Tips 操作
  const handleStartQuiz = useCallback(() => setStage('quiz'), []);
  const handleShowTips = useCallback(() => setShowTipsModal(true), []);
  const handleCloseTips = useCallback(() => setShowTipsModal(false), []);

  // 重新学习（失效缓存，重新请求随机题目）
  const handleRetry = useCallback(() => {
    invalidateGrammarCache();
    setStage('quiz');
    setCurrentQuestionIdx(0);
    resetQuestionState();
    setAnswers([]);
    setIsFinished(false);
    smartTipShownRef.current.clear();
  }, []);

  // 返回
  const handleDone = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // 计算最终结果
  const result: LessonResult | null = isFinished ? (() => {
    const totalCount = answers.length;
    const correctCount = answers.filter(a => a.correct).length;
    const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
    const starRating = calculateStarRating(correctCount / totalCount);
    return { totalCount, correctCount, incorrectCount: totalCount - correctCount, score, starRating };
  })() : null;

  // 提交结果
  useEffect(() => {
    if (isFinished && result && (routePointId || lessonData?.point?.id)) {
      const pid = routePointId || lessonData?.point?.id;
      submitResult(pid!, result);
    }
  }, [isFinished]);

  const submitResult = async (pid: string, res: LessonResult) => {
    try {
      await apiClient.submitGrammarLesson(pid, {
        score: res.score,
        totalCount: res.totalCount,
        correctCount: res.correctCount,
        starRating: res.starRating,
      });
      invalidateGrammarCache();

      if (user?.id) {
        if (res.starRating >= 4) {
          await recordGrammarMastered(user.id, pointCode);
        } else {
          await recordGrammarPracticed(user.id, pointCode);
        }
      }
    } catch (error) {
      console.warn('[GrammarLesson] 提交结果失败:', error);
    }
  };

  // 当前是否需要手动提交按钮
  const needsManualSubmit = currentQuestion ? (() => {
    if (currentQuestion.type === 'error_judgment') return false;
    if (currentQuestion.type === 'sentence_reorder') return false;
    return true;
  })() : false;

  const needsAssemblySubmit = currentQuestion?.type === 'word_assembly' && !isAnswered;

  return {
    // 基础数据
    point,
    explanation,
    isLoading,
    error,

    // 阶段
    stage,

    // 进度
    totalSteps,
    currentStep,

    // 题目
    currentQuestion,
    currentQuestionIdx,
    allQuestions,
    getQuestionTypeLabel,

    // 答题状态
    selectedAnswer,
    isAnswered,
    isCorrect,
    isFinished,
    result,
    needsManualSubmit,
    needsAssemblySubmit,

    // Smart Tip
    showSmartTip,
    currentSmartTip,

    // Tips Modal
    showTipsModal,

    // 操作
    handleSelectOption,
    handleSubmit,
    handleNext,
    handleRetry,
    handleDone,
    handleCloseSmartTip,
    handleStartQuiz,
    handleShowTips,
    handleCloseTips,
  };
}
