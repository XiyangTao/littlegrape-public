/**
 * React 桥：从组件订阅 session
 *
 * useSession()：当前 session 或 null（未登录）
 * useRequiredSession()：保证存在 —— 用于已登录子树
 */

import { useSyncExternalStore } from 'react';
import type { SessionContainer } from './SessionContainer';
import { subscribeSession, getSessionSnapshot } from './registry';

/**
 * 订阅当前活跃 session。session 切换时组件自动重渲染。
 *
 * 未登录时返回 null —— 调用方需自行判空。
 */
export function useSession(): SessionContainer | null {
  return useSyncExternalStore(
    subscribeSession,
    getSessionSnapshot,
    getSessionSnapshot,
  );
}

/**
 * 用于已确认登录的子树。无 session 抛错 —— 让 bug 早暴露。
 *
 * 典型用法：在 NavigationContainer / 已登录路由内部的 hook，
 * 父级 AppContent 已用 useSession() != null 守卫，子树调用一定有 session。
 */
export function useRequiredSession(): SessionContainer {
  const session = useSession();
  if (!session) {
    throw new Error('[useRequiredSession] called without an active session');
  }
  return session;
}
