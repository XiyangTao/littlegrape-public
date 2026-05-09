/**
 * 练习会话核心算法
 * 纯函数，不依赖 React
 */

import type { LearnWordWithProgress } from '@/db/WordDB';
import { shuffleArray } from '@/utils/wordSplitter';

export interface PracticeQuestion {
  wordId: string;
  word: LearnWordWithProgress;
  round: number; // 第几轮 (1, 2, 3)
}

export interface WordResult {
  wordId: string;
  word: LearnWordWithProgress;
  correctCount: number; // 答对次数 (0-3)
  wrongCount: number;   // 答错次数 (0-3)
  isMastered: boolean;  // 3 道全对
}

export interface PracticeSessionState {
  words: LearnWordWithProgress[];
  /** 题目队列（30 道题：每个单词 3 道，按轮次分组） */
  questionQueue: PracticeQuestion[];
  /** 当前题目索引 */
  currentIndex: number;
  /** 每个单词的答题结果 */
  wordResults: Record<string, { correct: number; wrong: number }>;
  /** 统计 */
  totalCorrect: number;
  totalWrong: number;
}

/**
 * 创建练习会话
 * 每个单词 3 道题，按轮次打散分布
 * 轮次 1: 所有单词各 1 道（打乱）
 * 轮次 2: 所有单词各 1 道（打乱）
 * 轮次 3: 所有单词各 1 道（打乱）
 */
export function createPracticeSession(words: LearnWordWithProgress[]): PracticeSessionState {
  const questionQueue: PracticeQuestion[] = [];

  // 3 轮，每轮每个单词 1 道题
  for (let round = 1; round <= 3; round++) {
    const roundQuestions = words.map(word => ({
      wordId: word.id,
      word,
      round,
    }));
    // 每轮内打乱顺序
    questionQueue.push(...shuffleArray(roundQuestions));
  }

  const wordResults: Record<string, { correct: number; wrong: number }> = {};
  for (const word of words) {
    wordResults[word.id] = { correct: 0, wrong: 0 };
  }

  return {
    words,
    questionQueue,
    currentIndex: 0,
    wordResults,
    totalCorrect: 0,
    totalWrong: 0,
  };
}

/**
 * 获取当前题目
 */
export function getCurrentQuestion(session: PracticeSessionState): PracticeQuestion | null {
  if (session.currentIndex >= session.questionQueue.length) {
    return null;
  }
  return session.questionQueue[session.currentIndex];
}

/**
 * 处理答题结果
 */
export function processAnswer(
  session: PracticeSessionState,
  isCorrect: boolean
): PracticeSessionState {
  const currentQuestion = getCurrentQuestion(session);
  if (!currentQuestion) {
    return session;
  }

  const { wordId } = currentQuestion;
  const newWordResults = { ...session.wordResults };

  if (isCorrect) {
    newWordResults[wordId] = {
      ...newWordResults[wordId],
      correct: newWordResults[wordId].correct + 1,
    };
  } else {
    newWordResults[wordId] = {
      ...newWordResults[wordId],
      wrong: newWordResults[wordId].wrong + 1,
    };
  }

  return {
    ...session,
    currentIndex: session.currentIndex + 1,
    wordResults: newWordResults,
    totalCorrect: session.totalCorrect + (isCorrect ? 1 : 0),
    totalWrong: session.totalWrong + (isCorrect ? 0 : 1),
  };
}

/**
 * 判断会话是否完成
 */
export function isSessionComplete(session: PracticeSessionState): boolean {
  return session.currentIndex >= session.questionQueue.length;
}

/**
 * 获取最终结果
 * 返回每个单词的判定结果
 */
export function getFinalResults(session: PracticeSessionState): WordResult[] {
  return session.words.map(word => {
    const result = session.wordResults[word.id];
    return {
      wordId: word.id,
      word,
      correctCount: result.correct,
      wrongCount: result.wrong,
      isMastered: result.correct === 3, // 3 道全对才算掌握
    };
  });
}

/**
 * 统计掌握和生词数量
 */
export function getResultStats(session: PracticeSessionState): {
  masteredCount: number;
  difficultCount: number;
  masteredWordIds: string[];
  difficultWordIds: string[];
} {
  const results = getFinalResults(session);
  const masteredWordIds = results.filter(r => r.isMastered).map(r => r.wordId);
  const difficultWordIds = results.filter(r => !r.isMastered).map(r => r.wordId);

  return {
    masteredCount: masteredWordIds.length,
    difficultCount: difficultWordIds.length,
    masteredWordIds,
    difficultWordIds,
  };
}
