import { getDatabase, runSerialWrite } from '../DatabaseManager';
import { generateShortId } from '@/utils/idGenerator';
import type { LocalProgress } from './types';
import { rowToLocalProgress, type ProgressRow } from './helpers';
import { getWordCountByTags } from './WordQueryDB';

// 获取单词学习进度
export async function getWordProgress(
  userId: string,
  wordId: string
): Promise<LocalProgress | null> {
  const db = await getDatabase();
  const result = await db.execute(`
    SELECT * FROM word_progress WHERE user_id = ? AND word_id = ?
  `, [userId, wordId]);

  const row = result.rows[0] as unknown as ProgressRow | undefined;
  if (!row) return null;
  return rowToLocalProgress(row);
}

// 批量获取单词学习进度
export async function getWordProgressBatch(
  userId: string,
  wordIds: string[]
): Promise<Map<string, LocalProgress>> {
  if (wordIds.length === 0) return new Map();

  const db = await getDatabase();
  const placeholders = wordIds.map(() => '?').join(',');
  const result = await db.execute(`
    SELECT * FROM word_progress WHERE user_id = ? AND word_id IN (${placeholders})
  `, [userId, ...wordIds]);
  const rows = result.rows as unknown as ProgressRow[];

  const resultMap = new Map<string, LocalProgress>();
  for (const row of rows) {
    resultMap.set(row.word_id, rowToLocalProgress(row));
  }
  return resultMap;
}

