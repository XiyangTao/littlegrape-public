import { useState, useCallback, useRef, useEffect } from 'react';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { ExerciseType, ExerciseQuestion } from '@/api/modules/exercise';
import { getRandomQuestion } from '@/data/exerciseQuestions';
import { saveExerciseRecord, getWrongQuestions } from '@/db/ExerciseHistoryDB';

export type Phase = 'loading' | 'answering' | 'feedback';

export function useExerciseSession() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const exerciseType: ExerciseType = route.params?.exerciseType;

  const [phase, setPhase] = useState<Phase>('loading');
  const [question, setQuestion] = useState<ExerciseQuestion | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const usedIds = useRef<string[]>([]);

  // mistake_review 模式：错题队列
  const mistakeQueue = useRef<ExerciseQuestion[]>([]);
  const mistakeIndex = useRef(0);

  const loadQuestion = useCallback(async () => {
    setPhase('loading');
    setIsCorrect(null);
    setError(null);

    if (exerciseType === 'mistake_review') {
      // 首次加载错题队列
      if (mistakeQueue.current.length === 0) {
        try {
          const wrongQuestions = await getWrongQuestions(30);
          if (wrongQuestions.length === 0) {
            setError('暂无错题记录');
            setPhase('answering');
            return;
          }
          mistakeQueue.current = wrongQuestions;
          mistakeIndex.current = 0;
        } catch {
          setError('加载错题失败');
          setPhase('answering');
          return;
        }
      }

      // 从队列取下一道题
      if (mistakeIndex.current >= mistakeQueue.current.length) {
        setError('所有错题已复习完毕');
        setPhase('answering');
        return;
      }

      const q = mistakeQueue.current[mistakeIndex.current];
      mistakeIndex.current++;
      setQuestion(q);
      setPhase('answering');
      return;
    }

    const q = getRandomQuestion(exerciseType, usedIds.current);
    if (!q) {
      setError('暂无该题型的题目');
      setPhase('answering');
      return;
    }

    usedIds.current.push(q.id);
    setQuestion(q);
    setPhase('answering');
  }, [exerciseType]);

  // 子组件调用此函数通知答题结果
  const handleAnswer = useCallback((correct: boolean) => {
    setIsCorrect(correct);
    setPhase('feedback');

    // 异步保存答题记录（不阻塞 UI）
    if (question && exerciseType !== 'mistake_review') {
      saveExerciseRecord(exerciseType, question, correct).catch(() => {});
    }
  }, [question, exerciseType]);

  const handleNext = useCallback(() => {
    loadQuestion();
  }, [loadQuestion]);

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // 首次加载
  useEffect(() => {
    loadQuestion();
  }, []);

  // ===== explain_answer 功能 =====
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);

  const handleExplain = useCallback(async () => {
    if (!question || isExplaining) return;
    setIsExplaining(true);
    setExplanation(null);
    try {
      const { apiClient } = await import('@/api');
      const res = await apiClient.explainExercise({
        question,
        isCorrect: isCorrect ?? false,
      });
      setExplanation(res.data?.explanation || '暂无解释');
    } catch {
      setExplanation('解释加载失败，请稍后重试');
    } finally {
      setIsExplaining(false);
    }
  }, [question, isCorrect, isExplaining]);

  // 切换题目时重置解释状态
  useEffect(() => {
    setExplanation(null);
    setIsExplaining(false);
  }, [question]);

  return {
    exerciseType,
    phase,
    question,
    isCorrect,
    error,
    handleAnswer,
    handleNext,
    handleClose,
    // explain_answer
    explanation,
    isExplaining,
    handleExplain,
  };
}
