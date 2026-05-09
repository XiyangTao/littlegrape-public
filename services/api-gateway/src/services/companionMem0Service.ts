/**
 * 伙伴对话服务 (Mem0 版)
 *
 * 唯一的伙伴对话实现：
 * - Mem0 管记忆（向量搜索+自动提取）
 * - Gateway 管数据（对话记录存 DB、历史加载传给 ai-service）
 * - ai-service 完全无状态（不存任何对话历史）
 */

import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@/config/database';
import { aiServiceClient } from '@/clients';
import { logger } from '@/utils/logger';

// 每个 user+character 的当前 sessionId（内存缓存，重启后新建）
const sessionMap = new Map<string, string>();

function getOrCreateSessionId(userId: string, characterId: string): string {
  const key = `${userId}_${characterId}`;
  if (!sessionMap.has(key)) {
    sessionMap.set(key, uuidv4());
  }
  return sessionMap.get(key)!;
}

function resetSessionId(userId: string, characterId: string): string {
  const key = `${userId}_${characterId}`;
  const newId = uuidv4();
  sessionMap.set(key, newId);
  return newId;
}

// ==================== 消息记录（异步，不阻塞响应） ====================

function saveMessageLog(
  userId: string,
  characterId: string,
  sessionId: string,
  role: string,
  content: string,
) {
  prisma.companionMem0Message.create({
    data: { userId, characterId, sessionId, role, content },
  }).catch(err => {
    logger.error('[Mem0] 消息记录失败:', err);
  });
}

// ==================== 加载最近对话历史 ====================

const MAX_RECENT_MESSAGES = 30;

async function loadRecentMessages(userId: string, characterId: string) {
  try {
    const sessionId = getOrCreateSessionId(userId, characterId);
    const messages = await prisma.companionMem0Message.findMany({
      where: { userId, characterId, sessionId },
      orderBy: { createdAt: 'asc' },
      take: MAX_RECENT_MESSAGES,
      select: { role: true, content: true },
    });
    return messages;
  } catch (err) {
    logger.error('[Mem0] 加载历史消息失败:', err);
    return [];
  }
}

// ==================== 初始化 ====================

export async function initThread(userId: string, characterId: string) {
  const result = await aiServiceClient.post('/companion-mem0/init', {
    user_id: userId,
    character_id: characterId,
  });

  // 新对话 → 新 sessionId
  const sessionId = resetSessionId(userId, characterId);

  // 记录开场白
  saveMessageLog(userId, characterId, sessionId, 'assistant', result.content);

  return {
    welcomeMessage: {
      messageId: result.message_id,
      role: result.role,
      content: result.content,
      translation: result.translation || '',
      timestamp: result.timestamp,
    },
    tokenUsage: result.token_usage,
  };
}

// ==================== 聊天 ====================

export async function sendMessage(userId: string, characterId: string, message: string) {
  // 从 DB 加载当前 session 的对话历史
  const recentMessages = await loadRecentMessages(userId, characterId);

  // 调 ai-service，传入历史
  const result = await aiServiceClient.post('/companion-mem0/chat', {
    user_id: userId,
    character_id: characterId,
    message,
    recent_messages: recentMessages,
  });

  // 记录用户消息 + AI 回复
  const sessionId = getOrCreateSessionId(userId, characterId);
  saveMessageLog(userId, characterId, sessionId, 'user', message);
  saveMessageLog(userId, characterId, sessionId, 'assistant', result.content);

  return {
    messageId: result.message_id,
    content: result.content,
    translation: result.translation || '',
    tips: result.tips || '',
    timestamp: result.timestamp,
    responseTime: result.response_time,
    tokenUsage: result.token_usage,
    memoriesUsed: result.memories_used || 0,
  };
}

// ==================== 查看记忆（调试） ====================

export async function getMemories(userId: string, characterId: string) {
  const result = await aiServiceClient.post('/companion-mem0/memories', {
    user_id: userId,
    character_id: characterId,
  });

  return {
    memories: result.memories || [],
    total: result.total || 0,
  };
}
