/**
 * 学习服务层
 *
 * 封装单词学习/掌握的状态检查逻辑，DB 层只负责纯 CRUD。
 */

import { removeDifficultWord } from '@/services/DifficultService';
import { getWordProgress, updateWordProgress, isInDifficultList } from '@/db/WordDB';
import { enqueueOutbox } from '@/db/OutboxDB';

/**
 * 学习单词
 * 如果已是 learned/mastered 状态，返回 false（不重复标记）
 */
export async function learnWord(userId: string, wordId: string): Promise<boolean> {
  const progress = await getWordProgress(userId, wordId);
  if (progress && (progress.status === 'learned' || progress.status === 'mastered')) {
    return false;
  }

  const now = Date.now();
  await updateWordProgress(userId, wordId, {
    status: 'learned',
    learnedAt: now,
  });

  // Outbox：同步到服务端 + 触发成就/任务事件
  enqueueOutbox(userId, 'word_learned', { wordId }).catch(err =>
    console.error('[LearningService] Outbox word_learned 失败:', err));

  return true;
}

/**
 * 掌握单词
 * 如果已是 mastered 状态，返回 false（不重复标记）
 */
export async function masterWord(userId: string, wordId: string): Promise<boolean> {
  const progress = await getWordProgress(userId, wordId);
  if (progress && progress.status === 'mastered') {
    return false;
  }

  const now = Date.now();
  await updateWordProgress(userId, wordId, {
    status: 'mastered',
    masteredAt: now,
  });

  // Outbox：同步到服务端 + 触发成就/任务事件
  enqueueOutbox(userId, 'word_mastered', { wordId, isSkipped: false }).catch(err =>
    console.error('[LearningService] Outbox word_mastered 失败:', err));

  // 如果在生词本中，自动移除
  await autoRemoveFromDifficult(userId, wordId);

  return true;
}

/**
 * 跳过单词（标记为已掌握但不触发事件/XP/成就）
 * 设置 mastered + is_skipped=1
 */
export async function skipWord(userId: string, wordId: string): Promise<void> {
  const now = Date.now();
  await updateWordProgress(userId, wordId, {
    status: 'mastered',
    masteredAt: now,
    isSkipped: 1,
  });

  // Outbox：同步到服务端（isSkipped=true 不触发事件）
  enqueueOutbox(userId, 'word_mastered', { wordId, isSkipped: true }).catch(err =>
    console.error('[LearningService] Outbox word_mastered(skip) 失败:', err));

  // 如果在生词本中，自动移除
  await autoRemoveFromDifficult(userId, wordId);
}

/**
 * 内部工具：如果单词在生词本中，自动移除并同步
 */
async function autoRemoveFromDifficult(userId: string, wordId: string): Promise<void> {
  try {
    const inDifficult = await isInDifficultList(wordId, userId);
    if (inDifficult) {
      await removeDifficultWord(userId, wordId);
    }
  } catch (error) {
    console.error('[LearningService] 自动移除生词本失败:', error);
  }
}
