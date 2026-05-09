import { getDatabase, runSerialWrite } from '../DatabaseManager';
import type { LocalDifficultWord } from './types';
import type { DifficultWordDetail } from './helpers';
import { rowToDifficultWord, rowToDifficultWordDetail } from './helpers';

// 记录答错（加入或更新生词本）
export async function recordWrongAnswer(wordId: string, userId: string): Promise<LocalDifficultWord> {
  const now = Date.now();
  const id = `diff_${wordId}_${userId}`;

  return runSerialWrite(async () => {
    const db = await getDatabase();

    // 检查是否已存在
    const existingResult = await db.execute(`
      SELECT * FROM difficult_words WHERE word_id = ? AND user_id = ?
    `, [wordId, userId]);
    const existingRow = existingResult.rows[0] as any | undefined;

    if (existingRow) {
      const existing = rowToDifficultWord(existingRow);
      // 已存在，增加错误次数，重置正确次数
      await db.execute(`
        UPDATE difficult_words
        SET wrong_count = wrong_count + 1, correct_count = 0, last_wrong_at = ?, synced_at = NULL
        WHERE word_id = ? AND user_id = ?
      `, [now, wordId, userId]);

      return {
        ...existing,
        wrongCount: existing.wrongCount + 1,
        correctCount: 0,
        lastWrongAt: now,
        syncedAt: null,
      };
    } else {
      // 不存在，新建记录
      await db.execute(`
        INSERT INTO difficult_words (id, word_id, user_id, wrong_count, correct_count, last_wrong_at, created_at, synced_at)
        VALUES (?, ?, ?, 1, 0, ?, ?, NULL)
      `, [id, wordId, userId, now, now]);

      return {
        id,
        wordId,
        userId,
        wrongCount: 1,
        correctCount: 0,
        lastWrongAt: now,
        createdAt: now,
        syncedAt: null,
      };
    }
  });
}

// 记录答对（增加正确次数，达到3次则移除）
export async function recordCorrectAnswer(wordId: string, userId: string): Promise<{ removed: boolean; correctCount: number }> {
  return runSerialWrite(async () => {
    const db = await getDatabase();

    const existingResult = await db.execute(`
      SELECT * FROM difficult_words WHERE word_id = ? AND user_id = ?
    `, [wordId, userId]);
    const existingRow = existingResult.rows[0] as any | undefined;

    if (!existingRow) {
      // 不在生词本中，无需处理
      return { removed: false, correctCount: 0 };
    }

    const existing = rowToDifficultWord(existingRow);
    const newCorrectCount = existing.correctCount + 1;

    if (newCorrectCount >= 3) {
      // 达到3次正确，移除出生词本
      await db.execute(`
        DELETE FROM difficult_words WHERE word_id = ? AND user_id = ?
      `, [wordId, userId]);
      return { removed: true, correctCount: newCorrectCount };
    } else {
      // 更新正确次数
      await db.execute(`
        UPDATE difficult_words SET correct_count = ?, synced_at = NULL WHERE word_id = ? AND user_id = ?
      `, [newCorrectCount, wordId, userId]);
      return { removed: false, correctCount: newCorrectCount };
    }
  });
}

// 获取用户的生词本单词（带统计信息）
export async function getDifficultWords(userId: string): Promise<DifficultWordDetail[]> {
  const db = await getDatabase();

  // 单库 JOIN 查询
  const result = await db.execute(`
    SELECT w.*, dw.wrong_count, dw.correct_count, dw.last_wrong_at
    FROM words w
    INNER JOIN difficult_words dw ON w.id = dw.word_id
    WHERE dw.user_id = ?
    ORDER BY dw.last_wrong_at DESC
  `, [userId]);

  return (result.rows as any[]).map(rowToDifficultWordDetail);
}

// 手动移除生词
export async function removeDifficultWord(wordId: string, userId: string): Promise<void> {
  return runSerialWrite(async () => {
    const db = await getDatabase();
    await db.execute(`
      DELETE FROM difficult_words WHERE word_id = ? AND user_id = ?
    `, [wordId, userId]);
  });
}

// 清空用户的所有生词
export async function clearAllDifficultWords(userId: string): Promise<void> {
  return runSerialWrite(async () => {
    const db = await getDatabase();
    await db.execute(`
      DELETE FROM difficult_words WHERE user_id = ?
    `, [userId]);
  });
}

