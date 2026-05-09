/**
 * 版本管理 Store
 *
 * 管理 App 版本检查与更新提示：
 * - 启动时检查版本（异步不阻塞）
 * - 强制更新：弹窗不可关闭
 * - 建议更新：弹窗可关闭，24h 冷却
 * - 检查失败静默降级
 */

import { create } from 'zustand';
import { Platform } from 'react-native';
import { apiClient } from '@/api';
import type { UpdateType, VersionCheckResult } from '@/api/modules/version';

// ==================== 类型定义 ====================

interface VersionState {
  updateType: UpdateType;
  latestVersion: string;
  currentVersion: string;
  releaseNotes: string;
  iosUrl: string;
  androidUrl: string;
  showUpdateModal: boolean;
}

interface VersionActions {
  /** 检查版本更新 */
  checkVersion: () => Promise<void>;
  /** 关闭更新弹窗（仅建议更新可关闭） */
  dismissUpdateModal: () => void;
  /** 获取当前平台的下载链接 */
  getDownloadUrl: () => string;
  /** 清空状态 */
  reset: () => void;
}

type VersionStore = VersionState & VersionActions;

// ==================== 常量 ====================

const DISMISS_COOLDOWN = 24 * 60 * 60 * 1000; // 24h 冷却

// ==================== 初始状态 ====================

const initialState: VersionState = {
  updateType: 'none',
  latestVersion: '',
  currentVersion: '',
  releaseNotes: '',
  iosUrl: '',
  androidUrl: '',
  showUpdateModal: false,
};

// ==================== Store 实现 ====================

// 建议更新上次关闭时间
let lastDismissedAt = 0;

export const useVersionStore = create<VersionStore>()((set, get) => ({
  ...initialState,

  checkVersion: async () => {
    try {
      const response = await apiClient.checkVersion();
      if (!response.success || !response.data) return;

      const { updateType, latestVersion, currentVersion, releaseNotes, iosUrl, androidUrl } = response.data;

      set({ updateType, latestVersion, currentVersion, releaseNotes, iosUrl, androidUrl });

      if (updateType === 'forced') {
        set({ showUpdateModal: true });
      } else if (updateType === 'optional') {
        // 24h 冷却期内不重复弹窗
        const now = Date.now();
        if (now - lastDismissedAt > DISMISS_COOLDOWN) {
          set({ showUpdateModal: true });
        }
      }
    } catch (error) {
      // 版本检查失败静默降级，不影响正常使用
      console.warn('[VersionStore] 版本检查失败:', error instanceof Error ? error.message : error);
    }
  },

  dismissUpdateModal: () => {
    const { updateType } = get();
    // 强制更新不可关闭
    if (updateType === 'forced') return;

    lastDismissedAt = Date.now();
    set({ showUpdateModal: false });
  },

  getDownloadUrl: () => {
    const { iosUrl, androidUrl } = get();
    return Platform.OS === 'ios' ? iosUrl : androidUrl;
  },

  reset: () => {
    lastDismissedAt = 0;
    set(initialState);
  },
}));
