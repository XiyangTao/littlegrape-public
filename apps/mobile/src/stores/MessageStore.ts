/**
 * 消息状态 Store（Session scope）
 *
 * 每个 SessionContainer 持有一个独立实例 —— 跟用户登录会话同生命周期。
 *
 * 因此本文件相比迁移前删除了：
 * - apiClient.getCurrentUserId() 写回校验（每实例只属于一个 userId）
 * - reset 方法（destroy 时整个实例 GC）
 *
 * 改造：
 * - translationPromises / translationTimeouts 从模块级移到 store closure
 * - destroy 时通过 disposeAll 清理所有 timeout，防泄漏
 */

import { create } from 'zustand';
import * as ConversationService from '@/services/ConversationService';
import * as MessageService from '@/services/MessageService';
import type { Message, TranslationData } from '@/types/conversation';
import type { VoiceMessageData } from '@/hooks/useVoiceInput';
import { parseUTCTimestamp } from '@/utils/dateUtils';
import { getErrorMessage } from '@/utils/errorUtils';

// 发送状态
type SendingStatus = 'idle' | 'sending' | 'success' | 'error';

// 会话消息状态
interface SessionMessages {
  messages: Message[];
  sendingStatus: SendingStatus;
  error?: string;
}

// Store 状态
interface MessageState {
  // 按 sessionId 存储消息
  sessions: Record<string, SessionMessages>;
}

// Store 操作
interface MessageActions {
  initSession: (sessionId: string, messages: Message[]) => void;
  sendMessage: (
    sessionId: string,
    userId: string,
    text: string,
    voiceData?: VoiceMessageData,
    onAIResponse?: (aiMessage: Message) => void
  ) => Promise<void>;
  toggleTranscript: (sessionId: string, messageId: string) => void;
  updateTranslation: (sessionId: string, messageId: string, translation: string, translationData?: TranslationData) => void;
  prefetchTranslation: (sessionId: string, messageId: string, text: string) => void;
  waitForTranslation: (messageId: string) => Promise<void>;
  clearSession: (sessionId: string) => void;
  getMessages: (sessionId: string) => Message[];
  getSendingStatus: (sessionId: string) => SendingStatus;
  /** 释放所有 timer / promise 缓存（SessionContainer.destroy 时调用） */
  disposeAll: () => void;
}

export type MessageStore = MessageState & MessageActions;

// ==================== Store 工厂 ====================

