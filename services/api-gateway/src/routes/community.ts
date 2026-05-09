/**
 * 学习社区路由
 */

import { Router, Request, Response } from 'express';
import {
  createPost, getPostList, getPostDetail, deletePost,
  addComment, getComments, toggleLike, getUserLikedPostIds,
} from '@/services/communityService';
import { logger } from '@/utils/logger';

const router = Router();

/**
 * 获取帖子列表
 * GET /api/community/posts?page=1&type=share
 */
router.get('/posts', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const type = req.query.type as string | undefined;
    const userId = req.user?.id;
    const result = await getPostList(page, 20, type);

    // 查询当前用户的点赞状态
    let likedPostIds = new Set<string>();
    if (userId) {
      likedPostIds = await getUserLikedPostIds(userId, result.posts.map(p => p.id));
    }

    const posts = result.posts.map(post => ({
      ...post,
      isLiked: likedPostIds.has(post.id),
    }));

    res.json({ success: true, data: { ...result, posts } });
  } catch (error: unknown) {
    logger.error('获取帖子列表失败:', error);
    res.status(500).json({ success: false, error: '获取帖子列表失败' });
  }
});

/**
 * 获取帖子详情
 * GET /api/community/posts/:id
 */
router.get('/posts/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const post = await getPostDetail(req.params.id);
    if (!post) { res.status(404).json({ success: false, error: '帖子不存在' }); return; }

    // 检查当前用户是否已点赞
    let isLiked = false;
    if (req.user?.id) {
      const likedIds = await getUserLikedPostIds(req.user.id, [post.id]);
      isLiked = likedIds.has(post.id);
    }

    res.json({ success: true, data: { ...post, isLiked } });
  } catch (error: unknown) {
    logger.error('获取帖子详情失败:', error);
    res.status(500).json({ success: false, error: '获取帖子详情失败' });
  }
});

/**
 * 发布帖子
 * POST /api/community/posts
 */
router.post('/posts', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ success: false, error: '未认证' }); return; }
    const { type, content, images, tags } = req.body;
    if (!content || content.trim().length < 5) {
      res.status(400).json({ success: false, error: '内容至少5个字符' }); return;
    }
    const post = await createPost({ userId, type: type || 'share', content, images, tags });
    res.json({ success: true, data: post });
  } catch (error: unknown) {
    logger.error('发布帖子失败:', error);
    res.status(500).json({ success: false, error: '发布帖子失败' });
  }
});

/**
 * 删除帖子
 * DELETE /api/community/posts/:id
 */
router.delete('/posts/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ success: false, error: '未认证' }); return; }
    await deletePost(req.params.id, userId);
    res.json({ success: true });
  } catch (error: unknown) {
    logger.error('删除帖子失败:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '删除帖子失败' });
  }
});

/**
 * 获取评论列表
 * GET /api/community/posts/:id/comments?page=1
 */
router.get('/posts/:id/comments', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const result = await getComments(req.params.id, page);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    logger.error('获取评论失败:', error);
    res.status(500).json({ success: false, error: '获取评论失败' });
  }
});

/**
 * 添加评论
 * POST /api/community/posts/:id/comments
 */
router.post('/posts/:id/comments', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ success: false, error: '未认证' }); return; }
    const { content, parentId } = req.body;
    if (!content || content.trim().length === 0) {
      res.status(400).json({ success: false, error: '评论内容不能为空' }); return;
    }
    const comment = await addComment(req.params.id, userId, content, parentId);
    res.json({ success: true, data: comment });
  } catch (error: unknown) {
    logger.error('添加评论失败:', error);
    res.status(500).json({ success: false, error: '添加评论失败' });
  }
});

/**
 * 切换点赞
 * POST /api/community/posts/:id/like
 */
router.post('/posts/:id/like', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ success: false, error: '未认证' }); return; }
    const result = await toggleLike(req.params.id, userId);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    logger.error('点赞操作失败:', error);
    res.status(500).json({ success: false, error: '操作失败' });
  }
});

export default router;
