/**
 * 伙伴对话本地数据库操作
 * 管理 companion_threads 和 companion_messages 表
 */

import { getDatabase, runSerialWrite } from './DatabaseManager';

// ==================== 类型定义 ====================

export interface CompanionThread {
  id: string;
  userId: string;
  characterId: string;
  agnoSessionId: string;
  messageCount: number;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  difficulty: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompanionMessage {
  id: string;
  threadId: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: string;
  voiceUri?: string | null;
  voiceDuration?: number | null;
  translation?: string | null;
  tips?: string | null;
}

// ==================== 行映射 ====================

function rowToThread(row: any): CompanionThread {
  return {
    id: row.id,
    userId: row.user_id,
    characterId: row.character_id,
    agnoSessionId: row.agno_session_id,
    messageCount: row.message_count ?? 0,
    lastMessageAt: row.last_message_at ?? null,
    lastMessagePreview: row.last_message_preview ?? null,
    difficulty: row.difficulty ?? 'cet4',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToMessage(row: any): CompanionMessage {
  return {
    id: row.id,
    threadId: row.thread_id,
    text: row.text,
    sender: row.sender,
    timestamp: row.timestamp,
    voiceUri: row.voice_uri ?? null,
    voiceDuration: row.voice_duration ?? null,
    translation: row.translation ?? null,
    tips: row.tips ?? null,
  };
}

// ==================== Thread 操作 ====================

/** 获取或创建本地线程 */
export async function getOrCreateThread(
  id: string, userId: string, characterId: string, agnoSessionId: string,
): Promise<CompanionThread> {
  const database = await getDatabase();

  // 先查找
  const existing = await database.execute(
    'SELECT * FROM companion_threads WHERE user_id = ? AND character_id = ?',
    [userId, characterId]
  );
  if (existing.rows.length > 0) {
    return rowToThread(existing.rows[0]);
  }

  // 创建
  const now = new Date().toISOString();
  await runSerialWrite(async () => {
    const db = await getDatabase();
    await db.execute(
      `INSERT OR IGNORE INTO companion_threads
        (id, user_id, character_id, agno_session_id, message_count, difficulty, created_at, updated_at)
       VALUES (?, ?, ?, ?, 0, 'cet4', ?, ?)`,
      [id, userId, characterId, agnoSessionId, now, now]
    );
  });

  return {
    id, userId, characterId, agnoSessionId,
    messageCount: 0, lastMessageAt: null, lastMessagePreview: null,
    difficulty: 'cet4', createdAt: now, updatedAt: now,
  };
}

/** 获取用户所有线程 */
export async function getThreads(userId: string): Promise<CompanionThread[]> {
  const database = await getDatabase();
  const result = await database.execute(
    'SELECT * FROM companion_threads WHERE user_id = ? ORDER BY updated_at DESC',
    [userId]
  );
  return (result.rows as any[]).map(rowToThread);
}

/** 更新线程最后消息信息 */
export async function updateThreadLastMessage(
  threadId: string, messageCount: number, preview: string,
): Promise<void> {
  return runSerialWrite(async () => {
    const database = await getDatabase();
    const now = new Date().toISOString();
    await database.execute(
      `UPDATE companion_threads SET message_count = ?, last_message_at = ?, last_message_preview = ?, updated_at = ? WHERE id = ?`,
      [messageCount, now, preview.slice(0, 50), now, threadId]
    );
  });
}

// ==================== Message 操作 ====================

/** 获取线程的所有消息 */
export async function getMessages(threadId: string): Promise<CompanionMessage[]> {
  const database = await getDatabase();
  const result = await database.execute(
    'SELECT * FROM companion_messages WHERE thread_id = ? ORDER BY timestamp ASC',
    [threadId]
  );
  return (result.rows as any[]).map(rowToMessage);
}

/** 添加消息 */
export async function addMessage(message: CompanionMessage): Promise<void> {
  return runSerialWrite(async () => {
    const database = await getDatabase();
    await database.execute(
      `INSERT OR IGNORE INTO companion_messages
        (id, thread_id, text, sender, timestamp, voice_uri, voice_duration, translation, tips, synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        message.id, message.threadId, message.text, message.sender,
        message.timestamp, message.voiceUri ?? null, message.voiceDuration ?? null,
        message.translation ?? null, message.tips ?? null,
      ]
    );
  });
}

/** 批量添加消息 */
export async function addMessages(messages: CompanionMessage[]): Promise<void> {
  if (messages.length === 0) return;
  return runSerialWrite(async () => {
    const database = await getDatabase();
    for (const msg of messages) {
      await database.execute(
        `INSERT OR IGNORE INTO companion_messages
          (id, thread_id, text, sender, timestamp, voice_uri, voice_duration, translation, tips, synced)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [msg.id, msg.threadId, msg.text, msg.sender, msg.timestamp,
         msg.voiceUri ?? null, msg.voiceDuration ?? null, msg.translation ?? null, msg.tips ?? null]
      );
    }
  });
}

/** 更新消息翻译 */
export async function updateMessageTranslation(messageId: string, translation: string): Promise<void> {
  return runSerialWrite(async () => {
    const database = await getDatabase();
    await database.execute(
      'UPDATE companion_messages SET translation = ? WHERE id = ?',
      [translation, messageId]
    );
  });
}

/** 更新消息 tips */
export async function updateMessageTips(messageId: string, tips: string): Promise<void> {
  return runSerialWrite(async () => {
    const database = await getDatabase();
    await database.execute(
      'UPDATE companion_messages SET tips = ? WHERE id = ?',
      [tips, messageId]
    );
  });
}

/** 获取消息数量 */
export async function getMessageCount(threadId: string): Promise<number> {
  const database = await getDatabase();
  const result = await database.execute(
    'SELECT COUNT(*) as count FROM companion_messages WHERE thread_id = ?',
    [threadId]
  );
  return Number(result.rows[0]?.count ?? 0);
}

/** 清空线程的所有消息 */
export async function clearMessages(threadId: string): Promise<void> {
  return runSerialWrite(async () => {
    const database = await getDatabase();
    await database.execute('DELETE FROM companion_messages WHERE thread_id = ?', [threadId]);
  });
}
