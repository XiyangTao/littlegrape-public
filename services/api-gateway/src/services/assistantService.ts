/**
 * 助手聊天服务
 * 核心业务逻辑：聊天、消息管理
 */

import { prisma } from '@/config/database';
import { aiServiceClient } from '@/clients';
import { logger } from '@/utils/logger';
import { recordUsage } from '@/services/usageService';
import { getOrRefreshMemory, buildSystemPrompt, updateAiInsights } from '@/services/assistantMemoryService';

// ==================== 类型定义 ====================

interface ChatResult {
  reply: string;
  messageId: string;
  userMessageId: string;
  tokenUsage?: number;
}

// ==================== 常量 ====================

/** 对话历史窗口大小（最近 N 条消息） */
const HISTORY_WINDOW = 20;

/** 每隔 N 轮对话触发 AI 洞察提取 */
const INSIGHT_EXTRACT_INTERVAL = 5;

// ==================== 核心方法 ====================

/**
 * 发送消息并获取 AI 回复
 */
export async function chat(
  userId: string,
  message: string,
  metadata?: Record<string, any>
): Promise<ChatResult> {
  // 1. 获取/刷新记忆
  const memory = await getOrRefreshMemory(userId);
  const systemPrompt = buildSystemPrompt(memory);

  // 2. 获取最近对话历史
  const recentMessages = await prisma.assistantMessage.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: HISTORY_WINDOW,
    select: { role: true, content: true },
  });

  // 反转为时间正序
  const history = recentMessages.reverse().map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  // 3. 调用 AI Service
  const aiResult = await aiServiceClient.assistantChat(systemPrompt, history, message);

  // 4. 保存用户消息和 AI 回复
  const [userMsg, assistantMsg] = await Promise.all([
    prisma.assistantMessage.create({
      data: {
        userId,
        role: 'user',
        content: message,
        metadata: metadata || undefined,
      },
    }),
    prisma.assistantMessage.create({
      data: {
        userId,
        role: 'assistant',
        content: aiResult.reply,
      },
    }),
  ]);

  // 5. 异步更新对话计数
  prisma.userStats.update({
    where: { userId },
    data: { totalConversations: { increment: 1 } },
  }).catch(err => logger.error('更新对话计数失败:', err));

  // 6. 异步记录用量
  const totalTokens = aiResult.token_usage?.total_tokens;
  if (totalTokens && totalTokens > 0) {
    recordUsage(userId, 'ai', totalTokens).catch(err => {
      logger.error('助手用量记录失败:', err);
    });
  }

  // 7. 异步检查是否需要提取 AI 洞察
  checkAndExtractInsights(userId).catch(err => {
    logger.error('AI 洞察提取失败:', err);
  });

  return {
    reply: aiResult.reply,
    messageId: assistantMsg.id,
    userMessageId: userMsg.id,
    tokenUsage: aiResult.token_usage?.total_tokens,
  };
}

/**
 * 获取历史消息（分页）
 */
export async function getMessages(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<{ messages: any[]; hasMore: boolean }> {
  const [messages, total] = await Promise.all([
    prisma.assistantMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit + 1, // 多取一条判断 hasMore
      select: {
        id: true,
        role: true,
        content: true,
        metadata: true,
        createdAt: true,
      },
    }),
    prisma.assistantMessage.count({ where: { userId } }),
  ]);

  const hasMore = messages.length > limit;
  const result = hasMore ? messages.slice(0, limit) : messages;

  return {
    messages: result.reverse().map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
      metadata: m.metadata,
      createdAt: m.createdAt.toISOString(),
    })),
    hasMore,
  };
}

// ==================== 内部方法 ====================

/**
 * 检查并异步提取 AI 洞察
 * 每隔 INSIGHT_EXTRACT_INTERVAL 轮对话触发一次
 */
async function checkAndExtractInsights(userId: string): Promise<void> {
  const messageCount = await prisma.assistantMessage.count({
    where: { userId, role: 'user' },
  });

  if (messageCount % INSIGHT_EXTRACT_INTERVAL !== 0) return;

  // 获取最近的对话用于提取洞察
  const recentMessages = await prisma.assistantMessage.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: INSIGHT_EXTRACT_INTERVAL * 2,
    select: { role: true, content: true },
  });

  try {
    const insights = await aiServiceClient.extractAssistantInsights(
      recentMessages.reverse().map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))
    );

    if (insights) {
      await updateAiInsights(userId, insights);
    }
  } catch (error) {
    // 非关键功能，提取失败不影响主流程
    logger.warn('AI 洞察提取调用失败:', error);
  }
}
