/**
 * 每日/每周任务路由
 * GET  /api/tasks/daily          → 获取当天任务列表（自动生成）
 * POST /api/tasks/:taskId/claim  → 领取单任务奖励
 * POST /api/tasks/daily-bonus    → 领取全部完成额外奖励
 */

import { Router, Request, Response } from 'express';
import { logger } from '@/utils/logger';
import {
  getOrCreateDailyTasks,
  claimTaskReward,
  claimDailyBonus,
} from '@/services/dailyTaskService';

const router = Router();

/**
 * 获取当天每日任务 + 本周每周任务
 * GET /api/tasks/daily
 */
router.get('/daily', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: '未认证' });
      return;
    }

    const data = await getOrCreateDailyTasks(userId);
    res.json({ success: true, data });
  } catch (error) {
    logger.error('获取每日任务失败:', error);
    res.status(500).json({ success: false, error: '获取每日任务失败' });
  }
});

/**
 * 领取单任务奖励
 * POST /api/tasks/:taskId/claim
 */
router.post('/:taskId/claim', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: '未认证' });
      return;
    }

    const { taskId } = req.params;
    const result = await claimTaskReward(userId, taskId);

    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('领取任务奖励失败:', error);
    res.status(500).json({ success: false, error: '领取任务奖励失败' });
  }
});

/**
 * 领取每日全部完成额外奖励
 * POST /api/tasks/daily-bonus
 */
router.post('/daily-bonus', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: '未认证' });
      return;
    }

    const result = await claimDailyBonus(userId);

    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('领取每日奖励失败:', error);
    res.status(500).json({ success: false, error: '领取每日奖励失败' });
  }
});

export default router;
