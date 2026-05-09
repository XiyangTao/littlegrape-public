/**
 * AI 自适应学习路径路由
 */

import { Router, Request, Response } from 'express';
import { getLearningPath } from '@/services/learningPathService';
import { logger } from '@/utils/logger';

const router = Router();

/**
 * 获取个性化学习路径推荐
 * GET /api/learning-path
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ success: false, error: '未认证' }); return; }
    const data = await getLearningPath(userId);
    res.json({ success: true, data });
  } catch (error: unknown) {
    logger.error('获取学习路径失败:', error);
    res.status(500).json({ success: false, error: '获取学习路径失败' });
  }
});

export default router;
