import { getDatabase } from '../DatabaseManager';
import type { LocalWord, WordStatusFilter } from './types';
import { rowToLocalWord } from './helpers';

// ============================================================
// 公共 SQL 构建工具
// ============================================================

type SqlParam = string | number | null;

/**
 * 根据 statusFilter 生成 JOIN 子句、WHERE 条件片段和前置/后置参数。
 *
 * 参数设计说明：
 *   - `new` 状态的 userId 需要出现在 LEFT JOIN ON 子句中（参数位置靠前）
 *   - `learning`/`mastered` 状态的 userId 出现在 WHERE 子句中（参数位置靠后）
 *   因此返回 prefixParams 和 suffixParams 分别插入调用者的参数数组。
 */
function buildStatusFilter(
  userId?: string,
  statusFilter?: WordStatusFilter
): {
  joinClause: string;
  whereClause: string;
  prefixParams: SqlParam[];
  suffixParams: SqlParam[];
} {
  if (!statusFilter || statusFilter === 'all' || !userId) {
    return { joinClause: '', whereClause: '', prefixParams: [], suffixParams: [] };
  }

  if (statusFilter === 'new') {
    return {
      joinClause: 'LEFT JOIN word_progress wp ON w.id = wp.word_id AND wp.user_id = ?',
      whereClause: "AND (wp.id IS NULL OR wp.status = 'new')",
      prefixParams: [userId],
      suffixParams: [],
    };
  }

  // learning -> 数据库中实际状态是 'learned'
  const dbStatus = statusFilter === 'learning' ? 'learned' : statusFilter;
  return {
    joinClause: 'INNER JOIN word_progress wp ON w.id = wp.word_id',
    whereClause: 'AND wp.user_id = ? AND wp.status = ?',
    prefixParams: [],
    suffixParams: [userId, dbStatus],
  };
}

/**
 * 通用的"按标签查询单词"执行器，支持 SELECT w.* 和 COUNT 两种模式。
 */
async function queryWordsByTags(options: {
  tags: string[];
  userId?: string;
  statusFilter?: WordStatusFilter;
  extraWhere?: string;
  extraParams?: SqlParam[];
  countOnly: false;
  offset: number;
  limit: number;
}): Promise<LocalWord[]>;
async function queryWordsByTags(options: {
  tags: string[];
  userId?: string;
  statusFilter?: WordStatusFilter;
  extraWhere?: string;
  extraParams?: SqlParam[];
  countOnly: true;
}): Promise<number>;
async function queryWordsByTags(options: {
  tags: string[];
  userId?: string;
  statusFilter?: WordStatusFilter;
  extraWhere?: string;
  extraParams?: SqlParam[];
  countOnly: boolean;
  offset?: number;
  limit?: number;
}): Promise<LocalWord[] | number> {
  const { tags, userId, statusFilter, extraWhere = '', extraParams = [], countOnly } = options;

  const db = await getDatabase();
  const placeholders = tags.map(() => '?').join(',');
  const { joinClause, whereClause, prefixParams, suffixParams } = buildStatusFilter(userId, statusFilter);

  const selectExpr = countOnly ? 'COUNT(DISTINCT w.id) as count' : 'DISTINCT w.*';
  const orderAndPaging = countOnly ? '' : `ORDER BY w.word ASC\n      LIMIT ? OFFSET ?`;

  const sql = `
      SELECT ${selectExpr} FROM words w
      INNER JOIN word_tags wt ON w.id = wt.word_id
      ${joinClause}
      WHERE wt.tag IN (${placeholders})
      ${extraWhere}
      ${whereClause}
      ${orderAndPaging}
    `;

  const params: SqlParam[] = [
    ...prefixParams,
    ...tags,
    ...extraParams,
    ...suffixParams,
  ];
  if (!countOnly) {
    params.push(options.limit!, options.offset!);
  }

  const result = await db.execute(sql, params);

  if (countOnly) {
    const row = result.rows[0] as { count: number } | undefined;
    return Number(row?.count ?? 0);
  }
  return (result.rows as any[]).map(rowToLocalWord);
}

// ============================================================
// 导出函数（签名与原来完全一致）
// ============================================================

