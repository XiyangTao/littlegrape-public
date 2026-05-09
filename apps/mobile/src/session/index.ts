/**
 * Session 模块统一出口
 *
 * 设计要点：
 * - SessionContainer：用户级别状态/副作用容器（每用户一个实例）
 * - registry：单例管理 + 订阅 + 写入 API
 * - useSession：React 桥
 * - storeHooks：6 个 session-scope store 的 React hook 集中桥（store 工厂保持纯粹）
 * - interceptorBridge：apiClient handler 注册（由 storeHooks 副作用 import 触发）
 *
 * 全局 vs 用户级别的分层准则：
 * - App scope（模块级 singleton，跨 user 复用）：
 *   apiClient、SQLite handle、AsyncStorage、i18n、theme、native SDK、AppStore、AuthStore、ToastStore
 * - Session scope（每 user 一个 SessionContainer 实例）：
 *   UserStore、QuotaStore、MessageStore、AssistantStore、AchievementStore、CompanionStore、
 *   WebSocket（PushChannel）、SyncManager、TanStack QueryClient
 */

export { SessionContainer } from './SessionContainer';

// 写入 API（startSession / endSession）—— 通常只 AuthStore 用
// 读取 API（tryGetSession 等）—— 业务代码任意位置使用
export {
  startSession,
  endSession,
  getSession,
  tryGetSession,
  subscribeSession,
  getSessionSnapshot,
} from './registry';

export { useSession, useRequiredSession } from './useSession';
export { SessionScope } from './SessionScope';
export { createSessionStoreHook } from './createSessionStoreHook';
export type { SessionStoreHook, SessionStoreSafeAccessor } from './createSessionStoreHook';
