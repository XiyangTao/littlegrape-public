/**
 * 会话业务逻辑层
 * 封装涉及多个模块的复杂操作（数据库 + 文件系统 + API）
 */

import { File } from 'expo-file-system/next';
import * as ConversationDB from '@/db/ConversationDB';
import { apiClient, syncToServer } from '@/api';

// ==================== 类型 re-export ====================
export type { SessionSummary, DBSession, DBMessage } from '@/db/ConversationDB';

// ==================== 查询操作 ====================

/**
 * 获取会话列表
 */
export async function getSessionList(userId: string, limit: number, offset: number) {
  return ConversationDB.getSessionList(userId, limit, offset);
}

/**
 * 获取会话数量
 */
export async function getSessionCount(userId: string): Promise<number> {
  return ConversationDB.getSessionCount(userId);
}

/**
 * 获取会话消息
 */
export async function getMessages(sessionId: string) {
  return ConversationDB.getMessages(sessionId);
}

/**
 * 检查会话是否存在
 */
export async function sessionExists(sessionId: string): Promise<boolean> {
  return ConversationDB.sessionExists(sessionId);
}

/**
 * 创建会话
 */
export async function createSession(session: Parameters<typeof ConversationDB.createSession>[0]) {
  return ConversationDB.createSession(session);
}

/**
 * 添加消息
 */
export async function addMessage(message: Parameters<typeof ConversationDB.addMessage>[0]) {
  return ConversationDB.addMessage(message);
}

/**
 * 更新消息翻译
 */
export async function updateMessageTranslation(messageId: string, translation: string) {
  return ConversationDB.updateMessageTranslation(messageId, translation);
}

/**
 * 替换消息 ID（临时 ID → 服务端正式 ID）
 */
export async function replaceMessageId(
  oldId: string,
  newId: string,
  updates: { tips: string | null; score: number | null; timestamp: string },
) {
  return ConversationDB.replaceMessageId(oldId, newId, updates);
}

/**
 * 批量添加消息
 */
export async function addMessages(messages: Parameters<typeof ConversationDB.addMessages>[0]) {
  return ConversationDB.addMessages(messages);
}

/**
 * 删除录音文件
 */
async function deleteVoiceFile(uri: string): Promise<void> {
  try {
    const fileUri = uri.startsWith('file://') ? uri : `file://${uri}`;
    const file = new File(fileUri);
    if (file.exists) {
      file.delete();
    }
  } catch (error) {
    console.warn('[ConversationService] 删除录音文件失败:', uri, error instanceof Error ? error.message : error);
  }
}

/**
 * 批量删除录音文件（并行执行）
 */
async function deleteVoiceFiles(uris: string[]): Promise<void> {
  if (uris.length === 0) return;
  await Promise.all(uris.map(deleteVoiceFile));
}

/**
 * 删除会话（包括数据库记录、录音文件、服务器数据）
 */
export async function deleteSession(sessionId: string, userId?: string): Promise<void> {
  // 1. 查询语音文件 URI
  const voiceUris = await ConversationDB.getVoiceUris(sessionId);

  // 2. 删除数据库记录
  await ConversationDB.deleteSession(sessionId);

  // 3. 删除服务器数据（不阻塞，失败忽略）
  if (userId) {
    syncToServer(() => apiClient.deleteChatSession(sessionId, userId), 'ConversationService');
  }

  // 4. 删除录音文件（不阻塞）
  if (voiceUris.length > 0) {
    deleteVoiceFiles(voiceUris).catch((error) => {
      console.warn('[ConversationService] 删除录音文件失败:', error instanceof Error ? error.message : error);
    });
  }
}

/**
 * 批量删除会话（包括数据库记录、录音文件、服务器数据）
 */
export async function batchDeleteSessions(sessionIds: string[], userId?: string): Promise<number> {
  if (sessionIds.length === 0) return 0;

  // 1. 查询所有语音文件 URI
  const voiceUris = await ConversationDB.getVoiceUrisBySessionIds(sessionIds);

  // 2. 删除数据库记录
  const deletedCount = await ConversationDB.batchDeleteSessions(sessionIds);

  // 3. 删除服务器数据（不阻塞，失败忽略）
  if (userId) {
    syncToServer(() => apiClient.batchDeleteChatSessions(sessionIds, userId), 'ConversationService');
  }

  // 4. 删除录音文件（不阻塞）
  if (voiceUris.length > 0) {
    deleteVoiceFiles(voiceUris).catch((error) => {
      console.warn('[ConversationService] 删除录音文件失败:', error instanceof Error ? error.message : error);
    });
  }

  return deletedCount;
}

/**
 * 发送聊天消息
 */
export async function sendChatMessage(sessionId: string, userId: string, message: string) {
  try {
    return await apiClient.sendChatMessage(sessionId, userId, message);
  } catch (error) {
    console.error('[ConversationService] 发送消息失败:', error instanceof Error ? error.message : error);
    throw error;
  }
}

/**
 * 翻译消息文本
 */
export async function translateMessage(text: string): Promise<{ translation: string; notes: string }> {
  try {
    const result = await apiClient.translateText(text);
    return {
      translation: result.translation,
      notes: result.notes || '',
    };
  } catch (error) {
    console.error('[ConversationService] 翻译消息失败:', error instanceof Error ? error.message : error);
    throw error;
  }
}

/**
 * 准备聊天会话
 */
export async function prepareChatSession(params: {
  predefined_scenario_id?: string;
  ai_role: string;
  scenario: string;
  difficulty_level: string;
  english_variant: string;
  conversation_style: string;
  enable_tips: boolean;
  voice_id?: string;
  voice_name?: string;
  voice_gender?: 'male' | 'female';
  learned_words?: string[];
}) {
  try {
    return await apiClient.prepareChatSession(params);
  } catch (error) {
    console.error('[ConversationService] 准备会话失败:', error instanceof Error ? error.message : error);
    throw error;
  }
}

/**
 * 创建聊天会话
 */
export async function createChatSession(params: {
  user_id: string;
  session_title?: string;
  predefined_scenario_id?: string;
  ai_role: string;
  scenario: string;
  difficulty_level: string;
  english_variant: string;
  conversation_style: string;
  enable_tips: boolean;
  voice_id?: string;
  voice_name?: string;
  voice_gender?: 'male' | 'female';
  prepared_system_prompt: string;
}) {
  try {
    return await apiClient.createChatSession(params);
  } catch (error) {
    console.error('[ConversationService] 创建会话失败:', error instanceof Error ? error.message : error);
    throw error;
  }
}
