/**
 * 词汇量测试同步器
 *
 * 策略：merge（双向合并）
 * - 初始化时：从服务端增量拉取历史测试记录（游标分页 + afterServerTime）
 * - 测试后：本地保存 + 异步更新远程（不等待）
 */

import { apiClient } from '@/api';
import {
  saveVocabularyTestResult as saveTestLocal,
  insertVocabularyTestsFromServer,
  type VocabularyTestRecord,
} from '@/db/WordDB';
import { getSyncServerTime, saveSyncServerTime } from '@/db/SyncMetadataDB';
import { enqueueOutbox } from '@/db/OutboxDB';
import type { VocabularyTestResult } from '@/services/VocabularyTestService';
import type { Syncer } from '../types';

const SYNCER_NAME = 'vocabulary-test';

export const VocabularyTestSyncer: Syncer = {
  name: SYNCER_NAME,
  priority: 11,
  strategy: 'merge',
  pushMode: 'outbox', // 通过 Outbox 异步推送

  initSync: async (userId: string) => {
    if (__DEV__) console.log(`[Sync:${SYNCER_NAME}] 从服务端拉取测试记录...`);
    try {
      // 获取上次同步时间（增量同步）
      const afterServerTime = await getSyncServerTime(userId, SYNCER_NAME);
      if (__DEV__) console.log(`[Sync:${SYNCER_NAME}] 增量同步, afterServerTime:`, afterServerTime);

      let cursor: string | undefined;
      let totalImported = 0;
      let lastServerTime: number | null = null;
      const limit = 1000;

      // 游标分页拉取所有数据
      while (true) {
        const response = await apiClient.pullVocabularyTests({
          afterServerTime: afterServerTime || undefined,
          cursor,
          limit,
        });

        if (!response.success || !response.data) {
          console.error(`[Sync:${SYNCER_NAME}] 拉取失败:`, response.error);
          break;
        }

        const { tests, nextCursor, serverTime } = response.data;

        if (tests && tests.length > 0) {
          await insertVocabularyTestsFromServer(userId, tests);
          totalImported += tests.length;
          if (__DEV__) console.log(`[Sync:${SYNCER_NAME}] 本批次: 服务端返回 ${tests.length} 条`);
        }

        // 保存最新的 serverTime
        if (serverTime) {
          lastServerTime = serverTime;
        }

        if (!nextCursor) break;
        cursor = nextCursor;
      }

      // 保存同步时间戳
      if (lastServerTime) {
        await saveSyncServerTime(userId, SYNCER_NAME, lastServerTime);
        if (__DEV__) console.log(`[Sync:${SYNCER_NAME}] 已保存 serverTime:`, lastServerTime);
      }

      if (totalImported > 0) {
        if (__DEV__) console.log(`[Sync:${SYNCER_NAME}] 拉取完成, 共导入 ${totalImported} 条测试记录`);
      } else {
        if (__DEV__) console.log(`[Sync:${SYNCER_NAME}] 服务端无新测试记录`);
      }
    } catch (error) {
      console.error(`[Sync:${SYNCER_NAME}] 拉取失败:`, error);
      throw error;
    }
  },
};

// ==================== 操作函数（本地 + UI + 异步远程） ====================

/**
 * 保存词汇量测试结果
 */
export async function saveVocabularyTestResult(
  userId: string,
  result: VocabularyTestResult
): Promise<VocabularyTestRecord> {
  if (__DEV__) console.log('[Sync:vocabulary-test] 开始保存测试结果, userId:', userId);

  // 1. 本地保存
  const record = await saveTestLocal(userId, result);
  if (__DEV__) console.log('[Sync:vocabulary-test] 本地保存成功, id:', record.id);

  // 2. 通过 Outbox 异步推送到服务端（支持失败重试）
  try {
    await enqueueOutbox(userId, 'vocab_test_push', {
      id: record.id,
      estimatedVocabulary: record.estimatedVocabulary,
      totalQuestions: record.totalQuestions,
      correctCount: record.correctCount,
      duration: record.duration,
      level: record.level,
      levelDescription: record.levelDescription,
      confidenceLower: record.confidenceLower,
      confidenceUpper: record.confidenceUpper,
      eventTime: record.eventTime,
    });
  } catch (err) {
    console.error('[VocabularyTestSyncer] Outbox 入队失败:', err);
  }

  return record;
}
