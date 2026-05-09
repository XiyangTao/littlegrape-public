/**
 * 学习事件同步器
 *
 * 策略：merge（双向合并）
 * - 初始化时：从服务端增量拉取当天的 events（游标分页 + afterServerTime）
 * - 学习时：先本地记录，定时批量推送
 */

import { apiClient } from '@/api';
import {
  getUnsyncedEventsWithDailyStats,
  getUnsyncedDailyStatsForPush,
  markEventsSynced,
  markDailyStatsSynced,
  upsertEventsFromServer,
  type LearningEvent,
} from '@/services/StatsService';
import { getSyncServerTime, saveSyncServerTime } from '@/db/SyncMetadataDB';
import { getLocalDateString } from '@/utils/dateUtils';
import type { Syncer } from '../types';

const SYNCER_NAME = 'events';

export const EventsSyncer: Syncer = {
  name: SYNCER_NAME,
  priority: 11, // 在 DailyStatsSyncer 之后
  strategy: 'merge',
  pushMode: 'push-loop', // 需要后台循环推送

  initSync: async (userId: string) => {
    const today = getLocalDateString();
    if (__DEV__) console.log(`[Sync:${SYNCER_NAME}] 从服务端拉取当天(${today})事件...`);
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
        const response = await apiClient.pullTodayEvents({
          date: today,
          afterServerTime: afterServerTime || undefined,
          cursor,
          limit,
        });

        if (!response.success || !response.data) {
          console.error(`[Sync:${SYNCER_NAME}] 拉取失败:`, response.error);
          break;
        }

        const { events, nextCursor, serverTime } = response.data;

        if (events && events.length > 0) {
          const insertedEvents = await upsertEventsFromServer(userId, events);
          totalImported += insertedEvents;
          if (__DEV__) console.log(`[Sync:${SYNCER_NAME}] 本批次: 服务端返回 ${events.length} 条, 实际插入 ${insertedEvents} 条`);
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

  push: async (userId: string) => {
    try {
      // 在同一事务中读取 events 和 dailyStats，保证一致性
      const { events, dailyStats } = await getUnsyncedEventsWithDailyStats(userId, 50);

      if (events.length === 0) {
        // 没有待同步事件时，检查是否有独立的 dailyStats 变更（如发音练习）
        const unsyncedStats = await getUnsyncedDailyStatsForPush(userId, 50);
        if (unsyncedStats.length === 0) return;

        if (__DEV__) console.log(`[Sync:${SYNCER_NAME}] 独立推送 ${unsyncedStats.length} 条 dailyStats...`);

        const response = await apiClient.pushLearningData({
          events: [],
          dailyStats: unsyncedStats,
        });

        if (response.success) {
          const ids = unsyncedStats.map(s => s.id);
          await markDailyStatsSynced(ids);
          if (__DEV__) console.log(`[Sync:${SYNCER_NAME}] 已独立推送 ${ids.length} 条 dailyStats`);
        }
        return;
      }

      if (__DEV__) console.log(`[Sync:${SYNCER_NAME}] 推送 ${events.length} 条学习事件...`);

      // 转换为服务端格式
      const eventsForServer = events.map((event: LearningEvent) => ({
        id: event.id,
        eventType: event.eventType,
        entityType: event.entityType,
        entityId: event.entityId,
        quantity: event.quantity,
        eventDate: event.eventDate,
        eventTime: event.eventTime,
      }));

      // 推送到服务端
      const response = await apiClient.pushLearningData({
        events: eventsForServer,
        dailyStats,
      });

      if (response.success) {
        const eventIds = events.map((e: LearningEvent) => e.id);
        await markEventsSynced(eventIds);
        if (__DEV__) console.log(`[Sync:${SYNCER_NAME}] 已推送 ${eventIds.length} 条学习事件`);
      }
      // 失败不处理，SyncManager 3 秒后自动重试
    } catch (error) {
      console.error(`[Sync:${SYNCER_NAME}] 推送失败:`, error);
      // 不抛出错误，SyncManager 3 秒后自动重试
    }
  },
};
