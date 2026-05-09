import { getDatabase, runSerialWrite } from './DatabaseManager';
import { rowToMessage, rowToSession, rowToSessionSummary } from './helpers';
import type { DBMessage, DBSession, SessionSummary } from './helpers';

// Re-export 类型供外部使用
export type { DBMessage, DBSession, SessionSummary } from './helpers';

// 初始化函数（保留用于兼容，实际迁移由 DatabaseManager 处理）
export async function initDatabase(): Promise<void> {
  // 迁移逻辑已移至 DatabaseManager，这里只需确保数据库已初始化
  await getDatabase();
}

// ============ Session 操作 ============

// 创建会话
export async function createSession(session: Omit<DBSession, 'createdAt' | 'updatedAt'>): Promise<void> {
  return runSerialWrite(async () => {
    const database = await getDatabase();
    const now = new Date().toISOString();

    await database.execute(
      `INSERT INTO sessions (
        session_id, user_id, scenario, ai_role, difficulty_level,
        english_variant, conversation_style, enable_tips,
        voice_id, voice_name, predefined_scenario_id,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        session.sessionId,
        session.userId,
        session.scenario,
        session.aiRole,
        session.difficultyLevel,
        session.englishVariant,
        session.conversationStyle,
        session.enableTips,
        session.voiceId || null,
        session.voiceName || null,
        session.predefinedScenarioId || null,
        now,
        now,
      ]
    );
  });
}

// 获取会话
export async function getSession(sessionId: string): Promise<DBSession | null> {
  const database = await getDatabase();
  const result = await database.execute(
    'SELECT * FROM sessions WHERE session_id = ?',
    [sessionId]
  );
  const row = result.rows[0] as any;
  if (!row) return null;
  return rowToSession(row);
}

// 获取用户的会话列表（带最近消息，按更新时间倒序）
export async function getSessionList(userId: string, limit = 20, offset = 0): Promise<SessionSummary[]> {
  const database = await getDatabase();
  const result = await database.execute(
    `SELECT s.*,
       (SELECT text FROM messages WHERE session_id = s.session_id ORDER BY timestamp DESC LIMIT 1) as last_message
     FROM sessions s
     WHERE s.user_id = ?
     ORDER BY s.updated_at DESC
     LIMIT ? OFFSET ?`,
    [userId, limit, offset]
  );
  return (result.rows as any[]).map(rowToSessionSummary);
}

// 更新会话的 updated_at
export async function touchSession(sessionId: string): Promise<void> {
  return runSerialWrite(async () => {
    const database = await getDatabase();
    const now = new Date().toISOString();
    await database.execute(
      'UPDATE sessions SET updated_at = ? WHERE session_id = ?',
      [now, sessionId]
    );
  });
}

// 删除会话（消息会级联删除）
export async function deleteSession(sessionId: string): Promise<void> {
  return runSerialWrite(async () => {
    const database = await getDatabase();
    // 先删除消息，再删除会话（因为外键约束）
    await database.execute('DELETE FROM messages WHERE session_id = ?', [sessionId]);
    await database.execute('DELETE FROM sessions WHERE session_id = ?', [sessionId]);
  });
}

// 批量删除会话
export async function batchDeleteSessions(sessionIds: string[]): Promise<number> {
  if (sessionIds.length === 0) return 0;

  return runSerialWrite(async () => {
    const database = await getDatabase();
    const placeholders = sessionIds.map(() => '?').join(',');

    // 使用事务批量删除
    let deletedCount = 0;
    await database.transaction(async (tx) => {
      // 先删除消息
      await tx.execute(
        `DELETE FROM messages WHERE session_id IN (${placeholders})`,
        sessionIds
      );
      // 再删除会话
      const result = await tx.execute(
        `DELETE FROM sessions WHERE session_id IN (${placeholders})`,
        sessionIds
      );
      deletedCount = result.rowsAffected;
    });

    return deletedCount;
  });
}

// ============ Message 操作 ============

// 添加消息（使用 INSERT OR REPLACE 避免重复插入报错）
export async function addMessage(message: DBMessage): Promise<void> {
  return runSerialWrite(async () => {
    const database = await getDatabase();

    await database.execute(
      `INSERT OR REPLACE INTO messages (id, session_id, text, sender, timestamp, tips, score, voice_uri, voice_duration, translation)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        message.id,
        message.sessionId,
        message.text,
        message.sender,
        message.timestamp,
        message.tips || null,
        message.score ?? null,
        message.voiceUri || null,
        message.voiceDuration ?? null,
        message.translation || null,
      ]
    );

    // 更新会话的 updated_at（在同一个串行队列中，不会死锁）
    const now = new Date().toISOString();
    await database.execute(
      'UPDATE sessions SET updated_at = ? WHERE session_id = ?',
      [now, message.sessionId]
    );
  });
}

