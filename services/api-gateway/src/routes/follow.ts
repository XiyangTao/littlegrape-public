/**
 * 关注系统路由
 */

import { Router, Request, Response } from 'express';
import * as followService from '@/services/followService';
import { logger } from '@/utils/logger';

const router = Router();

/**
 * 关注用户
 * POST /api/follow/:userId
 */
router.post('/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const followerId = req.user!.id;
    const followingId = req.params.userId;
    await followService.followUser(followerId, followingId);
    res.json({ success: true });
  } catch (error: any) {
    if (error.message === 'cannot_follow_self') {
      res.status(400).json({ success: false, error: '不能关注自己' });
      return;
    }
    logger.error('关注用户失败:', error);
    res.status(500).json({ success: false, error: '关注失败' });
  }
});

/**
 * 取消关注
 * DELETE /api/follow/:userId
 */
router.delete('/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const followerId = req.user!.id;
    const followingId = req.params.userId;
    await followService.unfollowUser(followerId, followingId);
    res.json({ success: true });
  } catch (error: unknown) {
    logger.error('取消关注失败:', error);
    res.status(500).json({ success: false, error: '取消关注失败' });
  }
});

/**
 * 我的关注列表
 * GET /api/follow/following?cursor=xxx&limit=20
 */
router.get('/following', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const cursor = req.query.cursor as string | undefined;
    const limit = parseInt(req.query.limit as string) || 20;
    const data = await followService.getFollowingList(userId, { cursor, limit });
    res.json({ success: true, data });
  } catch (error: unknown) {
    logger.error('获取关注列表失败:', error);
    res.status(500).json({ success: false, error: '获取关注列表失败' });
  }
});

/**
 * 我的粉丝列表
 * GET /api/follow/followers?cursor=xxx&limit=20
 */
router.get('/followers', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const cursor = req.query.cursor as string | undefined;
    const limit = parseInt(req.query.limit as string) || 20;
    const data = await followService.getFollowerList(userId, { cursor, limit });
    res.json({ success: true, data });
  } catch (error: unknown) {
    logger.error('获取粉丝列表失败:', error);
    res.status(500).json({ success: false, error: '获取粉丝列表失败' });
  }
});

/**
 * 互关好友列表
 * GET /api/follow/mutual?cursor=xxx&limit=20
 */
router.get('/mutual', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const cursor = req.query.cursor as string | undefined;
    const limit = parseInt(req.query.limit as string) || 20;
    const data = await followService.getMutualList(userId, { cursor, limit });
    res.json({ success: true, data });
  } catch (error: unknown) {
    logger.error('获取互关列表失败:', error);
    res.status(500).json({ success: false, error: '获取互关列表失败' });
  }
});

/**
 * 查看某人的关注列表
 * GET /api/follow/:userId/following?cursor=xxx&limit=20
 */
router.get('/:userId/following', async (req: Request, res: Response): Promise<void> => {
  try {
    const viewerId = req.user!.id;
    const userId = req.params.userId;
    const cursor = req.query.cursor as string | undefined;
    const limit = parseInt(req.query.limit as string) || 20;
    const data = await followService.getFollowingList(userId, { cursor, limit }, viewerId);
    res.json({ success: true, data });
  } catch (error: unknown) {
    logger.error('获取用户关注列表失败:', error);
    res.status(500).json({ success: false, error: '获取关注列表失败' });
  }
});

/**
 * 查看某人的粉丝列表
 * GET /api/follow/:userId/followers?cursor=xxx&limit=20
 */
router.get('/:userId/followers', async (req: Request, res: Response): Promise<void> => {
  try {
    const viewerId = req.user!.id;
    const userId = req.params.userId;
    const cursor = req.query.cursor as string | undefined;
    const limit = parseInt(req.query.limit as string) || 20;
    const data = await followService.getFollowerList(userId, { cursor, limit }, viewerId);
    res.json({ success: true, data });
  } catch (error: unknown) {
    logger.error('获取用户粉丝列表失败:', error);
    res.status(500).json({ success: false, error: '获取粉丝列表失败' });
  }
});

/**
 * 搜索用户
 * GET /api/follow/search?keyword=xxx&cursor=xxx&limit=20
 */
router.get('/search', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const keyword = (req.query.keyword as string) || '';
    const cursor = req.query.cursor as string | undefined;
    const limit = parseInt(req.query.limit as string) || 20;
    const data = await followService.searchUsers(keyword, userId, { cursor, limit });
    res.json({ success: true, data });
  } catch (error: unknown) {
    logger.error('搜索用户失败:', error);
    res.status(500).json({ success: false, error: '搜索用户失败' });
  }
});

export default router;
