/**
 * 并发原语 — singleflight + safe
 *
 * - singleflight: 同一时刻最多一个 in-flight 请求，并发调用共享同一 Promise
 * - safe: 异步任务包 try/catch + 标签化 console.error，不抛出（destroy 顺序里防一处失败带崩后续）
 */

/**
 * 单飞锁：N 次并发调用同一个 fn，只触发一次执行；
 * 所有调用方拿到同一个 in-flight Promise，结束后清空槽位。
 *
 * 典型用例：
 *   - AuthStore.refreshToken（拦截器 401 / WS 认证失败 / checkAuthStatus 三路共享）
 *   - logout 流程（重复点击 / 多个失活路径 race）
 */
export type Singleflight<T> = () => Promise<T>;

export function singleflight<T>(fn: () => Promise<T>): Singleflight<T> {
  let inflight: Promise<T> | null = null;
  return () => {
    if (inflight) return inflight;
    inflight = fn().finally(() => {
      inflight = null;
    });
    return inflight;
  };
}

/**
 * 安全执行：吞错 + 标签化日志。typeof 同步/异步 fn 都接受，不返回值。
 *
 * 用于 destroy / cleanup 顺序里 —— 一段失败不应阻断后续清理步骤。
 */
export async function safe(label: string, fn: () => unknown | Promise<unknown>): Promise<void> {
  try {
    await fn();
  } catch (e) {
    console.error(`[safe] ${label}:`, e);
  }
}
