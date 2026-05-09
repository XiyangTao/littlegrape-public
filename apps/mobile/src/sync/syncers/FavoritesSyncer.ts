/**
 * 收藏同步器
 *
 * 策略：local-first（本地优先）
 * - 初始化时：从服务端增量拉取收藏（游标分页 + afterServerTime）
 */

import { apiClient } from '@/api';
import { upsertFavoritesFromServer } from '@/db/WordDB';
import { getSyncServerTime, saveSyncServerTime } from '@/db/SyncMetadataDB';
import type { Syncer } from '../types';

const SYNCER_NAME = 'favorites';

export const FavoritesSyncer: Syncer = {
  name: SYNCER_NAME,
  priority: 2,
  strategy: 'local-first',
  pushMode: 'outbox',

  initSync: async (userId: string) => {
    if (__DEV__) console.log(`[Sync:${SYNCER_NAME}] 从服务端拉取收藏数据...`);
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
        const response = await apiClient.pullFavorites({
          afterServerTime: afterServerTime || undefined,
          cursor,
          limit,
        });

        if (!response.success || !response.data) {
          console.error(`[Sync:${SYNCER_NAME}] 拉取失败:`, response.error);
          break;
        }

        const { favorites, nextCursor, serverTime } = response.data;

        if (favorites.length > 0) {
          const insertedCount = await upsertFavoritesFromServer(userId, favorites);
          totalImported += insertedCount;
          if (__DEV__) console.log(`[Sync:${SYNCER_NAME}] 本批次: 服务端返回 ${favorites.length} 条, 实际插入 ${insertedCount} 条`);
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
