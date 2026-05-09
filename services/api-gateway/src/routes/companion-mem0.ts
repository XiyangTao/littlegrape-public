/**
 * 伙伴对话路由 (Mem0 版)
 *
 * 独立于现有 /api/companion，用于 A/B 验证 Mem0 记忆效果。
 * 接口格式与现有 companion 路由保持一致，方便前端切换。
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/utils/logger';
import { recordUsage } from '@/services/usageService';
import { quotaCheck } from '@/middleware/quotaMiddleware';
import { requireFeature } from '@/middleware/requireFeature';
import {
  initThread,
  sendMessage,
  getMemories,
} from '@/services/companionMem0Service';

const router = Router();

/**
 * 获取用户所有伙伴线程（兼容现有前端）
 * GET /api/companion-mem0/threads
 * Mem0 版不用数据库管理线程，返回空列表让前端走 init 流程
 */
router.get('/threads', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: '未认证' });
      return;
    }
    // 返回空列表，前端会对每个角色走 initThread
    res.json({ success: true, data: [] });
  } catch (error) {
    logger.error('[Mem0] 获取线程列表失败:', error);
    res.status(500).json({ success: false, error: '获取线程列表失败' });
  }
});

/**
 * 初始化线程 + 获取欢迎消息
 * POST /api/companion-mem0/threads
 * Body: { characterId }
 */
router.post('/threads', requireFeature('aiChat'), quotaCheck, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: '未认证' });
      return;
    }

    const { characterId } = req.body;
    if (!characterId) {
      res.status(400).json({ success: false, error: '缺少 characterId' });
      return;
    }

    const result = await initThread(userId, characterId);

    // 记录 token 用量
    const tokens = result.tokenUsage?.total_tokens;
    if (tokens && tokens > 0) {
      recordUsage(userId, 'ai', tokens).catch(err => {
        logger.error('记录用量失败:', err);
      });
    }

    // 生成虚拟 id/agnoSessionId 兼容前端 CompanionStore 期望的格式
    res.json({
      success: true,
      data: {
        thread: {
          id: `mem0_${userId}_${characterId}`,
          characterId,
          agnoSessionId: uuidv4(),
          messageCount: 0,
        },
        welcomeMessage: result.welcomeMessage,
      },
    });
  } catch (error) {
    logger.error('[Mem0] 初始化伙伴线程失败:', error);
    res.status(500).json({ success: false, error: '初始化失败' });
  }
});

/**
 * 发送消息
 * POST /api/companion-mem0/threads/:characterId/messages
 * Body: { message }
 */
router.post('/threads/:characterId/messages', requireFeature('aiChat'), quotaCheck, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: '未认证' });
      return;
    }

    const { characterId } = req.params;
    const { message } = req.body;
    if (!message) {
      res.status(400).json({ success: false, error: '缺少 message' });
      return;
    }

    const result = await sendMessage(userId, characterId, message);

    // 记录 token 用量
    const tokens = result.tokenUsage?.total_tokens;
    if (tokens && tokens > 0) {
      recordUsage(userId, 'ai', tokens).catch(err => {
        logger.error('记录用量失败:', err);
      });
    }

    res.json({
      success: true,
      data: {
        messageId: result.messageId,
        content: result.content,
        translation: result.translation,
        tips: result.tips,
        timestamp: result.timestamp,
        responseTime: result.responseTime,
        memoriesUsed: result.memoriesUsed,
      },
    });
  } catch (error) {
    logger.error('[Mem0] 伙伴聊天失败:', error);
    res.status(500).json({ success: false, error: '发送消息失败' });
  }
});

/**
 * 查看 Mem0 记忆（调试用）
 * GET /api/companion-mem0/threads/:characterId/memories
 */
router.get('/threads/:characterId/memories', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: '未认证' });
      return;
    }

    const { characterId } = req.params;
    const result = await getMemories(userId, characterId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('[Mem0] 获取记忆失败:', error);
    res.status(500).json({ success: false, error: '获取记忆失败' });
  }
});

/**
 * 清空聊天记录
 * DELETE /api/companion-mem0/threads/:characterId
 * Mem0 版不需要重置 Agno session，只返回成功让前端清空本地缓存
 */
router.delete('/threads/:characterId', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: '未认证' });
      return;
    }

    // Mem0 的记忆保留（和现有系统一致），只清空前端本地对话记录
    // ai-service 的内存历史会在下次 init 时自动重置
    logger.info(`[Mem0] 清空聊天记录: userId=${userId}, character=${req.params.characterId}`);
    res.json({ success: true });
  } catch (error) {
    logger.error('[Mem0] 清空聊天记录失败:', error);
    res.status(500).json({ success: false, error: '清空失败' });
  }
});

export default router;
