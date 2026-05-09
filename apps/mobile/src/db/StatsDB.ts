/**
 * 统计数据库操作
 *
 * 封装 learning_events 和 daily_stats 表的所有数据库操作
 * StatsService 通过此模块访问数据库
 */

import { getDatabase, runSerialWrite } from './DatabaseManager';
import { LocalWord, rowToLocalWord } from './WordDB';

// ==================== 类型定义 ====================

/** 学习事件类型 */
export type LearningEventType = 'word_learned' | 'word_mastered' | 'word_reviewed' | 'grammar_practiced' | 'grammar_mastered';

/** 实体类型 */
export type EntityType = 'word' | 'grammar';

/** 学习事件记录（数据库格式） */
export interface LearningEventRow {
  id: string;
  userId: string;
  eventType: LearningEventType;
  entityType: EntityType | null;
  entityId: string | null;
  quantity: number;
  eventDate: string;
  eventTime: number;
  syncStatus: 'pending' | 'synced' | 'failed';
  syncedAt: number | null;
}

/** 每日统计记录（数据库格式） */
export interface DailyStatsRow {
  id: string;
  userId: string;
  date: string;
  learnedCount: number;
  masteredCount: number;
  reviewedCount: number;
  grammarPracticedCount: number;
  grammarMasteredCount: number;
  phonemePracticedCount: number;
  updatedAt: number;
  syncedAt: number | null;
}

// ==================== 辅助函数 ====================

/** SQLite 原始行类型（snake_case 字段，值由 op-sqlite 返回） */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RawRow = Record<string, any>;

/** 将数据库行转换为 LearningEventRow */
function toEventRow(row: RawRow): LearningEventRow {
  return {
    id: row.id,
    userId: row.user_id,
    eventType: row.event_type as LearningEventType,
    entityType: row.entity_type as EntityType | null,
    entityId: row.entity_id,
    quantity: row.quantity,
    eventDate: row.event_date,
    eventTime: row.event_time,
    syncStatus: row.sync_status,
    syncedAt: row.synced_at,
  };
}

/** 将数据库行转换为 DailyStatsRow */
function toStatsRow(row: RawRow): DailyStatsRow {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.date,
    learnedCount: row.learned_count || 0,
    masteredCount: row.mastered_count || 0,
    reviewedCount: row.reviewed_count || 0,
    grammarPracticedCount: row.grammar_practiced_count || 0,
    grammarMasteredCount: row.grammar_mastered_count || 0,
    phonemePracticedCount: row.phoneme_practiced_count || 0,
    updatedAt: row.updated_at,
    syncedAt: row.synced_at,
  };
}

// ==================== Learning Events 操作 ====================

/**
 * 插入学习事件
 * @returns 是否成功插入（如果已存在返回 false）
 */
export async function insertLearningEvent(
  id: string,
  userId: string,
  eventType: LearningEventType,
  entityType: EntityType | null,
  entityId: string | null,
  quantity: number,
  eventDate: string,
  eventTime: number
): Promise<boolean> {
  const db = await getDatabase();
  const result = await db.execute(
    `INSERT OR IGNORE INTO learning_events
      (id, user_id, event_type, entity_type, entity_id, quantity, event_date, event_time, sync_status, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', NULL)`,
    [id, userId, eventType, entityType, entityId, quantity, eventDate, eventTime]
  );
  return result.rowsAffected > 0;
}

/**
 * 在事务中记录学习事件并更新每日汇总
 * 确保两步操作的原子性
 */
