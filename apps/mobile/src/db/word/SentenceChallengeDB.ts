/**
 * AI 造句挑战 DB 操作
 */
import { getDatabase, runSerialWrite } from '../DatabaseManager';
let _idCounter = 0;
function generateId(): string {
  return `sc_${Date.now()}_${++_idCounter}_${Math.random().toString(36).slice(2, 8)}`;
}

export interface SentenceChallengeRecord {
  id: string;
  userId: string;
  wordId: string;
  sentence: string;
  grammarScore: number | null;
  usageScore: number | null;
  naturalScore: number | null;
  overallScore: number | null;
  feedback: string | null;
  improvedSentence: string | null;
  createdAt: number;
}

export interface SentenceEvalResult {
  grammarScore: number;
  usageScore: number;
  naturalScore: number;
  overallScore: number;
  feedback: string;
  improvedSentence: string;
}

/**
 * 保存造句挑战记录
 */
export async function saveSentenceChallenge(
  userId: string,
  wordId: string,
  sentence: string,
  evalResult?: SentenceEvalResult
): Promise<string> {
  const db = await getDatabase();
  const id = generateId();
  const now = Date.now();

  await runSerialWrite(() => db.execute(`
    INSERT INTO sentence_challenges (id, user_id, word_id, sentence, grammar_score, usage_score, natural_score, overall_score, feedback, improved_sentence, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id, userId, wordId, sentence,
    evalResult?.grammarScore ?? null,
    evalResult?.usageScore ?? null,
    evalResult?.naturalScore ?? null,
    evalResult?.overallScore ?? null,
    evalResult?.feedback ?? null,
    evalResult?.improvedSentence ?? null,
    now,
  ]));

  return id;
}

/**
 * 获取某个词的造句历史
 */
export async function getSentenceHistory(
  userId: string,
  wordId: string
): Promise<SentenceChallengeRecord[]> {
  const db = await getDatabase();
  const result = await db.execute(`
    SELECT * FROM sentence_challenges
    WHERE user_id = ? AND word_id = ?
    ORDER BY created_at DESC
  `, [userId, wordId]);

  return (result.rows as any[]).map(rowToRecord);
}

/**
 * 获取用户造句统计
 */
export async function getSentenceStats(userId: string): Promise<{
  totalCount: number;
  avgScore: number;
}> {
  const db = await getDatabase();
  const result = await db.execute(`
    SELECT COUNT(*) as total_count, AVG(overall_score) as avg_score
    FROM sentence_challenges
    WHERE user_id = ? AND overall_score IS NOT NULL
  `, [userId]);

  const row = (result.rows as any[])[0];
  return {
    totalCount: row?.total_count || 0,
    avgScore: Math.round(row?.avg_score || 0),
  };
}

function rowToRecord(row: any): SentenceChallengeRecord {
  return {
    id: row.id,
    userId: row.user_id,
    wordId: row.word_id,
    sentence: row.sentence,
    grammarScore: row.grammar_score,
    usageScore: row.usage_score,
    naturalScore: row.natural_score,
    overallScore: row.overall_score,
    feedback: row.feedback,
    improvedSentence: row.improved_sentence,
    createdAt: row.created_at,
  };
}
