/**
 * Session-scope store React hooks —— 集中桥接点。
 *
 * 设计原则：
 * - store 工厂文件 (`stores/XxxStore.ts`) 保持纯粹：只导出 `createXxxStore` 和类型，不 import 任何 `@/session/*`
 * - 所有 React hook（useXxxStore / 便捷 hook）集中在此 —— 从这里 import session 桥
 * - 这样 store 工厂 → session 单向无环；调用方从 `@/stores` barrel 拿 hook，无感
 *
 * 同时副作用 import `./interceptorBridge` —— 让从 storeHooks 走的 barrel 调用方
 * 自动触发 apiClient handler 注册（无需在 App.tsx 里手动 import）。
 */

import './interceptorBridge';

import { createSessionStoreHook } from './createSessionStoreHook';

import type { UserStore } from '@/stores/UserStore';
import type { QuotaStore } from '@/stores/QuotaStore';
import type { AchievementStore } from '@/stores/AchievementStore';
import type { AssistantStore } from '@/stores/AssistantStore';
import type { CompanionStore } from '@/stores/CompanionStore';
import type { MessageStore } from '@/stores/MessageStore';
import type { Message } from '@/types/conversation';

// ==================== 6 个 session-scope store 的 React hook ====================

const userHook = createSessionStoreHook<UserStore>(s => s.userStore);
export const useUserStore = userHook.useStore;
export const getUserStoreState = userHook.getStateSafe;

const quotaHook = createSessionStoreHook<QuotaStore>(s => s.quotaStore);
export const useQuotaStore = quotaHook.useStore;
export const getQuotaStoreState = quotaHook.getStateSafe;

const achievementHook = createSessionStoreHook<AchievementStore>(s => s.achievementStore);
export const useAchievementStore = achievementHook.useStore;
export const getAchievementStoreState = achievementHook.getStateSafe;

const assistantHook = createSessionStoreHook<AssistantStore>(s => s.assistantStore);
export const useAssistantStore = assistantHook.useStore;
export const getAssistantStoreState = assistantHook.getStateSafe;

const companionHook = createSessionStoreHook<CompanionStore>(s => s.companionStore);
export const useCompanionStore = companionHook.useStore;

const messageHook = createSessionStoreHook<MessageStore>(s => s.messageStore);
export const useMessageStore = messageHook.useStore;

// ==================== 便捷 hook ====================

// ------ User ------

export const useUserStats = () => {
  const favoriteCount = useUserStore((s) => s.favoriteCount);
  const difficultCount = useUserStore((s) => s.difficultCount);
  const todayStats = useUserStore((s) => s.todayStats);
  const overviewStats = useUserStore((s) => s.overviewStats);
  const incrementFavoriteCount = useUserStore((s) => s.incrementFavoriteCount);
  const decrementFavoriteCount = useUserStore((s) => s.decrementFavoriteCount);
  const incrementDifficultCount = useUserStore((s) => s.incrementDifficultCount);
  const decrementDifficultCount = useUserStore((s) => s.decrementDifficultCount);
  const updateTodayStats = useUserStore((s) => s.updateTodayStats);

  return {
    favoriteCount,
    difficultCount,
    todayStats,
    overviewStats,
    incrementFavoriteCount,
    decrementFavoriteCount,
    incrementDifficultCount,
    decrementDifficultCount,
    updateTodayStats,
  };
};

export const useCurrentLibrary = () => {
  const currentLibraryTag = useUserStore((s) => s.currentLibraryTag);
  const setCurrentLibraryTag = useUserStore((s) => s.setCurrentLibraryTag);
  return { currentLibraryTag, setCurrentLibraryTag };
};

export const useVocabularyTest = () => {
  const vocabularyTest = useUserStore((s) => s.vocabularyTest);
  const hasVocabularyTest = useUserStore((s) => s.hasVocabularyTest);
  const shouldRetestVocabulary = useUserStore((s) => s.shouldRetestVocabulary);
  const getWordsToNextLevel = useUserStore((s) => s.getWordsToNextLevel);
  const saveVocabularyTestResult = useUserStore((s) => s.saveVocabularyTestResult);

  return {
    vocabularyTest,
    hasVocabularyTest,
    shouldRetestVocabulary,
    getWordsToNextLevel,
    saveVocabularyTestResult,
  };
};

// ------ Quota ------

export const useQuota = () => {
  const quota = useQuotaStore((s) => s.quota);
  const isLoading = useQuotaStore((s) => s.isLoading);
  const fetchQuota = useQuotaStore((s) => s.fetchQuota);
  return { quota, isLoading, fetchQuota };
};

// ------ Assistant ------

export const useAssistantUnread = () => {
  const unreadCount = useAssistantStore((s) => s.unreadCount);
  const latestPush = useAssistantStore((s) => s.latestPush);
  return { unreadCount, latestPush };
};

// ------ Companion ------

export const useCompanionMessages = () => useCompanionStore((s) => s.messages);
export const useCompanionSending = () => useCompanionStore((s) => s.sendingStatus);
export const useCompanionTyping = () => useCompanionStore((s) => s.isTyping);

// ------ Message ------

/** 空数组常量，避免每次返回新引用导致无限循环 */
const EMPTY_MESSAGES: Message[] = [];

export const useSessionMessages = (sessionId: string) => {
  const messages = useMessageStore((s) => s.sessions[sessionId]?.messages ?? EMPTY_MESSAGES);
  const sendingStatus = useMessageStore((s) => s.sessions[sessionId]?.sendingStatus ?? 'idle');
  const error = useMessageStore((s) => s.sessions[sessionId]?.error);

  return {
    messages,
    sendingStatus,
    isTyping: sendingStatus === 'sending',
    error,
  };
};