// 按单词文本精确查询（点词查义）
export async function getWordByText(word: string): Promise<LocalWord | null> {
  const db = await getDatabase();
  const result = await db.execute(
    'SELECT * FROM words WHERE LOWER(word) = ? LIMIT 1',
    [word.toLowerCase()]
  );
  const row = result.rows[0] as any | undefined;
  if (!row) return null;
  return rowToLocalWord(row);
}

// 按标签获取单词（分页）
export async function getWordsByTag(
  tag: string,
  offset: number = 0,
  limit: number = 20
): Promise<LocalWord[]> {
  const db = await getDatabase();

  const result = await db.execute(`
    SELECT DISTINCT w.* FROM words w
    INNER JOIN word_tags wt ON w.id = wt.word_id
    WHERE wt.tag = ?
    ORDER BY w.word ASC
    LIMIT ? OFFSET ?
  `, [tag, limit, offset]);

  return (result.rows as any[]).map(rowToLocalWord);
}

// 按标签获取单词数量
export async function getWordCountByTag(tag: string): Promise<number> {
  const db = await getDatabase();
  const result = await db.execute(`
    SELECT COUNT(*) as count FROM word_tags WHERE tag = ?
  `, [tag]);
  const row = result.rows[0] as { count: number } | undefined;
  return Number(row?.count ?? 0);
}

// 按多个标签获取单词（分页，去重）
export async function getWordsByTags(
  tags: string[],
  offset: number = 0,
  limit: number = 20,
  userId?: string,
  statusFilter?: WordStatusFilter
): Promise<LocalWord[]> {
  if (tags.length === 0) return [];
  return queryWordsByTags({ tags, userId, statusFilter, countOnly: false, offset, limit });
}

// 按多个标签获取单词数量（去重）
export async function getWordCountByTags(
  tags: string[],
  userId?: string,
  statusFilter?: WordStatusFilter
): Promise<number> {
  if (tags.length === 0) return 0;

  // 注意：无过滤时该函数原来以 word_tags 为主表，使用简化查询
  if (!statusFilter || statusFilter === 'all' || !userId) {
    const db = await getDatabase();
    const placeholders = tags.map(() => '?').join(',');
    const result = await db.execute(
      `SELECT COUNT(DISTINCT word_id) as count FROM word_tags WHERE tag IN (${placeholders})`,
      tags
    );
    const row = result.rows[0] as { count: number } | undefined;
    return Number(row?.count ?? 0);
  }

  return queryWordsByTags({ tags, userId, statusFilter, countOnly: true });
}

// 获取用户未学习的单词 ID（排好序，上限 1000）
// orderBy: 'smart' 匹配用户水平优先高频词, 'alphabetical' 按字母 A-Z, 'random' 随机打乱
// userBncLevel: smart 模式下的用户 BNC 等级（estimatedVocabulary / 1000），未测试时按词频由易到难
export async function getUnlearnedWordIds(
  userId: string,
  tags: string[],
  orderBy: 'smart' | 'alphabetical' | 'random' = 'smart',
  userBncLevel?: number,
  limit: number = 1000
): Promise<string[]> {
  if (tags.length === 0) return [];

  const db = await getDatabase();
  const placeholders = tags.map(() => '?').join(',');

  let orderClause: string;
  const params: (string | number)[] = [userId, ...tags];

  if (orderBy === 'alphabetical') {
    orderClause = 'ORDER BY w.word ASC';
  } else if (orderBy === 'random') {
    orderClause = 'ORDER BY RANDOM()';
  } else if (userBncLevel) {
    // smart + 有用户水平：优先推用户水平及以上的词（学习前沿），低于用户水平的排后面
    orderClause = `ORDER BY
      CASE WHEN COALESCE(w.bnc_coca_level, 13) >= ? THEN 0 ELSE 1 END,
      ABS(COALESCE(w.bnc_coca_level, 13) - ?) ASC,
      w.bnc_coca_level ASC`;
    params.push(userBncLevel, userBncLevel);
  } else {
    // smart + 无用户水平：按词频由易到难
    orderClause = 'ORDER BY w.bnc_coca_level ASC, w.word ASC';
  }

  params.push(limit);

  const result = await db.execute(`
    SELECT DISTINCT w.id FROM words w
    INNER JOIN word_tags wt ON w.id = wt.word_id
    LEFT JOIN word_progress wp ON w.id = wp.word_id AND wp.user_id = ?
    WHERE wt.tag IN (${placeholders})
    AND (wp.status IS NULL OR wp.status = 'new')
    ${orderClause}
    LIMIT ?
  `, params);

  return (result.rows as any[]).map((row: any) => row.id);
}