export async function recordEventWithDailyStats(
  id: string,
  userId: string,
  eventType: LearningEventType,
  entityType: EntityType | null,
  entityId: string | null,
  quantity: number,
  eventDate: string,
  eventTime: number,
  dailyStatsField: 'learned_count' | 'mastered_count' | 'reviewed_count' | 'grammar_practiced_count' | 'grammar_mastered_count'
): Promise<boolean> {
  const db = await getDatabase();
  let inserted = false;

  await db.transaction(async (tx) => {
    // 1. 插入学习事件
    const result = await tx.execute(
      `INSERT OR IGNORE INTO learning_events
        (id, user_id, event_type, entity_type, entity_id, quantity, event_date, event_time, sync_status, synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', NULL)`,
      [id, userId, eventType, entityType, entityId, quantity, eventDate, eventTime]
    );

    if (result.rowsAffected === 0) {
      inserted = false;
      return;
    }

    inserted = true;
    const dailyStatsId = `${userId}_${eventDate}`;
    const now = Date.now();

    // 2. 尝试更新 daily_stats
    const updateResult = await tx.execute(
      `UPDATE daily_stats
       SET ${dailyStatsField} = ${dailyStatsField} + 1, updated_at = ?
       WHERE id = ?`,
      [now, dailyStatsId]
    );

    // 3. 如果记录不存在，插入新记录
    if (updateResult.rowsAffected === 0) {
      const learnedCount = dailyStatsField === 'learned_count' ? 1 : 0;
      const masteredCount = dailyStatsField === 'mastered_count' ? 1 : 0;
      const reviewedCount = dailyStatsField === 'reviewed_count' ? 1 : 0;
      const grammarPracticedCount = dailyStatsField === 'grammar_practiced_count' ? 1 : 0;
      const grammarMasteredCount = dailyStatsField === 'grammar_mastered_count' ? 1 : 0;
      await tx.execute(
        `INSERT INTO daily_stats
          (id, user_id, date, learned_count, mastered_count, reviewed_count, grammar_practiced_count, grammar_mastered_count, phoneme_practiced_count, updated_at, synced_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, NULL)`,
        [dailyStatsId, userId, eventDate, learnedCount, masteredCount, reviewedCount, grammarPracticedCount, grammarMasteredCount, now]
      );
    }
  });

  return inserted;
}

/**
 * 按日期范围查询事件的实体ID
 */
export async function getEventEntityIds(
  userId: string,
  eventType: LearningEventType,
  startTime: number,
  endTime: number
): Promise<string[]> {
  const db = await getDatabase();
  const result = await db.execute(
    `SELECT entity_id
     FROM learning_events
     WHERE user_id = ? AND event_type = ? AND entity_type = 'word'
       AND event_time >= ? AND event_time <= ?
     ORDER BY event_time ASC`,
    [userId, eventType, startTime, endTime]
  );
  return (result.rows as RawRow[]).map(row => row.entity_id).filter(Boolean);
}

/**
 * 按日期范围查询事件并关联单词信息
 */
export async function getEventsWithWords(
  userId: string,
  eventType: LearningEventType,
  startTime: number,
  endTime: number
): Promise<LocalWord[]> {
  const db = await getDatabase();
  const result = await db.execute(
    `SELECT w.*
     FROM learning_events e
     INNER JOIN words w ON w.id = e.entity_id
     WHERE e.user_id = ? AND e.event_type = ? AND e.entity_type = 'word'
       AND e.event_time >= ? AND e.event_time <= ?
     ORDER BY e.event_time ASC`,
    [userId, eventType, startTime, endTime]
  );
  return (result.rows as any[]).map(rowToLocalWord);
}

/**
 * 获取待同步事件数量
 */
export async function getPendingEventsCount(userId: string): Promise<number> {
  const db = await getDatabase();
  const result = await db.execute(
    `SELECT COUNT(*) as count FROM learning_events WHERE user_id = ? AND sync_status = 'pending'`,
    [userId]
  );
  return (result.rows[0] as RawRow)?.count || 0;
}

/**
 * 获取待同步的学习事件
 */
export async function getUnsyncedEvents(
  userId: string,
  limit: number = 100
): Promise<LearningEventRow[]> {
  const db = await getDatabase();
  const result = await db.execute(
    `SELECT * FROM learning_events
     WHERE user_id = ? AND sync_status = 'pending'
     ORDER BY event_time ASC
     LIMIT ?`,
    [userId, limit]
  );
  return (result.rows as RawRow[]).map(toEventRow);
}

/**
 * 标记事件为已同步
 */
