/**
 * 助手消息本地缓存
 * 用于离线查看和加速首屏加载
 */

import { getDatabase, runSerialWrite } from './DatabaseManager';
import type { AssistantMessage, LocalAssistantMessage } from '@/types/assistant';
import { safeJsonParse } from '@/utils/safeJsonParse';

/**
 * 保存消息到本地（批量 upsert）
 */
export async function saveMessages(messages: AssistantMessage[]): Promise<void> {
  if (messages.length === 0) return;

  return runSerialWrite(async () => {
    const database = await getDatabase();
    await database.transaction(async (tx) => {
      for (const msg of messages) {
        await tx.execute(
          `INSERT OR REPLACE INTO assistant_messages (id, role, content, metadata, created_at, synced)
           VALUES (?, ?, ?, ?, ?, 1)`,
          [
            msg.id,
            msg.role,
            msg.content,
            msg.metadata ? JSON.stringify(msg.metadata) : null,
            msg.createdAt,
          ],
        );
      }
    });
  });
}

/**
 * 保存单条消息（发送时立即缓存）
 */
export async function saveMessage(msg: AssistantMessage, synced: boolean = true): Promise<void> {
  return runSerialWrite(async () => {
    const database = await getDatabase();
    await database.execute(
      `INSERT OR REPLACE INTO assistant_messages (id, role, content, metadata, created_at, synced)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        msg.id,
        msg.role,
        msg.content,
        msg.metadata ? JSON.stringify(msg.metadata) : null,
        msg.createdAt,
        synced ? 1 : 0,
      ],
    );
  });
}

/**
 * 获取本地缓存的最近消息
 */
export async function getRecentMessages(limit: number = 20): Promise<AssistantMessage[]> {
  const database = await getDatabase();
  const result = await database.execute(
    `SELECT * FROM assistant_messages ORDER BY created_at DESC LIMIT ?`,
    [limit],
  );

  const rows = result.rows as unknown as LocalAssistantMessage[];
  return rows.reverse().map(parseRow);
}

/**
 * 获取本地消息数量
 */
export async function getMessageCount(): Promise<number> {
  const database = await getDatabase();
  const result = await database.execute(
    'SELECT COUNT(*) as count FROM assistant_messages',
  );
  const row = result.rows[0] as { count: number } | undefined;
  return Number(row?.count ?? 0);
}

/**
 * 清空本地缓存
 */
export async function clearMessages(): Promise<void> {
  return runSerialWrite(async () => {
    const database = await getDatabase();
    await database.execute('DELETE FROM assistant_messages');
  });
}

// ==================== 内部工具 ====================

function parseRow(row: LocalAssistantMessage): AssistantMessage {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    metadata: safeJsonParse(row.metadata, null),
    createdAt: row.created_at,
  };
}
