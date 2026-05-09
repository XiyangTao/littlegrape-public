/**
 * 单词遭遇记录 DB 操作
 */
import { getDatabase, runSerialWrite } from '../DatabaseManager';
let _idCounter = 0;
function generateId(): string {
  return `enc_${Date.now()}_${++_idCounter}_${Math.random().toString(36).slice(2, 8)}`;
}

export type EncounterSource = 'conversation' | 'listening' | 'reading' | 'push';

export interface EncounterRecord {
  id: string;
  userId: string;
  wordId: string;
  source: EncounterSource;
  contextSentence: string | null;
  encounteredAt: number;
}

/**
 * 记录单词遭遇
 */
export async function recordEncounter(
  userId: string,
  wordId: string,
  source: EncounterSource,
  contextSentence?: string
): Promise<void> {
  const db = await getDatabase();
  await runSerialWrite(() => db.execute(`
    INSERT INTO encountered_words (id, user_id, word_id, source, context_sentence, encountered_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [generateId(), userId, wordId, source, contextSentence || null, Date.now()]));
}

/**
 * 获取用户最近学过的单词（用于 AI 对话注入）
 */
export async function getRecentLearnedWords(
  userId: string,
  days: number = 7,
  limit: number = 10
): Promise<{ wordId: string; word: string; learnedAt: number }[]> {
  const db = await getDatabase();
  const since = Date.now() - days * 24 * 60 * 60 * 1000;

  const result = await db.execute(`
    SELECT w.id as word_id, w.word, wp.learned_at
    FROM word_progress wp
    INNER JOIN words w ON w.id = wp.word_id
    WHERE wp.user_id = ? AND wp.status IN ('learned', 'mastered')
    AND wp.learned_at >= ?
    ORDER BY wp.learned_at DESC
    LIMIT ?
  `, [userId, since, limit]);

  return (result.rows as any[]).map(row => ({
    wordId: row.word_id,
    word: row.word,
    learnedAt: row.learned_at,
  }));
}

/**
 * 获取 N 天前学过的、有例句的单词（用于遭遇通知）
 * @param userId 用户 ID
 * @param minDays 最少多少天前学的（默认 3）
 * @param maxDays 最多多少天前学的（默认 7）
 * @param limit 最多返回几条（默认 20）
 */
export async function getLearnedWordsWithExamples(
  userId: string,
  minDays: number = 3,
  maxDays: number = 7,
  limit: number = 20
): Promise<{ wordId: string; word: string; examples: string }[]> {
  const db = await getDatabase();
  const now = Date.now();
  const minTime = now - maxDays * 24 * 60 * 60 * 1000;
  const maxTime = now - minDays * 24 * 60 * 60 * 1000;

  const result = await db.execute(`
    SELECT w.id as word_id, w.word, COALESCE(c.examples, w.examples) as examples
    FROM word_progress wp
    INNER JOIN words w ON w.id = wp.word_id
    LEFT JOIN word_details_cache c ON w.id = c.word_id
    WHERE wp.user_id = ? AND wp.status IN ('learned', 'mastered')
    AND wp.learned_at >= ? AND wp.learned_at <= ?
    AND COALESCE(c.examples, w.examples) IS NOT NULL
    AND COALESCE(c.examples, w.examples) != '[]'
    AND COALESCE(c.examples, w.examples) != ''
    ORDER BY RANDOM()
    LIMIT ?
  `, [userId, minTime, maxTime, limit]);

  return (result.rows as any[]).map(row => ({
    wordId: row.word_id,
    word: row.word,
    examples: row.examples,
  }));
}

/**
 * 获取遭遇统计
 */
export async function getEncounterStats(userId: string): Promise<{ totalEncounters: number; uniqueWords: number }> {
  const db = await getDatabase();
  const result = await db.execute(`
    SELECT COUNT(*) as total, COUNT(DISTINCT word_id) as unique_words
    FROM encountered_words
    WHERE user_id = ?
  `, [userId]);

  const row = (result.rows as any[])[0];
  return {
    totalEncounters: row?.total || 0,
    uniqueWords: row?.unique_words || 0,
  };
}