// 搜索单词
export async function searchWords(
  query: string,
  tag?: string,
  limit: number = 50
): Promise<LocalWord[]> {
  const db = await getDatabase();

  let sql = 'SELECT DISTINCT w.* FROM words w';
  const params: SqlParam[] = [];

  if (tag) {
    sql += ' INNER JOIN word_tags wt ON w.id = wt.word_id WHERE wt.tag = ? AND';
    params.push(tag);
  } else {
    sql += ' WHERE';
  }

  sql += ' w.word LIKE ? ORDER BY w.word ASC LIMIT ?';
  params.push(`${query}%`, limit);

  const result = await db.execute(sql, params);
  return (result.rows as any[]).map(rowToLocalWord);
}

// 在所有单词中搜索（不限词库）
export async function searchAllWords(
  query: string,
  limit: number = 50
): Promise<LocalWord[]> {
  const db = await getDatabase();

  const result = await db.execute(`
    SELECT * FROM words
    WHERE word LIKE ?
    ORDER BY word ASC
    LIMIT ?
  `, [`${query}%`, limit]);

  return (result.rows as any[]).map(rowToLocalWord);
}

// 在多个标签中搜索单词（分页）
export async function searchWordsInTags(
  query: string,
  tags: string[],
  offset: number = 0,
  limit: number = 20,
  userId?: string,
  statusFilter?: WordStatusFilter
): Promise<LocalWord[]> {
  if (tags.length === 0) return [];
  return queryWordsByTags({
    tags, userId, statusFilter, countOnly: false, offset, limit,
    extraWhere: 'AND w.word LIKE ?',
    extraParams: [`${query}%`],
  });
}

// 在多个标签中搜索单词数量
export async function searchWordCountInTags(
  query: string,
  tags: string[],
  userId?: string,
  statusFilter?: WordStatusFilter
): Promise<number> {
  if (tags.length === 0) return 0;
  return queryWordsByTags({
    tags, userId, statusFilter, countOnly: true,
    extraWhere: 'AND w.word LIKE ?',
    extraParams: [`${query}%`],
  });
}

// 按首字母+关键词搜索单词（分页）
export async function searchWordsByLetter(
  letter: string,
  query: string,
  tags: string[],
  offset: number = 0,
  limit: number = 20,
  userId?: string,
  statusFilter?: WordStatusFilter
): Promise<LocalWord[]> {
  if (tags.length === 0) return [];
  const letterUpper = letter.toUpperCase();
  const letterLower = letter.toLowerCase();
  return queryWordsByTags({
    tags, userId, statusFilter, countOnly: false, offset, limit,
    extraWhere: 'AND (w.word LIKE ? OR w.word LIKE ?) AND w.word LIKE ?',
    extraParams: [`${letterUpper}%`, `${letterLower}%`, `${query}%`],
  });
}

// 按首字母+关键词搜索单词数量
export async function searchWordCountByLetter(
  letter: string,
  query: string,
  tags: string[],
  userId?: string,
  statusFilter?: WordStatusFilter
): Promise<number> {
  if (tags.length === 0) return 0;
  const letterUpper = letter.toUpperCase();
  const letterLower = letter.toLowerCase();
  return queryWordsByTags({
    tags, userId, statusFilter, countOnly: true,
    extraWhere: 'AND (w.word LIKE ? OR w.word LIKE ?) AND w.word LIKE ?',
    extraParams: [`${letterUpper}%`, `${letterLower}%`, `${query}%`],
  });
}

