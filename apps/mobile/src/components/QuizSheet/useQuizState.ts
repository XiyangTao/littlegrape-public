import { useState, useCallback, useMemo } from 'react';
import type { LearnWordWithProgress } from '@/types/word';
import { parseLocalWord } from '@/services/WordService';

export type QuizType = 'matching' | 'multipleChoice';

// 匹配题数据
export interface MatchingItem {
  id: string;
  word: string;
  meaning: string;
}

// 选择题数据
export interface MultipleChoiceQuestion {
  word: LearnWordWithProgress;
  options: string[];
  correctIndex: number;
}

// 打乱数组
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function useQuizState(words: LearnWordWithProgress[]) {
  const [currentQuizType, setCurrentQuizType] = useState<QuizType>('matching');
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [correctWordIds, setCorrectWordIds] = useState<Set<string>>(new Set());

  // 匹配题状态
  const [matchingItems, setMatchingItems] = useState<MatchingItem[]>([]);
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set());
  const [wrongPair, setWrongPair] = useState<{ wordId: string; meaningId: string } | null>(null);

  // 选择题状态
  const [questions, setQuestions] = useState<MultipleChoiceQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [choiceCorrectCount, setChoiceCorrectCount] = useState(0);

  // 初始化测试
  const initQuiz = useCallback(() => {
    setCurrentQuizType('matching');
    setQuizCompleted(false);
    setCorrectCount(0);
    setTotalCount(0);
    setCorrectWordIds(new Set());

    // 初始化匹配题
    const items: MatchingItem[] = words.slice(0, 5).map(w => {
      const parsed = parseLocalWord(w);
      return {
        id: w.id,
        word: w.word,
        meaning: parsed.meanings[0]?.meaningCn || w.meaningCn,
      };
    });
    setMatchingItems(items);
    setSelectedWordId(null);
    setMatchedPairs(new Set());
    setWrongPair(null);

    // 初始化选择题
    const choiceQuestions: MultipleChoiceQuestion[] = words.slice(0, 5).map(word => {
      const parsed = parseLocalWord(word);
      const correctMeaning = parsed.meanings[0]?.meaningCn || word.meaningCn;

      // 从其他单词中选择错误选项
      const otherWords = words.filter(w => w.id !== word.id);
      const wrongOptions = shuffleArray(otherWords)
        .slice(0, 3)
        .map(w => {
          const p = parseLocalWord(w);
          return p.meanings[0]?.meaningCn || w.meaningCn;
        });

      const allOptions = [correctMeaning, ...wrongOptions];
      const shuffledOptions = shuffleArray(allOptions);
      const correctIndex = shuffledOptions.indexOf(correctMeaning);

      return {
        word,
        options: shuffledOptions,
        correctIndex,
      };
    });
    setQuestions(choiceQuestions);
    setCurrentQuestionIndex(0);
    setSelectedOptionIndex(null);
    setShowAnswer(false);
    setChoiceCorrectCount(0);
  }, [words]);

  // 打乱后的释义列表
  const shuffledMeanings = useMemo(() => {
    return shuffleArray(matchingItems.map(item => ({
      id: item.id,
      meaning: item.meaning,
    })));
  }, [matchingItems]);

  // 处理单词点击（匹配题）
  const handleWordPress = useCallback((wordId: string) => {
    if (matchedPairs.has(wordId)) return;
    setSelectedWordId(wordId);
    setWrongPair(null);
  }, [matchedPairs]);

  // 处理释义点击（匹配题）
  const handleMeaningPress = useCallback((meaningId: string) => {
    if (!selectedWordId || matchedPairs.has(meaningId)) return;

    if (selectedWordId === meaningId) {
      // 匹配正确
      setMatchedPairs(prev => {
        const newSet = new Set(prev);
        newSet.add(meaningId);
        return newSet;
      });
      setCorrectWordIds(prev => {
        const next = new Set(prev);
        next.add(meaningId);
        return next;
      });
      setCorrectCount(prev => prev + 1);
      setSelectedWordId(null);

      // 检查是否全部完成
      if (matchedPairs.size + 1 >= matchingItems.length) {
        setTimeout(() => {
          setTotalCount(matchingItems.length);
          setCurrentQuizType('multipleChoice');
        }, 500);
      }
    } else {
      // 匹配错误
      setWrongPair({ wordId: selectedWordId, meaningId });
      setTimeout(() => {
        setWrongPair(null);
        setSelectedWordId(null);
      }, 800);
    }
  }, [selectedWordId, matchedPairs, matchingItems.length]);

  // 处理选择题选项点击
  const handleOptionPress = useCallback((index: number) => {
    if (showAnswer) return;

    setSelectedOptionIndex(index);
    setShowAnswer(true);

    const isCorrect = index === questions[currentQuestionIndex].correctIndex;
    if (isCorrect) {
      setChoiceCorrectCount(prev => prev + 1);
      setCorrectWordIds(prev => {
        const next = new Set(prev);
        next.add(questions[currentQuestionIndex].word.id);
        return next;
      });
    }
  }, [showAnswer, questions, currentQuestionIndex]);

  // 下一题
  const handleNextQuestion = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOptionIndex(null);
      setShowAnswer(false);
    } else {
      // 选择题完成
      const totalCorrect = correctCount + choiceCorrectCount;
      const total = matchingItems.length + questions.length;
      setCorrectCount(totalCorrect);
      setTotalCount(total);
      setQuizCompleted(true);
    }
  }, [currentQuestionIndex, questions.length, correctCount, choiceCorrectCount, matchingItems.length]);

  return {
    // 状态
    currentQuizType,
    quizCompleted,
    correctCount,
    totalCount,
    correctWordIds,

    // 匹配题
    matchingItems,
    selectedWordId,
    matchedPairs,
    wrongPair,
    shuffledMeanings,

    // 选择题
    questions,
    currentQuestionIndex,
    selectedOptionIndex,
    showAnswer,

    // 操作
    initQuiz,
    handleWordPress,
    handleMeaningPress,
    handleOptionPress,
    handleNextQuestion,
  };
}
