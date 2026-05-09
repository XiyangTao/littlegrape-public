/**
 * AI 学习助手业务服务
 * 封装聊天、推送、本地缓存的复合操作
 */

import { apiClient, syncToServer } from '@/api';
import * as AssistantDB from '@/db/AssistantDB';
import type {
  AssistantMessage,
  AssistantMessageMetadata,
  AssistantChatResponse,
  AppNotification,
} from '@/types/assistant';

// ==================== 聊天 ====================

/**
 * 发送消息并获取 AI 回复
 */
export async function sendMessage(
  message: string,
  metadata?: AssistantMessageMetadata,
): Promise<AssistantChatResponse> {
  let result: AssistantChatResponse;
  try {
    result = await apiClient.assistantChat(message, metadata);
  } catch (error) {
    console.error('[AssistantService] 发送消息失败:', error instanceof Error ? error.message : error);
    throw error;
  }

  // 异步缓存消息到本地
  const now = new Date().toISOString();
  const userMsg: AssistantMessage = {
    id: result.userMessageId,
    role: 'user',
    content: message,
    metadata: metadata || null,
    createdAt: now,
  };
  const aiMsg: AssistantMessage = {
    id: result.messageId,
    role: 'assistant',
    content: result.reply,
    metadata: null,
    createdAt: now,
  };
  syncToServer(() => AssistantDB.saveMessages([userMsg, aiMsg]), 'AssistantService');

  return result;
}

/**
 * 获取历史消息（从服务端拉取，同步缓存到本地）
 */
export async function getMessages(
  limit: number = 20,
  offset: number = 0,
): Promise<{ messages: AssistantMessage[]; hasMore: boolean }> {
  let result: { messages: AssistantMessage[]; hasMore: boolean };
  try {
    result = await apiClient.getAssistantMessages(limit, offset);
  } catch (error) {
    console.error('[AssistantService] 获取消息列表失败:', error instanceof Error ? error.message : error);
    throw error;
  }

  // 异步缓存
  if (result.messages.length > 0) {
    syncToServer(() => AssistantDB.saveMessages(result.messages), 'AssistantService');
  }

  return result;
}

/**
 * 获取本地缓存的消息（用于首屏快速展示）
 */
export async function getCachedMessages(limit: number = 20): Promise<AssistantMessage[]> {
  return AssistantDB.getRecentMessages(limit);
}

// ==================== 推送 ====================

/**
 * 获取未读推送
 */
export async function getUnreadPushes(): Promise<AppNotification[]> {
  try {
    const result = await apiClient.getAssistantPushes();
    return result.pushes || [];
  } catch (error) {
    console.error('[AssistantService] 获取未读推送失败:', error instanceof Error ? error.message : error);
    throw error;
  }
}

/**
 * 标记推送已读
 */
export async function markPushesRead(pushIds?: string[]): Promise<void> {
  try {
    await apiClient.markAssistantPushesRead(pushIds);
  } catch (error) {
    console.error('[AssistantService] 标记推送已读失败:', error instanceof Error ? error.message : error);
    throw error;
  }
}

// ==================== 清理 ====================

/**
 * 清空本地缓存（登出时调用）
 */
export async function clearLocalData(): Promise<void> {
  await AssistantDB.clearMessages();
}
