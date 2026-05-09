/**
 * SessionContainer — 用户会话容器
 *
 * 持有所有"用户级别"的状态与副作用：
 * - userStore / quotaStore / messageStore / assistantStore / achievementStore / companionStore
 * - pushChannel（长连接） / 业务级 wsRegistry / syncManager / queryClient
 *
 * 生命周期：
 * - 用户登录 → registry.startSession(userId) → new SessionContainer(userId)
 * - 用户登出 → registry.endSession() → container.destroy() → 引用清除后整个对象 GC
 *
 * Token 流转：完全委托给 TokenManager，SessionContainer 不再需要 AuthBridge。
 *
 * WebSocket 工厂：业务流式 hooks（ASR / 流式 TTS / 翻译 / 同传 / 跟读评测）
 * 通过 session.openWebSocket(path) 创建 ws，自动注册到容器内 wsRegistry，
 * destroy 时一次性关闭，消除"旧用户消息抢在 cleanup 前到达 handler"的窗口。
 */

import { QueryClient } from '@tanstack/react-query';
import { API_GATEWAY_URL } from '@env';
import { createQuotaStore, type QuotaStoreApi } from '@/stores/QuotaStore';
import { createAchievementStore, type AchievementStoreApi } from '@/stores/AchievementStore';
import { createAssistantStore, type AssistantStoreApi } from '@/stores/AssistantStore';
import { createCompanionStore, type CompanionStoreApi } from '@/stores/CompanionStore';
import { createMessageStore, type MessageStoreApi } from '@/stores/MessageStore';
import { createUserStore, type UserStoreApi } from '@/stores/UserStore';
import { useToastStore } from '@/stores/ToastStore';
import * as AssistantService from '@/services/AssistantService';
import { SyncManager } from '@/sync';
import { safe } from '@/utils/concurrency';
import type { AchievementInfo } from '@/api/modules/achievement';
import type { AppNotification } from '@/types/assistant';
import { PushChannel } from './PushChannel';

const WS_BASE = (API_GATEWAY_URL || 'http://localhost:3000').replace(/^http/, 'ws');

// ==================== 推送消息类型 ====================

/**
 * 服务端推送消息的 discriminated union。
 * 服务端按 channel + type 多路分发；type guard 收窄后业务类型自动安全。
 */
type PushMessage =
  | { channel: 'achievement'; payload: AchievementInfo }
  | { channel: 'assistant'; type: 'push'; payload: AppNotification }
  | { channel: 'social'; type: 'new_follower' | 'mutual_follow'; payload: { nickname?: string } }
  | { channel: 'subscription'; type: 'updated' };

function isPushMessage(data: unknown): data is PushMessage {
  if (!data || typeof data !== 'object') return false;
  const channel = (data as { channel?: unknown }).channel;
  return channel === 'achievement' || channel === 'assistant'
    || channel === 'social' || channel === 'subscription';
}

export class SessionContainer {
  /** 当前 session 归属的用户 ID。容器实例不可变，与一次登录 1:1 绑定 */
  readonly userId: string;

  /** 配额 store（每用户独立实例） */
  readonly quotaStore: QuotaStoreApi;

  /** 成就通知 store（每用户独立实例） */
  readonly achievementStore: AchievementStoreApi;

  /** AI 助手 store（每用户独立实例） */
  readonly assistantStore: AssistantStoreApi;

  /** 伙伴对话 store（每用户独立实例） */
  readonly companionStore: CompanionStoreApi;

  /** 消息 store（每用户独立实例） */
  readonly messageStore: MessageStoreApi;

  /** 用户数据 store（每用户独立实例 —— 收藏/生词/统计/偏好等） */
  readonly userStore: UserStoreApi;

  /**
   * TanStack QueryClient（每用户独立实例）
   * session 销毁时整个 cache GC，新 session 从干净状态开始拉取
   */
  readonly queryClient: QueryClient;

  /**
   * 推送 WebSocket 长连接（每用户独立实例）
   * 内部接管心跳 / 重连 / AppState 切换 / 路由 ws 消息到本容器内 store
   */
  readonly pushChannel: PushChannel;

  /**
   * 数据同步管理器（每用户独立实例）
   */
  readonly syncManager: SyncManager;

  /**
   * Session 级 AbortController。
   * destroy 时一次性 abort：网络请求、长时间 IO、WebSocket 重连定时器都可监听这个 signal。
   */
  private readonly abortController = new AbortController();

  /** 业务级临时 WebSocket 注册表（流式 TTS / ASR / 翻译 / 同传等 hook 持有的短连接） */
  private readonly wsRegistry = new Set<WebSocket>();

  private _destroyed = false;

