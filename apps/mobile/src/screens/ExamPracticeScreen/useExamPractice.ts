import { useState, useEffect, useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useI18n } from '@/context/I18nProvider';
import { apiClient } from '@/api';
import type { GeneratedExam } from '@/api/modules/exam';

export type Phase = 'loading' | 'intro' | 'testing' | 'result';

export function useExamPractice() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { t } = useI18n();

  const examTypeId = route.params?.examTypeId as string;

  // ==================== 状态 ====================
  const [phase, setPhase] = useState<Phase>('loading');
  const [exam, setExam] = useState<GeneratedExam | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  // ==================== refs ====================
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nextQuestionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  // ==================== 生命周期 ====================
  useEffect(() => {
    isMountedRef.current = true;
    loadExam();
    return () => {
      isMountedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      if (nextQuestionTimerRef.current) clearTimeout(nextQuestionTimerRef.current);
    };
  }, []);

  // ==================== 加载考题 ====================
  const loadExam = useCallback(async () => {
    let cancelled = false;
    try {
      const res = await apiClient.generateExam(examTypeId);
      if (cancelled || !isMountedRef.current) return;
      if (res.success && res.data.questions.length > 0) {
        setExam(res.data);
        setPhase('intro');
      } else {
        Alert.alert(t('exam.noQuestions'), t('exam.noQuestionsDesc'), [
          { text: t('common.confirm'), onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error) {
      if (cancelled || !isMountedRef.current) return;
      console.error('加载考试失败:', error);
      navigation.goBack();
    }
    return () => { cancelled = true; };
  }, [examTypeId, t, navigation]);

  // ==================== 开始考试 ====================
  const startExam = useCallback(() => {
    setPhase('testing');
    setTimeElapsed(0);
    timerRef.current = setInterval(() => {
      if (!isMountedRef.current) return;
      setTimeElapsed(prev => prev + 1);
    }, 1000);
  }, []);

  // ==================== 结束考试 ====================
  const finishExam = useCallback(async (lastIsCorrect: boolean, currentExam: GeneratedExam, currentCorrectCount: number, currentTimeElapsed: number, currentAnswers: Record<string, number>) => {
    if (timerRef.current) clearInterval(timerRef.current);

    const finalCorrect = currentCorrectCount + (lastIsCorrect ? 1 : 0);
    const finalScore = Math.round((finalCorrect / currentExam.questions.length) * 100);

    if (!isMountedRef.current) return;
    setCorrectCount(finalCorrect);
    setScore(finalScore);
    setPhase('result');

    // 提交成绩
    try {
      await apiClient.submitExamResult({
        examTypeId,
        score: finalScore,
        totalQuestions: currentExam.questions.length,
        correctCount: finalCorrect,
        duration: currentTimeElapsed,
        answers: currentAnswers,
      });
    } catch (error) {
      console.error('提交成绩失败:', error);
    }
  }, [examTypeId]);

  // ==================== 选择选项 ====================
  const handleSelectOption = useCallback((optionIndex: number) => {
    if (showFeedback || !exam) return;
    setSelectedOption(optionIndex);
    setShowFeedback(true);

    const question = exam.questions[currentIndex];
    const isCorrect = optionIndex === question.answer;

    const newAnswers = { ...answers, [question.id]: optionIndex };
    setAnswers(newAnswers);
    const newCorrectCount = isCorrect ? correctCount + 1 : correctCount;

    // 自动进入下一题
    nextQuestionTimerRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      if (currentIndex < exam.questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setSelectedOption(null);
        setShowFeedback(false);
      } else {
        finishExam(isCorrect, exam, correctCount, timeElapsed, newAnswers);
      }
    }, 800);
  }, [showFeedback, exam, currentIndex, answers, correctCount, timeElapsed, finishExam]);

  // ==================== 重新开始 ====================
  const handleRetry = useCallback(() => {
    setPhase('loading');
    setCurrentIndex(0);
    setAnswers({});
    setSelectedOption(null);
    setShowFeedback(false);
    setCorrectCount(0);
    setScore(0);
    loadExam();
  }, [loadExam]);

  // ==================== 工具函数 ====================
  const formatTime = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }, []);

  return {
    // 导航
    navigation,
    // 路由参数
    examTypeId,
    // 状态
    phase,
    exam,
    currentIndex,
    answers,
    selectedOption,
    showFeedback,
    timeElapsed,
    score,
    correctCount,
    // 操作
    startExam,
    handleSelectOption,
    handleRetry,
    // 工具
    formatTime,
  };
}
