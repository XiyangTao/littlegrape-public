import { getDatabase } from '../DatabaseManager';

/**
 * 获取待练习单词数量（已学习但未掌握）
 * @param userId 用户ID
 * @param tag 可选词库标签，不传则查全部
 * @returns 待练习单词数量
 */
export async function getPracticeWordCount(userId: string, tag?: string): Promise<number> {
  const db = await getDatabase();

  if (tag) {
    const result = await db.execute(`
      SELECT COUNT(DISTINCT wp.word_id) as count
      FROM word_progress wp
      INNER JOIN word_tags wt ON wp.word_id = wt.word_id
      WHERE wp.user_id = ? AND wt.tag = ? AND wp.status = 'learned' AND wp.is_skipped = 0
    `, [userId, tag]);
    return (result.rows[0] as any)?.count || 0;
  }

  const result = await db.execute(`
    SELECT COUNT(*) as count
    FROM word_progress
    WHERE user_id = ? AND status = 'learned' AND is_skipped = 0
  `, [userId]);

  return (result.rows[0] as any)?.count || 0;
}

// ==================== 复习选词 ====================

/**
 * 获取待复习单词数量（所有 status='learned' 且未跳过的词）
 */
export async function getReviewWordCount(userId: string, tag?: string): Promise<number> {
  const db = await getDatabase();

  if (tag) {
    const result = await db.execute(`
      SELECT COUNT(DISTINCT wp.word_id) as count
      FROM word_progress wp
      INNER JOIN word_tags wt ON wp.word_id = wt.word_id
      WHERE wp.user_id = ? AND wt.tag = ? AND wp.status = 'learned' AND wp.is_skipped = 0
    `, [userId, tag]);
    return Number((result.rows[0] as any)?.count ?? 0);
  }

  const result = await db.execute(`
    SELECT COUNT(*) as count
    FROM word_progress
    WHERE user_id = ? AND status = 'learned' AND is_skipped = 0
  `, [userId]);
  return Number((result.rows[0] as any)?.count ?? 0);
}

/** 选词阶段的轻量数据（只含 id、word、meaningCn） */
export interface ReviewCandidate {
  id: string;
  word: string;
  meaningCn: string;
}

/**
 * 获取待复习单词候选列表（轻量查询，只取 id/word/meaningCn）
 *
 * 所有 status='learned' 且未跳过的词，按 learned_at ASC 排序（最早学的优先）。
 * 详情在用户确认选词后再加载。
 *
 * @param userId 用户ID
 * @param limit 数量上限，默认 1000
 * @param tag 词库标签
 */
export async function getReviewCandidates(
  userId: string,
  limit: number = 1000,
  tag?: string,
): Promise<ReviewCandidate[]> {
  const db = await getDatabase();

  const tagJoin = tag ? 'INNER JOIN word_tags wt ON w.id = wt.word_id' : '';
  const tagWhere = tag ? 'AND wt.tag = ?' : '';
  const params = tag ? [userId, tag, limit] : [userId, limit];

  const queryResult = await db.execute(`
    SELECT DISTINCT w.id, w.word, w.meaning_cn
    FROM words w
    INNER JOIN word_progress wp ON w.id = wp.word_id
    ${tagJoin}
    WHERE wp.user_id = ? ${tagWhere}
      AND wp.status = 'learned'
      AND wp.is_skipped = 0
    ORDER BY wp.learned_at ASC
    LIMIT ?
  `, params);

  return (queryResult.rows as any[]).map(row => ({
    id: row.id,
    word: row.word,
    meaningCn: row.meaning_cn ?? '',
  }));
}

/**
 * 获取生词本中的待复习候选词（轻量查询）
 *
 * 只返回在 difficult_words 表中且 status='learned' 的词。
 */
export async function getDifficultReviewCandidates(
  userId: string,
  limit: number = 1000,
  tag?: string,
): Promise<ReviewCandidate[]> {
  const db = await getDatabase();

  const tagJoin = tag ? 'INNER JOIN word_tags wt ON w.id = wt.word_id' : '';
  const tagWhere = tag ? 'AND wt.tag = ?' : '';
  const params = tag ? [userId, userId, tag, limit] : [userId, userId, limit];

  const queryResult = await db.execute(`
    SELECT DISTINCT w.id, w.word, w.meaning_cn
    FROM words w
    INNER JOIN word_progress wp ON w.id = wp.word_id
    INNER JOIN difficult_words dw ON w.id = dw.word_id AND dw.user_id = ?
    ${tagJoin}
    WHERE wp.user_id = ? ${tagWhere}
      AND wp.status = 'learned'
      AND wp.is_skipped = 0
    ORDER BY dw.last_wrong_at ASC
    LIMIT ?
  `, params);

  return (queryResult.rows as any[]).map(row => ({
    id: row.id,
    word: row.word,
    meaningCn: row.meaning_cn ?? '',
  }));
}
