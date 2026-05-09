/**
 * 成就通知 Store（Session scope）—— 纯工厂，不感知 session
 *
 * 本文件只导出 `createAchievementStore` 工厂和类型。React hook 和 apiClient handler 注册
 * 集中在 `@/session/storeHooks` 和 `@/session/interceptorBridge`。
 *
 * 保留：processedIds 按 userId 分桶持久化（AsyncStorage key 含 userId），同用户重登可复用去重记录。
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '@/api';
import { navigationRef } from '@/navigation/navigationRef';
import type {
  AchievementInfo,
  AchievementEventResult,
  StatsSnapshot,
} from '@/api/modules/achievement';

/** 历史全局键（旧版本写入），新版本只读不写 — 启动时一次性清理迁移残留
 *
 * TODO(v1.3+): 大部分用户已升级，可删除 LEGACY_PROCESSED_IDS_KEY 及 initProcessedIds 中的清理逻辑。
 */
const LEGACY_PROCESSED_IDS_KEY = '@achievement_processed_ids';
/** 按 userId 分桶的存储键 */
const getProcessedIdsKey = (userId: string) => `@achievement_processed_ids_${userId}`;
const MAX_PROCESSED_IDS = 500;

/** 检查当前是否在首页 */
function isOnHomeScreen(): boolean {
  if (!navigationRef.isReady()) return false;
  return navigationRef.getCurrentRoute()?.name === 'Home';
}

async function loadProcessedIds(userId: string): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(getProcessedIdsKey(userId));
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveProcessedIds(userId: string, ids: Set<string>): void {
  const arr = Array.from(ids);
  const trimmed = arr.length > MAX_PROCESSED_IDS ? arr.slice(-MAX_PROCESSED_IDS) : arr;
  AsyncStorage.setItem(getProcessedIdsKey(userId), JSON.stringify(trimmed)).catch(() => {});
}

// 重新导出类型供外部使用
export type { AchievementEventResult, StatsSnapshot };

interface AchievementState {
  pendingEvents: AchievementInfo[];
  currentAchievement: AchievementInfo | null;
  showModal: boolean;
  lastStatsSnapshot: StatsSnapshot | null;
  /** 已处理过的成就 ID 集合，防止重复弹窗 */
  processedIds: Set<string>;
}

interface AchievementActions {
  /** 启动初始化 —— 由 SessionContainer constructor 触发一次，从 AsyncStorage 恢复 processedIds */
  initProcessedIds: () => Promise<void>;
  /** Axios interceptor / WS 调用，入队成就事件（自动去重） */
  enqueueEvent: (event: AchievementEventResult) => void;
  /** 从服务端拉取未读通知并入队 */
  fetchUnread: () => Promise<void>;
  /** 展示下一个成就 */
  showNext: () => void;
  /** 关闭弹窗，500ms 后展示下一个 */
  dismiss: () => void;
  /** 导航到首页时调用，尝试展示队列中的成就 */
  onNavigateToHome: () => void;
}

export type AchievementStore = AchievementState & AchievementActions;

// ==================== 初始状态 ====================

const initialState: AchievementState = {
  pendingEvents: [],
  currentAchievement: null,
  showModal: false,
  lastStatsSnapshot: null,
  processedIds: new Set(),
};

// ==================== Store 工厂 ====================

