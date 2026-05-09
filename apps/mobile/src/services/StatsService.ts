/**
 * 统计服务
 *
 * 本地优先、事件驱动的学习统计系统核心服务
 * - 记录学习事件并同时更新每日汇总
 * - 提供统一的统计读取接口
 * - UI 层通过此服务获取所有统计数据
 *
 * 数据访问通过 StatsDB 模块
 */

import { runSerialWrite } from '@/db/DatabaseManager';
import * as StatsDB from '@/db/StatsDB';
import type { LocalWord } from '@/db/WordDB';
import { generateShortId } from '@/utils/idGenerator';
import { getLocalDateString, parseLocalDate } from '@/utils/dateUtils';

// ==================== 类型重导出 ====================

export type { LearningEventType, EntityType, LearningEventRow } from '@/db/StatsDB';
export type { LocalWord } from '@/db/WordDB';

/** 学习事件记录（对外接口） */
export interface LearningEvent {
  id: string;
  userId: string;
  eventType: StatsDB.LearningEventType;
  entityType: StatsDB.EntityType | null;
  entityId: string | null;
  quantity: number;
  eventDate: string;
  eventTime: number;
  syncStatus: 'pending' | 'synced' | 'failed';
  syncedAt: number | null;
}

/** 每日统计 */
export interface DailyStats {
  date: string;
  learnedCount: number;
  masteredCount: number;
  reviewedCount: number;
  grammarPracticedCount: number;
  grammarMasteredCount: number;
  phonemePracticedCount: number;
}

/** 今日统计（带用户信息） */
export interface TodayStats extends DailyStats {
  userId: string;
}

/** 总体统计 */
export interface OverviewStats {
  totalLearned: number;
  totalMastered: number;
  totalDays: number;
  streakDays: number;
}

// ==================== 辅助函数 ====================

// getLocalDateString 从 @/utils/dateUtils 导入（消除重复定义）

/**
 * 获取日期范围的开始和结束时间戳
 * 使用 parseLocalDate 安全解析，避免 new Date("YYYY-MM-DD") 的 UTC 陷阱
 */
function getDateRange(dateStr: string): { start: number; end: number } {
  const start = parseLocalDate(dateStr).getTime();
  const end = start + 24 * 60 * 60 * 1000 - 1;
  return { start, end };
}

// ==================== 核心函数 ====================

/**
 * 记录学习事件
 * 同时更新 learning_events 表和 daily_stats 汇总表
 */
export async function recordLearningEvent(
  userId: string,
  eventType: StatsDB.LearningEventType,
  entityId?: string,
  entityType: StatsDB.EntityType = 'word',
  eventTime: number = Date.now()
): Promise<boolean> {
  return runSerialWrite(async () => {
    const eventDate = getLocalDateString(eventTime);
    // 同一天同一用户同一单词同一事件类型，生成相同的 id（去重）
    const uniqueKey = `${userId}_${eventType}_${entityType}_${entityId || 'none'}_${eventDate}`;
    const id = generateShortId(uniqueKey, 0); // timestamp 固定为 0，确保同一天生成相同 id

    const fieldMap: Record<StatsDB.LearningEventType, 'learned_count' | 'mastered_count' | 'reviewed_count' | 'grammar_practiced_count' | 'grammar_mastered_count'> = {
      'word_learned': 'learned_count',
      'word_mastered': 'mastered_count',
      'word_reviewed': 'reviewed_count',
      'grammar_practiced': 'grammar_practiced_count',
      'grammar_mastered': 'grammar_mastered_count',
    };

    // 在事务中同时插入事件和更新 daily_stats，保证原子性
    return StatsDB.recordEventWithDailyStats(
      id, userId, eventType, entityType, entityId || null, 1,
      eventDate, eventTime, fieldMap[eventType]
    );
  });
}

/**
 * 记录单词学习事件（便捷函数）
 */
export async function recordWordLearned(
  userId: string,
  wordId: string,
  eventTime: number = Date.now()
): Promise<boolean> {
  return recordLearningEvent(userId, 'word_learned', wordId, 'word', eventTime);
}

