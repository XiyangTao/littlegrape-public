/**
 * 同步 Outbox 数据库操作
 *
 * 记录所有需要推送到服务端的写操作，由 OutboxProcessor 统一消费。
 * 支持失败重试和指数退避（3s, 6s, 12s, 24s, 48s）。
 *
 * 跨用户隔离：每条 entry 必带 user_id —— processOutbox 只处理当前 SyncManager.userId 的 entry，
 * 用户 A 的离线写入不会被用户 B 登录后的推送循环用 B 的 token 推上去。
 */

import { getDatabase, runSerialWrite } from './DatabaseManager';

// ==================== 类型定义 ====================

export type OutboxOpType =
  | 'favorite_add'
  | 'favorite_remove'
  | 'difficult_wrong'
  | 'difficult_correct'
  | 'difficult_remove'
  | 'difficult_clear'
  | 'vocab_test_push'
  | 'word_learned'
  | 'word_mastered';

export interface OutboxEntry {
  id: number;
  user_id: string;
  op_type: OutboxOpType;
  payload: string;
  created_at: number;
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  scheduled_at: number;
}

// ==================== 写操作 ====================

/**
 * 写入一条 Outbox 记录
 * @throws 如果 INSERT 失败则抛出错误
 */
export async function enqueueOutbox(
  userId: string,
  opType: OutboxOpType,
  payload: Record<string, any>,
): Promise<void> {
  if (!userId) throw new Error('[OutboxDB] enqueueOutbox: userId is required');
  const now = Date.now();
  await runSerialWrite(async () => {
    const db = await getDatabase();
    await db.execute(
      `INSERT INTO sync_outbox (user_id, op_type, payload, created_at, scheduled_at) VALUES (?, ?, ?, ?, ?)`,
      [userId, opType, JSON.stringify(payload), now, now],
    );
  });
}

// ==================== 读操作 ====================

/**
 * 获取当前用户到期的待处理条目（scheduled_at <= now 且未达最大重试次数）
 */
export async function getPendingEntries(userId: string, limit = 20): Promise<OutboxEntry[]> {
  const db = await getDatabase();
  const now = Date.now();
  const result = await db.execute(
    `SELECT * FROM sync_outbox WHERE user_id = ? AND scheduled_at <= ? AND attempts < max_attempts ORDER BY id ASC LIMIT ?`,
    [userId, now, limit],
  );
  return result.rows as unknown as OutboxEntry[];
}

/**
 * 执行成功 — 删除条目
 */
export async function removeEntry(id: number): Promise<void> {
  const db = await getDatabase();
  await db.execute(`DELETE FROM sync_outbox WHERE id = ?`, [id]);
}

/**
 * 执行失败 — 递增 attempts 并设置指数退避的下次执行时间
 * 退避梯度：3s → 6s → 12s → 24s → 48s
 */
export async function markFailed(id: number, error: string): Promise<void> {
  const db = await getDatabase();
  // 先读取当前 attempts 以计算退避时间
  const current = await db.execute(
    `SELECT attempts FROM sync_outbox WHERE id = ?`,
    [id],
  );
  const attempts = (current.rows[0] as any)?.attempts ?? 0;
  const backoffMs = 3000 * Math.pow(2, attempts); // 3s, 6s, 12s, 24s, 48s
  const scheduledAt = Date.now() + backoffMs;

  await db.execute(
    `UPDATE sync_outbox SET attempts = attempts + 1, last_error = ?, scheduled_at = ? WHERE id = ?`,
    [error, scheduledAt, id],
  );
}
