/**
 * 排行榜路由
 */

import { Router, Request, Response } from 'express';
import { getLeaderboard, getUserRank, LeaderboardType, LeaderboardPeriod, LeaderboardScope } from '@/services/leaderboardService';
import { logger } from '@/utils/logger';

const router = Router();

/**
 * 获取排行榜
 * GET /api/leaderboard?type=learned&period=week
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const type = (req.query.type as LeaderboardType) || 'learned';
    const period = (req.query.period as LeaderboardPeriod) || 'week';
    const scopeParam = req.query.scope as string | undefined;
    const scope: LeaderboardScope | undefined =
      scopeParam === 'following' && req.user?.id
        ? { type: 'following', userId: req.user.id }
        : undefined;
    const data = await getLeaderboard(type, period, 50, scope);
    res.json({ success: true, data });
  } catch (error: unknown) {
    logger.error('获取排行榜失败:', error);
    res.status(500).json({ success: false, error: '获取排行榜失败' });
  }
});

/**
 * 获取用户排名
 * GET /api/leaderboard/rank?type=learned&period=week
 */
router.get('/rank', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ success: false, error: '未认证' }); return; }
    const type = (req.query.type as LeaderboardType) || 'learned';
    const period = (req.query.period as LeaderboardPeriod) || 'week';
    const rank = await getUserRank(userId, type, period);
    res.json({ success: true, data: { rank } });
  } catch (error: unknown) {
    logger.error('获取用户排名失败:', error);
    res.status(500).json({ success: false, error: '获取用户排名失败' });
  }
});

export default router;