export async function markEventsSynced(eventIds: string[]): Promise<void> {
  if (eventIds.length === 0) return;

  return runSerialWrite(async () => {
    const db = await getDatabase();
    const now = Date.now();
    const placeholders = eventIds.map(() => '?').join(',');

    await db.execute(
      `UPDATE learning_events
       SET sync_status = 'synced', synced_at = ?
       WHERE id IN (${placeholders})`,
      [now, ...eventIds]
    );
  });
}

/**
 * 标记事件同步失败
 */
export async function markEventsFailed(eventIds: string[]): Promise<void> {
  if (eventIds.length === 0) return;

  return runSerialWrite(async () => {
    const db = await getDatabase();
    const placeholders = eventIds.map(() => '?').join(',');

    await db.execute(
      `UPDATE learning_events
       SET sync_status = 'failed'
       WHERE id IN (${placeholders})`,
      eventIds
    );
  });
}

/**
 * 从服务端插入学习事件（INSERT OR IGNORE）
 */
export async function insertEventsFromServer(
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
  if (events.length === 0) return 0;

  return runSerialWrite(async () => {
    const db = await getDatabase();
    let insertedCount = 0;

    for (const event of events) {
      const result = await db.execute(
        `INSERT OR IGNORE INTO learning_events
          (id, user_id, event_type, entity_type, entity_id, quantity, event_date, event_time, sync_status, synced_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
        [event.id, userId, event.eventType, event.entityType, event.entityId, event.quantity, event.eventDate, event.eventTime, Date.now()]
      );
      if (result.rowsAffected > 0) {
        insertedCount++;
      }
    }

    return insertedCount;
  });
}

/**
 * 获取总学习单词数（去重）
 */
export async function getTotalLearnedCount(userId: string): Promise<number> {
  const db = await getDatabase();
  const result = await db.execute(
    `SELECT COUNT(DISTINCT entity_id) as count
     FROM learning_events
     WHERE user_id = ? AND event_type = 'word_learned' AND entity_type = 'word'`,
    [userId]
  );
  return (result.rows[0] as RawRow)?.count || 0;
}

/**
 * 获取总掌握单词数（去重）
 */
export async function getTotalMasteredCount(userId: string): Promise<number> {
  const db = await getDatabase();
  const result = await db.execute(
    `SELECT COUNT(DISTINCT entity_id) as count
     FROM learning_events
     WHERE user_id = ? AND event_type = 'word_mastered' AND entity_type = 'word'`,
    [userId]
  );
  return (result.rows[0] as RawRow)?.count || 0;
}

// ==================== Daily Stats 操作 ====================

/**
 * 获取单条每日统计
 */
export async function getDailyStats(
  userId: string,
  date: string
): Promise<DailyStatsRow | null> {
  const db = await getDatabase();
  const id = `${userId}_${date}`;

  const result = await db.execute(
    'SELECT * FROM daily_stats WHERE id = ?',
    [id]
  );

  const row = result.rows[0];
  return row ? toStatsRow(row) : null;
}

/**
 * 获取日期范围内的每日统计
 */
export async function getDailyStatsRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<DailyStatsRow[]> {
  const db = await getDatabase();

  const result = await db.execute(
    `SELECT * FROM daily_stats
     WHERE user_id = ? AND date >= ? AND date <= ?
     ORDER BY date ASC`,
    [userId, startDate, endDate]
  );

  return (result.rows as RawRow[]).map(toStatsRow);
}

/**
 * 获取指定日期列表的每日统计
 */
export async function getDailyStatsForDates(
  userId: string,
  dates: string[]
): Promise<DailyStatsRow[]> {
  if (dates.length === 0) return [];

  const db = await getDatabase();
  const placeholders = dates.map(() => '?').join(',');

  const result = await db.execute(
    `SELECT * FROM daily_stats
     WHERE user_id = ? AND date IN (${placeholders})`,
    [userId, ...dates]
  );

  return (result.rows as RawRow[]).map(toStatsRow);
}

/**
 * 更新每日统计（增加计数）
 * @returns 是否更新成功（记录不存在返回 false）
 */
export async function incrementDailyStats(
  userId: string,
  date: string,
  field: 'learned_count' | 'mastered_count' | 'reviewed_count' | 'grammar_practiced_count' | 'grammar_mastered_count'
): Promise<boolean> {
  const db = await getDatabase();
  const id = `${userId}_${date}`;
  const now = Date.now();

  const result = await db.execute(
    `UPDATE daily_stats
     SET ${field} = ${field} + 1, updated_at = ?
     WHERE id = ?`,
    [now, id]
  );

  return result.rowsAffected > 0;
}

/**
 * 插入每日统计
 */
export async function insertDailyStats(
  userId: string,
  date: string,
  learnedCount: number,
  masteredCount: number,
  reviewedCount: number,
  grammarPracticedCount: number = 0,
  grammarMasteredCount: number = 0,
  phonemePracticedCount: number = 0
): Promise<void> {
  const db = await getDatabase();
  const id = `${userId}_${date}`;
  const now = Date.now();

  await db.execute(
    `INSERT INTO daily_stats
      (id, user_id, date, learned_count, mastered_count, reviewed_count, grammar_practiced_count, grammar_mastered_count, phoneme_practiced_count, updated_at, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    [id, userId, date, learnedCount, masteredCount, reviewedCount, grammarPracticedCount, grammarMasteredCount, phonemePracticedCount, now]
  );
}

/**
 * 从服务端插入每日统计（INSERT OR IGNORE）
 */
export async function insertDailyStatsFromServer(
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
  if (stats.length === 0) return 0;

  return runSerialWrite(async () => {
    const db = await getDatabase();
    let insertedCount = 0;

    for (const stat of stats) {
      const id = `${userId}_${stat.date}`;
      const result = await db.execute(
        `INSERT OR IGNORE INTO daily_stats
          (id, user_id, date, learned_count, mastered_count, reviewed_count, grammar_practiced_count, grammar_mastered_count, phoneme_practiced_count, updated_at, synced_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, userId, stat.date, stat.learnedCount, stat.masteredCount, stat.reviewedCount, stat.grammarPracticedCount || 0, stat.grammarMasteredCount || 0, stat.phonemePracticedCount || 0, stat.updatedAt, stat.updatedAt]
      );
      if (result.rowsAffected > 0) {
        insertedCount++;
      }
    }

    return insertedCount;
  });
}

/**
 * 获取有学习记录的日期列表（倒序）
 */
export async function getActiveDates(userId: string): Promise<string[]> {
  const db = await getDatabase();

  const result = await db.execute(
    `SELECT date FROM daily_stats
     WHERE user_id = ? AND (learned_count > 0 OR mastered_count > 0 OR reviewed_count > 0 OR grammar_practiced_count > 0 OR grammar_mastered_count > 0 OR phoneme_practiced_count > 0)
     ORDER BY date DESC`,
    [userId]
  );

  return (result.rows as RawRow[]).map(row => row.date);
}

/**
 * 获取总学习天数
 */
export async function getTotalDays(userId: string): Promise<number> {
  const db = await getDatabase();

  const result = await db.execute(
    `SELECT COUNT(*) as count
     FROM daily_stats
     WHERE user_id = ? AND (learned_count > 0 OR mastered_count > 0 OR reviewed_count > 0 OR grammar_practiced_count > 0 OR grammar_mastered_count > 0 OR phoneme_practiced_count > 0)`,
    [userId]
  );

  return (result.rows[0] as RawRow)?.count || 0;
}

/**
 * 获取最近同步时间
 */
export async function getLastSyncTime(userId: string): Promise<number | null> {
  const db = await getDatabase();

  const result = await db.execute(
    `SELECT MAX(synced_at) as last_sync
     FROM daily_stats
     WHERE user_id = ? AND synced_at IS NOT NULL`,
    [userId]
  );

  return (result.rows[0] as RawRow)?.last_sync || null;
}

// ==================== Words 操作 ====================

/**
 * 根据ID列表查询单词
 */
export async function getWordsByIds(wordIds: string[]): Promise<LocalWord[]> {
  if (wordIds.length === 0) return [];

  const db = await getDatabase();
  const placeholders = wordIds.map(() => '?').join(',');

  const result = await db.execute(
    `SELECT * FROM words WHERE id IN (${placeholders})`,
    wordIds
  );

  return (result.rows as any[]).map(rowToLocalWord);
}

/**
 * 在同一个事务中读取未同步事件和对应的每日统计
 * 保证两者的数据一致性（不被中间的写操作影响）
 */
export async function getUnsyncedEventsWithDailyStats(
  userId: string,
  limit: number = 50
): Promise<{
  events: LearningEventRow[];
  dailyStats: DailyStatsRow[];
}> {
  const db = await getDatabase();
  let events: LearningEventRow[] = [];
  let dailyStats: DailyStatsRow[] = [];

  await db.transaction(async (tx) => {
    // 1. 读取未同步事件
    const eventsResult = await tx.execute(
      `SELECT * FROM learning_events
       WHERE user_id = ? AND sync_status = 'pending'
       ORDER BY event_time ASC
       LIMIT ?`,
      [userId, limit]
    );
    events = (eventsResult.rows as RawRow[]).map(toEventRow);

    if (events.length === 0) return;

    // 2. 提取涉及的日期（去重）
    const dates = [...new Set(events.map(e => e.eventDate))];
    const placeholders = dates.map(() => '?').join(',');

    // 3. 在同一事务中读取对应的 dailyStats
    const statsResult = await tx.execute(
      `SELECT * FROM daily_stats
       WHERE user_id = ? AND date IN (${placeholders})`,
      [userId, ...dates]
    );
    dailyStats = (statsResult.rows as RawRow[]).map(toStatsRow);
  });

  return { events, dailyStats };
}

/**
 * 仅更新 daily_stats 计数（不涉及 learning_events）
 * 用于发音练习等不走事件系统的场景
 * UPSERT：存在则递增，不存在则新建
 */
export async function incrementDailyStatsOnly(
  userId: string,
  date: string,
  field: 'phoneme_practiced_count'
): Promise<void> {
  return runSerialWrite(async () => {
    const db = await getDatabase();
    const id = `${userId}_${date}`;
    const now = Date.now();

    // 先尝试更新
    const updateResult = await db.execute(
      `UPDATE daily_stats
       SET ${field} = ${field} + 1, updated_at = ?, synced_at = NULL
       WHERE id = ?`,
      [now, id]
    );

    // 记录不存在则插入
    if (updateResult.rowsAffected === 0) {
      const phonemePracticedCount = field === 'phoneme_practiced_count' ? 1 : 0;
      await db.execute(
        `INSERT INTO daily_stats
          (id, user_id, date, learned_count, mastered_count, reviewed_count, grammar_practiced_count, grammar_mastered_count, phoneme_practiced_count, updated_at, synced_at)
         VALUES (?, ?, ?, 0, 0, 0, 0, 0, ?, ?, NULL)`,
        [id, userId, date, phonemePracticedCount, now]
      );
    }
  });
}

/**
 * 查询未同步的 daily_stats 记录
 * 用于独立推送仅有 daily_stats 变更（无事件）的情况
 */
export async function getUnsyncedDailyStats(
  userId: string,
  limit: number = 50
): Promise<DailyStatsRow[]> {
  const db = await getDatabase();
  const result = await db.execute(
    `SELECT * FROM daily_stats
     WHERE user_id = ? AND (synced_at IS NULL OR synced_at < updated_at)
     ORDER BY date ASC
     LIMIT ?`,
    [userId, limit]
  );
  return (result.rows as RawRow[]).map(toStatsRow);
}

/**
 * 标记 daily_stats 记录为已同步
 */
export async function markDailyStatsSynced(ids: string[]): Promise<void> {
  if (ids.length === 0) return;

  return runSerialWrite(async () => {
    const db = await getDatabase();
    const placeholders = ids.map(() => '?').join(',');
    await db.execute(
      `UPDATE daily_stats
       SET synced_at = updated_at
       WHERE id IN (${placeholders})`,
      ids
    );
  });
}
