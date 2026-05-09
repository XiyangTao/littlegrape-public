/**
 * 统一同步管理器（Session scope）
 *
 * 每个 SessionContainer 持有一个 SyncManager 实例，跟用户登录会话同生命周期：
 *   - SessionContainer.constructor → new SyncManager(userId).start()
 *   - SessionContainer.destroy → syncManager.stop()
 *
 * 内部状态（state / failCounts / push timers）一律实例字段，无模块级残留。
 */

import NetInfo from '@react-native-community/netinfo';
import type { Syncer } from './types';
import { processOutbox } from './OutboxProcessor';
import { FavoritesSyncer } from './syncers/FavoritesSyncer';
import { DifficultSyncer } from './syncers/DifficultSyncer';
import { DailyStatsSyncer } from './syncers/DailyStatsSyncer';
import { EventsSyncer } from './syncers/EventsSyncer';
import { VocabularyTestSyncer } from './syncers/VocabularyTestSyncer';
import { WordProgressSyncer } from './syncers/WordProgressSyncer';
import { PhonemeProgressSyncer } from './syncers/PhonemeProgressSyncer';

// ==================== Syncer 注册 ====================

/** 所有 Syncer 按优先级排序 */
const syncers: Syncer[] = [
  WordProgressSyncer, // 学习进度同步，优先级 5
  PhonemeProgressSyncer, // 音素进度同步，优先级 6
  FavoritesSyncer,
  DifficultSyncer,
  DailyStatsSyncer, // 每日统计同步，优先级 10（只拉取）
  EventsSyncer, // 学习事件同步，优先级 11（拉取 + 推送）
  VocabularyTestSyncer,
].sort((a, b) => a.priority - b.priority);

// ==================== 状态类型 ====================

export interface SyncState {
  isInitializing: boolean;
  isPushing: boolean;
  lastSyncAt: number | null;
  error: string | null;
  /** 初始化失败的 Syncer 名称列表 */
  failedSyncers: string[];
}

const EMPTY_STATE: SyncState = {
  isInitializing: false,
  isPushing: false,
  lastSyncAt: null,
  error: null,
  failedSyncers: [],
};

const PUSH_INTERVAL = 3 * 1000;
const MAX_CONSECUTIVE_FAILURES = 3;
const FAIL_RESET_INTERVAL = 5 * 60 * 1000;

// ==================== Class ====================

export class SyncManager {
  readonly userId: string;
  state: SyncState = { ...EMPTY_STATE };
  private pushIntervalTimer: ReturnType<typeof setInterval> | null = null;
  private failResetTimer: ReturnType<typeof setInterval> | null = null;
  private failCounts = new Map<string, number>();
  private stopped = false;

  constructor(userId: string) {
    if (!userId) throw new Error('[SyncManager] userId is required');
    this.userId = userId;
  }

  /**
   * 启动初始化 + 后续 push loop。fire-and-forget：调用方无需 await，
   * 内部按优先级跑 Syncer.initSync，单个失败不阻塞其他，全部完成后启动定时 push 循环。
   */
  start(): Promise<void> {
    return this.runInit();
  }

  stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    this.stopPushLoop();
    this.failCounts.clear();
    this.state = { ...EMPTY_STATE };
    if (__DEV__) console.log('[SyncManager] 已停止同步');
  }

  /** 手动触发推送（操作后立即同步用） */
  async triggerPush(): Promise<void> {
    if (this.stopped) return;
    await this.pushIfNeeded();
  }

  // ==================== 内部 ====================

  private async runInit(): Promise<void> {
    if (this.state.isInitializing || this.stopped) return;

    this.state.isInitializing = true;
    this.state.error = null;
    this.state.failedSyncers = [];

    try {
      if (__DEV__) console.log('[SyncManager] 开始初始化同步...');
      const failed: string[] = [];

      for (const syncer of syncers) {
        if (this.stopped) return;
        try {
          if (__DEV__) console.log(`[SyncManager] 执行 ${syncer.name} 初始化...`);
          await syncer.initSync(this.userId);
        } catch (error) {
          console.error(`[SyncManager] ${syncer.name} 初始化失败:`, error);
          failed.push(syncer.name);
        }
      }

      this.state.failedSyncers = failed;
      this.state.lastSyncAt = Date.now();

      if (failed.length > 0) {
        this.state.error = `${failed.length} 个同步器初始化失败: ${failed.join(', ')}`;
        console.warn(`[SyncManager] 初始化部分失败: ${failed.join(', ')}`);
      } else {
        if (__DEV__) console.log('[SyncManager] 初始化同步完成');
      }
    } catch (error) {
      console.error('[SyncManager] 初始化同步失败:', error);
      this.state.error = error instanceof Error ? error.message : '初始化同步失败';
    } finally {
      this.state.isInitializing = false;
    }

    if (this.stopped) return;
    this.startPushLoop();
  }

  private startPushLoop(): void {
    this.stopPushLoop();

    this.pushIntervalTimer = setInterval(async () => {
      await this.pushIfNeeded();
    }, PUSH_INTERVAL);

    this.failResetTimer = setInterval(() => {
      this.failCounts.clear();
    }, FAIL_RESET_INTERVAL);

    if (__DEV__) console.log('[SyncManager] 已启动推送循环');
  }

  private stopPushLoop(): void {
    if (this.pushIntervalTimer) {
      clearInterval(this.pushIntervalTimer);
      this.pushIntervalTimer = null;
    }
    if (this.failResetTimer) {
      clearInterval(this.failResetTimer);
      this.failResetTimer = null;
    }
  }

  /**
   * 检查网络并执行推送
   *
   * 防 setInterval 闭包陷阱：tick fire 后 stop 已无法打断本轮回调，
   * 这里在每个 IO 边界前检查 this.stopped，立刻退出。
   */
  private async pushIfNeeded(): Promise<void> {
    if (this.stopped || this.state.isPushing) return;

    try {
      const netState = await NetInfo.fetch();
      if (this.stopped || !netState.isConnected) return;

      this.state.isPushing = true;

      for (const syncer of syncers) {
        if (this.stopped) return;
        if (syncer.pushMode === 'push-loop' && syncer.push) {
          if ((this.failCounts.get(syncer.name) || 0) >= MAX_CONSECUTIVE_FAILURES) {
            continue;
          }
          try {
            await syncer.push(this.userId);
            this.failCounts.delete(syncer.name);
          } catch (error) {
            console.error(`[SyncManager] ${syncer.name} 推送失败:`, error);
            this.failCounts.set(syncer.name, (this.failCounts.get(syncer.name) || 0) + 1);
          }
        }
      }

      if (this.stopped) return;
      try {
        await processOutbox(this.userId);
      } catch (error) {
        console.error('[SyncManager] Outbox 处理失败:', error);
      }
    } catch (error) {
      console.error('[SyncManager] 推送检查失败:', error);
    } finally {
      this.state.isPushing = false;
    }
  }
}
