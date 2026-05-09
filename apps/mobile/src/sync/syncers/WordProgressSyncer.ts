/**
 * 学习进度同步器
 *
 * 策略：pull-only（只从服务端拉取）
 * - 初始化时：从服务端增量拉取进度（游标分页 + afterServerTime）
 * - 推送：已改为 Outbox 逐条同步（word_learned / word_mastered），不再批量 push
 */

import { apiClient } from '@/api';
import {
  upsertWordProgressFromServer,
} from '@/db/WordDB';
import { getSyncServerTime, saveSyncServerTime } from '@/db/SyncMetadataDB';
import type { Syncer } from '../types';

const SYNCER_NAME = 'word-progress';

export const WordProgressSyncer: Syncer = {
  name: SYNCER_NAME,
  priority: 5, // 较高优先级，在 Libraries 之后
  strategy: 'merge',
  pushMode: 'outbox', // 推送已改为 Outbox 逐条同步

  initSync: async (userId: string) => {
    if (__DEV__) console.log(`[Sync:${SYNCER_NAME}] 从服务端拉取学习进度...`);
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
        const response = await apiClient.pullWordProgress({
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
          const insertedCount = await upsertWordProgressFromServer(userId, progress);
          totalImported += insertedCount;
          if (__DEV__) console.log(`[Sync:${SYNCER_NAME}] 本批次: 服务端返回 ${progress.length} 条, 实际插入 ${insertedCount} 条`);
        }

        // 保存最新的 serverTime
        if (serverTime) {
          lastServerTime = serverTime;
        }

        // 没有更多数据了
        if (!nextCursor) {
          break;
        }

        cursor = nextCursor;
      }

      // 保存同步时间戳
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

};