// 获取单词详情（LEFT JOIN 缓存表获取完整数据）
export async function getWordById(id: string): Promise<LocalWord | null> {
  const db = await getDatabase();
  const result = await db.execute(`
    SELECT w.*,
           COALESCE(c.phonetic_us, w.phonetic_us) as phonetic_us,
           COALESCE(c.phonetic_uk, w.phonetic_uk) as phonetic_uk,
           COALESCE(c.audio_url_us, w.audio_url_us) as audio_url_us,
           COALESCE(c.audio_url_uk, w.audio_url_uk) as audio_url_uk,
           COALESCE(c.audio_ai_explanation_url, w.audio_ai_explanation_url) as audio_ai_explanation_url,
           COALESCE(c.meanings, w.meanings) as meanings,
           COALESCE(c.examples, w.examples) as examples,
           COALESCE(c.etymology, w.etymology) as etymology,
           COALESCE(c.collocations, w.collocations) as collocations,
           COALESCE(c.inflections, w.inflections) as inflections,
           COALESCE(c.tags, w.tags) as tags
    FROM words w
    LEFT JOIN word_details_cache c ON w.id = c.word_id
    WHERE w.id = ?
  `, [id]);

  const row = result.rows[0] as any | undefined;
  if (!row) return null;
  return rowToLocalWord(row);
}

// 按首字母获取单词（分页）
export async function getWordsByLetter(
  letter: string,
  tags: string[],
  offset: number = 0,
  limit: number = 30,
  userId?: string,
  statusFilter?: WordStatusFilter
): Promise<LocalWord[]> {
  if (tags.length === 0) return [];
  const letterUpper = letter.toUpperCase();
  const letterLower = letter.toLowerCase();
  return queryWordsByTags({
    tags, userId, statusFilter, countOnly: false, offset, limit,
    extraWhere: 'AND (w.word LIKE ? OR w.word LIKE ?)',
    extraParams: [`${letterUpper}%`, `${letterLower}%`],
  });
}

// 按首字母获取单词数量
export async function getWordCountByLetter(
  letter: string,
  tags: string[],
  userId?: string,
  statusFilter?: WordStatusFilter
): Promise<number> {
  if (tags.length === 0) return 0;
  const letterUpper = letter.toUpperCase();
  const letterLower = letter.toLowerCase();
  return queryWordsByTags({
    tags, userId, statusFilter, countOnly: true,
    extraWhere: 'AND (w.word LIKE ? OR w.word LIKE ?)',
    extraParams: [`${letterUpper}%`, `${letterLower}%`],
  });
}

// 获取所有有单词的首字母及其数量
export async function getAvailableLetters(
  tags: string[]
): Promise<{ letter: string; count: number }[]> {
  if (tags.length === 0) return [];

  const db = await getDatabase();
  const placeholders = tags.map(() => '?').join(',');

  const result = await db.execute(`
    SELECT UPPER(SUBSTR(w.word, 1, 1)) as letter, COUNT(DISTINCT w.id) as count
    FROM words w
    INNER JOIN word_tags wt ON w.id = wt.word_id
    WHERE wt.tag IN (${placeholders})
    GROUP BY UPPER(SUBSTR(w.word, 1, 1))
    ORDER BY letter ASC
  `, tags);

  return result.rows as unknown as { letter: string; count: number }[];
}

// 获取随机英文单词（用于"义选词"干扰项）
export async function getRandomWords(
  excludeWordId: string,
  count: number = 3
): Promise<string[]> {
  const db = await getDatabase();

  const result = await db.execute(`
    SELECT word FROM words
    WHERE id != ? AND word IS NOT NULL AND word != ''
    ORDER BY RANDOM()
    LIMIT ?
  `, [excludeWordId, count]);

  return (result.rows as any[]).map(row => row.word);
}

// 获取随机的干扰释义（排除当前单词）
export async function getRandomMeanings(
  excludeWordId: string,
  count: number = 3
): Promise<string[]> {
  const db = await getDatabase();

  const result = await db.execute(`
    SELECT meaning_cn FROM words
    WHERE id != ? AND meaning_cn IS NOT NULL AND meaning_cn != ''
    ORDER BY RANDOM()
    LIMIT ?
  `, [excludeWordId, count]);

  return (result.rows as any[]).map(row => row.meaning_cn);
}

