import { getDatabase, runSerialWrite } from '../DatabaseManager';
import type { LocalWord, LearnWordWithProgress, SelectWordsOptions } from './types';
import { rowToLocalWord } from './helpers';
import { getWordProgressBatch } from './WordProgressDB';
import { ensureWordDetails } from './WordDetailCacheDB';

// ==================== 学习会话管理 ====================

const LEARNING_SESSION_TABLE = 'learning_session_words';

export async function resetLearningSessionWords(): Promise<void> {
  const db = await getDatabase();
  await runSerialWrite(() => db.execute(`DELETE FROM ${LEARNING_SESSION_TABLE}`));
}

export async function addLearningSessionWords(wordIds: string[]): Promise<void> {
  if (wordIds.length === 0) return;
  const db = await getDatabase();
  await runSerialWrite(() => db.transaction(async (tx) => {
    for (const id of wordIds) {
      await tx.execute(
        `INSERT OR IGNORE INTO ${LEARNING_SESSION_TABLE} (word_id) VALUES (?)`,
        [id]
      );
    }
  }));
}

/**
 * 选取学习单词
 * 优先选取用户当前水平的新单词，不够则从所有未学单词中补充
 */
export async function selectWordsForLearning(
  options: SelectWordsOptions
): Promise<LearnWordWithProgress[]> {
  const {
    userId,
    tags,
    totalCount,
    bncLevelMin,
    bncLevelMax,
  } = options;

  const db = await getDatabase();

  // 诊断：检查基础数据（仅开发模式）
  if (__DEV__) {
    const wordsCountResult = await db.execute('SELECT COUNT(*) as cnt FROM words');
    const tagsCountResult = await db.execute('SELECT COUNT(*) as cnt FROM word_tags');
    const sessionCountResult = await db.execute(`SELECT COUNT(*) as cnt FROM ${LEARNING_SESSION_TABLE}`);
    const progressCountResult = await db.execute('SELECT COUNT(*) as cnt FROM word_progress WHERE user_id = ?', [userId]);
    console.log(`[selectWordsForLearning] 诊断: words=${(wordsCountResult.rows as any[])[0]?.cnt}, word_tags=${(tagsCountResult.rows as any[])[0]?.cnt}, session=${(sessionCountResult.rows as any[])[0]?.cnt}, progress=${(progressCountResult.rows as any[])[0]?.cnt}`);
    console.log(`[selectWordsForLearning] 参数: userId=${userId}, tags=${JSON.stringify(tags)}, totalCount=${totalCount}, bncLevelMin=${bncLevelMin}, bncLevelMax=${bncLevelMax}`);
  }

  // 构建词库过滤条件
  const tagFilter = tags && tags.length > 0
    ? `AND w.id IN (SELECT word_id FROM word_tags WHERE tag IN (${tags.map(() => '?').join(',')}))`
    : '';
  const tagParams = tags && tags.length > 0 ? tags : [];

  const sessionFilter = `AND w.id NOT IN (SELECT word_id FROM ${LEARNING_SESSION_TABLE})`;

  // 构建 BNC 等级过滤条件（用户当前水平，排除 NULL）
  const hasBncFilter = bncLevelMin !== undefined && bncLevelMax !== undefined;
  const bncFilter = hasBncFilter
    ? `AND w.bnc_coca_level >= ? AND w.bnc_coca_level <= ?`
    : '';
  const bncParams = hasBncFilter ? [bncLevelMin, bncLevelMax] : [];

  // 1. 优先选取用户当前水平的新单词
  const mainResult = await db.execute(`
    SELECT w.*,
           COALESCE(c.meanings, w.meanings) as meanings,
           COALESCE(c.examples, w.examples) as examples,
           COALESCE(c.etymology, w.etymology) as etymology,
           COALESCE(c.collocations, w.collocations) as collocations,
           COALESCE(c.inflections, w.inflections) as inflections,
           COALESCE(c.tags, w.tags) as tags,
           COALESCE(c.phonetic_uk, w.phonetic_uk) as phonetic_uk,
           COALESCE(c.audio_url_us, w.audio_url_us) as audio_url_us,
           COALESCE(c.audio_url_uk, w.audio_url_uk) as audio_url_uk,
           COALESCE(c.audio_ai_explanation_url, w.audio_ai_explanation_url) as audio_ai_explanation_url
    FROM words w
    LEFT JOIN word_progress wp ON w.id = wp.word_id AND wp.user_id = ?
    LEFT JOIN word_details_cache c ON w.id = c.word_id
    WHERE wp.id IS NULL ${tagFilter} ${sessionFilter} ${bncFilter}
    ORDER BY RANDOM()
    LIMIT ?
  `, [userId, ...tagParams, ...bncParams, totalCount]);

  const allWords = [...(mainResult.rows as any[])];
  if (__DEV__) console.log(`[selectWordsForLearning] 主查询结果: ${allWords.length} 个单词`);

  // 2. 如果数量不够，从所有其他未学单词中补充（不限 BNC 等级）
  const shortage = totalCount - allWords.length;
  if (shortage > 0) {
    const existingIds = allWords.map(w => w.id);
    const excludeFilter = existingIds.length > 0
      ? `AND w.id NOT IN (${existingIds.map(() => '?').join(',')})`
      : '';

    const supplementResult = await db.execute(`
      SELECT w.*,
             COALESCE(c.meanings, w.meanings) as meanings,
             COALESCE(c.examples, w.examples) as examples,
             COALESCE(c.etymology, w.etymology) as etymology,
             COALESCE(c.collocations, w.collocations) as collocations,
             COALESCE(c.inflections, w.inflections) as inflections,
             COALESCE(c.tags, w.tags) as tags,
             COALESCE(c.phonetic_uk, w.phonetic_uk) as phonetic_uk,
             COALESCE(c.audio_url_us, w.audio_url_us) as audio_url_us,
             COALESCE(c.audio_url_uk, w.audio_url_uk) as audio_url_uk,
             COALESCE(c.audio_ai_explanation_url, w.audio_ai_explanation_url) as audio_ai_explanation_url
      FROM words w
      LEFT JOIN word_progress wp ON w.id = wp.word_id AND wp.user_id = ?
      LEFT JOIN word_details_cache c ON w.id = c.word_id
      WHERE wp.id IS NULL ${tagFilter} ${sessionFilter} ${excludeFilter}
      ORDER BY RANDOM()
      LIMIT ?
    `, [userId, ...tagParams, ...existingIds, shortage]);

    allWords.push(...(supplementResult.rows as any[]));
  }

  // 记录本次会话已加载的单词
  await addLearningSessionWords(allWords.map(w => w.id));

  // 获取所有单词的学习进度
  const wordIds = allWords.map(w => w.id);
  const progressMap = await getWordProgressBatch(userId, wordIds);

  // 组装结果并打乱顺序
  const result: LearnWordWithProgress[] = allWords.map(row => ({
    id: row.id,
    word: row.word,
    phoneticUs: row.phonetic_us,
    phoneticUk: row.phonetic_uk,
    audioUrlUs: row.audio_url_us,
    audioUrlUk: row.audio_url_uk,
    audioAiExplanationUrl: row.audio_ai_explanation_url,
    pos: row.pos,
    meaningCn: row.meaning_cn,
    meaningEn: row.meaning_en,
    level: row.level,
    frequency: row.frequency,
    meanings: row.meanings,
    examples: row.examples,
    etymology: row.etymology,
    collocations: row.collocations,
    inflections: row.inflections,
    tags: row.tags,
    syncedAt: row.synced_at,
    progress: progressMap.get(row.id) || null,
  }));

  // Fisher-Yates 洗牌算法打乱顺序
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  // 异步预加载详情缓存
  ensureWordDetails(result.map(w => w.id)).catch(() => {});

  return result;
}
