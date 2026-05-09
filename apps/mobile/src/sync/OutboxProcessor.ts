/**
 * Outbox 处理器
 *
 * 从 sync_outbox 表中读取待处理条目，按顺序执行 API 调用。
 * 成功后删除条目，失败后标记重试（指数退避）。
 * 由 SyncManager 的 push loop 每 3 秒调用一次。
 */

import NetInfo from '@react-native-community/netinfo';
import { apiClient } from '@/api';
import {
  getPendingEntries,
  removeEntry,
  markFailed,
  type OutboxEntry,
} from '@/db/OutboxDB';

/**
 * 根据 op_type 执行对应的 API 调用
 */
async function executeEntry(entry: OutboxEntry): Promise<void> {
  const payload = JSON.parse(entry.payload);

  switch (entry.op_type) {
    case 'favorite_add':
      await apiClient.addFavorite(payload.wordId);
      break;
    case 'favorite_remove':
      await apiClient.removeFavorite(payload.wordId);
      break;
    case 'difficult_wrong':
      await apiClient.recordWrongAnswer(payload.wordId);
      break;
    case 'difficult_correct':
      await apiClient.recordCorrectAnswer(payload.wordId);
      break;
    case 'difficult_remove':
      await apiClient.removeDifficultWord(payload.wordId);
      break;
    case 'difficult_clear':
      await apiClient.clearAllDifficultWords();
      break;
    case 'vocab_test_push':
      await apiClient.pushVocabularyTests({ tests: [payload] });
      break;
    case 'word_learned':
      await apiClient.markWordLearned(payload.wordId);
      break;
    case 'word_mastered':
      await apiClient.markWordMastered(payload.wordId, payload.isSkipped);
      break;
    default:
      console.warn(`[OutboxProcessor] 未知操作类型: ${entry.op_type}`);
  }
}

/**
 * 处理当前用户到期的 Outbox 条目
 *
 * 关键约束：只处理 user_id === userId 的 entry。
 * 用户 A 离线写入后立刻 logout、用户 B 登录这种场景下，A 的 entry 留在表里
 * 不会被 B 的 SyncManager 用 B 的 token 推上去 —— 等 A 重登再推完。
 *
 * @returns 成功处理的条目数
 */
export async function processOutbox(userId: string): Promise<number> {
  if (!userId) {
    console.warn('[OutboxProcessor] processOutbox 缺 userId，跳过');
    return 0;
  }
  // 无网络时跳过处理，避免不必要的失败重试
  const netState = await NetInfo.fetch();
  if (!netState.isConnected) return 0;

  const entries = await getPendingEntries(userId);
  if (entries.length === 0) return 0;

  let processed = 0;
  for (const entry of entries) {
    try {
      await executeEntry(entry);
      await removeEntry(entry.id);
      processed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await markFailed(entry.id, msg);
      console.warn(`[OutboxProcessor] 条目 ${entry.id} (${entry.op_type}) 失败:`, msg);
    }
  }

  if (processed > 0) {
    if (__DEV__) console.log(`[OutboxProcessor] 处理完成: ${processed}/${entries.length} 条`);
  }
  return processed;
}
