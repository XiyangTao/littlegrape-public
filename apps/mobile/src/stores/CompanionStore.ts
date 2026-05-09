/**
 * 伙伴对话 Store（Session scope）
 *
 * 每个 SessionContainer 持有一个独立实例 —— 跟用户登录会话同生命周期。
 *
 * 因此本文件相比迁移前删除了：
 * - apiClient.getCurrentUserId() 写回校验
 * - reset 方法
 *
 * 保留：
 * - CompanionDB 按 user_id 隔离 —— logout 不清表（下次同用户重登可恢复对话历史）
 */

import { create } from 'zustand';
import { apiClient } from '@/api';
import * as CompanionDB from '@/db/CompanionDB';
import type { CompanionThread } from '@/db/CompanionDB';

// ==================== 类型定义 ====================

export interface CompanionChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  voiceUri?: string;
  voiceDuration?: number;
  translation?: string;
  tips?: string;
  _requestId?: string;
}

interface CompanionState {
  activeCharacterId: string | null;
  activeThread: CompanionThread | null;
  messages: CompanionChatMessage[];
  sendingStatus: 'idle' | 'sending' | 'error';
  isTyping: boolean;
  /** 是否为首次创建的新线程（用于决定是否自动播放开场白 TTS） */
  isNewThread: boolean;
}

interface PreloadedGreeting {
  id: string;
  text: string;
  translation?: string;
  timestamp: string;
}

interface CompanionActions {
  initThread: (characterId: string, preloadedGreeting?: PreloadedGreeting) => Promise<void>;
  sendMessage: (characterId: string, text: string) => Promise<void>;
  clearHistory: (characterId: string) => Promise<void>;
}

export type CompanionStore = CompanionState & CompanionActions;

// ==================== 初始状态 ====================

const initialState: CompanionState = {
  activeCharacterId: null,
  activeThread: null,
  messages: [],
  sendingStatus: 'idle',
  isTyping: false,
  isNewThread: false,
};

// ==================== Store 工厂 ====================

