/**
 * 用户数据 Store（Session scope）—— 纯工厂，不感知 session
 *
 * 本文件只导出 `createUserStore` 工厂和类型。React hook 集中在 `@/session/storeHooks`。
 *
 * 每个 SessionContainer 持有一个独立实例 —— 跟用户登录会话同生命周期。
 * currentLibraryTag / learnSortMode 按 userId 分桶持久化（AsyncStorage key 含 userId）
 * —— 同用户重登可恢复偏好；异用户登录从 0 加载。
 *
 * 数据同步由 SessionContainer.syncManager 统一调度 ——
 * initialize 只负责本地加载；SessionContainer 在 sync 完成后回调 reloadAfterSync()。
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getFavoriteCount,
  getDifficultCount,
  getVocabularyTestResult,
  type VocabularyTestRecord,
} from '@/db/WordDB';
import {
  learnWord as learnWordService,
  masterWord as masterWordService,
  skipWord as skipWordService,
} from '@/services/LearningService';
import { saveVocabularyTestResult as saveVocabTest } from '@/sync';
import {
  addFavorite as addFavoriteSync,
  removeFavorite as removeFavoriteSync,
} from '@/services/FavoriteService';
import {
  recordWrongAnswer as recordWrongSync,
  recordCorrectAnswer as recordCorrectSync,
} from '@/services/DifficultService';
import {
  getTodayStats as getLocalTodayStats,
  getOverviewStats as getLocalOverviewStats,
  recordWordLearned as recordLearned,
  recordWordMastered as recordMastered,
} from '@/services/StatsService';
import type { VocabularyTestResult } from '@/services/VocabularyTestService';
import { VOCABULARY_LEVELS } from '@/services/VocabularyTestService';
// ==================== 类型定义 ====================

/** 今日学习统计 */
export interface TodayStats {
  learnedCount: number;
  masteredCount: number;
  reviewedCount: number;
  phonemePracticedCount: number;
}

/** 总体学习统计 */
export interface OverviewStats {
  totalLearned: number;
  totalMastered: number;
  totalDays: number;
  streakDays: number;
}

/** 用户状态（只读数据） */
interface UserState {
  /** 当前用户 ID */
  userId: string;
  /** 是否已初始化 */
  isInitialized: boolean;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 当前学习的词库 tag */
  currentLibraryTag: string | null;
  /** 学新词排序模式 */
  learnSortMode: 'smart' | 'alphabetical' | 'random';
  /** 收藏数量 */
  favoriteCount: number;
  /** 生词本数量 */
  difficultCount: number;
  /** 今日学习统计 */
  todayStats: TodayStats;
  /** 总体学习统计 */
  overviewStats: OverviewStats;
  /** 词汇量测试结果 */
  vocabularyTest: VocabularyTestRecord | null;
}

interface UserActions {
  /** 启动初始化（由 SessionContainer constructor 触发） */
  initialize: () => Promise<void>;
  /** sync 完成后回调（由 SessionContainer 在 syncManager.start() 完成时调用） */
  reloadAfterSync: () => Promise<void>;
  /** 刷新（下拉刷新时调用） */
  refresh: () => Promise<void>;
  /** 从本地刷新统计（不调用服务端） */
  refreshStatsFromLocal: () => Promise<void>;

  // ------ 收藏 ------
  addFavorite: (wordId: string) => Promise<void>;
  removeFavorite: (wordId: string) => Promise<void>;
  incrementFavoriteCount: () => void;
  decrementFavoriteCount: () => void;

  // ------ 生词本 ------
  recordWrongAnswer: (wordId: string) => Promise<void>;
  recordCorrectAnswer: (wordId: string) => Promise<void>;
  incrementDifficultCount: () => void;
  decrementDifficultCount: () => void;

  // ------ 学习统计 ------
  updateTodayStats: (updates: Partial<TodayStats>) => void;
  learnWord: (wordId: string) => Promise<boolean>;
  masterWord: (wordId: string) => Promise<boolean>;
  skipWord: (wordId: string) => Promise<void>;

  // ------ 词库 ------
  setCurrentLibraryTag: (tag: string) => Promise<void>;
  setLearnSortMode: (mode: 'smart' | 'alphabetical' | 'random') => Promise<void>;

  // ------ 词汇量测试 ------
  saveVocabularyTestResult: (result: VocabularyTestResult) => Promise<void>;
  hasVocabularyTest: () => boolean;
  shouldRetestVocabulary: () => boolean;
  getWordsToNextLevel: () => { nextLevel: string; wordsNeeded: number } | null;
}

export type UserStore = UserState & UserActions;

// ==================== 默认值 ====================

const defaultTodayStats: TodayStats = {
  learnedCount: 0,
  masteredCount: 0,
  reviewedCount: 0,
  phonemePracticedCount: 0,
};

const defaultOverviewStats: OverviewStats = {
  totalLearned: 0,
  totalMastered: 0,
  totalDays: 0,
  streakDays: 0,
};

