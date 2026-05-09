/**
 * Session Registry — session 生命周期管理 + 状态访问。
 *
 * 核心约定：同一时刻最多一个活跃 session（项目不需要多账号同时在线）。
 *
 * Token 流转完全交给 TokenManager —— startSession 不再需要 AuthBridge 参数。
 */

import { SessionContainer } from './SessionContainer';
import { FALLBACK_QUERY_CLIENT } from './fallbackQueryClient';

// ==================== 状态 ====================

let current: SessionContainer | null = null;
const listeners = new Set<() => void>();

/**
 * 上一次 destroy 的 in-flight Promise。
 *
 * 关键不变量：endSession 把 current 置 null 是同步的，但 destroy 是异步的；
 * 没有这个字段，紧接 endSession 的 startSession 会发现 current === null 立即返回，
 * 然后新建 container —— 此时旧 destroy 仍在跑，新旧副作用时间重叠。
 */
let pendingDestroy: Promise<void> | null = null;

// ==================== 写入 API ====================

/**
 * 启动新 session。
 *
 * - 同 userId 已有活跃 session：直接复用（防止 React StrictMode 双跑）
 * - 异 userId / 旧 session 还在：先 await endSession() 串行清理，再建新的
 * - 上一轮 destroy 还在跑：await pendingDestroy
 */
export async function startSession(userId: string): Promise<SessionContainer> {
  if (current && !current.isDestroyed && current.userId === userId) {
    return current;
  }
  await endSession();
  if (pendingDestroy) {
    try { await pendingDestroy; } catch { /* destroy 内部已 log */ }
  }
  current = new SessionContainer(userId);
  notify();
  return current;
}

/**
 * 销毁当前 session。
 *
 * 幂等：未登录态 no-op；上一轮 destroy 还在跑时直接 await（不重复触发）。
 * 顺序：先把 current 置 null + 通知，再 await destroy（cleanup 异步进行）。
 */
export async function endSession(): Promise<void> {
  if (pendingDestroy) {
    try { await pendingDestroy; } catch { /* destroy 内部已 log */ }
    return;
  }
  if (!current) return;
  const old = current;
  current = null;
  notify();
  pendingDestroy = (async () => {
    try {
      await old.destroy();
    } catch (e) {
      console.error('[SessionRegistry] destroy session failed:', e);
    } finally {
      try { FALLBACK_QUERY_CLIENT.clear(); } catch { /* ignore */ }
    }
  })();
  try {
    await pendingDestroy;
  } finally {
    pendingDestroy = null;
  }
}

// ==================== 读取 API ====================

/**
 * 获取当前 session（要求必须存在）。
 * 用于"已确认在登录后子树"的代码 —— 缺失则是 bug，应早暴露。
 */
export function getSession(): SessionContainer {
  if (!current || current.isDestroyed) {
    throw new Error('[SessionRegistry] no active session');
  }
  return current;
}

/**
 * 防御式获取 —— 可能未登录或刚 destroy 时返回 null。
 *
 * 用于：axios 拦截器 / WebSocket 推送 / native 回调等"消息可能晚到"的异步路径。
 */
export function tryGetSession(): SessionContainer | null {
  if (!current || current.isDestroyed) return null;
  return current;
}

/**
 * React useSyncExternalStore 用：订阅 session 切换事件。
 */
export function subscribeSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** React useSyncExternalStore 用：当前快照 */
export function getSessionSnapshot(): SessionContainer | null {
  return current && !current.isDestroyed ? current : null;
}

// ==================== 内部 ====================

function notify() {
  for (const fn of listeners) {
    try {
      fn();
    } catch (e) {
      console.error('[SessionRegistry] listener error:', e);
    }
  }
}
