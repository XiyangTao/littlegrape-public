import { Router } from 'express';
import { greetingService } from '@/services/greetingService';
import { logger } from '@/utils/logger';

const router = Router();

/**
 * GET /api/greeting/daily
 * 获取每日欢迎语
 */
router.get('/daily', async (req, res) => {
  try {
    logger.info('Fetching daily greeting');

    const greeting = await greetingService.getDailyGreeting(req.user?.id || '');

    res.json({
      success: true,
      data: greeting
    });

  } catch (error) {
    logger.error('Failed to fetch daily greeting:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to fetch daily greeting'
    });
  }
});

export default router;