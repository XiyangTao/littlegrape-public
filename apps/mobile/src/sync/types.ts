/**
 * 同步模块类型定义
 */

/** 同步策略 */
export type SyncStrategy = 'local-first' | 'remote-first' | 'merge';

/**
 * 推送模式
 * - 'push-loop': 由 SyncManager 定时轮询调用 push()，适合高频批量数据（如学习进度、事件）
 * - 'outbox': 操作时写入 Outbox 队列，由 OutboxProcessor 统一消费，适合离散操作（如收藏、词库）
 * - 'pull-only': 仅拉取，不推送（如每日统计由 EventsSyncer 附带推送）
 */
export type PushMode = 'push-loop' | 'outbox' | 'pull-only';

/** 同步器接口 */
export interface Syncer {
  /** 同步器名称 */
  name: string;

  /** 优先级（数字越小越先执行） */
  priority: number;

  /** 同步策略 */
  strategy: SyncStrategy;

  /**
   * 推送模式
   * - 'push-loop': 需提供 push() 方法，SyncManager 每 3 秒轮询调用
   * - 'outbox': 操作时写入 sync_outbox 表，由 OutboxProcessor 消费
   * - 'pull-only': 仅在 initSync 时拉取数据
   */
  pushMode: PushMode;

  /** 初始化同步（首次/重装后调用） */
  initSync: (userId: string) => Promise<void>;

  /** 增量同步（日常使用，可选） */
  incrementalSync?: (userId: string, lastSyncAt: number) => Promise<void>;

  /** 推送本地变更到服务端（仅 pushMode='push-loop' 时需要） */
  push?: (userId: string) => Promise<void>;

  /** 获取本地最后同步时间（可选） */
  getLastSyncAt?: (userId: string) => Promise<number | null>;
}
