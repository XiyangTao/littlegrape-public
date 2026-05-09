/**
 * 同步元数据数据库操作
 *
 * 管理各 syncer 的同步时间戳（服务端时间）
 * 用于增量同步，只拉取上次同步后变化的数据
 */

import { getDatabase, runSerialWrite } from './DatabaseManager';

/**
 * 获取指定 syncer 的最后同步时间（服务端时间）
 */
export async function getSyncServerTime(
  userId: string,
  syncerName: string
): Promise<number | null> {
  const db = await getDatabase();

  const result = await db.execute(
    `SELECT last_server_time FROM sync_metadata WHERE user_id = ? AND syncer_name = ?`,
    [userId, syncerName]
  );

  const row = result.rows[0] as { last_server_time: number | null } | undefined;
  return row?.last_server_time || null;
}

/**
 * 保存指定 syncer 的最后同步时间（服务端时间）
 */
export async function saveSyncServerTime(
  userId: string,
  syncerName: string,
  serverTime: number
): Promise<void> {
  const db = await getDatabase();
  const now = Date.now();

  await runSerialWrite(() => db.execute(
    `INSERT INTO sync_metadata (user_id, syncer_name, last_server_time, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (user_id, syncer_name) DO UPDATE SET
       last_server_time = excluded.last_server_time,
       updated_at = excluded.updated_at`,
    [userId, syncerName, serverTime, now]
  ));
}

/**
 * 清除指定用户的所有同步元数据（用于登出或重置）
 */
export async function clearSyncMetadata(userId: string): Promise<void> {
  const db = await getDatabase();
  await runSerialWrite(() => db.execute(`DELETE FROM sync_metadata WHERE user_id = ?`, [userId]));
}

/**
 * 清除指定 syncer 的同步元数据（用于强制全量同步）
 */
export async function clearSyncerMetadata(
  userId: string,
  syncerName: string
): Promise<void> {
  const db = await getDatabase();
  await runSerialWrite(() => db.execute(
    `DELETE FROM sync_metadata WHERE user_id = ? AND syncer_name = ?`,
    [userId, syncerName]
  ));
}