// 批量添加消息
export async function addMessages(messages: DBMessage[]): Promise<void> {
  if (messages.length === 0) return;

  return runSerialWrite(async () => {
    const database = await getDatabase();

    // 使用事务批量插入
    await database.transaction(async (tx) => {
      for (const message of messages) {
        await tx.execute(
          `INSERT OR REPLACE INTO messages (id, session_id, text, sender, timestamp, tips, score, voice_uri, voice_duration, translation)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            message.id,
            message.sessionId,
            message.text,
            message.sender,
            message.timestamp,
            message.tips || null,
            message.score ?? null,
            message.voiceUri || null,
            message.voiceDuration ?? null,
            message.translation || null,
          ]
        );
      }

      // 更新会话的 updated_at
      if (messages.length > 0) {
        const now = new Date().toISOString();
        await tx.execute(
          'UPDATE sessions SET updated_at = ? WHERE session_id = ?',
          [now, messages[0].sessionId]
        );
      }
    });
  });
}

// 更新消息（tips 和 score）
export async function updateMessage(
  messageId: string,
  updates: { tips?: string; score?: number }
): Promise<void> {
  const setParts: string[] = [];
  const values: (string | number | null)[] = [];

  if (updates.tips !== undefined) {
    setParts.push('tips = ?');
    values.push(updates.tips);
  }
  if (updates.score !== undefined) {
    setParts.push('score = ?');
    values.push(updates.score);
  }

  if (setParts.length === 0) return;

  return runSerialWrite(async () => {
    const database = await getDatabase();
    values.push(messageId);
    await database.execute(
      `UPDATE messages SET ${setParts.join(', ')} WHERE id = ?`,
      values
    );
  });
}

// 更新消息的翻译
export async function updateMessageTranslation(
  messageId: string,
  translation: string
): Promise<void> {
  return runSerialWrite(async () => {
    const database = await getDatabase();
    await database.execute(
      'UPDATE messages SET translation = ? WHERE id = ?',
      [translation, messageId]
    );
  });
}

// 替换消息 ID 并更新字段（用于将临时 ID 替换为服务器返回的真实 ID）
export async function replaceMessageId(
  oldId: string,
  newId: string,
  updates?: { tips?: string | null; score?: number | null; timestamp?: string }
): Promise<void> {
  return runSerialWrite(async () => {
    const database = await getDatabase();

    const setParts: string[] = ['id = ?'];
    const values: (string | number | null)[] = [newId];

    if (updates?.tips !== undefined) {
      setParts.push('tips = ?');
      values.push(updates.tips);
    }
    if (updates?.score !== undefined) {
      setParts.push('score = ?');
      values.push(updates.score);
    }
    if (updates?.timestamp !== undefined) {
      setParts.push('timestamp = ?');
      values.push(updates.timestamp);
    }

    values.push(oldId);
    await database.execute(
      `UPDATE messages SET ${setParts.join(', ')} WHERE id = ?`,
      values
    );
  });
}

// 获取会话的所有消息（按时间正序）
export async function getMessages(sessionId: string): Promise<DBMessage[]> {
  const database = await getDatabase();
  const result = await database.execute(
    'SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC',
    [sessionId]
  );
  return (result.rows as any[]).map(rowToMessage);
}

// 获取会话的消息数量
export async function getMessageCount(sessionId: string): Promise<number> {
  const database = await getDatabase();
  const result = await database.execute(
    'SELECT COUNT(*) as count FROM messages WHERE session_id = ?',
    [sessionId]
  );
  const row = result.rows[0] as { count: number } | undefined;
  return Number(row?.count ?? 0);
}

// ============ 工具方法 ============

// 获取会话的所有语音文件 URI
export async function getVoiceUris(sessionId: string): Promise<string[]> {
  const database = await getDatabase();
  const result = await database.execute(
    'SELECT voice_uri FROM messages WHERE session_id = ? AND voice_uri IS NOT NULL',
    [sessionId]
  );
  return (result.rows as unknown as { voice_uri: string }[]).map((r) => r.voice_uri);
}

// 批量获取多个会话的所有语音文件 URI
export async function getVoiceUrisBySessionIds(sessionIds: string[]): Promise<string[]> {
  if (sessionIds.length === 0) return [];

  const database = await getDatabase();
  const placeholders = sessionIds.map(() => '?').join(',');
  const result = await database.execute(
    `SELECT voice_uri FROM messages WHERE session_id IN (${placeholders}) AND voice_uri IS NOT NULL`,
    sessionIds
  );
  return (result.rows as unknown as { voice_uri: string }[]).map((r) => r.voice_uri);
}

// 检查会话是否存在
export async function sessionExists(sessionId: string): Promise<boolean> {
  const database = await getDatabase();
  const result = await database.execute(
    'SELECT COUNT(*) as count FROM sessions WHERE session_id = ?',
    [sessionId]
  );
  const row = result.rows[0] as { count: number } | undefined;
  return Number(row?.count ?? 0) > 0;
}

// 获取用户的会话总数
export async function getSessionCount(userId: string): Promise<number> {
  const database = await getDatabase();
  const result = await database.execute(
    'SELECT COUNT(*) as count FROM sessions WHERE user_id = ?',
    [userId]
  );
  const row = result.rows[0] as { count: number } | undefined;
  return Number(row?.count ?? 0);
}

// 清空所有数据（用于调试或退出登录）
export async function clearAllData(): Promise<void> {
  return runSerialWrite(async () => {
    const database = await getDatabase();
    await database.execute('DELETE FROM messages');
    await database.execute('DELETE FROM sessions');
    if (__DEV__) console.log('[ConversationDB] All data cleared');
  });
}