  constructor(userId: string) {
    if (!userId) throw new Error('[SessionContainer] userId is required');
    this.userId = userId;
    this.quotaStore = createQuotaStore(userId);
    this.achievementStore = createAchievementStore(userId);
    this.assistantStore = createAssistantStore(userId);
    this.companionStore = createCompanionStore(userId);
    this.messageStore = createMessageStore(userId);
    this.userStore = createUserStore(userId);
    this.queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 30_000,
          gcTime: 5 * 60_000,
          retry: 1,
          refetchOnWindowFocus: false,
        },
      },
    });
    this.pushChannel = new PushChannel({
      wsPath: '/ws/push',
      onMessage: (data) => this.routePushMessage(data),
      onReconnect: () => {
        this.achievementStore.getState().fetchUnread();
        this.assistantStore.getState().fetchUnreadPushes();
      },
    });
    this.syncManager = new SyncManager(userId);

    // 启动期初始化（fire-and-forget）
    this.achievementStore.getState().initProcessedIds();
    this.userStore.getState().initialize();
    this.pushChannel.start();
    // 会员/配额是 session 身份的一部分（planType / costBudget / periodEnd 等），必须在 session
    // 创建时主动拉一次，否则首页 / AI 对话页等消费侧会在 quota=null 窗口里把用户当成 free。
    // 后续维护由 WS subscription:updated 推送 + AppState 切前台 + 进套餐页主动刷新承担。
    this.quotaStore.getState().fetchQuota().catch((e) => {
      console.warn('[SessionContainer] 初始 fetchQuota 失败（会员状态待 WS / 焦点恢复）:', e);
    });

    this.syncManager.start().then(() => {
      if (this._destroyed) return;
      this.userStore.getState().reloadAfterSync();
    }).catch((e) => {
      console.error('[SessionContainer] syncManager.start failed:', e);
    });
  }

  /**
   * 推送消息分发：按 channel 路由到容器内对应 store。
   */
  private routePushMessage(data: unknown): void {
    if (!isPushMessage(data)) return;

    switch (data.channel) {
      case 'achievement':
        this.achievementStore.getState().enqueueEvent({
          xpGained: data.payload.xpReward || 0,
          levelUp: false,
          newLevel: null,
          totalXp: 0,
          newAchievements: [data.payload],
        });
        break;

      case 'assistant':
        this.assistantStore.getState().receivePush(data.payload);
        break;

      case 'social': {
        const nickname = data.payload?.nickname;
        if (data.type === 'new_follower') {
          useToastStore.getState().info(`${nickname || '有人'} 关注了你`);
        } else if (data.type === 'mutual_follow') {
          useToastStore.getState().info(`你和 ${nickname || '对方'} 成为了互关好友`);
        }
        break;
      }

      case 'subscription':
        this.quotaStore.getState().refreshQuotaSilently();
        break;
    }
  }

  /**
   * 创建一个业务级 WebSocket（自动注册到容器，destroy 时一并关闭）。
   *
   * 使用：const ws = session.openWebSocket('/ws/asr/stream?engine=azure')
   *
   * - path：以 `/` 开头的 WS 路径（host 用 API_GATEWAY_URL 替换协议头）
   * - 自动注册：close/error/cleanup 时从 registry 移除
   * - destroyed 后调用抛错（早暴露逻辑 bug）
   */
  openWebSocket(path: string): WebSocket {
    if (this._destroyed) {
      throw new Error('[SessionContainer] cannot openWebSocket after destroy');
    }
    const ws = new WebSocket(`${WS_BASE}${path}`);
    this.wsRegistry.add(ws);

    const removeFromRegistry = () => {
      this.wsRegistry.delete(ws);
    };
    // 用 addEventListener 而非 onclose —— 不与业务方设置的 onclose 互相覆盖
    if (typeof ws.addEventListener === 'function') {
      ws.addEventListener('close', removeFromRegistry);
    }

    return ws;
  }

  /** Abort 信号 —— 业务代码可挂载到 fetch / WebSocket / setTimeout 上 */
  get signal(): AbortSignal {
    return this.abortController.signal;
  }

  /** session 是否已销毁（destroy 后或新 session 已建立） */
  get isDestroyed(): boolean {
    return this._destroyed;
  }

  /**
   * 销毁 session：取消所有 in-flight 副作用，释放资源。
   *
   * 顺序：
   *   1. abort 信号触发 → 所有挂在 signal 上的网络/IO 取消
   *   2. 关业务 wsRegistry 内所有 WS（同步关，消除"旧消息抢在 cleanup 前到达"窗口）
   *   3. 关 PushChannel
   *   4. 停 SyncManager
   *   5. cancel + clear QueryClient cache
   *   6. MessageStore 清 timer / Promise 缓存防泄漏
   *   7. AssistantDB（全局表）清空
   */
  async destroy(): Promise<void> {
    if (this._destroyed) return;
    this._destroyed = true;

    await safe('SessionContainer.abort', () => this.abortController.abort());

    // 同步关业务 ws —— 不能并行，必须先解绑回调防止 close 握手期间消息触发 handler
    await safe('SessionContainer.closeBusinessWS', () => {
      const snapshot = [...this.wsRegistry];
      this.wsRegistry.clear();
      for (const ws of snapshot) {
        try {
          ws.onmessage = null;
          ws.onclose = null;
          ws.onerror = null;
          ws.close();
        } catch {
          /* ignore */
        }
      }
    });

    await safe('SessionContainer.pushChannel.stop', () => this.pushChannel.stop());
    await safe('SessionContainer.syncManager.stop', () => this.syncManager.stop());
    await safe('SessionContainer.queryClient.cleanup', async () => {
      await this.queryClient.cancelQueries();
      this.queryClient.clear();
    });
    await safe('SessionContainer.messageStore.disposeAll', () =>
      this.messageStore.getState().disposeAll(),
    );
    await safe('SessionContainer.clearLocalData', () => AssistantService.clearLocalData());
  }
}
