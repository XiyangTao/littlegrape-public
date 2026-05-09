/**
 * 消息业务逻辑层
 *
 * 从 MessageStore 提取的纯业务逻辑：
 * - API 调用 + 响应解析
 * - 本地数据库持久化
 * - Store 只保留状态管理职责
 */

import * as ConversationService from '@/services/ConversationService';

// ==================== 类型定义 ====================

/** API 发送结果（结构化） */
export interface SendResult {
  userMessage: {
    id: string;
    tips: string | null;
    score: number | null;
    timestamp: string;
  } | null;
  aiMessages: Array<{
    id: string;
    content: string;
    timestamp: string;
    tips: string | null;
  }>;
}

// ==================== 核心函数 ====================

/**
 * 保存用户消息到本地数据库（乐观保存）
 */
export async function saveUserMessage(params: {
  id: string;
  sessionId: string;
  text: string;
  voiceFilePath?: string | null;
  voiceDuration?: number | null;
}): Promise<void> {
  await ConversationService.addMessage({
    id: params.id,
    sessionId: params.sessionId,
    text: params.text,
    sender: 'user',
    timestamp: new Date().toISOString(),
    tips: null,
    score: null,
    voiceUri: params.voiceFilePath || null,
    voiceDuration: params.voiceDuration ?? null,
  });
}

/**
 * 调用 API 发送消息并解析响应
 */
export async function sendAndParse(
  sessionId: string,
  userId: string,
  text: string
): Promise<SendResult> {
  const response = await ConversationService.sendChatMessage(sessionId, userId, text);
  const apiUser = response.messages.find((msg: any) => msg.role === 'user');
  const apiAiList = response.messages.filter((msg: any) => msg.role === 'assistant');

  return {
    userMessage: apiUser
      ? {
          id: apiUser.message_id,
          tips: apiUser.tips || null,
          score: apiUser.score ?? null,
          timestamp: apiUser.timestamp,
        }
      : null,
    aiMessages: apiAiList.map((msg: any) => ({
      id: msg.message_id,
      content: msg.content,
      timestamp: msg.timestamp,
      tips: msg.tips || null,
    })),
  };
}

/**
 * 持久化发送结果到本地数据库
 * - 替换用户消息的临时 ID
 * - 保存 AI 回复
 */
export async function persistSendResult(params: {
  sessionId: string;
  tempUserMessageId: string;
  result: SendResult;
}): Promise<void> {
  const { sessionId, tempUserMessageId, result } = params;

  // 替换用户消息的临时 ID
  if (result.userMessage) {
    await ConversationService.replaceMessageId(tempUserMessageId, result.userMessage.id, {
      tips: result.userMessage.tips,
      score: result.userMessage.score,
      timestamp: result.userMessage.timestamp,
    });
  }

  // 保存 AI 回复
  if (result.aiMessages.length > 0) {
    await ConversationService.addMessages(
      result.aiMessages.map((msg) => ({
        id: msg.id,
        sessionId: sessionId,
        text: msg.content,
        sender: 'ai' as const,
        timestamp: msg.timestamp,
        tips: msg.tips,
        score: null,
      }))
    );
  }
}
