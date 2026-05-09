/**
 * 每日统计同步器
 *
 * 策略：merge（双向合并）
 * - 初始化时：从服务端增量拉取 dailyStats（游标分页 + afterServerTime）
 * - 只负责拉取，不负责推送（推送由 EventsSyncer 负责）
 */

import { apiClient } from '@/api';
import { upsertDailyStatsFromServer } from '@/services/StatsService';
import { getSyncServerTime, saveSyncServerTime } from '@/db/SyncMetadataDB';
import type { Syncer } from '../types';

const SYNCER_NAME = 'daily-stats';

export const DailyStatsSyncer: Syncer = {
  name: SYNCER_NAME,
  priority: 10, // 较低优先级
  strategy: 'merge',
  pushMode: 'pull-only', // 不需要推送，由 EventsSyncer 附带推送 dailyStats

  initSync: async (userId: string) => {
    if (__DEV__) console.log(`[Sync:${SYNCER_NAME}] 从服务端拉取每日统计数据...`);
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
        const response = await apiClient.pullDailyStats({
          afterServerTime: afterServerTime || undefined,
          cursor,
          limit,
        });

        if (!response.success || !response.data) {
          console.error(`[Sync:${SYNCER_NAME}] 拉取失败:`, response.error);
          break;
        }

        const { dailyStats, nextCursor, serverTime } = response.data;

        if (dailyStats && dailyStats.length > 0) {
          // 转换为 upsertDailyStatsFromServer 期望的格式
          const statsForInsert = dailyStats.map(s => ({
            date: s.date,
            learnedCount: s.learnedCount,
            masteredCount: s.masteredCount,
            reviewedCount: s.reviewedCount,
            grammarPracticedCount: s.grammarPracticedCount || 0,
            grammarMasteredCount: s.grammarMasteredCount || 0,
            phonemePracticedCount: s.phonemePracticedCount || 0,
            updatedAt: s.updatedAt,
          }));
          const insertedStats = await upsertDailyStatsFromServer(userId, statsForInsert);
          totalImported += insertedStats;
          if (__DEV__) console.log(`[Sync:${SYNCER_NAME}] 本批次: 服务端返回 ${dailyStats.length} 条, 实际插入 ${insertedStats} 条`);
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

      if (__DEV__) console.log(`[Sync:${SYNCER_NAME}] 拉取完成, 共导入 ${totalImported} 条`);
    } catch (error) {
      console.error(`[Sync:${SYNCER_NAME}] 拉取失败:`, error);
      throw error;
    }
  },
};
