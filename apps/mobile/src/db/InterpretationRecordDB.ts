/**
 * 同声传译记录数据库操作
 */

import { getDatabase, runSerialWrite } from './DatabaseManager';

// ==================== 类型定义 ====================

export interface InterpretationRecordRow {
  id: string;
  userId: string;
  sourceLanguage: string;
  targetLanguage: string;
  mode: string;
  durationMs: number;
  transcript: string; // JSON string of SubtitleSegment[]
  sourceAudioPath: string | null;
  translationAudioPath: string | null;
  createdAt: string;
}

// ==================== 写操作 ====================

export async function insertRecord(record: InterpretationRecordRow): Promise<void> {
  return runSerialWrite(async () => {
    const db = await getDatabase();
    await db.execute(
      `INSERT INTO interpretation_records
       (id, user_id, source_language, target_language, mode, duration_ms, transcript, source_audio_path, translation_audio_path, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.userId,
        record.sourceLanguage,
        record.targetLanguage,
        record.mode,
        record.durationMs,
        record.transcript,
        record.sourceAudioPath,
        record.translationAudioPath,
        record.createdAt,
      ]
    );
  });
}

export async function deleteRecord(userId: string, id: string): Promise<void> {
  return runSerialWrite(async () => {
    const db = await getDatabase();
    await db.execute(
      'DELETE FROM interpretation_records WHERE id = ? AND user_id = ?',
      [id, userId]
    );
  });
}

export async function deleteAllRecords(userId: string): Promise<void> {
  return runSerialWrite(async () => {
    const db = await getDatabase();
    await db.execute('DELETE FROM interpretation_records WHERE user_id = ?', [userId]);
  });
}

// ==================== 读操作 ====================

export async function getRecords(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<InterpretationRecordRow[]> {
  const db = await getDatabase();
  const result = await db.execute(
    'SELECT * FROM interpretation_records WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [userId, limit, offset]
  );

  return (result.rows || []).map(mapRow);
}

export async function getRecordById(
  userId: string,
  id: string
): Promise<InterpretationRecordRow | null> {
  const db = await getDatabase();
  const result = await db.execute(
    'SELECT * FROM interpretation_records WHERE id = ? AND user_id = ?',
    [id, userId]
  );

  if (!result.rows || result.rows.length === 0) return null;
  return mapRow(result.rows[0]);
}

export async function getRecordCount(userId: string): Promise<number> {
  const db = await getDatabase();
  const result = await db.execute(
    'SELECT COUNT(*) as count FROM interpretation_records WHERE user_id = ?',
    [userId]
  );
  return Number(result.rows?.[0]?.count ?? 0);
}

// ==================== 映射 ====================

function mapRow(row: any): InterpretationRecordRow {
  return {
    id: row.id,
    userId: row.user_id,
    sourceLanguage: row.source_language,
    targetLanguage: row.target_language,
    mode: row.mode,
    durationMs: Number(row.duration_ms),
    transcript: row.transcript,
    sourceAudioPath: row.source_audio_path || null,
    translationAudioPath: row.translation_audio_path || null,
    createdAt: row.created_at,
  };
}