// 分页获取生词本单词
export async function getDifficultWordsPaged(
  userId: string,
  limit: number,
  offset: number,
  sortMode: 'time' | 'alpha' = 'time',
): Promise<DifficultWordDetail[]> {
  const db = await getDatabase();
  const orderBy = sortMode === 'alpha' ? 'w.word ASC' : 'dw.last_wrong_at DESC';

  const result = await db.execute(`
    SELECT w.*, dw.wrong_count, dw.correct_count, dw.last_wrong_at
    FROM words w
    INNER JOIN difficult_words dw ON w.id = dw.word_id
    WHERE dw.user_id = ?
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `, [userId, limit, offset]);

  return (result.rows as any[]).map(rowToDifficultWordDetail);
}

// 获取生词本数量
export async function getDifficultCount(userId: string): Promise<number> {
  const db = await getDatabase();
  const result = await db.execute(`
    SELECT COUNT(*) as count FROM difficult_words WHERE user_id = ?
  `, [userId]);
  const row = result.rows[0] as { count: number } | undefined;
  return Number(row?.count ?? 0);
}

// 检查单词是否在生词本中
export async function isInDifficultList(wordId: string, userId: string): Promise<boolean> {
  const db = await getDatabase();
  const result = await db.execute(`
    SELECT COUNT(*) as count FROM difficult_words WHERE word_id = ? AND user_id = ?
  `, [wordId, userId]);
  const row = result.rows[0] as { count: number } | undefined;
  return Number(row?.count ?? 0) > 0;
}

// 获取未同步的生词本记录
export async function getUnsyncedDifficultWords(userId: string): Promise<LocalDifficultWord[]> {
  const db = await getDatabase();
  const result = await db.execute(`
    SELECT * FROM difficult_words WHERE user_id = ? AND synced_at IS NULL
  `, [userId]);
  return (result.rows as any[]).map(rowToDifficultWord);
}

// 标记生词本记录已同步
export async function markDifficultWordsSynced(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  return runSerialWrite(async () => {
    const db = await getDatabase();
    const placeholders = ids.map(() => '?').join(',');
    await db.execute(`
      UPDATE difficult_words SET synced_at = ? WHERE id IN (${placeholders})
    `, [Date.now(), ...ids]);
  });
}

// 获取生词本最后同步时间
export async function getDifficultLastSyncTime(userId: string): Promise<number | null> {
  const db = await getDatabase();
  const result = await db.execute(
    `SELECT MAX(synced_at) as last_sync
     FROM difficult_words
     WHERE user_id = ? AND synced_at IS NOT NULL`,
    [userId]
  );
  return (result.rows[0] as any)?.last_sync || null;
}

// 从服务端插入生词本数据
export async function upsertDifficultFromServer(
  userId: string,
  words: Array<{
    id: string;
    wordId: string;
    wrongCount: number;
    correctCount: number;
    lastWrongAt: number;
    createdAt: number;
    updatedAt: number;
  }>
): Promise<number> {
  if (words.length === 0) return 0;

  return runSerialWrite(async () => {
    const db = await getDatabase();
    let insertedCount = 0;
    const now = Date.now();

    for (const item of words) {
      const localId = `diff_${item.wordId}_${userId}`;

      // 检查本地是否有更新的数据
      const existingResult = await db.execute(
        'SELECT synced_at FROM difficult_words WHERE user_id = ? AND word_id = ?',
        [userId, item.wordId]
      );
      const existing = existingResult.rows[0] as { synced_at: number | null } | undefined;

      // 如果本地数据未同步，跳过服务端数据
      if (existing && existing.synced_at === null) {
        continue;
      }

      await db.execute(`
        INSERT INTO difficult_words (id, word_id, user_id, wrong_count, correct_count, last_wrong_at, created_at, synced_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, word_id) DO UPDATE SET
          wrong_count = excluded.wrong_count,
          correct_count = excluded.correct_count,
          last_wrong_at = excluded.last_wrong_at,
          synced_at = excluded.synced_at
      `, [localId, item.wordId, userId, item.wrongCount, item.correctCount, item.lastWrongAt, item.createdAt, now]);
      insertedCount++;
    }

    return insertedCount;
  });
}

// 批量导入生词本（从服务器同步时使用）
export async function importDifficultWords(words: Array<{
  wordId: string;
  wrongCount: number;
  correctCount: number;
  lastWrongAt: number;
  createdAt: number;
}>, userId: string): Promise<void> {
  if (words.length === 0) return;
  return runSerialWrite(async () => {
    const db = await getDatabase();
    const now = Date.now();

    for (const word of words) {
      const id = `diff_${word.wordId}_${userId}`;
      await db.execute(`
        INSERT OR REPLACE INTO difficult_words (id, word_id, user_id, wrong_count, correct_count, last_wrong_at, created_at, synced_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [id, word.wordId, userId, word.wrongCount, word.correctCount, word.lastWrongAt, word.createdAt, now]);
    }
  });
}
