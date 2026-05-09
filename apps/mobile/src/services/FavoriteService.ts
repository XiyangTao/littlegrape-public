/**
 * 收藏服务层
 *
 * 封装收藏的业务操作（本地 DB + Outbox 异步远程）。
 */

import { enqueueOutbox } from '@/db/OutboxDB';
import {
  addFavorite as addFavoriteLocal,
  removeFavorite as removeFavoriteLocal,
} from '@/db/WordDB';

/**
 * 添加收藏（本地 + Outbox 异步远程）
 */
export async function addFavorite(userId: string, wordId: string): Promise<void> {
  await addFavoriteLocal(wordId, userId);
  try {
    await enqueueOutbox(userId, 'favorite_add', { wordId });
  } catch (err) {
    console.error('[FavoriteService] Outbox 入队失败:', err);
  }
}

/**
 * 取消收藏（本地 + Outbox 异步远程）
 */
export async function removeFavorite(userId: string, wordId: string): Promise<void> {
  await removeFavoriteLocal(wordId, userId);
  try {
    await enqueueOutbox(userId, 'favorite_remove', { wordId });
  } catch (err) {
    console.error('[FavoriteService] Outbox 入队失败:', err);
  }
}
