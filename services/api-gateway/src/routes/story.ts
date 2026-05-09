/**
 * 剧情路由
 * 剧情练习模式 API
 */

import { Router, Request, Response } from 'express';
import {
  getStoryLines,
  getStoryLine,
  getEpisodeConfig,
  getUserStoryProgress,
  updateEpisodeProgress,
  getStoryLineIdByEpisodeId,
} from '@/services/storyService';
import { aiServiceClient } from '@/clients/aiServiceClient';
import { quotaCheck } from '@/middleware/quotaMiddleware';
import { requireFeature } from '@/middleware/requireFeature';
import { recordUsage } from '@/services/usageService';
import { logger } from '@/utils/logger';

const router = Router();

/**
 * 获取故事线列表
 * GET /api/story/list
 */
router.get('/list', async (_req: Request, res: Response): Promise<void> => {
  try {
    const stories = await getStoryLines();
    res.json({ success: true, data: stories });
  } catch (error: unknown) {
    logger.error('获取故事线列表失败:', error);
    res.status(500).json({ success: false, error: '获取故事线列表失败' });
  }
});

/**
 * 获取用户剧情进度（放在 /:storyLineId 之前避免被拦截）
 * GET /api/story/progress
 */
router.get('/progress', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: '未认证' });
      return;
    }

    const progress = await getUserStoryProgress(userId);
    res.json({ success: true, data: progress });
  } catch (error: unknown) {
    logger.error('获取剧情进度失败:', error);
    res.status(500).json({ success: false, error: '获取剧情进度失败' });
  }
});

/**
 * 更新剧集进度
 * POST /api/story/progress
 * Body: { storyLineId, episodeId, status?, stars?, grade?, answers? }
 */
router.post('/progress', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: '未认证' });
      return;
    }

    const { episodeId, status, stars, grade, answers } = req.body;
    if (!episodeId) {
      res.status(400).json({ success: false, error: '缺少 episodeId' });
      return;
    }

    // storyLineId 可选，没传则从 episodeId 自动查
    const storyLineId = req.body.storyLineId || await getStoryLineIdByEpisodeId(episodeId);
    if (!storyLineId) {
      res.status(404).json({ success: false, error: 'Episode not found' });
      return;
    }

    const result = await updateEpisodeProgress(userId, storyLineId, episodeId, {
      status,
      stars,
      grade,
      answers,
    });

    res.json({ success: true, data: result });
  } catch (error: unknown) {
    logger.error('更新剧情进度失败:', error);
    res.status(500).json({ success: false, error: '更新剧情进度失败' });
  }
});

/**
 * 获取 episode 完整配置（剧本 + 学习点 + 题目）
 * GET /api/story/episodes/:episodeId
 */
router.get('/episodes/:episodeId', async (req: Request, res: Response): Promise<void> => {
  try {
    const config = await getEpisodeConfig(req.params.episodeId);
    if (!config) {
      res.status(404).json({ success: false, error: 'Episode not found or not published' });
      return;
    }
    res.json({ success: true, data: config });
  } catch (error: unknown) {
    logger.error('获取 episode 配置失败:', error);
    res.status(500).json({ success: false, error: 'Failed to get episode config' });
  }
});

/**
 * 对话题评估（运行时 AI 评估，仍由 ai-service 处理）
 * POST /api/story/evaluate
 */
router.post('/evaluate', requireFeature('story'), quotaCheck, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const result = await aiServiceClient.evaluateStoryConversation(req.body);

    // 记录 AI 用量
    const totalTokens = result?.token_usage?.total_tokens;
    if (userId && totalTokens && totalTokens > 0) {
      recordUsage(userId, 'ai', totalTokens).catch((e: unknown) =>
        logger.error('记录用量失败:', e)
      );
    }

    res.json({ success: true, data: result });
  } catch (error: unknown) {
    logger.error('对话评估失败:', error);
    const axiosErr = error as any;
    res.status(axiosErr.response?.status || 500).json({
      success: false,
      error: axiosErr.response?.data?.detail || 'Evaluation failed',
    });
  }
});

/**
 * 获取单个故事线详情
 * GET /api/story/:storyLineId
 */
router.get('/:storyLineId', async (req: Request, res: Response): Promise<void> => {
  try {
    const story = await getStoryLine(req.params.storyLineId);
    if (!story) {
      res.status(404).json({ success: false, error: '故事线不存在' });
      return;
    }
    res.json({ success: true, data: story });
  } catch (error: unknown) {
    logger.error('获取故事线详情失败:', error);
    res.status(500).json({ success: false, error: '获取故事线详情失败' });
  }
});

export default router;