export function createMessageStore(_userId: string) {
  // 每实例独立的翻译预取缓存（替代原模块级 Map）
  const translationPromises = new Map<string, Promise<void>>();
  const translationTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

  function clearTranslationEntry(messageId: string): void {
    const t = translationTimeouts.get(messageId);
    if (t) {
      clearTimeout(t);
      translationTimeouts.delete(messageId);
    }
    translationPromises.delete(messageId);
  }

  return create<MessageStore>((set, get) => ({
    sessions: {},

    initSession: (sessionId, messages) => {
      set((state) => ({
        sessions: {
          ...state.sessions,
          [sessionId]: {
            messages,
            sendingStatus: 'idle',
          },
        },
      }));

      // 预取 AI 消息的翻译（欢迎消息等）
      for (const msg of messages) {
        if (msg.sender === 'ai' && !msg.translation) {
          get().prefetchTranslation(sessionId, msg.id, msg.text);
        }
      }
    },

    sendMessage: async (sessionId, userId, text, voiceData, onAIResponse) => {
      const messageText = text.trim();
      if (!messageText || !sessionId || !userId) return;

      const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const tempUserMessageId = `temp_${Date.now()}`;
      const userMessage: Message = {
        id: tempUserMessageId,
        text: messageText,
        sender: 'user',
        timestamp: new Date(),
        voiceUri: voiceData?.filePath,
        voiceDuration: voiceData?.duration,
        _requestId: requestId,
      };

      // 1. 乐观更新 UI 状态
      set((state) => {
        const session = state.sessions[sessionId] || { messages: [], sendingStatus: 'idle' };
        return {
          sessions: {
            ...state.sessions,
            [sessionId]: {
              ...session,
              messages: [...session.messages, userMessage],
              sendingStatus: 'sending',
            },
          },
        };
      });

      // 2. 乐观保存用户消息到本地数据库
      try {
        await MessageService.saveUserMessage({
          id: tempUserMessageId,
          sessionId,
          text: messageText,
          voiceFilePath: voiceData?.filePath,
          voiceDuration: voiceData?.duration,
        });
      } catch (dbError) {
        console.error('[MessageStore] Failed to save user message to DB:', dbError);
      }

      // 3. 调用 API 并解析响应
      try {
        const result = await MessageService.sendAndParse(sessionId, userId, messageText);

        // 4. 更新 UI 状态（通过 requestId 精确匹配）
        set((state) => {
          const session = state.sessions[sessionId];
          if (!session) return state;

          const newMessages: Message[] = [];
          for (const msg of session.messages) {
            if (msg._requestId === requestId && result.userMessage) {
              const { _requestId, ...rest } = msg;
              newMessages.push({
                ...rest,
                id: result.userMessage.id,
                tips: result.userMessage.tips || undefined,
                score: result.userMessage.score || undefined,
              });
              for (const aiMsg of result.aiMessages) {
                newMessages.push({
                  id: aiMsg.id,
                  text: aiMsg.content,
                  sender: 'ai' as const,
                  timestamp: parseUTCTimestamp(aiMsg.timestamp),
                  tips: aiMsg.tips || undefined,
                });
              }
            } else {
              newMessages.push(msg);
            }
          }

          return {
            sessions: {
              ...state.sessions,
              [sessionId]: { ...session, messages: newMessages, sendingStatus: 'success' },
            },
          };
        });

        // 5. 持久化到本地数据库
        try {
          await MessageService.persistSendResult({ sessionId, tempUserMessageId, result });
        } catch (dbError) {
          console.error('[MessageStore] Failed to persist send result:', dbError);
        }

        // 6. 预取 AI 回复的翻译
        for (const aiMsg of result.aiMessages) {
          get().prefetchTranslation(sessionId, aiMsg.id, aiMsg.content);
        }

        // 7. 触发 AI 回复回调（用于 TTS 等）
        if (onAIResponse && result.aiMessages.length > 0) {
          const lastAiMsg = result.aiMessages[result.aiMessages.length - 1];
          onAIResponse({
            id: lastAiMsg.id,
            text: lastAiMsg.content,
            sender: 'ai',
            timestamp: parseUTCTimestamp(lastAiMsg.timestamp),
            tips: lastAiMsg.tips || undefined,
          });
        }
      } catch (error) {
        if ((error as any)?.quotaExceeded) {
          console.warn('[MessageStore] 配额超限，已由全局弹窗处理');
        } else {
          console.error('[MessageStore] Failed to send message:', error);
        }

        set((state) => {
          const session = state.sessions[sessionId];
          if (!session) return state;
          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...session,
                sendingStatus: 'error',
                error: getErrorMessage(error),
              },
            },
          };
        });
      }
    },

    toggleTranscript: (sessionId, messageId) => {
      set((state) => {
        const session = state.sessions[sessionId];
        if (!session) return state;

        return {
          sessions: {
            ...state.sessions,
            [sessionId]: {
              ...session,
              messages: session.messages.map((msg) =>
                msg.id === messageId ? { ...msg, showTranscript: !msg.showTranscript } : msg
              ),
            },
          },
        };
      });
    },

    updateTranslation: (sessionId, messageId, translation, translationData) => {
      set((state) => {
        const session = state.sessions[sessionId];
        if (!session) return state;

        return {
          sessions: {
            ...state.sessions,
            [sessionId]: {
              ...session,
              messages: session.messages.map((msg) =>
                msg.id === messageId ? { ...msg, translation, translationData } : msg
              ),
            },
          },
        };
      });
    },

    prefetchTranslation: (sessionId, messageId, text) => {
      const session = get().sessions[sessionId];
      const message = session?.messages.find((m) => m.id === messageId);
      if (message?.translation || message?.translationData) {
        return;
      }

      if (translationPromises.has(messageId)) {
        return;
      }

      const fetchPromise = (async () => {
        try {
          const result = await ConversationService.translateMessage(text);

          const translationData: TranslationData = {
            translation: result.translation,
            notes: result.notes || '',
          };

          const fullTranslation = result.notes
            ? `${result.translation}\n\n${result.notes}`
            : result.translation;

          get().updateTranslation(sessionId, messageId, fullTranslation, translationData);

          await ConversationService.updateMessageTranslation(messageId, fullTranslation);
        } catch (error) {
          console.error('[MessageStore] Prefetch translation failed:', error);
        } finally {
          clearTranslationEntry(messageId);
        }
      })();

      const timeoutHandle = setTimeout(() => {
        clearTranslationEntry(messageId);
      }, 5 * 60 * 1000);

      translationPromises.set(messageId, fetchPromise);
      translationTimeouts.set(messageId, timeoutHandle);
    },

    waitForTranslation: async (messageId: string) => {
      const promise = translationPromises.get(messageId);
      if (promise) {
        await promise;
      }
    },

    clearSession: (sessionId) => {
      const session = get().sessions[sessionId];
      if (session) {
        for (const msg of session.messages) {
          clearTranslationEntry(msg.id);
        }
      }

      set((state) => {
        const newSessions = { ...state.sessions };
        delete newSessions[sessionId];
        return { sessions: newSessions };
      });
    },

    getMessages: (sessionId) => {
      return get().sessions[sessionId]?.messages || [];
    },

    getSendingStatus: (sessionId) => {
      return get().sessions[sessionId]?.sendingStatus || 'idle';
    },

    disposeAll: () => {
      // SessionContainer.destroy 时调用 —— 主动 clearTimeout 防泄漏
      for (const handle of translationTimeouts.values()) clearTimeout(handle);
      translationTimeouts.clear();
      translationPromises.clear();
    },
  }));
}

export type MessageStoreApi = ReturnType<typeof createMessageStore>;