/**
 * 记录单词掌握事件（便捷函数）
 */
export async function recordWordMastered(
  userId: string,
  wordId: string,
  eventTime: number = Date.now()
): Promise<boolean> {
  return recordLearningEvent(userId, 'word_mastered', wordId, 'word', eventTime);
}

/**
 * 记录单词复习事件（便捷函数）
 */
export async function recordWordReviewed(
  userId: string,
  wordId: string,
  eventTime: number = Date.now()
): Promise<boolean> {
  return recordLearningEvent(userId, 'word_reviewed', wordId, 'word', eventTime);
}

/**
 * 记录语法练习事件（便捷函数）
 */
export async function recordGrammarPracticed(
  userId: string,
  pointCode: string,
  eventTime: number = Date.now()
): Promise<boolean> {
  return recordLearningEvent(userId, 'grammar_practiced', pointCode, 'grammar', eventTime);
}

/**
 * 记录语法掌握事件（便捷函数）
 */
export async function recordGrammarMastered(
  userId: string,
  pointCode: string,
  eventTime: number = Date.now()
): Promise<boolean> {
  return recordLearningEvent(userId, 'grammar_mastered', pointCode, 'grammar', eventTime);
}

/**
 * 获取今日统计
 */
export async function getTodayStats(userId: string): Promise<TodayStats> {
  const today = getLocalDateString();
  const stats = await StatsDB.getDailyStats(userId, today);

  if (!stats) {
    return {
      userId,
      date: today,
      learnedCount: 0,
      masteredCount: 0,
      reviewedCount: 0,
      grammarPracticedCount: 0,
      grammarMasteredCount: 0,
      phonemePracticedCount: 0,
    };
  }

  return {
    userId,
    date: stats.date,
    learnedCount: stats.learnedCount,
    masteredCount: stats.masteredCount,
    reviewedCount: stats.reviewedCount,
    grammarPracticedCount: stats.grammarPracticedCount,
    grammarMasteredCount: stats.grammarMasteredCount,
    phonemePracticedCount: stats.phonemePracticedCount,
  };
}

/**
 * 获取日期范围内的每日统计
 */
