import { Client } from '../client';
import { ENDPOINTS } from '../endpoints';
import type {
  AssistantChatRequest,
  AssistantChatResponse,
  AssistantMessagesResponse,
  AppNotification,
  AssistantMessageMetadata,
} from '@/types/assistant';

declare module '../client' {
  interface Client {
    assistantChat(message: string, metadata?: AssistantMessageMetadata): Promise<AssistantChatResponse>;
    getAssistantMessages(limit?: number, offset?: number): Promise<AssistantMessagesResponse>;
    clearAssistantMessages(): Promise<{ success: boolean }>;
    getAssistantPushes(): Promise<{ pushes: AppNotification[] }>;
    markAssistantPushesRead(pushIds?: string[]): Promise<{ success: boolean }>;
  }
}

// 发送助手聊天消息
Client.prototype.assistantChat = async function (
  message: string,
  metadata?: AssistantMessageMetadata,
): Promise<AssistantChatResponse> {
  return this.api.post(ENDPOINTS.ASSISTANT_CHAT, { message, metadata });
};

// 获取助手历史消息
Client.prototype.getAssistantMessages = async function (
  limit?: number,
  offset?: number,
): Promise<AssistantMessagesResponse> {
  return this.api.get(ENDPOINTS.ASSISTANT_MESSAGES, {
    params: { limit, offset },
  });
};

// 清空助手聊天记录
Client.prototype.clearAssistantMessages = async function (): Promise<{ success: boolean }> {
  return this.api.delete(ENDPOINTS.ASSISTANT_MESSAGES);
};

// 获取未读推送列表
Client.prototype.getAssistantPushes = async function (): Promise<{ pushes: AppNotification[] }> {
  return this.api.get(ENDPOINTS.ASSISTANT_PUSHES);
};

// 标记推送已读
Client.prototype.markAssistantPushesRead = async function (
  pushIds?: string[],
): Promise<{ success: boolean }> {
  return this.api.post(ENDPOINTS.ASSISTANT_PUSHES_READ, { pushIds });
};
