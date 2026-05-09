/**
 * AI Chat 路由
 * 转发到 ai-service 的对话相关接口
 */

import { Router, Request, Response } from 'express';
import { aiServiceClient } from '@/clients';
import { logger } from '@/utils/logger';
import { recordUsage } from '@/services/usageService';
import { quotaCheck } from '@/middleware/quotaMiddleware';
import { requireFeature } from '@/middleware/requireFeature';
import { emitAchievementEvent } from '@/events/eventBus';

const router = Router();

/**
 * 获取预定义场景列表
 * GET /api/chat/scenarios
 */
router.get('/scenarios', async (req: Request, res: Response) => {
  try {
    const { category } = req.query;
    const scenarios = await aiServiceClient.getScenarios(category as string | undefined);
    res.json(scenarios);
  } catch (error: unknown) {
    logger.error('获取场景列表失败:', error);
    const axiosErr = error as any;
    res.status(axiosErr.response?.status || 500).json({
      success: false,
      error: axiosErr.response?.data?.detail || (error instanceof Error ? error.message : '获取场景列表失败')
    });
  }
});

/**
 * 预生成系统提示词
 * POST /api/chat/prepare
 */
router.post('/prepare', requireFeature('aiChat'), quotaCheck, async (req: Request, res: Response) => {
  try {
    const result = await aiServiceClient.prepareSession(req.body);

    // 记录 AI 用量（自定义场景生成会消耗 tokens）
    const userId = req.user?.id;
    const tokenUsage = result.token_usage;
    if (userId && tokenUsage?.total_tokens > 0) {
      recordUsage(userId, 'ai', tokenUsage.total_tokens).catch(err => {
        logger.error('记录用量失败:', err);
      });
    } 

    res.json(result);
  } catch (error: unknown) {
    logger.error('预生成系统提示词失败:', error);
    const axiosErr = error as any;
    res.status(axiosErr.response?.status || 500).json({
      success: false,
      error: axiosErr.response?.data?.detail || (error instanceof Error ? error.message : '预生成系统提示词失败')
    });
  }
});

/**
 * 获取用户会话列表
 * GET /api/chat/sessions
 */
router.get('/sessions', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: '未认证' });
      return;
    }
    const { limit, offset } = req.query;
    const sessions = await aiServiceClient.getUserSessions(
      userId,
      limit ? parseInt(limit as string, 10) : undefined,
      offset ? parseInt(offset as string, 10) : undefined
    );
    res.json(sessions);
  } catch (error: unknown) {
    logger.error('获取用户会话列表失败:', error);
    const axiosErr = error as any;
    res.status(axiosErr.response?.status || 500).json({
      success: false,
      error: axiosErr.response?.data?.detail || (error instanceof Error ? error.message : '获取用户会话列表失败')
    });
  }
});

/**
 * 创建对话会话
 * POST /api/chat/sessions
 */
router.post('/sessions', requireFeature('aiChat'), quotaCheck, async (req: Request, res: Response) => {
  try {
    const session = await aiServiceClient.createSession(req.body);

    // 记录 AI 用量（欢迎消息生成消耗 tokens）
    const userId = req.user?.id;
    const tokenUsage = session.token_usage;
    if (userId && tokenUsage?.total_tokens > 0) {
      recordUsage(userId, 'ai', tokenUsage.total_tokens).catch(err => {
        logger.error('记录用量失败:', err);
      });
    }

    // 成就引擎：fire-and-forget，结果通过 WS 推送
    if (userId) {
      emitAchievementEvent(userId, 'conversation_done', {
        totalTokens: tokenUsage?.total_tokens,
      });
    }

    res.json(session);
  } catch (error: unknown) {
    logger.error('创建会话失败:', error);
    const axiosErr = error as any;
    res.status(axiosErr.response?.status || 500).json({
      success: false,
      error: axiosErr.response?.data?.detail || (error instanceof Error ? error.message : '创建会话失败')
    });
  }
});

/**
 * 发送聊天消息
 * POST /api/chat/sessions/:sessionId/messages
 */
router.post('/sessions/:sessionId/messages', requireFeature('aiChat'), quotaCheck, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id;
    const result = await aiServiceClient.sendMessage(sessionId, userId as string, req.body);

    // 记录 AI 用量
    const tokenUsage = result.token_usage;
    if (userId && tokenUsage?.total_tokens > 0) {
      recordUsage(userId, 'ai', tokenUsage.total_tokens).catch(err => {
        logger.error('记录用量失败:', err);
      });
    }

    res.json(result);
  } catch (error: unknown) {
    logger.error('发送消息失败:', error);
    const axiosErr = error as any;
    res.status(axiosErr.response?.status || 500).json({
      success: false,
      error: axiosErr.response?.data?.detail || (error instanceof Error ? error.message : '发送消息失败')
    });
  }
});

/**
 * 获取会话历史消息
 * GET /api/chat/sessions/:sessionId/messages
 */
router.get('/sessions/:sessionId/messages', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id;
    const { limit, offset } = req.query;
    const history = await aiServiceClient.getChatHistory(
      sessionId,
      userId as string,
      limit ? parseInt(limit as string, 10) : undefined,
      offset ? parseInt(offset as string, 10) : undefined
    );
    res.json(history);
  } catch (error: unknown) {
    logger.error('获取历史消息失败:', error);
    const axiosErr = error as any;
    res.status(axiosErr.response?.status || 500).json({
      success: false,
      error: axiosErr.response?.data?.detail || (error instanceof Error ? error.message : '获取历史消息失败')
    });
  }
});

