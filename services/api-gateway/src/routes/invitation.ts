/**
 * 邀请系统路由
 */

import { Router, Request, Response } from 'express';
import {
  getUserInviteCode,
  applyInviteCode,
  getInvitationList,
  getInvitationStats,
} from '@/services/invitationService';
import { logger } from '@/utils/logger';

const router = Router();

/**
 * 获取我的邀请码
 * GET /api/invitation/code
 */
router.get('/code', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ success: false, error: '未认证' }); return; }
    const code = await getUserInviteCode(userId);
    res.json({ success: true, data: { inviteCode: code } });
  } catch (error: unknown) {
    logger.error('获取邀请码失败:', error);
    res.status(500).json({ success: false, error: '获取邀请码失败' });
  }
});

/**
 * 使用邀请码
 * POST /api/invitation/apply
 * body: { inviteCode: string }
 */
router.post('/apply', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ success: false, error: '未认证' }); return; }
    const { inviteCode } = req.body;
    if (!inviteCode) {
      res.status(400).json({ success: false, error: '缺少邀请码' });
      return;
    }
    const result = await applyInviteCode(userId, inviteCode);
    res.json(result);
  } catch (error: unknown) {
    logger.error('使用邀请码失败:', error);
    res.status(500).json({ success: false, error: '使用邀请码失败' });
  }
});

/**
 * 获取邀请列表
 * GET /api/invitation/list
 */
router.get('/list', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ success: false, error: '未认证' }); return; }
    const list = await getInvitationList(userId);
    res.json({ success: true, data: list });
  } catch (error: unknown) {
    logger.error('获取邀请列表失败:', error);
    res.status(500).json({ success: false, error: '获取邀请列表失败' });
  }
});

/**
 * 获取邀请统计
 * GET /api/invitation/stats
 */
router.get('/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ success: false, error: '未认证' }); return; }
    const stats = await getInvitationStats(userId);
    res.json({ success: true, data: stats });
  } catch (error: unknown) {
    logger.error('获取邀请统计失败:', error);
    res.status(500).json({ success: false, error: '获取邀请统计失败' });
  }
});

export default router;