export function createAchievementStore(userId: string) {
  // 实例级单飞锁：防 React StrictMode 双跑 / 多组件并发调用
  // 跨用户防御已不需要 —— 每实例只属于一个 userId
  let initPromise: Promise<void> | null = null;

  return create<AchievementStore>()((set, get) => ({
    ...initialState,

    initProcessedIds: async () => {
      if (initPromise) return initPromise;
      initPromise = (async () => {
        // 一次性清理历史全局键残留（旧版本写入），新版按 userId 分桶
        AsyncStorage.removeItem(LEGACY_PROCESSED_IDS_KEY).catch(() => {});
        const ids = await loadProcessedIds(userId);
        set({ processedIds: ids });
      })();
      return initPromise;
    },

    enqueueEvent: (event) => {
      // 始终存储最新的 statsSnapshot（即使没有新成就）
      if (event.statsSnapshot) {
        set({ lastStatsSnapshot: event.statsSnapshot });
      }

      if (!event.newAchievements || event.newAchievements.length === 0) return;

      const { processedIds } = get();
      const newItems = event.newAchievements.filter(a => !processedIds.has(a.id));
      if (newItems.length === 0) return;

      const updatedIds = new Set(processedIds);
      for (const item of newItems) {
        updatedIds.add(item.id);
      }

      set((state) => ({
        pendingEvents: [...state.pendingEvents, ...newItems],
        processedIds: updatedIds,
      }));

      saveProcessedIds(userId, updatedIds);
      apiClient.markNotificationsRead(newItems.map(a => a.id)).catch(() => {});

      if (!get().showModal) {
        get().showNext();
      }
    },

    fetchUnread: async () => {
      // 等 init 把 processedIds 读出来再走去重
      if (initPromise) {
        try { await initPromise; } catch { /* 失败保持空集，影响小 */ }
      }
      try {
        const res = await apiClient.getUnreadNotifications();
        if (!res.success || !res.data || res.data.length === 0) return;

        const notifications = res.data;
        const { processedIds } = get();

        // 收集所有未读的 achievementId（用于 ACK 补偿）
        const allAchievementIds: string[] = notifications.map(n => n.achievementId);

        const newItems: AchievementInfo[] = [];

        for (const n of notifications) {
          if (processedIds.has(n.achievementId)) continue;

          const p = n.payload || {};
          newItems.push({
            id: n.achievementId,
            name: { 'zh-CN': p.nameZh || '???', en: p.nameEn || '???' },
            description: { 'zh-CN': p.descriptionZh || '', en: p.descriptionEn || '' },
            icon: p.icon || 'star',
            category: p.category || 'learning',
            xpReward: p.xpReward || 0,
            unlocked: true,
            unlockedAt: n.createdAt,
            progress: null,
            tier: p.tier,
            seriesCode: p.seriesCode,
            isHidden: p.isHidden,
          });
        }

        if (newItems.length > 0) {
          const updatedIds = new Set(processedIds);
          for (const item of newItems) {
            updatedIds.add(item.id);
          }

          set((state) => ({
            pendingEvents: [...state.pendingEvents, ...newItems],
            processedIds: updatedIds,
          }));

          saveProcessedIds(userId, updatedIds);

          if (!get().showModal) {
            get().showNext();
          }
        }

        // ACK：用 achievementIds 标记服务端已读（包含所有未读项，补偿之前 ACK 失败的情况）
        if (allAchievementIds.length > 0) {
          apiClient.markNotificationsRead(allAchievementIds).catch(e => {
            if (__DEV__) console.warn('[AchievementStore] 标记通知已读失败:', e);
          });
        }
      } catch (error) {
        if (__DEV__) console.warn('[AchievementStore] 拉取未读通知失败:', error);
      }
    },

    showNext: () => {
      const { pendingEvents } = get();
      if (pendingEvents.length === 0) {
        set({ currentAchievement: null, showModal: false });
        return;
      }

      // 只在首页展示，避免动画冲突
      if (!isOnHomeScreen()) return;

      const [next, ...rest] = pendingEvents;
      set({
        currentAchievement: next,
        pendingEvents: rest,
        showModal: true,
      });
    },

    dismiss: () => {
      set({ showModal: false });
      // 500ms 后展示下一个
      setTimeout(() => {
        get().showNext();
      }, 500);
    },

    onNavigateToHome: () => {
      const { showModal, pendingEvents } = get();
      if (!showModal && pendingEvents.length > 0) {
        get().showNext();
      }
    },
  }));
}

export type AchievementStoreApi = ReturnType<typeof createAchievementStore>;
