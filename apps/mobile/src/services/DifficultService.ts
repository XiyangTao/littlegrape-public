/**
 * 生词本服务层
 *
 * 封装生词本的业务操作（本地 DB + Outbox 异步远程）。
 */

import { enqueueOutbox } from '@/db/OutboxDB';
import {
  recordWrongAnswer as recordWrongLocal,
  recordCorrectAnswer as recordCorrectLocal,
  removeDifficultWord as removeDifficultLocal,
  clearAllDifficultWords as clearAllDifficultLocal,
} from '@/db/WordDB';

/**
 * 记录答错（加入生词本）
 * @returns isNew - 是否是新加入生词本（wrongCount === 1）
 */
export async function recordWrongAnswer(userId: string, wordId: string): Promise<{ isNew: boolean }> {
  const result = await recordWrongLocal(wordId, userId);
  try {
    await enqueueOutbox(userId, 'difficult_wrong', { wordId });
  } catch (err) {
    console.error('[DifficultService] Outbox 入队失败:', err);
  }
  return { isNew: result.wrongCount === 1 };
}

/**
 * 记录答对（可能移出生词本）
 * @returns removed - 是否已从生词本移出
 */
export async function recordCorrectAnswer(userId: string, wordId: string): Promise<{ removed: boolean }> {
  const result = await recordCorrectLocal(wordId, userId);
  try {
    await enqueueOutbox(userId, 'difficult_correct', { wordId });
  } catch (err) {
    console.error('[DifficultService] Outbox 入队失败:', err);
  }
  return { removed: result.removed };
}

/**
 * 手动移除单个生词（本地 DB + Outbox）
 */
export async function removeDifficultWord(userId: string, wordId: string): Promise<void> {
  await removeDifficultLocal(wordId, userId);
  try {
    await enqueueOutbox(userId, 'difficult_remove', { wordId });
  } catch (err) {
    console.error('[DifficultService] Outbox 入队失败:', err);
  }
}

/**
 * 清空用户所有生词（本地 DB + Outbox）
 */
export async function clearAllDifficultWords(userId: string): Promise<void> {
  await clearAllDifficultLocal(userId);
  try {
    await enqueueOutbox(userId, 'difficult_clear', {});
  } catch (err) {
    console.error('[DifficultService] Outbox 入队失败:', err);
  }
}