export async function getDailyStatsRange(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<DailyStats[]> {
  const startStr = getLocalDateString(startDate.getTime());
  const endStr = getLocalDateString(endDate.getTime());

  const rows = await StatsDB.getDailyStatsRange(userId, startStr, endStr);

  return rows.map(row => ({
    date: row.date,
    learnedCount: row.learnedCount,
    masteredCount: row.masteredCount,
    reviewedCount: row.reviewedCount,
    grammarPracticedCount: row.grammarPracticedCount,
    grammarMasteredCount: row.grammarMasteredCount,
    phonemePracticedCount: row.phonemePracticedCount,
  }));
}

/**
 * 获取总体统计
 */
export async function getOverviewStats(userId: string): Promise<OverviewStats> {
  const [totalLearned, totalMastered, totalDays, streakDays] = await Promise.all([
    StatsDB.getTotalLearnedCount(userId),
    StatsDB.getTotalMasteredCount(userId),
    StatsDB.getTotalDays(userId),
    calculateStreakDays(userId),
  ]);

  return {
    totalLearned,
    totalMastered,
    totalDays,
    streakDays,
  };
}

/**
 * 计算连续打卡天数
 */
async function calculateStreakDays(userId: string): Promise<number> {
  const dates = await StatsDB.getActiveDates(userId);
  if (dates.length === 0) return 0;

  const today = getLocalDateString();
  const yesterday = getLocalDateString(Date.now() - 24 * 60 * 60 * 1000);

  // 如果最近一天不是今天或昨天，说明连续打卡已断
  if (dates[0] !== today && dates[0] !== yesterday) {
    return 0;
  }

  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const currentDate = parseLocalDate(dates[i - 1]);
    const prevDate = parseLocalDate(dates[i]);

    const diffDays = Math.round(
      (currentDate.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000)
    );

    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * 获取某天学习的单词列表（仅ID）
 */
export async function getLearnedWordsOnDate(
  userId: string,
  date: Date
): Promise<string[]> {
  const { start, end } = getDateRange(getLocalDateString(date.getTime()));
  return StatsDB.getEventEntityIds(userId, 'word_learned', start, end);
}

/**
 * 获取某天掌握的单词列表（仅ID）
 */
export async function getMasteredWordsOnDate(
  userId: string,
  date: Date
): Promise<string[]> {
  const { start, end } = getDateRange(getLocalDateString(date.getTime()));
  return StatsDB.getEventEntityIds(userId, 'word_mastered', start, end);
}

/**
 * 获取某天学习的单词详情（带完整单词信息）
 * 优先从本地查询，如果本地无数据则从服务端获取
 */
export async function getLearningWordsByDate(
  userId: string,
  date: Date,
  eventType: 'word_learned' | 'word_mastered'
): Promise<LocalWord[]> {
  const dateStr = getLocalDateString(date.getTime());
  const { start, end } = getDateRange(dateStr);

  // 1. 首先从本地查询
  const localWords = await StatsDB.getEventsWithWords(userId, eventType, start, end);

  // 2. 如果本地有数据，直接返回
  if (localWords.length > 0) {
    return localWords;
  }

  // 3. 本地无数据，尝试从服务端获取
  try {
    const { apiClient } = await import('@/api');
    const response = await apiClient.fetchEventsForDate(dateStr);

    if (!response.success || !response.data?.events) {
      return [];
    }

    // 4. 筛选指定类型的事件，提取 wordIds
    const wordIds = response.data.events
      .filter(e => e.eventType === eventType && e.entityType === 'word' && e.entityId)
      .map(e => e.entityId as string);

    if (wordIds.length === 0) {
      return [];
    }

    // 5. 根据 wordIds 从本地 words 表查询单词信息
    return StatsDB.getWordsByIds(wordIds);
  } catch (error) {
    console.error('[StatsService] 从服务端获取历史事件失败:', error instanceof Error ? error.message : error);
    return [];
  }
}

// ==================== 同步相关 ====================

/**
 * 获取待同步事件数量
 */
export async function getPendingEventsCount(userId: string): Promise<number> {
  return StatsDB.getPendingEventsCount(userId);
}

/**
 * 获取待同步的学习事件
 */
export async function getUnsyncedEvents(
  userId: string,
  limit: number = 100
): Promise<LearningEvent[]> {
  const rows = await StatsDB.getUnsyncedEvents(userId, limit);
  return rows.map(row => ({
    id: row.id,
    userId: row.userId,
    eventType: row.eventType,
    entityType: row.entityType,
    entityId: row.entityId,
    quantity: row.quantity,
    eventDate: row.eventDate,
    eventTime: row.eventTime,
    syncStatus: row.syncStatus,
    syncedAt: row.syncedAt,
  }));
}

/**
 * 标记事件为已同步
 */
export async function markEventsSynced(eventIds: string[]): Promise<void> {
  return StatsDB.markEventsSynced(eventIds);
}

/**
 * 标记事件同步失败
 */
export async function markEventsFailed(eventIds: string[]): Promise<void> {
  return StatsDB.markEventsFailed(eventIds);
}

/**
 * 从服务端插入学习事件
 */
export async function upsertEventsFromServer(
  userId: string,
  events: Array<{
    id: string;
    eventType: string;
    entityType: string | null;
    entityId: string | null;
    quantity: number;
    eventDate: string;
    eventTime: number;
  }>
): Promise<number> {
  return StatsDB.insertEventsFromServer(userId, events);
}

/**
 * 从服务端插入每日统计
 */
export async function upsertDailyStatsFromServer(
  userId: string,
  stats: Array<{
    date: string;
    learnedCount: number;
    masteredCount: number;
    reviewedCount: number;
    grammarPracticedCount?: number;
    grammarMasteredCount?: number;
    phonemePracticedCount?: number;
    updatedAt: number;
  }>
): Promise<number> {
  return StatsDB.insertDailyStatsFromServer(userId, stats);
}

/**
 * 获取指定日期的本地 dailyStats
 */
export async function getDailyStatsForDates(
  userId: string,
  dates: string[]
): Promise<Array<{
  date: string;
  learnedCount: number;
  masteredCount: number;
  reviewedCount: number;
  grammarPracticedCount: number;
  grammarMasteredCount: number;
  phonemePracticedCount: number;
}>> {
  const rows = await StatsDB.getDailyStatsForDates(userId, dates);
  return rows.map(row => ({
    date: row.date,
    learnedCount: row.learnedCount,
    masteredCount: row.masteredCount,
    reviewedCount: row.reviewedCount,
    grammarPracticedCount: row.grammarPracticedCount,
    grammarMasteredCount: row.grammarMasteredCount,
    phonemePracticedCount: row.phonemePracticedCount,
  }));
}

/**
 * 获取最近同步时间
 */
export async function getLastSyncTime(userId: string): Promise<number | null> {
  return StatsDB.getLastSyncTime(userId);
}

/**
 * 按需获取某天的学习事件详情（仅ID）
 */
export async function getEventsForDate(
  userId: string,
  date: Date,
  eventType?: 'word_learned' | 'word_mastered'
): Promise<string[]> {
  const { start, end } = getDateRange(getLocalDateString(date.getTime()));

  if (eventType) {
    return StatsDB.getEventEntityIds(userId, eventType, start, end);
  }

  // 如果没指定类型，获取所有类型
  const [learned, mastered] = await Promise.all([
    StatsDB.getEventEntityIds(userId, 'word_learned', start, end),
    StatsDB.getEventEntityIds(userId, 'word_mastered', start, end),
  ]);

  return [...learned, ...mastered];
}

/**
 * 记录发音练习（直接操作 daily_stats，不走事件系统）
 */
export async function recordPhonemePractice(userId: string): Promise<void> {
  const today = getLocalDateString();
  await StatsDB.incrementDailyStatsOnly(userId, today, 'phoneme_practiced_count');
}

/**
 * 获取未同步的 daily_stats（独立推送用）
 * 返回带 id 的记录，供 Syncer 推送后标记同步
 */
export async function getUnsyncedDailyStatsForPush(
  userId: string,
  limit: number = 50
): Promise<Array<DailyStats & { id: string }>> {
  const rows = await StatsDB.getUnsyncedDailyStats(userId, limit);
  return rows.map(row => ({
    id: row.id,
    date: row.date,
    learnedCount: row.learnedCount,
    masteredCount: row.masteredCount,
    reviewedCount: row.reviewedCount,
    grammarPracticedCount: row.grammarPracticedCount,
    grammarMasteredCount: row.grammarMasteredCount,
    phonemePracticedCount: row.phonemePracticedCount,
  }));
}

/**
 * 标记 daily_stats 为已同步
 */
export { markDailyStatsSynced } from '@/db/StatsDB';

/**
 * 获取待同步事件和对应的每日统计（事务一致性读取）
 */
export async function getUnsyncedEventsWithDailyStats(
  userId: string,
  limit: number = 50
): Promise<{
  events: LearningEvent[];
  dailyStats: DailyStats[];
}> {
  const result = await StatsDB.getUnsyncedEventsWithDailyStats(userId, limit);

  return {
    events: result.events.map(row => ({
      id: row.id,
      userId: row.userId,
      eventType: row.eventType,
      entityType: row.entityType,
      entityId: row.entityId,
      quantity: row.quantity,
      eventDate: row.eventDate,
      eventTime: row.eventTime,
      syncStatus: row.syncStatus,
      syncedAt: row.syncedAt,
    })),
    dailyStats: result.dailyStats.map(row => ({
      date: row.date,
      learnedCount: row.learnedCount,
      masteredCount: row.masteredCount,
      reviewedCount: row.reviewedCount,
      grammarPracticedCount: row.grammarPracticedCount,
      grammarMasteredCount: row.grammarMasteredCount,
      phonemePracticedCount: row.phonemePracticedCount,
    })),
  };
}
