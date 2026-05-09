/**
 * AI 学习助手路由
 */

import { Router, Request, Response } from 'express';
import { logger } from '@/utils/logger';
import { quotaCheck } from '@/middleware/quotaMiddleware';
import { requireFeature } from '@/middleware/requireFeature';
import { chat, getMessages } from '@/services/assistantService';
import { getOrRefreshMemory } from '@/services/assistantMemoryService';
import { prisma } from '@/config/database';

const router = Router();

/**
 * 发送消息并获取 AI 回复
 * POST /api/assistant/chat
 */
router.post('/chat', requireFeature('aiChat'), quotaCheck, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: '未认证' });
      return;
    }

    const { message, metadata } = req.body;
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      res.status(400).json({ success: false, error: '缺少消息内容' });
      return;
    }

    if (message.trim().length > 500) {
      res.status(400).json({ success: false, error: '消息内容不能超过500字' });
      return;
    }

    const result = await chat(userId, message.trim(), metadata);

    res.json({
      success: true,
      ...result,
    });
  } catch (error: unknown) {
    const axiosErr = error as any;
    const errMsg = axiosErr?.response?.data?.detail || (error instanceof Error ? error.message : '助手聊天失败');
    logger.error('助手聊天失败:', { message: errMsg, status: axiosErr?.response?.status });
    res.status(axiosErr?.response?.status || 500).json({
      success: false,
      error: typeof errMsg === 'string' ? errMsg : '助手聊天失败',
    });
  }
});

/**
 * 获取历史消息
 * GET /api/assistant/messages
 */
router.get('/messages', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: '未认证' });
      return;
    }

    const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 50);
    const offset = parseInt(req.query.offset as string, 10) || 0;

    const result = await getMessages(userId, limit, offset);

    res.json({ success: true, ...result });
  } catch (error: unknown) {
    logger.error('获取助手消息失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取助手消息失败',
    });
  }
});

/**
 * 获取未读通知列表
 * GET /api/assistant/pushes
 */
router.get('/pushes', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: '未认证' });
      return;
    }

    const notifications = await prisma.userNotification.findMany({
      where: { userId, isRead: false },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        type: true,
        channel: true,
        content: true,
        isRead: true,
        createdAt: true,
      },
    });

    res.json({
      success: true,
      pushes: notifications.map(n => ({
        ...n,
        createdAt: n.createdAt.toISOString(),
      })),
    });
  } catch (error: unknown) {
    logger.error('获取未读通知失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取未读通知失败',
    });
  }
});

/**
 * 标记推送已读
 * POST /api/assistant/pushes/read
 */
router.post('/pushes/read', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: '未认证' });
      return;
    }

    const { pushIds } = req.body;

    if (pushIds && Array.isArray(pushIds) && pushIds.length > 0) {
      // 标记指定通知
      await prisma.userNotification.updateMany({
        where: { id: { in: pushIds }, userId },
        data: { isRead: true, readAt: new Date() },
      });
    } else {
      // 全部标记已读
      await prisma.userNotification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true, readAt: new Date() },
      });
    }

    res.json({ success: true });
  } catch (error: unknown) {
    logger.error('标记推送已读失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '标记推送已读失败',
    });
  }
});

/**
 * 注册/更新 Expo Push Token
 * POST /api/assistant/push-token
 */
router.post('/push-token', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: '未认证' });
      return;
    }

    const { token, platform } = req.body;
    if (!token) {
      res.status(400).json({ success: false, error: '缺少 token' });
      return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        pushToken: token,
        pushPlatform: platform || 'ios',
      },
    });

    res.json({ success: true });
  } catch (error: unknown) {
    logger.error('注册 push token 失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '注册 push token 失败',
    });
  }
});

/**
 * 注销 Push Token
 * DELETE /api/assistant/push-token
 */
router.delete('/push-token', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: '未认证' });
      return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { pushToken: null, pushPlatform: null },
    });

    res.json({ success: true });
  } catch (error: unknown) {
    logger.error('注销 push token 失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '注销 push token 失败',
    });
  }
});

/**
 * 获取记忆快照（调试用）
 * GET /api/assistant/memory
 */
router.get('/memory', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: '未认证' });
      return;
    }

    const memory = await getOrRefreshMemory(userId);
    res.json({ success: true, memory });
  } catch (error: unknown) {
    logger.error('获取记忆快照失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取记忆快照失败',
    });
  }
});

/**
 * 清空聊天记录
 * DELETE /api/assistant/messages
 */
router.delete('/messages', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: '未认证' });
      return;
    }
    await prisma.assistantMessage.deleteMany({ where: { userId } });
    res.json({ success: true });
  } catch (error: unknown) {
    logger.error('清空助手消息失败:', { message: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '清空消息失败' });
  }
});

export default router;
