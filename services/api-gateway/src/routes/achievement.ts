/**
 * 成就系统路由
 */

import { Router, Request, Response } from 'express';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { redisClient } from '@/config/redis';
import {
  getUserLevel,
  getUserAchievementsWithProgress,
  getLevelTitle,
  XP_REWARDS,
  processAchievementEvent,
  recheckAllAchievements,
  getUnreadNotifications,
  markNotificationsRead,
  claimDailyTaskBonus,
} from '@/services/achievementService';
import { getShowcase, setShowcase, getAchievementLeaderboard } from '@/services/showcaseService';
import { logger } from '@/utils/logger';

const router = Router();

// /xp 端点限流：每用户每分钟 30 次
const xpRateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'rl_achievement_xp',
  points: 30,
  duration: 60,
});

// /check 端点限流：每用户每分钟 5 次（高消耗操作，更严格限流）
const checkRateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'rl_achievement_check',
  points: 5,
  duration: 60,
});

/**
 * 获取用户等级信息
 * GET /api/achievement/level
 */
router.get('/level', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ success: false, error: '未认证' }); return; }
    const level = await getUserLevel(userId);
    const title = getLevelTitle(level.level);
    const titleEn = getLevelTitle(level.level, 'en');
    res.json({ success: true, data: { ...level, title, titleEn } });
  } catch (error: unknown) {
    logger.error('获取等级信息失败:', error);
    res.status(500).json({ success: false, error: '获取等级信息失败' });
  }
});

/**
 * 获取用户成就列表
 * GET /api/achievement/list
 */
router.get('/list', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ success: false, error: '未认证' }); return; }
    const achievements = await getUserAchievementsWithProgress(userId);
    res.json({ success: true, data: achievements });
  } catch (error: unknown) {
    logger.error('获取成就列表失败:', error);
    res.status(500).json({ success: false, error: '获取成就列表失败' });
  }
});

/**
 * 增加经验值（通过事件总线触发）
 * POST /api/achievement/xp
 * body: { action: 'word_learned' | 'word_mastered' | ... }
 */
router.post('/xp', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ success: false, error: '未认证' }); return; }

    // 限流检查
    try {
      await xpRateLimiter.consume(userId);
    } catch {
      res.status(429).json({ success: false, error: '请求过于频繁，请稍后再试' });
      return;
    }

    const { action } = req.body;
    if (!XP_REWARDS[action]) {
      res.status(400).json({ success: false, error: '无效的 action' });
      return;
    }
    const result = await processAchievementEvent(userId, action);
    if (!result) {
      res.status(500).json({ success: false, error: '处理成就事件失败' });
      return;
    }
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    logger.error('增加经验值失败:', error);
    res.status(500).json({ success: false, error: '增加经验值失败' });
  }
});

/**
 * 检查并解锁成就（纯只读，不递增计数器）
 * POST /api/achievement/check
 */
router.post('/check', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ success: false, error: '未认证' }); return; }

    // 限流检查
    try {
      await checkRateLimiter.consume(userId);
    } catch {
      res.status(429).json({ success: false, error: '请求过于频繁，请稍后再试' });
      return;
    }

    const result = await recheckAllAchievements(userId);

    res.json({
      success: true,
      data: { newlyUnlocked: result.newAchievements.map(a => a.id) },
      achievementEvent: result,
    });
  } catch (error: unknown) {
    logger.error('检查成就失败:', error);
    res.status(500).json({ success: false, error: '检查成就失败' });
  }
});

/**
 * 获取未读成就通知
 * GET /api/achievement/notifications
 */
router.get('/notifications', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ success: false, error: '未认证' }); return; }

    const notifications = await getUnreadNotifications(userId);
    res.json({ success: true, data: notifications });
  } catch (error: unknown) {
    logger.error('获取成就通知失败:', error);
    res.status(500).json({ success: false, error: '获取成就通知失败' });
  }
});

/**
 * 标记通知已读（ACK 确认）
 * POST /api/achievement/notifications/read
 * body: { achievementIds: string[] }
 */
router.post('/notifications/read', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ success: false, error: '未认证' }); return; }

    const { achievementIds } = req.body;
    if (!Array.isArray(achievementIds) || achievementIds.length === 0 || !achievementIds.every(id => typeof id === 'string')) {
      res.status(400).json({ success: false, error: '无效的 achievementIds' });
      return;
    }
    if (achievementIds.length > 100) {
      res.status(400).json({ success: false, error: 'achievementIds 数量不能超过 100 个' });
      return;
    }

    await markNotificationsRead(userId, achievementIds);
    res.json({ success: true });
  } catch (error: unknown) {
    logger.error('标记通知已读失败:', error);
    res.status(500).json({ success: false, error: '标记通知已读失败' });
  }
});

/**
 * 领取每日任务完成奖励
 * POST /api/achievement/daily-bonus
 */
router.post('/daily-bonus', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ success: false, error: '未认证' }); return; }

    const result = await claimDailyTaskBonus(userId);
    if (!result) {
      res.json({ success: true, data: { xpAwarded: 0, alreadyClaimed: true } });
      return;
    }

    res.json({ success: true, data: result });
  } catch (error: unknown) {
    logger.error('领取每日任务奖励失败:', error);
    res.status(500).json({ success: false, error: '领取奖励失败' });
  }
});

// ==================== 展柜 ====================

/**
 * 获取用户展柜
 * GET /api/achievement/showcase/:userId
 */
router.get('/showcase/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const showcase = await getShowcase(userId);
    res.json({ success: true, data: showcase });
  } catch (error: unknown) {
    logger.error('获取展柜失败:', error);
    res.status(500).json({ success: false, error: '获取展柜失败' });
  }
});

/**
 * 设置展柜
 * POST /api/achievement/showcase
 * body: { slots: [{ slotIndex: number, achievementId: string }] }
 */
router.post('/showcase', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ success: false, error: '未认证' }); return; }

    const { slots } = req.body;
    if (!Array.isArray(slots) || slots.length === 0 || slots.length > 5) {
      res.status(400).json({ success: false, error: '无效的展柜数据' });
      return;
    }

    const result = await setShowcase(userId, slots);
    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }

    res.json({ success: true });
  } catch (error: unknown) {
    logger.error('设置展柜失败:', error);
    res.status(500).json({ success: false, error: '设置展柜失败' });
  }
});

// ==================== 成就排行榜 ====================

/**
 * 获取成就排行榜
 * GET /api/achievement/leaderboard
 */
router.get('/leaderboard', async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 50);
    const data = await getAchievementLeaderboard(limit);
    res.json({ success: true, data });
  } catch (error: unknown) {
    logger.error('获取成就排行榜失败:', error);
    res.status(500).json({ success: false, error: '获取排行榜失败' });
  }
});

export default router;
