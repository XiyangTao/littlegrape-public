/**
 * 词根索引 DB 操作模块
 * 管理词根索引的构建和查询
 */

import { getDatabase, runSerialWrite } from '../DatabaseManager';
let _idCounter = 0;
function generateId(): string {
  return `root_${Date.now()}_${++_idCounter}_${Math.random().toString(36).slice(2, 8)}`;
}

// ==================== 类型定义 ====================

export interface RootEntry {
  id: string;
  root: string;
  rootMeaning: string | null;
  wordCount: number;
  wordIds: string[];
}

export interface UserRootProgress {
  id: string;
  userId: string;
  rootId: string;
  learnedCount: number;
  totalCount: number;
  isLit: boolean;
  updatedAt: number;
}

export interface RootWordItem {
  id: string;
  word: string;
  meaningCn: string;
  phoneticUs: string | null;
  status: 'new' | 'learned' | 'mastered';
}

// ==================== 词根索引构建 ====================

// 记录已构建的 tag 集合，避免重复构建
const _builtTags = new Set<string>();

/**
 * 构建词根索引（单个 tag 或全量）
 * tag=undefined 时构建全量索引（tag 列存 NULL）
 * 幂等操作：已构建的 tag 跳过
 */
export async function buildRootIndex(tag?: string): Promise<number> {
  const tagKey = tag || '__all__';
  if (_builtTags.has(tagKey)) return 0;

  const db = await getDatabase();

  // 检查该 tag 是否已有数据
  const countResult = tag
    ? await db.execute('SELECT COUNT(*) as cnt FROM root_index WHERE tag = ?', [tag])
    : await db.execute('SELECT COUNT(*) as cnt FROM root_index WHERE tag IS NULL');
  const existingCount = (countResult.rows as any[])[0]?.cnt || 0;
  if (existingCount > 0) {
    _builtTags.add(tagKey);
    return existingCount;
  }

  // 查询单词数据
  const wordsResult = tag
    ? await db.execute(`
        SELECT w.id, w.word, w.etymology_root, w.etymology FROM words w
        INNER JOIN word_tags wt ON w.id = wt.word_id
        WHERE wt.tag = ?
          AND ((w.etymology_root IS NOT NULL AND w.etymology_root != '')
            OR (w.etymology IS NOT NULL AND w.etymology != '' AND w.etymology != 'null'))
      `, [tag])
    : await db.execute(`
        SELECT id, word, etymology_root, etymology FROM words
        WHERE (etymology_root IS NOT NULL AND etymology_root != '')
           OR (etymology IS NOT NULL AND etymology != '' AND etymology != 'null')
      `);

  // 按词根分组
  const rootMap = new Map<string, { rootMeaning: string | null; wordIds: string[] }>();

  for (const row of wordsResult.rows as any[]) {
    try {
      let root: string | null = null;
      let rootMeaning: string | null = null;

      // 优先使用 etymology_root 列
      if (row.etymology_root && row.etymology_root.trim() !== '') {
        root = row.etymology_root.trim().toLowerCase();
        if (row.etymology) {
          try {
            const etym = typeof row.etymology === 'string' ? JSON.parse(row.etymology) : row.etymology;
            rootMeaning = etym?.rootMeaning || null;
          } catch {}
        }
      } else if (row.etymology) {
        const etym = typeof row.etymology === 'string' ? JSON.parse(row.etymology) : row.etymology;
        if (!etym?.root || etym.root.trim() === '') continue;
        root = etym.root.trim().toLowerCase();
        rootMeaning = etym.rootMeaning || null;
      }

      if (!root) continue;

      if (!rootMap.has(root)) {
        rootMap.set(root, { rootMeaning, wordIds: [] });
      }
      rootMap.get(root)!.wordIds.push(row.id);
    } catch {
      // 跳过无法解析的数据
    }
  }

  // 过滤掉 <3 个派生词的词根，批量写入
  let insertedCount = 0;
  for (const [root, data] of rootMap) {
    if (data.wordIds.length < 3) continue;

    await runSerialWrite(() => db.execute(
      `INSERT OR IGNORE INTO root_index (id, tag, root, root_meaning, word_count, word_ids)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [generateId(), tag || null, root, data.rootMeaning, data.wordIds.length, JSON.stringify(data.wordIds)]
    ));
    insertedCount++;
  }

  _builtTags.add(tagKey);
  return insertedCount;
}

/**
 * 构建所有词根索引（全量 + 每个 tag）
 * APP 初始化时后台调用
 */
export async function buildAllRootIndexes(): Promise<void> {
  const db = await getDatabase();

  // 全量索引
  await buildRootIndex();

  // 每个 tag 的索引
  const tagsResult = await db.execute('SELECT tag FROM library_info');
  for (const row of tagsResult.rows as any[]) {
    await buildRootIndex(row.tag);
  }
}

// ==================== 查询函数 ====================

/**
 * 获取所有词根（按 word_count 降序）
 * tag=undefined 时查全量索引
 */
export async function getAllRoots(tag?: string, limit?: number): Promise<RootEntry[]> {
  const db = await getDatabase();
  const tagCondition = tag ? 'WHERE tag = ?' : 'WHERE tag IS NULL';
  const tagParams = tag ? [tag] : [];
  const sql = limit
    ? `SELECT * FROM root_index ${tagCondition} ORDER BY word_count DESC LIMIT ?`
    : `SELECT * FROM root_index ${tagCondition} ORDER BY word_count DESC`;
  const params = limit ? [...tagParams, limit] : tagParams;

  const result = await db.execute(sql, params);
  return (result.rows as any[]).map(rowToRootEntry);
}

/**
 * 搜索词根
 * tag=undefined 时搜全量索引
 */
export async function searchRoots(query: string, tag?: string): Promise<RootEntry[]> {
  const db = await getDatabase();
  const tagCondition = tag ? 'AND tag = ?' : 'AND tag IS NULL';
  const tagParams = tag ? [tag] : [];
  const result = await db.execute(
    `SELECT * FROM root_index WHERE root LIKE ? ${tagCondition} ORDER BY word_count DESC LIMIT 50`,
    [`%${query}%`, ...tagParams]
  );
  return (result.rows as any[]).map(rowToRootEntry);
}

/**
 * 获取单个词根
 */
export async function getRootById(rootId: string): Promise<RootEntry | null> {
  const db = await getDatabase();
  const result = await db.execute('SELECT * FROM root_index WHERE id = ?', [rootId]);
  const row = (result.rows as any[])[0];
  return row ? rowToRootEntry(row) : null;
}

/**
 * 获取词根下的所有单词（带学习状态）
 */
export async function getRootWords(rootId: string, userId: string): Promise<RootWordItem[]> {
  const db = await getDatabase();

  // 先获取词根的 word_ids
  const rootResult = await db.execute('SELECT word_ids FROM root_index WHERE id = ?', [rootId]);
  const rootRow = (rootResult.rows as any[])[0];
  if (!rootRow) return [];

  const wordIds: string[] = JSON.parse(rootRow.word_ids || '[]');
  if (wordIds.length === 0) return [];

  // 查询单词详情 + 学习进度
  const placeholders = wordIds.map(() => '?').join(',');
  const result = await db.execute(`
    SELECT w.id, w.word, w.meaning_cn, w.phonetic_us,
           COALESCE(wp.status, 'new') as status
    FROM words w
    LEFT JOIN word_progress wp ON w.id = wp.word_id AND wp.user_id = ?
    WHERE w.id IN (${placeholders})
    ORDER BY w.word
  `, [userId, ...wordIds]);

  return (result.rows as any[]).map(row => ({
    id: row.id,
    word: row.word,
    meaningCn: row.meaning_cn,
    phoneticUs: row.phonetic_us,
    status: row.status || 'new',
  }));
}

/**
 * 获取用户所有词根进度
 */
export async function getUserRootProgressList(userId: string): Promise<UserRootProgress[]> {
  const db = await getDatabase();
  const result = await db.execute(
    'SELECT * FROM user_root_progress WHERE user_id = ?',
    [userId]
  );
  return (result.rows as any[]).map(rowToUserRootProgress);
}

/**
 * 更新用户词根进度
 * 根据 word_progress 表计算该词根下已学词数量
 */
export async function updateUserRootProgress(userId: string, rootId: string): Promise<UserRootProgress | null> {
  const db = await getDatabase();

  // 获取词根信息
  const rootResult = await db.execute('SELECT word_ids, word_count FROM root_index WHERE id = ?', [rootId]);
  const rootRow = (rootResult.rows as any[])[0];
  if (!rootRow) return null;

  const wordIds: string[] = JSON.parse(rootRow.word_ids || '[]');
  const totalCount = rootRow.word_count;

  // 计算已学词数量
  const placeholders = wordIds.map(() => '?').join(',');
  const learnedResult = await db.execute(`
    SELECT COUNT(*) as cnt FROM word_progress
    WHERE user_id = ? AND word_id IN (${placeholders})
    AND status IN ('learned', 'mastered')
  `, [userId, ...wordIds]);
  const learnedCount = (learnedResult.rows as any[])[0]?.cnt || 0;

  const isLit = learnedCount >= totalCount ? 1 : 0;
  const now = Date.now();

  // Upsert
  await runSerialWrite(() => db.execute(`
    INSERT INTO user_root_progress (id, user_id, root_id, learned_count, total_count, is_lit, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, root_id) DO UPDATE SET
      learned_count = excluded.learned_count,
      total_count = excluded.total_count,
      is_lit = excluded.is_lit,
      updated_at = excluded.updated_at
  `, [generateId(), userId, rootId, learnedCount, totalCount, isLit, now]));

  return {
    id: '',
    userId,
    rootId,
    learnedCount,
    totalCount,
    isLit: isLit === 1,
    updatedAt: now,
  };
}

/**
 * 批量更新所有词根的用户进度
 */
export async function updateAllRootProgress(userId: string): Promise<void> {
  const roots = await getAllRoots();
  for (const root of roots) {
    await updateUserRootProgress(userId, root.id);
  }
}

// ==================== 行映射 ====================

function rowToRootEntry(row: any): RootEntry {
  return {
    id: row.id,
    root: row.root,
    rootMeaning: row.root_meaning,
    wordCount: row.word_count,
    wordIds: JSON.parse(row.word_ids || '[]'),
  };
}

function rowToUserRootProgress(row: any): UserRootProgress {
  return {
    id: row.id,
    userId: row.user_id,
    rootId: row.root_id,
    learnedCount: row.learned_count,
    totalCount: row.total_count,
    isLit: row.is_lit === 1,
    updatedAt: row.updated_at,
  };
}
