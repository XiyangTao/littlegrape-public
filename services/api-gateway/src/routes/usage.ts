/**
 * 用量统计路由
 * GET /api/usage - 获取用户用量统计
 */

import { Router, Request, Response } from 'express';
import { logger } from '@/utils/logger';
import { getTodayCN, getNDaysAgoCN } from '@/utils/dateUtils';
import { getUserUsageStats, getUsageHistory } from '@/services/usageService';

const router = Router();

/**
 * GET /api/usage
 * 获取用户用量统计（今日、当月、按服务分类）
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: '未认证' });
      return;
    }

    const stats = await getUserUsageStats(userId);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('获取用量统计失败:', error);
    res.status(500).json({
      success: false,
      error: '获取用量统计失败'
    });
  }
});

/**
 * GET /api/usage/history
 * 获取用户用量历史（按日期范围）
 */
router.get('/history', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: '未认证' });
      return;
    }

    const { start_date, end_date, service_type } = req.query;

    const startDate = (start_date as string) || getNDaysAgoCN(30);
    const endDate = (end_date as string) || getTodayCN();

    const history = await getUsageHistory(
      userId,
      startDate,
      endDate,
      service_type as 'ai' | 'tts' | 'asr' | undefined
    );

    res.json({
      success: true,
      data: {
        start_date: startDate,
        end_date: endDate,
        records: history
      }
    });

  } catch (error) {
    logger.error('获取用量历史失败:', error);
    res.status(500).json({
      success: false,
      error: '获取用量历史失败'
    });
  }
});

export default router;