// 更新学习进度
export async function updateWordProgress(
  userId: string,
  wordId: string,
  updates: Partial<Omit<LocalProgress, 'id' | 'wordId' | 'userId'>>
): Promise<void> {
  return runSerialWrite(async () => {
    const db = await getDatabase();
    const now = Date.now();

    const existingResult = await db.execute(
      'SELECT * FROM word_progress WHERE user_id = ? AND word_id = ?',
      [userId, wordId]
    );
    const existing = existingResult.rows[0] as unknown as ProgressRow | undefined;

    if (existing) {
      // 更新
      const updateFields: string[] = [];
      const values: (string | number | null)[] = [];

      if (updates.status !== undefined) {
        updateFields.push('status = ?');
        values.push(updates.status);
      }
      if (updates.learnedAt !== undefined) {
        updateFields.push('learned_at = ?');
        values.push(updates.learnedAt);
      }
      if (updates.masteredAt !== undefined) {
        updateFields.push('mastered_at = ?');
        values.push(updates.masteredAt);
      }
      if (updates.isSkipped !== undefined) {
        updateFields.push('is_skipped = ?');
        values.push(updates.isSkipped);
      }

      updateFields.push('updated_at = ?');
      values.push(now);
      values.push(userId);
      values.push(wordId);

      await db.execute(
        `UPDATE word_progress SET ${updateFields.join(', ')} WHERE user_id = ? AND word_id = ?`,
        values
      );
    } else {
      // 插入
      const uniqueKey = `${userId}_${wordId}`;
      const id = generateShortId(uniqueKey, now);
      await db.execute(`
        INSERT INTO word_progress (id, word_id, user_id, status, learned_at, mastered_at, synced_at, updated_at, is_skipped)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id,
        wordId,
        userId,
        updates.status || 'new',
        updates.learnedAt || null,
        updates.masteredAt || null,
        null,
        now,
        updates.isSkipped || 0,
      ]);
    }
  });
}

// 标记单词为已学习
// 返回 true 表示状态发生了变化，false 表示已经是 learned/mastered 状态无需更新
export async function markWordAsLearned(
  userId: string,
  wordId: string
): Promise<boolean> {
  // 先检查当前状态，如果已经是 learned 或 mastered，直接返回
  const db = await getDatabase();
  const existingResult = await db.execute(
    'SELECT status FROM word_progress WHERE user_id = ? AND word_id = ?',
    [userId, wordId]
  );
  const existing = existingResult.rows[0] as { status: string } | undefined;

  if (existing && (existing.status === 'learned' || existing.status === 'mastered')) {
    return false;
  }

  const now = Date.now();
  await updateWordProgress(userId, wordId, {
    status: 'learned',
    learnedAt: now,
  });
  return true;
}

// 标记单词为已掌握
// 返回 true 表示状态发生了变化，false 表示已经是 mastered 状态无需更新
export async function markWordAsMastered(
  userId: string,
  wordId: string
): Promise<boolean> {
  // 先检查当前状态，如果已经是 mastered，直接返回
  const db = await getDatabase();
  const existingResult = await db.execute(
    'SELECT status FROM word_progress WHERE user_id = ? AND word_id = ?',
    [userId, wordId]
  );
  const existing = existingResult.rows[0] as { status: string } | undefined;

  if (existing && existing.status === 'mastered') {
    return false;
  }

  const now = Date.now();
  await updateWordProgress(userId, wordId, {
    status: 'mastered',
    masteredAt: now,
  });
  return true;
}

// 获取用户在某词库的学习统计
export async function getLibraryStats(
  userId: string,
  tag: string
): Promise<{ total: number; learned: number; mastered: number; skipped: number }> {
  const db = await getDatabase();

  // 获取词库总数
  const totalResult = await db.execute(`
    SELECT word_count FROM library_info WHERE tag = ?
  `, [tag]);
  const totalRow = totalResult.rows[0] as { word_count: number } | undefined;
  const total = totalRow?.word_count || 0;

  // 单库 JOIN 查询学习中数量（仅 learned，不含 mastered）
  const learnedResult = await db.execute(`
    SELECT COUNT(DISTINCT wp.word_id) as count
    FROM word_progress wp
    INNER JOIN word_tags wt ON wp.word_id = wt.word_id
    WHERE wp.user_id = ? AND wt.tag = ? AND wp.status = 'learned'
  `, [userId, tag]);
  const learnedRow = learnedResult.rows[0] as { count: number } | undefined;

  const masteredResult = await db.execute(`
    SELECT COUNT(DISTINCT wp.word_id) as count
    FROM word_progress wp
    INNER JOIN word_tags wt ON wp.word_id = wt.word_id
    WHERE wp.user_id = ? AND wt.tag = ? AND wp.status = 'mastered'
  `, [userId, tag]);
  const masteredRow = masteredResult.rows[0] as { count: number } | undefined;

  // 跳过的词数量（mastered + is_skipped=1）
  const skippedResult = await db.execute(`
    SELECT COUNT(DISTINCT wp.word_id) as count
    FROM word_progress wp
    INNER JOIN word_tags wt ON wp.word_id = wt.word_id
    WHERE wp.user_id = ? AND wt.tag = ? AND wp.status = 'mastered' AND wp.is_skipped = 1
  `, [userId, tag]);
  const skippedRow = skippedResult.rows[0] as { count: number } | undefined;

  return {
    total,
    learned: Number(learnedRow?.count ?? 0),
    mastered: Number(masteredRow?.count ?? 0),
    skipped: Number(skippedRow?.count ?? 0),
  };
}

// 获取用户在多个词库的学习统计（去重）
// 优化：使用单库 JOIN 查询，利用索引
export async function getLibraryStatsByTags(
  userId: string,
  tags: string[]
): Promise<{ total: number; learned: number; mastered: number; skipped: number }> {
  if (tags.length === 0) return { total: 0, learned: 0, mastered: 0, skipped: 0 };

  const db = await getDatabase();
  const placeholders = tags.map(() => '?').join(',');

  // 1. 统计词库总单词数（去重）
  const total = await getWordCountByTags(tags);

  // 2. 单库 JOIN 查询学习中数量（仅 learned，不含 mastered）
  const learnedResult = await db.execute(`
    SELECT COUNT(DISTINCT wp.word_id) as count
    FROM word_progress wp
    INNER JOIN word_tags wt ON wp.word_id = wt.word_id
    WHERE wp.user_id = ? AND wt.tag IN (${placeholders}) AND wp.status = 'learned'
  `, [userId, ...tags]);
  const learnedRow = learnedResult.rows[0] as { count: number } | undefined;

  // 3. 单库 JOIN 查询已掌握数量
  const masteredResult = await db.execute(`
    SELECT COUNT(DISTINCT wp.word_id) as count
    FROM word_progress wp
    INNER JOIN word_tags wt ON wp.word_id = wt.word_id
    WHERE wp.user_id = ? AND wt.tag IN (${placeholders}) AND wp.status = 'mastered'
  `, [userId, ...tags]);
  const masteredRow = masteredResult.rows[0] as { count: number } | undefined;

  // 4. 跳过的词数量
  const skippedResult = await db.execute(`
    SELECT COUNT(DISTINCT wp.word_id) as count
    FROM word_progress wp
    INNER JOIN word_tags wt ON wp.word_id = wt.word_id
    WHERE wp.user_id = ? AND wt.tag IN (${placeholders}) AND wp.status = 'mastered' AND wp.is_skipped = 1
  `, [userId, ...tags]);
  const skippedRow = skippedResult.rows[0] as { count: number } | undefined;

  return {
    total,
    learned: Number(learnedRow?.count ?? 0),
    mastered: Number(masteredRow?.count ?? 0),
    skipped: Number(skippedRow?.count ?? 0),
  };
}

// 获取待同步的进度（未同步到服务器的）
export async function getUnsyncedProgress(userId: string): Promise<LocalProgress[]> {
  const db = await getDatabase();
  const result = await db.execute(`
    SELECT * FROM word_progress
    WHERE user_id = ? AND (synced_at IS NULL OR synced_at < updated_at)
    ORDER BY updated_at ASC
    LIMIT 100
  `, [userId]);

  return (result.rows as unknown as ProgressRow[]).map(rowToLocalProgress);
}

// 标记进度已同步
export async function markProgressSynced(ids: string[]): Promise<void> {
  if (ids.length === 0) return;

  return runSerialWrite(async () => {
    const db = await getDatabase();
    const now = Date.now();
    const placeholders = ids.map(() => '?').join(',');

    await db.execute(
      `UPDATE word_progress SET synced_at = ? WHERE id IN (${placeholders})`,
      [now, ...ids]
    );
  });
}

// 获取学习进度最后同步时间
export async function getWordProgressLastSyncTime(userId: string): Promise<number | null> {
  const db = await getDatabase();

  const result = await db.execute(
    `SELECT MAX(synced_at) as last_sync
     FROM word_progress
     WHERE user_id = ? AND synced_at IS NOT NULL`,
    [userId]
  );

  return (result.rows[0] as { last_sync: number | null } | undefined)?.last_sync || null;
}

// 从服务端插入学习进度（合并策略：服务端数据优先如果更新）
export async function upsertWordProgressFromServer(
  userId: string,
  progressList: Array<{
    id: string;
    wordId: string;
    status: string;
    learnedAt: number | null;
    masteredAt: number | null;
    updatedAt: number;
    isSkipped?: number;
  }>
): Promise<number> {
  if (progressList.length === 0) return 0;

  return runSerialWrite(async () => {
    const db = await getDatabase();
    let insertedCount = 0;
    const now = Date.now();

    for (const item of progressList) {
      // 检查本地是否有更新的数据
      const existingResult = await db.execute(
        'SELECT updated_at FROM word_progress WHERE user_id = ? AND word_id = ?',
        [userId, item.wordId]
      );
      const existing = existingResult.rows[0] as { updated_at: number } | undefined;

      // 如果本地数据更新（且未同步），跳过服务端数据
      if (existing && existing.updated_at > item.updatedAt) {
        continue;
      }

      // 插入或更新
      await db.execute(`
        INSERT INTO word_progress (id, word_id, user_id, status, learned_at, mastered_at, synced_at, updated_at, is_skipped)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, word_id) DO UPDATE SET
          status = excluded.status,
          learned_at = excluded.learned_at,
          mastered_at = excluded.mastered_at,
          synced_at = excluded.synced_at,
          updated_at = excluded.updated_at,
          is_skipped = excluded.is_skipped
      `, [
        item.id,
        item.wordId,
        userId,
        item.status,
        item.learnedAt,
        item.masteredAt,
        now,
        item.updatedAt,
        item.isSkipped ?? 0,
      ]);
      insertedCount++;
    }

    return insertedCount;
  });
}
