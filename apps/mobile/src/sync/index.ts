/**
 * 统一同步模块
 *
 * 生命周期由 SessionContainer 管理：
 *   - constructor: new SyncManager(userId).start()
 *   - destroy: syncManager.stop()
 *
 * 业务代码不应直接调用 SyncManager —— 通过 store action 间接触发同步。
 */

export { SyncManager } from './SyncManager';
export type { SyncState } from './SyncManager';
export type { Syncer, SyncStrategy } from './types';

// saveVocabularyTestResult 保留在 syncers 中供 UserStore 使用
export { saveVocabularyTestResult } from './syncers/VocabularyTestSyncer';
