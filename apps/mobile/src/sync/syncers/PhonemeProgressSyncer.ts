/**
 * 音素练习进度同步器
 *
 * 策略：merge（双向合并）
 * - 初始化时：从服务端增量拉取进度（游标分页 + afterServerTime）
 * - 练习时：先本地记录，定时批量推送
 */

import { apiClient } from '@/api';
import {
  getUnsyncedPhonemeProgress,
  markPhonemeProgressSynced,
  upsertPhonemeProgressFromServer,
} from '@/db/PhonemeProgressDB';
import { getSyncServerTime, saveSyncServerTime } from '@/db/SyncMetadataDB';
import type { Syncer } from '../types';

const SYNCER_NAME = 'phoneme-progress';

export const PhonemeProgressSyncer: Syncer = {
  name: SYNCER_NAME,
  priority: 6,
  strategy: 'merge',
  pushMode: 'push-loop',

  initSync: async (userId: string) => {
    if (__DEV__) console.log(`[Sync:${SYNCER_NAME}] 从服务端拉取音素进度...`);
    try {
      const afterServerTime = await getSyncServerTime(userId, SYNCER_NAME);
      if (__DEV__) console.log(`[Sync:${SYNCER_NAME}] 增量同步, afterServerTime:`, afterServerTime);

      let cursor: string | undefined;
      let totalImported = 0;
      let lastServerTime: number | null = null;
      const limit = 1000;

      while (true) {
        const response = await apiClient.pullPhonemeProgress({
          afterServerTime: afterServerTime || undefined,
          cursor,
          limit,
        });

        if (!response.success || !response.data) {
          console.error(`[Sync:${SYNCER_NAME}] 拉取失败:`, response.error);
          break;
        }

        const { progress, nextCursor, serverTime } = response.data;

        if (progress.length > 0) {
          const insertedCount = await upsertPhonemeProgressFromServer(userId, progress);
          totalImported += insertedCount;
          if (__DEV__) console.log(`[Sync:${SYNCER_NAME}] 本批次: 服务端返回 ${progress.length} 条, 实际插入 ${insertedCount} 条`);
        }

        if (serverTime) {
          lastServerTime = serverTime;
        }

        if (!nextCursor) {
          break;
        }

        cursor = nextCursor;
      }

      if (lastServerTime) {
        await saveSyncServerTime(userId, SYNCER_NAME, lastServerTime);
        if (__DEV__) console.log(`[Sync:${SYNCER_NAME}] 已保存 serverTime:`, lastServerTime);
      }

      if (__DEV__) console.log(`[Sync:${SYNCER_NAME}] 拉取完成, 共导入 ${totalImported} 条`);
    } catch (error) {
      console.error(`[Sync:${SYNCER_NAME}] 拉取失败:`, error);
      throw error;
    }
  },

  push: async (userId: string) => {
    try {
      const progressList = await getUnsyncedPhonemeProgress(userId);
      if (progressList.length === 0) return;

      if (__DEV__) console.log(`[Sync:${SYNCER_NAME}] 推送 ${progressList.length} 条音素进度...`);

      const progressForServer = progressList.map((p) => ({
        phonemeSymbol: p.phonemeSymbol,
        practiceCount: p.practiceCount,
        totalWordCount: p.totalWordCount,
        avgScore: p.avgScore,
        bestScore: p.bestScore,
        lastScore: p.lastScore,
        masteryLevel: p.masteryLevel,
        listenCorrectCount: p.listenCorrectCount,
        listenTotalCount: p.listenTotalCount,
        lastPracticedAt: p.lastPracticedAt,
        updatedAt: p.updatedAt,
      }));

      const response = await apiClient.pushPhonemeProgress({
        progress: progressForServer,
      });

      if (response.success) {
        const ids = progressList.map((p) => p.id);
        await markPhonemeProgressSynced(ids);
        if (__DEV__) console.log(`[Sync:${SYNCER_NAME}] 已推送 ${ids.length} 条音素进度`);
      }
    } catch (error) {
      console.error(`[Sync:${SYNCER_NAME}] 推送失败:`, error);
      // 不抛出错误，让 SyncManager 3 秒后自动重试
    }
  },
};
