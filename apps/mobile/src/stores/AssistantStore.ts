/**
 * AI 学习助手 Store（Session scope）
 *
 * 每个 SessionContainer 持有一个独立实例 —— 跟用户登录会话同生命周期。
 *
 * 因此本文件相比迁移前删除了：
 * - ASSISTANT_LAST_USER_ID_KEY 跨用户自愈机制（每实例只属于一个 userId，内存层无跨用户残留）
 * - 模块级 initPromise / initPromiseUserId 单飞锁的跨用户防御
 * - apiClient.getCurrentUserId() 写回校验
 * - reset 方法
 *
 * AssistantDB 仍是全局表（无 user_id 列）—— logout 时由 SessionContainer.destroy 调用
 * AssistantService.clearLocalData() 一次性清空，下任用户进来从服务端拉取干净数据。
 */

import { create } from 'zustand';
import * as AssistantService from '@/services/AssistantService';
import type {
  AssistantMessage,
  AssistantMessageMetadata,
  AppNotification,
  QuickActionType,
} from '@/types/assistant';

// ==================== 快捷操作配置 ====================

const QUICK_ACTION_MESSAGES: Record<QuickActionType, string> = {
  daily_summary: '帮我总结一下今天的学习情况',
  review_remind: '我现在该复习哪些单词？',
  weak_analysis: '分析一下我的薄弱环节',
  study_advice: '给我一些学习建议',
  encourage: '鼓励鼓励我吧',
};

// ==================== 类型定义 ====================

interface AssistantState {
  // 悬浮球
  isVisible: boolean;
  unreadCount: number;
  latestPush: AppNotification | null;

  // 聊天
  messages: AssistantMessage[];
  isLoading: boolean;
  isSending: boolean;
  hasMore: boolean;
}

interface AssistantActions {
  loadMessages(refresh?: boolean): Promise<void>;
  loadMoreMessages(): Promise<void>;
  sendMessage(text: string, metadata?: AssistantMessageMetadata): Promise<AssistantMessage | null>;
  sendQuickAction(actionType: QuickActionType): Promise<void>;

  fetchUnreadPushes(): Promise<void>;
  receivePush(push: AppNotification): void;
  markPushesRead(): Promise<void>;

  setVisible(visible: boolean): void;
}

export type AssistantStore = AssistantState & AssistantActions;

// ==================== 常量 ====================

const PAGE_SIZE = 20;

// ==================== 初始状态 ====================

const initialState: AssistantState = {
  isVisible: true,
  unreadCount: 0,
  latestPush: null,
  messages: [],
  isLoading: false,
  isSending: false,
  hasMore: false,
};

// ==================== Store 工厂 ====================

export function createAssistantStore(_userId: string) {
  return create<AssistantStore>()((set, get) => ({
    ...initialState,

    loadMessages: async (refresh = false) => {
      const { isLoading, messages } = get();
      if (isLoading) return;

      set({ isLoading: true });

      try {
        if (refresh || messages.length === 0) {
          // 首次加载：先展示本地缓存
          const cached = await AssistantService.getCachedMessages(PAGE_SIZE);
          if (cached.length > 0) {
            set({ messages: cached });
          }

          // 然后拉取服务端最新
          const result = await AssistantService.getMessages(PAGE_SIZE, 0);
          set({
            messages: result.messages,
            hasMore: result.hasMore,
          });
        }
      } catch (error) {
        console.error('[AssistantStore] loadMessages failed:', error);
      } finally {
        set({ isLoading: false });
      }
    },

    loadMoreMessages: async () => {
      const { isLoading, hasMore, messages } = get();
      if (isLoading || !hasMore) return;

      set({ isLoading: true });

      try {
        const result = await AssistantService.getMessages(PAGE_SIZE, messages.length);
        set({
          // 追加到前面（更早的消息）
          messages: [...result.messages, ...messages],
          hasMore: result.hasMore,
        });
      } catch (error) {
        console.error('[AssistantStore] loadMoreMessages failed:', error);
      } finally {
        set({ isLoading: false });
      }
    },

    sendMessage: async (text, metadata) => {
      const { isSending } = get();
      if (isSending) return null;

      const tempId = `temp_${Date.now()}`;
      const userMsg: AssistantMessage = {
        id: tempId,
        role: 'user',
        content: text,
        metadata: metadata || null,
        createdAt: new Date().toISOString(),
      };

      set((state) => ({
        messages: [...state.messages, userMsg],
        isSending: true,
      }));

      try {
        const result = await AssistantService.sendMessage(text, metadata);

        const aiMsg: AssistantMessage = {
          id: result.messageId,
          role: 'assistant',
          content: result.reply,
          metadata: null,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          messages: state.messages
            .map((m) => (m.id === tempId ? { ...m, id: result.userMessageId } : m))
            .concat(aiMsg),
          isSending: false,
        }));

        return aiMsg;
      } catch (error) {
        // 移除临时消息
        set((state) => ({
          messages: state.messages.filter((m) => m.id !== tempId),
          isSending: false,
        }));
        throw error;
      }
    },

    sendQuickAction: async (actionType) => {
      const message = QUICK_ACTION_MESSAGES[actionType];
      if (!message) return;
      await get().sendMessage(message, { quickAction: actionType });
    },

    fetchUnreadPushes: async () => {
      try {
        const pushes = await AssistantService.getUnreadPushes();
        set({
          unreadCount: pushes.length,
          latestPush: pushes.length > 0 ? pushes[0] : null,
        });
      } catch (error) {
        if (__DEV__) console.warn('[AssistantStore] 拉取未读推送失败:', error);
      }
    },

    receivePush: (push) => {
      set((state) => ({
        unreadCount: state.unreadCount + 1,
        latestPush: push,
      }));
    },

    markPushesRead: async () => {
      try {
        await AssistantService.markPushesRead();
        set({ unreadCount: 0, latestPush: null });
      } catch (error) {
        if (__DEV__) console.warn('[AssistantStore] 标记推送已读失败:', error);
      }
    },

    setVisible: (visible) => {
      set({ isVisible: visible });
    },
  }));
}

export type AssistantStoreApi = ReturnType<typeof createAssistantStore>;