// 获取同根词（优先干扰项）
async function getSameRootWords(
  wordId: string,
  count: number = 1
): Promise<string[]> {
  const db = await getDatabase();
  try {
    const result = await db.execute(`
      SELECT w2.word FROM words w1
      JOIN words w2 ON w2.id != w1.id
        AND w2.etymology_root = w1.etymology_root
        AND w1.etymology_root IS NOT NULL
        AND w1.etymology_root != ''
      WHERE w1.id = ?
      ORDER BY RANDOM() LIMIT ?
    `, [wordId, count]);
    return (result.rows as any[]).map(row => row.word);
  } catch {
    return [];
  }
}

// 获取形近词（长度相近 + 首两字母相同）
async function getSimilarWords(
  word: string,
  excludeWordId: string,
  count: number = 1
): Promise<string[]> {
  const db = await getDatabase();
  const prefix = word.substring(0, 2).toLowerCase();
  const minLen = Math.max(2, word.length - 2);
  const maxLen = word.length + 2;
  try {
    const result = await db.execute(`
      SELECT word FROM words
      WHERE id != ? AND length(word) BETWEEN ? AND ?
        AND LOWER(SUBSTR(word, 1, 2)) = ?
        AND LOWER(word) != ?
      ORDER BY RANDOM() LIMIT ?
    `, [excludeWordId, minLen, maxLen, prefix, word.toLowerCase(), count]);
    return (result.rows as any[]).map(row => row.word);
  } catch {
    return [];
  }
}

// 智能干扰词生成（同根词 > 形近词 > 随机词）
export async function getSmartDistractorWords(
  wordId: string,
  word: string,
  count: number = 3
): Promise<string[]> {
  const sameRoot = await getSameRootWords(wordId, 1);
  const similar = await getSimilarWords(word, wordId, 1);

  const distractors = [...new Set([...sameRoot, ...similar])].filter(
    w => w.toLowerCase() !== word.toLowerCase()
  );

  const remaining = count - distractors.length;
  if (remaining > 0) {
    const randoms = await getRandomWords(wordId, remaining + 2);
    for (const r of randoms) {
      if (distractors.length >= count) break;
      if (r.toLowerCase() !== word.toLowerCase() && !distractors.includes(r)) {
        distractors.push(r);
      }
    }
  }

  return distractors.slice(0, count);
}

// 按单词文本批量查询音频 URL（用于音素练习预加载真实发音）
export async function getWordAudioByTexts(
  texts: string[]
): Promise<Map<string, { id: string; audioUrl: string | null }>> {
  if (texts.length === 0) return new Map();

  const db = await getDatabase();
  const placeholders = texts.map(() => '?').join(',');

  const result = await db.execute(`
    SELECT w.id, w.word,
           COALESCE(c.audio_url_us, w.audio_url_us) as audio_url_us
    FROM words w
    LEFT JOIN word_details_cache c ON w.id = c.word_id
    WHERE w.word IN (${placeholders})
  `, texts);

  const map = new Map<string, { id: string; audioUrl: string | null }>();
  for (const row of result.rows as any[]) {
    map.set(row.word, { id: row.id, audioUrl: row.audio_url_us || null });
  }
  return map;
}

// 智能干扰释义生成（同根词释义 > 随机释义）
export async function getSmartDistractorMeanings(
  wordId: string,
  meaningCn: string,
  count: number = 3
): Promise<string[]> {
  const db = await getDatabase();

  // 先尝试获取同根词的释义作为干扰项
  let distractors: string[] = [];
  try {
    const rootResult = await db.execute(`
      SELECT w2.meaning_cn FROM words w1
      JOIN words w2 ON w2.id != w1.id
        AND w2.etymology_root = w1.etymology_root
        AND w1.etymology_root IS NOT NULL
        AND w1.etymology_root != ''
      WHERE w1.id = ? AND w2.meaning_cn != ? AND w2.meaning_cn IS NOT NULL
      ORDER BY RANDOM() LIMIT 1
    `, [wordId, meaningCn]);
    distractors = (rootResult.rows as any[]).map(row => row.meaning_cn);
  } catch {}

  const remaining = count - distractors.length;
  if (remaining > 0) {
    const randoms = await getRandomMeanings(wordId, remaining + 1);
    for (const r of randoms) {
      if (distractors.length >= count) break;
      if (r !== meaningCn && !distractors.includes(r)) {
        distractors.push(r);
      }
    }
  }

  return distractors.slice(0, count);
}