/**
 * 批量删除对话会话
 * DELETE /api/chat/sessions/batch
 * 注意：此路由必须在 /sessions/:sessionId 之前定义，否则会被错误匹配
 */
router.delete('/sessions/batch', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: '未认证' });
      return;
    }
    const { session_ids } = req.body;
    if (!session_ids || !Array.isArray(session_ids) || session_ids.length === 0) {
      res.status(400).json({
        success: false,
        error: '缺少必需参数: session_ids (必须是非空数组)'
      });
      return;
    }
    const result = await aiServiceClient.batchDeleteSessions(session_ids, userId);
    res.json(result);
  } catch (error: unknown) {
    logger.error('批量删除会话失败:', error);
    const axiosErr = error as any;
    res.status(axiosErr.response?.status || 500).json({
      success: false,
      error: axiosErr.response?.data?.detail || (error instanceof Error ? error.message : '批量删除会话失败')
    });
  }
});

/**
 * 删除对话会话
 * DELETE /api/chat/sessions/:sessionId
 */
router.delete('/sessions/:sessionId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: '未认证' });
      return;
    }
    const result = await aiServiceClient.deleteSession(sessionId, userId);
    res.json(result);
  } catch (error: unknown) {
    logger.error('删除会话失败:', error);
    const axiosErr = error as any;
    res.status(axiosErr.response?.status || 500).json({
      success: false,
      error: axiosErr.response?.data?.detail || (error instanceof Error ? error.message : '删除会话失败')
    });
  }
});

/**
 * 翻译英文文本
 * POST /api/chat/translate
 */
router.post('/translate', requireFeature('textTranslation'), quotaCheck, async (req: Request, res: Response): Promise<void> => {
  try {
    const { text } = req.body;
    if (!text) {
      res.status(400).json({
        success: false,
        error: '缺少必需参数: text'
      });
      return;
    }

    const result = await aiServiceClient.translate(text);

    // 记录 AI 用量
    const userId = req.user?.id;
    const tokenUsage = result.token_usage;
    if (userId && tokenUsage?.total_tokens && tokenUsage.total_tokens > 0) {
      recordUsage(userId, 'ai', tokenUsage.total_tokens).catch(err => {
        logger.error('记录用量失败:', err);
      });
    }

    res.json(result);
  } catch (error: unknown) {
    logger.error('翻译失败:', error);
    const axiosErr = error as any;
    res.status(axiosErr.response?.status || 500).json({
      success: false,
      error: axiosErr.response?.data?.detail || (error instanceof Error ? error.message : '翻译失败')
    });
  }
});

/**
 * 生成单词 AI 解说
 * POST /api/chat/word/explanation
 */
router.post('/word/explanation', requireFeature('wordExplanation'), quotaCheck, async (req: Request, res: Response): Promise<void> => {
  try {
    const { word, phonetic, meanings, examples, collocations, etymology } = req.body;
    if (!word) {
      res.status(400).json({
        success: false,
        error: '缺少必需参数: word'
      });
      return;
    }

    const result = await aiServiceClient.generateWordExplanation({
      word,
      phonetic,
      meanings: meanings || [],
      examples,
      collocations,
      etymology
    });

    // 记录 AI 用量
    const userId = req.user?.id;
    const tokenUsage = result.token_usage;
    if (userId && tokenUsage?.total_tokens && tokenUsage.total_tokens > 0) {
      recordUsage(userId, 'ai', tokenUsage.total_tokens).catch(err => {
        logger.error('记录用量失败:', err);
      });
    }

    res.json(result);
  } catch (error: unknown) {
    logger.error('生成单词解说失败:', error);
    const axiosErr = error as any;
    res.status(axiosErr.response?.status || 500).json({
      success: false,
      error: axiosErr.response?.data?.detail || (error instanceof Error ? error.message : '生成单词解说失败')
    });
  }
});

// ==================== Story Mode ====================

/**
 * 创建剧情会话
 * POST /api/chat/story/sessions
 */
router.post('/story/sessions', requireFeature('story'), quotaCheck, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const result = await aiServiceClient.createStorySession({ ...req.body, user_id: userId });

    // 记录 AI 用量
    const tokenUsage = result.token_usage;
    if (userId && tokenUsage?.total_tokens > 0) {
      recordUsage(userId, 'ai', tokenUsage.total_tokens).catch(err => {
        logger.error('记录用量失败:', err);
      });
    }

    res.json(result);
  } catch (error: unknown) {
    logger.error('创建剧情会话失败:', error);
    const axiosErr = error as any;
    res.status(axiosErr.response?.status || 500).json({
      success: false,
      error: axiosErr.response?.data?.detail || (error instanceof Error ? error.message : '创建剧情会话失败')
    });
  }
});

/**
 * 发送剧情消息
 * POST /api/chat/story/sessions/:sessionId/messages
 */
router.post('/story/sessions/:sessionId/messages', requireFeature('story'), quotaCheck, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id;
    const result = await aiServiceClient.sendStoryMessage(sessionId, userId as string, req.body);

    // 记录 AI 用量
    const tokenUsage = result.token_usage;
    if (userId && tokenUsage?.total_tokens > 0) {
      recordUsage(userId, 'ai', tokenUsage.total_tokens).catch(err => {
        logger.error('记录用量失败:', err);
      });
    }

    res.json(result);
  } catch (error: unknown) {
    logger.error('发送剧情消息失败:', error);
    const axiosErr = error as any;
    res.status(axiosErr.response?.status || 500).json({
      success: false,
      error: axiosErr.response?.data?.detail || (error instanceof Error ? error.message : '发送剧情消息失败')
    });
  }
});

export default router;
