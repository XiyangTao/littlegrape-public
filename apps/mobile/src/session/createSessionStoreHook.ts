/**
 * Session-scope store 的 React 桥工厂
 *
 * 6 个 session-scope store 文件原本各自重复 ~25 行模板：
 *   - useXxxStoreImpl<T>(selector) 桥到当前 session 的 store
 *   - .getState 严格抛错版本
 *   - getXxxStoreState() 防御式 null 返回
 *
 * 统一抽成本工厂后单行调用：
 *   const { useStore, getStateSafe } = createSessionStoreHook(s => s.userStore);
 */

import { useStore as zustandUseStore, type StoreApi } from 'zustand';
import type { SessionContainer } from './SessionContainer';
import { tryGetSession } from './registry';
import { useRequiredSession } from './useSession';

/**
 * 加强版 hook —— 兼容 zustand 原生两种调用：
 *   useStore() 返回整个 state；useStore(selector) 返回投影。
 * 同时挂上命令式 getState / setState 方法（与 zustand store API 对齐）。
 */
export interface SessionStoreHook<S> {
  (): S;
  <T>(selector: (s: S) => T): T;
  /** 严格取状态 —— 无 session 时抛错（用于已确认登录态的代码路径） */
  getState(): S;
  /** 命令式更新 —— 无 session 时静默 noop */
  setState(partial: Partial<S> | ((s: S) => Partial<S>)): void;
}

/** 防御式访问器 —— 异步路径用（WS 回调 / setTimeout 等可能在 logout 后 fire） */
export type SessionStoreSafeAccessor<S> = () => S | null;

export function createSessionStoreHook<S>(
  pick: (session: SessionContainer) => StoreApi<S>,
): { useStore: SessionStoreHook<S>; getStateSafe: SessionStoreSafeAccessor<S> } {
  function useImpl<T = S>(selector?: (s: S) => T): T | S {
    const session = useRequiredSession();
    // 统一传 selector（避免 hook 条件调用）：未传则用 identity
    return zustandUseStore(pick(session), (selector ?? identity) as (s: S) => T);
  }

  (useImpl as SessionStoreHook<S>).getState = (): S => {
    const session = tryGetSession();
    if (!session) {
      throw new Error('[SessionStoreHook.getState] no active session');
    }
    return pick(session).getState();
  };

  (useImpl as SessionStoreHook<S>).setState = (
    partial: Partial<S> | ((s: S) => Partial<S>),
  ): void => {
    const session = tryGetSession();
    if (!session) {
      // 命令式 setState 在异步路径里可能 fire after logout —— 此时静默 noop（不抛错，避免污染调用链）
      if (__DEV__) console.warn('[SessionStoreHook.setState] called without active session');
      return;
    }
    pick(session).setState(partial as never);
  };

  const getStateSafe: SessionStoreSafeAccessor<S> = () => {
    const session = tryGetSession();
    return session ? pick(session).getState() : null;
  };

  return { useStore: useImpl as SessionStoreHook<S>, getStateSafe };
}

const identity = <S>(s: S): S => s;