const getLibraryTagKey = (userId: string) => `@currentLibraryTag_${userId}`;
const getLearnSortModeKey = (userId: string) => `@learnSortMode_${userId}`;

// ==================== Store 工厂 ====================

export function createUserStore(userId: string) {
  /** 实例级初始化单飞锁（防 React StrictMode 双跑） */
  let initPromise: Promise<void> | null = null;

  return create<UserStore>()((set, get) => ({
    userId,
    isInitialized: false,
    isLoading: false,
    currentLibraryTag: null,
    learnSortMode: 'smart',
    favoriteCount: 0,
    difficultCount: 0,
    todayStats: defaultTodayStats,
    overviewStats: defaultOverviewStats,
    vocabularyTest: null,

    initialize: async () => {
      if (initPromise) return initPromise;
      initPromise = (async () => {
        set({ isLoading: true });

        try {
          // 0. 从 AsyncStorage 读取持久化偏好（按 userId 分桶）
          const [savedTag, savedSortMode] = await Promise.all([
            AsyncStorage.getItem(getLibraryTagKey(userId)),
            AsyncStorage.getItem(getLearnSortModeKey(userId)),
          ]);
          if (savedTag) {
            set({ currentLibraryTag: savedTag });
          }
          if (savedSortMode) {
            set({ learnSortMode: savedSortMode as 'smart' | 'alphabetical' | 'random' });
          }

          // 1. 先从本地加载数据（立即显示）
          await Promise.all([
            loadUserStats(userId, set),
            loadVocabularyTest(userId, set),
          ]);
          set({ isInitialized: true });

          // 2. 不在此处调度 sync —— 由 SessionContainer.syncManager 统一管理。
          //    sync 完成后 SessionContainer 会调 reloadAfterSync() 触发本 store reload。
        } catch (error) {
          console.error('[UserStore] 初始化失败:', error);
        } finally {
          set({ isLoading: false });
        }
      })();
      return initPromise;
    },

    reloadAfterSync: async () => {
      try {
        await Promise.all([
          loadUserStats(userId, set),
          loadVocabularyTest(userId, set),
        ]);
      } catch (error) {
        console.error('[UserStore] reloadAfterSync 失败:', error);
      }
    },

    refresh: async () => {
      set({ isLoading: true });
      try {
        await loadStatsFromLocal(userId, set);
        await reloadCounts(userId, set);
      } catch (error) {
        console.error('[UserStore] 刷新失败:', error);
      } finally {
        set({ isLoading: false });
      }
    },

    refreshStatsFromLocal: async () => {
      try {
        await loadStatsFromLocal(userId, set);
      } catch (error) {
        console.error('[UserStore] 刷新本地统计失败:', error);
      }
    },

    // ====== 收藏操作 ======

    addFavorite: async (wordId: string) => {
      await addFavoriteSync(userId, wordId);
      set((state) => ({ favoriteCount: state.favoriteCount + 1 }));
    },

    removeFavorite: async (wordId: string) => {
      await removeFavoriteSync(userId, wordId);
      set((state) => ({ favoriteCount: Math.max(0, state.favoriteCount - 1) }));
    },

    incrementFavoriteCount: () => {
      set((state) => ({ favoriteCount: state.favoriteCount + 1 }));
    },

    decrementFavoriteCount: () => {
      set((state) => ({ favoriteCount: Math.max(0, state.favoriteCount - 1) }));
    },

    // ====== 生词本操作 ======

    recordWrongAnswer: async (wordId: string) => {
      const { isNew } = await recordWrongSync(userId, wordId);
      if (isNew) {
        set((state) => ({ difficultCount: state.difficultCount + 1 }));
      }
    },

    recordCorrectAnswer: async (wordId: string) => {
      const { removed } = await recordCorrectSync(userId, wordId);
      if (removed) {
        set((state) => ({ difficultCount: Math.max(0, state.difficultCount - 1) }));
      }
    },

    incrementDifficultCount: () => {
      set((state) => ({ difficultCount: state.difficultCount + 1 }));
    },

    decrementDifficultCount: () => {
      set((state) => ({ difficultCount: Math.max(0, state.difficultCount - 1) }));
    },

    // ====== 学习统计操作 ======

    updateTodayStats: (updates: Partial<TodayStats>) => {
      set((state) => ({
        todayStats: { ...state.todayStats, ...updates },
      }));
    },

    learnWord: async (wordId: string) => {
      try {
        const statusChanged = await learnWordService(userId, wordId);
        if (!statusChanged) {
          return false;
        }

        const inserted = await recordLearned(userId, wordId);
        if (inserted) {
          set((state) => ({
            todayStats: {
              ...state.todayStats,
              learnedCount: state.todayStats.learnedCount + 1,
            },
            overviewStats: {
              ...state.overviewStats,
              totalLearned: state.overviewStats.totalLearned + 1,
            },
          }));
        }
        return inserted;
      } catch (error) {
        console.error('[UserStore] learnWord 失败:', error);
        return false;
      }
    },

    masterWord: async (wordId: string) => {
      try {
        const statusChanged = await masterWordService(userId, wordId);
        if (!statusChanged) {
          return false;
        }

        const inserted = await recordMastered(userId, wordId);
        if (inserted) {
          set((state) => ({
            todayStats: {
              ...state.todayStats,
              masteredCount: state.todayStats.masteredCount + 1,
            },
            overviewStats: {
              ...state.overviewStats,
              totalMastered: state.overviewStats.totalMastered + 1,
            },
          }));
        }
        return inserted;
      } catch (error) {
        console.error('[UserStore] masterWord 失败:', error);
        return false;
      }
    },

    skipWord: async (wordId: string) => {
      try {
        await skipWordService(userId, wordId);
      } catch (error) {
        console.error('[UserStore] skipWord 失败:', error);
      }
    },

    // ====== 词库操作 ======

    setCurrentLibraryTag: async (tag: string) => {
      set({ currentLibraryTag: tag });
      await AsyncStorage.setItem(getLibraryTagKey(userId), tag);
    },

    setLearnSortMode: async (mode: 'smart' | 'alphabetical' | 'random') => {
      set({ learnSortMode: mode });
      await AsyncStorage.setItem(getLearnSortModeKey(userId), mode);
    },

    // ====== 词汇量测试操作 ======

    saveVocabularyTestResult: async (result: VocabularyTestResult) => {
      const record = await saveVocabTest(userId, result);
      set({ vocabularyTest: record });
    },

    hasVocabularyTest: () => {
      return get().vocabularyTest !== null;
    },

    shouldRetestVocabulary: () => {
      const { vocabularyTest } = get();
      if (!vocabularyTest) return true;
      const daysSinceTest =
        (Date.now() - vocabularyTest.eventTime) / (1000 * 60 * 60 * 24);
      return daysSinceTest > 30;
    },

    getWordsToNextLevel: () => {
      const { vocabularyTest } = get();
      if (!vocabularyTest) return null;

      const currentIndex = VOCABULARY_LEVELS.findIndex(
        (l: any) =>
          vocabularyTest.estimatedVocabulary >= l.min &&
          vocabularyTest.estimatedVocabulary < l.max
      );

      if (currentIndex === -1 || currentIndex >= VOCABULARY_LEVELS.length - 1) {
        return null;
      }

      const nextLevel = VOCABULARY_LEVELS[currentIndex + 1];
      return {
        nextLevel: `${nextLevel.level} ${nextLevel.description}`,
        wordsNeeded: nextLevel.min - vocabularyTest.estimatedVocabulary,
      };
    },
  }));
}

