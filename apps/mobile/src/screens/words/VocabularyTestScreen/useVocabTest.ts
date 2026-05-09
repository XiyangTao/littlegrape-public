import { useState, useCallback, useRef } from 'react';
import { Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useUserStore, useVocabularyTest } from '@/stores';
import { ensureWordsData } from '@/db';
import {
  initVocabTestSession,
  getNextQuestion,
  recordResponse,
  calculateResult,
  getProgress,
  VocabTestSession,
  TestQuestion,
  VocabularyTestResult,
} from '@/services/VocabularyTestService';

export type TestState = 'intro' | 'testing' | 'result';

export default function useVocabTest() {
  const navigation = useNavigation<any>();
  const saveVocabularyTestResult = useUserStore((state) => state.saveVocabularyTestResult);
  const { vocabularyTest } = useVocabularyTest();

  // 测试状态
  const [testState, setTestState] = useState<TestState>('intro');
  const [session, setSession] = useState<VocabTestSession | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<TestQuestion | null>(null);
  const [result, setResult] = useState<VocabularyTestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 选中的选项（用于显示反馈）
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  // 动画
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // 计时器
  const questionStartTime = useRef<number>(0);

  // 开始测试
  const handleStartTest = useCallback(async () => {
    setIsLoading(true);
    try {
      // 确保词库已导入（启动时失败的兜底）
      await ensureWordsData();
      const newSession = await initVocabTestSession();
      setSession(newSession);

      const firstQuestion = await getNextQuestion(newSession);
      if (firstQuestion) {
        setCurrentQuestion(firstQuestion);
        questionStartTime.current = Date.now();
        setTestState('testing');
      }
    } catch (error) {
      console.error('Failed to start test:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 回答问题（4选1）
  const handleAnswer = useCallback(async (optionId: string) => {
    if (!session || !currentQuestion || showFeedback) return;

    const responseTime = Date.now() - questionStartTime.current;
    const isCorrect = optionId === currentQuestion.correctOptionId;

    // 显示答案反馈
    setSelectedOption(optionId);
    setShowFeedback(true);

    // 短暂显示答案后进入下一题
    setTimeout(async () => {
      // 动画过渡
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: isCorrect ? -30 : 30,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(async () => {
        // 记录回答
        recordResponse(session, currentQuestion.id, optionId, responseTime);

        // 获取下一题
        const nextQuestion = await getNextQuestion(session);

        // 重置状态
        setSelectedOption(null);
        setShowFeedback(false);

        if (nextQuestion) {
          setCurrentQuestion(nextQuestion);
          questionStartTime.current = Date.now();

          // 重置动画
          slideAnim.setValue(0);
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }).start();
        } else {
          // 测试结束
          const testResult = calculateResult(session);
          setResult(testResult);
          setTestState('result');
          // 保存测试结果到本地数据库
          saveVocabularyTestResult(testResult);
        }

        setSession({ ...session });
      });
    }, 600); // 显示答案反馈 600ms
  }, [session, currentQuestion, fadeAnim, slideAnim, showFeedback]);

  // 重新测试
  const handleRetry = useCallback(() => {
    // 重置动画状态
    fadeAnim.setValue(1);
    slideAnim.setValue(0);
    // 重置测试状态
    setSession(null);
    setCurrentQuestion(null);
    setResult(null);
    setSelectedOption(null);
    setShowFeedback(false);
    setTestState('intro');
  }, [fadeAnim, slideAnim]);

  // 返回
  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // 获取进度
  const progress = session ? getProgress(session) : null;

  return {
    // 状态
    testState,
    session,
    currentQuestion,
    result,
    isLoading,
    selectedOption,
    showFeedback,
    vocabularyTest,
    progress,
    // 动画
    fadeAnim,
    slideAnim,
    // 回调
    handleStartTest,
    handleAnswer,
    handleRetry,
    handleGoBack,
  };
}
