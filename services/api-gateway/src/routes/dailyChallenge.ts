/**
 * 每日挑战赛路由
 */
import { Router, Request, Response } from 'express';
import { getTodayCN } from '@/utils/dateUtils';
import {
  getTodayChallenge,
  submitChallengeResult,
  getLeaderboard,
  getUserStats,
  getUserRank,
} from '@/services/dailyChallengeService';
import { emitAchievementEvent } from '@/events/eventBus';
import { logger } from '@/utils/logger';

const router = Router();

// GET /api/daily-challenge/today
router.get('/today', async (req: Request, res: Response): Promise<void> => {
  try {
    const challenge = await getTodayChallenge();
    res.json({ success: true, data: challenge });
  } catch (error: unknown) {
    logger.error('获取今日挑战失败:', error);
    res.status(500).json({ success: false, error: '获取今日挑战失败' });
  }
});

// POST /api/daily-challenge/submit
router.post('/submit', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ success: false, error: '未认证' }); return; }

    const { date, score, correctCount, totalQuestions, maxCombo, duration } = req.body;

    const result = await submitChallengeResult(
      userId, date, score, correctCount, totalQuestions, maxCombo, duration
    );

    // 触发成就事件（推进每日任务进度）
    emitAchievementEvent(userId, 'daily_challenge_done', {
      score, correctCount, totalQuestions, maxCombo,
    });

    // 获取排名
    const rank = await getUserRank(userId, date);

    res.json({ success: true, data: { ...result, rank } });
  } catch (error: unknown) {
    logger.error('提交挑战结果失败:', error);
    res.status(500).json({ success: false, error: '提交失败' });
  }
});

// GET /api/daily-challenge/leaderboard?date=YYYY-MM-DD
router.get('/leaderboard', async (req: Request, res: Response): Promise<void> => {
  try {
    const date = (req.query.date as string) || getTodayCN();
    const leaderboard = await getLeaderboard(date);

    // 如果已登录，附加用户排名
    const userId = req.user?.id;
    let myRank = null;
    if (userId) {
      myRank = await getUserRank(userId, date);
    }

    res.json({ success: true, data: { leaderboard, myRank } });
  } catch (error: unknown) {
    logger.error('获取排行榜失败:', error);
    res.status(500).json({ success: false, error: '获取排行榜失败' });
  }
});

// GET /api/daily-challenge/my-stats
router.get('/my-stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ success: false, error: '未认证' }); return; }

    const stats = await getUserStats(userId);
    res.json({ success: true, data: stats });
  } catch (error: unknown) {
    logger.error('获取用户统计失败:', error);
    res.status(500).json({ success: false, error: '获取统计失败' });
  }
});

export default router;
