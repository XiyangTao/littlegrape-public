import { getDatabase, runSerialWrite } from '../DatabaseManager';
import type { LocalWord, LocalFavorite } from './types';
import type { FavoriteRow } from './helpers';
import { rowToLocalWord, rowToFavorite } from './helpers';

// 添加收藏
export async function addFavorite(wordId: string, userId: string): Promise<LocalFavorite> {
  const now = Date.now();
  const id = `fav_${wordId}_${userId}`;

  await runSerialWrite(async () => {
    const db = await getDatabase();
    await db.execute(`
      INSERT OR REPLACE INTO favorite_words (id, word_id, user_id, created_at, synced_at)
      VALUES (?, ?, ?, ?, NULL)
    `, [id, wordId, userId, now]);
  });

  return { id, wordId, userId, createdAt: now, syncedAt: null };
}

// 移除收藏
export async function removeFavorite(wordId: string, userId: string): Promise<void> {
  return runSerialWrite(async () => {
    const db = await getDatabase();
    await db.execute(`
      DELETE FROM favorite_words WHERE word_id = ? AND user_id = ?
    `, [wordId, userId]);
  });
}

// 检查是否已收藏
export async function isFavorited(wordId: string, userId: string): Promise<boolean> {
  const db = await getDatabase();
  const result = await db.execute(`
    SELECT COUNT(*) as count FROM favorite_words WHERE word_id = ? AND user_id = ?
  `, [wordId, userId]);
  const row = result.rows[0] as { count: number } | undefined;
  return Number(row?.count ?? 0) > 0;
}

// 获取用户的所有收藏单词（返回 LocalWord）
export async function getFavoriteWords(userId: string): Promise<LocalWord[]> {
  const db = await getDatabase();

  // 单库 JOIN 查询
  const result = await db.execute(`
    SELECT w.* FROM words w
    INNER JOIN favorite_words fw ON w.id = fw.word_id
    WHERE fw.user_id = ?
    ORDER BY fw.created_at DESC
  `, [userId]);

  return (result.rows as any[]).map(rowToLocalWord);
}

// 分页获取收藏单词
export async function getFavoriteWordsPaged(
  userId: string,
  limit: number,
  offset: number,
): Promise<LocalWord[]> {
  const db = await getDatabase();

  const result = await db.execute(`
    SELECT w.* FROM words w
    INNER JOIN favorite_words fw ON w.id = fw.word_id
    WHERE fw.user_id = ?
    ORDER BY fw.created_at DESC
    LIMIT ? OFFSET ?
  `, [userId, limit, offset]);

  return (result.rows as any[]).map(rowToLocalWord);
}

// 获取收藏数量
export async function getFavoriteCount(userId: string): Promise<number> {
  const db = await getDatabase();
  const result = await db.execute(`
    SELECT COUNT(*) as count FROM favorite_words WHERE user_id = ?
  `, [userId]);
  const row = result.rows[0] as { count: number } | undefined;
  return Number(row?.count ?? 0);
}

// 批量查询哪些单词已收藏（返回已收藏的 wordId 集合）
export async function getFavoritedWordIds(wordIds: string[], userId: string): Promise<Set<string>> {
  if (wordIds.length === 0) return new Set();
  const db = await getDatabase();
  const placeholders = wordIds.map(() => '?').join(',');
  const result = await db.execute(`
    SELECT word_id FROM favorite_words
    WHERE user_id = ? AND word_id IN (${placeholders})
  `, [userId, ...wordIds]);
  return new Set((result.rows as Pick<FavoriteRow, 'word_id'>[]).map(r => r.word_id));
}

// 获取未同步的收藏记录
export async function getUnsyncedFavorites(userId: string): Promise<LocalFavorite[]> {
  const db = await getDatabase();
  const result = await db.execute(`
    SELECT * FROM favorite_words WHERE user_id = ? AND synced_at IS NULL
  `, [userId]);
  return (result.rows as any[]).map(rowToFavorite);
}

// 标记收藏已同步
export async function markFavoritesSynced(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  return runSerialWrite(async () => {
    const db = await getDatabase();
    const placeholders = ids.map(() => '?').join(',');
    await db.execute(`
      UPDATE favorite_words SET synced_at = ? WHERE id IN (${placeholders})
    `, [Date.now(), ...ids]);
  });
}

// 获取收藏最后同步时间
export async function getFavoritesLastSyncTime(userId: string): Promise<number | null> {
  const db = await getDatabase();
  const result = await db.execute(
    `SELECT MAX(synced_at) as last_sync
     FROM favorite_words
     WHERE user_id = ? AND synced_at IS NOT NULL`,
    [userId]
  );
  return (result.rows[0] as any)?.last_sync || null;
}

// 从服务端插入收藏数据
export async function upsertFavoritesFromServer(
  userId: string,
  favorites: Array<{
    id: string;
    wordId: string;
    createdAt: number;
  }>
): Promise<number> {
  if (favorites.length === 0) return 0;

  return runSerialWrite(async () => {
    const db = await getDatabase();
    let insertedCount = 0;
    const now = Date.now();

    for (const item of favorites) {
      const localId = `fav_${item.wordId}_${userId}`;
      const result = await db.execute(`
        INSERT OR IGNORE INTO favorite_words (id, word_id, user_id, created_at, synced_at)
        VALUES (?, ?, ?, ?, ?)
      `, [localId, item.wordId, userId, item.createdAt, now]);

      if (result.rowsAffected > 0) {
        insertedCount++;
      }
    }

    return insertedCount;
  });
}

// 批量导入收藏（从服务器同步时使用）
export async function importFavorites(favorites: Array<{ wordId: string; createdAt: number }>, userId: string): Promise<void> {
  if (favorites.length === 0) return;
  return runSerialWrite(async () => {
    const db = await getDatabase();
    const now = Date.now();

    for (const fav of favorites) {
      const id = `fav_${fav.wordId}_${userId}`;
      await db.execute(`
        INSERT OR IGNORE INTO favorite_words (id, word_id, user_id, created_at, synced_at)
        VALUES (?, ?, ?, ?, ?)
      `, [id, fav.wordId, userId, fav.createdAt, now]);
    }
  });
}