export type UserStoreApi = ReturnType<typeof createUserStore>;

// ==================== 内部辅助函数 ====================

type SetState = (
  partial: Partial<UserState> | ((state: UserState) => Partial<UserState>)
) => void;

/** 从本地加载统计数据 */
async function loadStatsFromLocal(userId: string, set: SetState) {
  try {
    const [todayStats, overviewStats] = await Promise.all([
      getLocalTodayStats(userId),
      getLocalOverviewStats(userId),
    ]);

    set({
      todayStats: {
        learnedCount: todayStats.learnedCount,
        masteredCount: todayStats.masteredCount,
        reviewedCount: todayStats.reviewedCount,
        phonemePracticedCount: todayStats.phonemePracticedCount,
      },
      overviewStats: {
        totalLearned: overviewStats.totalLearned,
        totalMastered: overviewStats.totalMastered,
        totalDays: overviewStats.totalDays,
        streakDays: overviewStats.streakDays,
      },
    });
  } catch (error) {
    console.error('[UserStore] 加载本地统计失败:', error);
  }
}

/** 从本地加载用户统计数据 */
async function loadUserStats(userId: string, set: SetState) {
  const [favoriteCount, difficultCount] = await Promise.all([
    getFavoriteCount(userId),
    getDifficultCount(userId),
  ]);

  set({ favoriteCount, difficultCount });

  await loadStatsFromLocal(userId, set);
}

/** 从本地数据库重新统计收藏数和难词数 */
async function reloadCounts(userId: string, set: SetState) {
  try {
    const [favoriteCount, difficultCount] = await Promise.all([
      getFavoriteCount(userId),
      getDifficultCount(userId),
    ]);
    set({ favoriteCount, difficultCount });
  } catch (error) {
    console.error('[UserStore] 刷新统计数据失败:', error);
  }
}

/** 加载词汇量测试结果 */
async function loadVocabularyTest(userId: string, set: SetState) {
  try {
    const record = await getVocabularyTestResult(userId);
    set({ vocabularyTest: record });
  } catch (error) {
    console.error('[UserStore] 加载词汇量测试结果失败:', error);
  }
}

// React hook 集中在 @/session/storeHooks，本文件只导出 factory + 类型
