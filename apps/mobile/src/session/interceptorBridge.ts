/**
 * API 拦截器桥接 —— 把 apiClient 的 piggyback / 429 / toast 等 handler
 * 路由到当前 session 的对应 store。
 *
 * 集中在这里以让 store 工厂文件保持纯粹（只导出 factory + 类型）。
 *
 * 加载触发：通过 `session/storeHooks` 顶部 side-effect import 自动执行 ——
 * 调用方走 `@/stores` barrel 时自动加载本文件，handler 注册无需在 App.tsx 显式触发。
 */

import { AppState, AppStateStatus } from 'react-native';
import { apiClient } from '@/api';
import { tryGetSession } from './registry';
import { useToastStore } from '@/stores/ToastStore';
import type { UsageSummary } from '@/api/modules/quota';

// ==================== piggyback / 429 / toast handler 注册 ====================

// 拦截器：成就事件 —— 路由到当前 session；无 session 静默 noop
apiClient.setAchievementHandler((event) => {
  tryGetSession()?.achievementStore.getState().enqueueEvent(event);
});

// 拦截器：429 配额超限 —— skipPrompt 时只刷新不弹 modal
apiClient.setQuotaHandler((skipPrompt) => {
  const store = tryGetSession()?.quotaStore.getState();
  if (!store) return;
  if (skipPrompt) {
    store.refreshQuotaSilently();
  } else {
    store.triggerExceededModal();
  }
});

// 拦截器：piggyback 用量（仅用量维度，不含会员字段）
apiClient.setUsagePiggybackHandler((usage) => {
  tryGetSession()?.quotaStore.getState().updateUsage(usage as UsageSummary);
});

// 拦截器：toast（App scope，不需要路由 session）
apiClient.setToastHandler((message, type) => {
  useToastStore.getState().show({ message, type });
});

// 反向注入：session abort signal —— 让 App scope 的 client 不直接 import session 模块，
// 破除 client.ts → registry.ts → SessionContainer.ts → store → api/index.ts 的循环依赖。
apiClient.setSessionSignalProvider(() => tryGetSession()?.signal);

// ==================== AppState 监听（前后台切换刷新 quota） ====================

let appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;

export const setupQuotaAppStateListener = () => {
  if (appStateSubscription) return;
  let lastAppState: AppStateStatus = AppState.currentState;
  appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
    if (lastAppState.match(/inactive|background/) && nextAppState === 'active') {
      // App 从后台恢复，静默刷新当前 session 的配额（无 session 自然 noop）
      tryGetSession()?.quotaStore.getState().refreshQuotaSilently();
    }
    lastAppState = nextAppState;
  });
};

export const removeQuotaAppStateListener = () => {
  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }
};