export function createCompanionStore(userId: string) {
  return create<CompanionStore>()((set, get) => ({
    ...initialState,

    initThread: async (characterId: string, preloadedGreeting?: PreloadedGreeting) => {
      set({ activeCharacterId: characterId, activeThread: null, messages: [], sendingStatus: 'idle', isTyping: false, isNewThread: false });

      try {
        // 开场白已预加载（从 AIChatsScreen 传入）→ 直接使用本地数据
        if (preloadedGreeting) {
          let localThread: CompanionThread | null = null;
          try {
            const localThreads = await CompanionDB.getThreads(userId);
            localThread = localThreads.find(t => t.characterId === characterId) || null;
          } catch { /* 忽略 */ }

          if (get().activeCharacterId !== characterId) return;

          const msg: CompanionChatMessage = {
            id: preloadedGreeting.id,
            text: preloadedGreeting.text,
            sender: 'ai',
            timestamp: new Date(preloadedGreeting.timestamp),
            translation: preloadedGreeting.translation || undefined,
          };

          set({
            activeThread: localThread,
            isNewThread: true,
            messages: [msg],
          });
          return;
        }

        // 1. 查找本地线程
        let localThreads: CompanionThread[] = [];
        try {
          localThreads = await CompanionDB.getThreads(userId);
        } catch { /* 本地 DB 表可能不存在 */ }
        const localThread = localThreads.find(t => t.characterId === characterId);

        if (localThread && localThread.messageCount > 0) {
          // 有本地缓存 → 直接加载历史（不自动播放 TTS）
          const localMessages = await CompanionDB.getMessages(localThread.id);
          set({
            activeThread: localThread,
            isNewThread: false,
            messages: localMessages.map(m => ({
              id: m.id,
              text: m.text,
              sender: m.sender,
              timestamp: new Date(m.timestamp),
              voiceUri: m.voiceUri ?? undefined,
              voiceDuration: m.voiceDuration ?? undefined,
              translation: m.translation ?? undefined,
              tips: m.tips ?? undefined,
            })),
          });
          return;
        }

        // 2. 从服务端初始化/获取线程（兜底）
        const resp = await apiClient.initCompanionThread(characterId);
        if (!resp.success || !resp.data) return;

        const { thread, welcomeMessage } = resp.data;

        let localNewThread: CompanionThread | null = null;
        try {
          localNewThread = await CompanionDB.getOrCreateThread(
            thread.id, userId, characterId, thread.agnoSessionId,
          );
        } catch { /* 忽略 */ }

        // 竞态检查（用户切角色）
        if (get().activeCharacterId !== characterId) return;

        if (!welcomeMessage) {
          set({ activeThread: localNewThread, isNewThread: false, messages: [] });
          return;
        }

        // 本地没消息 → 新对话，显示开场白，自动播放 TTS
        const msg: CompanionChatMessage = {
          id: welcomeMessage.messageId,
          text: welcomeMessage.content,
          sender: 'ai',
          timestamp: new Date(welcomeMessage.timestamp),
          translation: welcomeMessage.translation || undefined,
        };

        if (localNewThread) {
          CompanionDB.addMessage({
            id: msg.id, threadId: thread.id, text: msg.text,
            sender: msg.sender, timestamp: msg.timestamp.toISOString(),
            translation: msg.translation || null,
          }).catch(() => {});
          CompanionDB.updateThreadLastMessage(thread.id, 1, msg.text).catch(() => {});
        }

        set({
          activeThread: localNewThread,
          isNewThread: true,
          messages: [msg],
        });
      } catch (error: any) {
        console.error('[CompanionStore] 初始化线程失败:', error?.message || error);
      }
    },

    sendMessage: async (characterId: string, text: string) => {
      const { activeThread } = get();
      if (!activeThread) return;

      const tempId = `temp_${Date.now()}`;

      // 乐观更新
      const userMsg: CompanionChatMessage = {
        id: tempId,
        text,
        sender: 'user',
        timestamp: new Date(),
      };

      set(state => ({
        messages: [...state.messages, userMsg],
        sendingStatus: 'sending',
        isTyping: true,
      }));

      CompanionDB.addMessage({
        id: tempId, threadId: activeThread.id, text,
        sender: 'user', timestamp: userMsg.timestamp.toISOString(),
      }).catch(() => {});

      try {
        const resp = await apiClient.sendCompanionMessage(characterId, text);
        if (!resp.success || !resp.data) {
          set({ sendingStatus: 'error', isTyping: false });
          return;
        }

        const { messageId, content, translation, tips, timestamp } = resp.data;

        const aiMsg: CompanionChatMessage = {
          id: messageId,
          text: content,
          sender: 'ai',
          timestamp: new Date(timestamp),
          translation: translation || undefined,
        };

        // tips 挂在用户消息上（是对用户输入的评估）
        set(state => ({
          messages: tips
            ? state.messages.map(m => m.id === tempId ? { ...m, tips } : m).concat(aiMsg)
            : [...state.messages, aiMsg],
          sendingStatus: 'idle',
          isTyping: false,
        }));

        CompanionDB.addMessage({
          id: messageId, threadId: activeThread.id, text: content,
          sender: 'ai', timestamp, translation: translation || null,
        }).catch(() => {});
        if (tips) {
          CompanionDB.updateMessageTips(tempId, tips).catch(() => {});
        }

        const newCount = get().messages.length;
        CompanionDB.updateThreadLastMessage(activeThread.id, newCount, content).catch(() => {});
      } catch (error) {
        console.error('[CompanionStore] 发送消息失败:', error);
        set({ sendingStatus: 'error', isTyping: false });
      }
    },

    clearHistory: async (characterId: string) => {
      try {
        await apiClient.clearCompanionHistory(characterId);

        const { activeThread } = get();
        if (activeThread) {
          try {
            await CompanionDB.clearMessages(activeThread.id);
            await CompanionDB.updateThreadLastMessage(activeThread.id, 0, '');
          } catch { /* 忽略 */ }
        }

        set(state => ({
          messages: [],
          isNewThread: false,
          activeThread: state.activeThread ? { ...state.activeThread, messageCount: 0, lastMessagePreview: null } : null,
        }));
      } catch (error: any) {
        console.error('[CompanionStore] 清空聊天记录失败:', error?.message || error);
        throw error;
      }
    },
  }));
}

export type CompanionStoreApi = ReturnType<typeof createCompanionStore>;
