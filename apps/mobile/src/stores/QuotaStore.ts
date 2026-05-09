/**
 * 配额 Store（Session scope）—— 纯工厂，不感知 session
 *
 * 本文件只导出：
 *   - `createQuotaStore(userId)` 工厂（由 SessionContainer 调用）
 *   - `QuotaStore` 类型 / `QuotaStoreApi` 类型
 *
 * React hook（useQuotaStore / useQuota）和 apiClient handler 注册集中在
 * `@/session/storeHooks` 和 `@/session/interceptorBridge` —— 不在此 import `@/session/*`，
 * 从根上消除 store ↔ session 的双向运行时依赖。
 */

import { create } from 'zustand';
import { apiClient } from '@/api';
import type { QuotaStatus, QuotaCheckResult, UsageSummary } from '@/api/modules/quota';

// ==================== 类型定义 ====================

interface QuotaState {
  quota: QuotaStatus | null;
  isLoading: boolean;
  showExceededModal: boolean;
}

interface QuotaActions {
  /** 获取配额状态 */
  fetchQuota: () => Promise<void>;
  /** 静默刷新配额（不设 isLoading） */
  refreshQuotaSilently: () => Promise<void>;
  /** 检查配额是否可用 */
  checkQuota: () => Promise<QuotaCheckResult>;
  /**
   * 从 API 响应 piggyback 更新用量字段（仅用量，不动会员）。
   *
   * 会员维度（planType / costBudget / periodEnd / isTrial 等）由 fetchQuota 权威路径
   * 和 WS subscription:updated 推送独立维护，piggyback 不会侵蚀这些字段。
   */
  updateUsage: (usage: UsageSummary) => void;
  /** 触发配额超限弹窗 */
  triggerExceededModal: () => void;
  /** 关闭配额超限弹窗 */
  dismissExceededModal: () => void;
}

export type QuotaStore = QuotaState & QuotaActions;

// ==================== 初始状态 ====================

const initialState: QuotaState = {
  quota: null,
  isLoading: false,
  showExceededModal: false,
};

// ==================== Store 工厂 ====================

/**
 * 创建 Session 级 Quota store。由 SessionContainer 在 constructor 中调用。
 *
 * userId 当前未在闭包内使用 —— 网络请求自动带 token（apiClient 拦截器），
 * 但保留参数签名以便未来需要按用户做差异化逻辑（埋点 / 调试日志）。
 */
export function createQuotaStore(_userId: string) {
  /**
   * 每实例独立的单飞锁：防 React StrictMode 双跑、多组件并发调用、429 piggyback 与首屏 fetch 并发等场景
   * 重复发出 N 次 GET /quota。跨用户语义已由 SessionContainer 隔离 —— 销毁旧 store 后这个 closure 整体 GC。
   */
  let inFlightFetch: Promise<void> | null = null;

  async function doFetchQuota(
    set: (state: Partial<QuotaState>) => void,
    withLoading: boolean,
  ): Promise<void> {
    if (withLoading) set({ isLoading: true });
    try {
      const response = await apiClient.getQuotaStatus();
      if (response.success && response.data) {
        set({ quota: response.data });
      }
    } catch (error) {
      console.error('[QuotaStore] 获取配额状态失败:', error);
    } finally {
      if (withLoading) set({ isLoading: false });
    }
  }

  return create<QuotaStore>()((set, get) => ({
    ...initialState,

    fetchQuota: async () => {
      if (inFlightFetch) return inFlightFetch;
      inFlightFetch = doFetchQuota(set, /* withLoading */ true).finally(() => {
        inFlightFetch = null;
      });
      return inFlightFetch;
    },

    refreshQuotaSilently: async () => {
      if (inFlightFetch) return inFlightFetch;
      inFlightFetch = doFetchQuota(set, /* withLoading */ false).finally(() => {
        inFlightFetch = null;
      });
      return inFlightFetch;
    },

    checkQuota: async () => {
      try {
        const response = await apiClient.checkQuotaAvailable();
        if (response.success && response.data) {
          return response.data;
        }
        return { available: true };
      } catch (error) {
        console.error('[QuotaStore] 检查配额失败:', error);
        return { available: true };
      }
    },

    updateUsage: (usage: UsageSummary) => {
      const current = get().quota;
      if (!current) return;
      set({
        quota: {
          ...current,
          quotaStatus: usage.quotaStatus,
          usagePercentage: usage.usagePercentage,
          costConsumed: usage.costConsumed,
        },
      });
    },

    triggerExceededModal: () => {
      // 弹窗正在显示时不重复触发（防止并发 429 导致闪烁）
      if (get().showExceededModal) return;
      set({ showExceededModal: true });
      get().refreshQuotaSilently();
    },

    dismissExceededModal: () => {
      set({ showExceededModal: false });
    },
  }));
}

export type QuotaStoreApi = ReturnType<typeof createQuotaStore>;
