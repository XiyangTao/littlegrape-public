/**
 * 单词服务层
 *
 * Screen/Component 访问单词数据的统一入口。
 * 封装 DB 层调用，未来可以在此层添加缓存、日志等横切关注点。
 */

import {
  // 词库
  getAllAvailableLibraries,
  getLibraryStats,
  getLibraryStatsByTags,
  // 单词查询
  getUnlearnedWordIds,
  getWordById,
  getWordsByTags,
  getWordCountByTags,
  getWordsByLetter,
  getWordCountByLetter,
  getAvailableLetters,
  searchAllWords,
  searchWordsInTags,
  searchWordCountInTags,
  searchWordsByLetter,
  searchWordCountByLetter,
  getRandomMeanings,
  // 学习进度
  getWordProgressBatch,
  updateWordProgress,
  // 练习
  getPracticeWordCount,
  // 学习会话
  selectWordsForLearning,
  resetLearningSessionWords,
  // 收藏/生词查询
  getFavoriteWords,
  getFavoriteWordsPaged,
  getFavoriteCount,
  getDifficultWords,
  getDifficultWordsPaged,
  getDifficultCount,
  removeDifficultWord,
  clearAllDifficultWords,
  isFavorited,
  // 解析
  parseLocalWord,
  // 遭遇通知
  getLearnedWordsWithExamples,
} from '@/db/WordDB';
import { apiClient } from '@/api';
import { scheduleEncounterNotification } from '@/services/NotificationService';
import { safeJsonParse } from '@/utils/safeJsonParse';

// ==================== 类型 re-export ====================
// Screen 可以从 WordService import 类型，不再直接 import db 层
export type {
  LocalWord,
  LocalProgress,
  WordStatusFilter,
  LearnWordWithProgress,
  WordMeaning,
  WordEtymology,
  WordCollocation,
  ParsedWord,
} from '@/types/word';

// ==================== 解析工具 ====================
export { parseLocalWord };

// ==================== 词库操作 ====================
export { getAllAvailableLibraries };

// ==================== 单词查询 ====================
export {
  getUnlearnedWordIds,
  getWordById,
  getWordsByTags,
  getWordCountByTags,
  getWordsByLetter,
  getWordCountByLetter,
  getAvailableLetters,
  searchAllWords,
  searchWordsInTags,
  searchWordCountInTags,
  searchWordsByLetter,
  searchWordCountByLetter,
  getRandomMeanings,
};

// ==================== 学习进度 ====================
export { getWordProgressBatch, updateWordProgress };

// ==================== 练习 ====================
export { getPracticeWordCount };

// ==================== 学习会话 ====================
export { selectWordsForLearning, resetLearningSessionWords };

// ==================== 收藏/生词查询 ====================
export {
  getFavoriteWords, getFavoriteWordsPaged, getFavoriteCount,
  getDifficultWords, getDifficultWordsPaged, getDifficultCount,
  removeDifficultWord, clearAllDifficultWords, isFavorited,
};

// ==================== 词库统计 ====================
export { getLibraryStats, getLibraryStatsByTags };

// ==================== AI 功能 ====================

/**
 * 生成单词 AI 讲解
 */
export async function generateWordExplanation(params: {
  word: string;
  phonetic?: string;
  meanings: Array<{ pos?: string; meaningCn?: string; meaningEn?: string }>;
  examples?: Array<{ en?: string; cn?: string }>;
  collocations?: string[];
  etymology?: {
    roots?: Array<{ root?: string; meaning?: string }>;
    affixes?: Array<{ affix?: string; type?: string; meaning?: string }>;
  };
}): Promise<{ success: boolean; explanation: string; error?: string }> {
  try {
    return await apiClient.generateWordExplanation(params);
  } catch (error) {
    console.error('[WordService] 生成AI讲解失败:', error instanceof Error ? error.message : error);
    throw error;
  }
}

// ==================== 单词遭遇通知 ====================

/**
 * 调度单词遭遇通知
 * 查询 3-7 天前学过的、有例句的单词，随机取一个，调度明天推送
 */
export async function scheduleWordEncounterNotification(userId: string): Promise<void> {
  try {
    // 1. 查询 3-7 天前学过的、有例句的单词
    const words = await getLearnedWordsWithExamples(userId, 3, 7, 20);
    if (words.length === 0) {
      if (__DEV__) console.log('[WordService] 没有符合条件的遭遇通知单词');
      return;
    }

    // 2. 随机取一个
    const picked = words[Math.floor(Math.random() * words.length)];

    // 3. 解析例句 JSON，取第一条英文例句
    const examples = safeJsonParse<Array<{ en?: string; cn?: string }>>(picked.examples, []);
    const firstExample = examples.find(e => e.en)?.en;
    if (!firstExample) {
      if (__DEV__) console.log('[WordService] 选中的单词没有可用例句:', picked.word);
      return;
    }

    // 4. 调度通知
    await scheduleEncounterNotification({
      word: picked.word,
      example: firstExample,
    });
  } catch (error) {
    console.warn('[WordService] 调度遭遇通知失败:', error);
  }
}
