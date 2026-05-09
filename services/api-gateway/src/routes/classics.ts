/**
 * 名著精读路由
 *
 * 认证：所有 /api/* 路由由 index.ts 的全局 routeGuard 中间件统一处理登录校验（详见 src/index.ts:104）。
 * 下方 handler 里的 `if (!userId) return 401` 是二次防御，防止全局中间件被误移除时兜底。
 * 若将来调整中间件架构，请确保本文件所有 handler 仍有登录校验。
 */

import { Router, Request, Response } from 'express';
import {
  listBooks,
  getBookDetail,
  getChapterContent,
  getRecentReadings,
  getBookProgress,
  upsertBookProgress,
  getAllBookProgress,
} from '@/services/classicsService';
import { checkClassicsAccess } from '@/services/classicsAccessService';
import { logger } from '@/utils/logger';

const router = Router();

/**
 * 书架 — 分页名著列表
 * GET /api/classics/books?level=beginner&cursor=xxx&limit=20
 */
router.get('/books', async (req: Request, res: Response): Promise<void> => {
  try {
    const { level, cursor, limit } = req.query;
    const page = await listBooks({
      level: level ? String(level) : undefined,
      cursor: cursor ? String(cursor) : undefined,
      limit: limit ? parseInt(String(limit), 10) : undefined,
    });
    res.json({ success: true, data: page });
  } catch (error) {
    logger.error('获取名著列表失败:', error);
    res.status(500).json({ success: false, error: '获取名著列表失败' });
  }
});

/**
 * 书详情 + 章节目录
 * GET /api/classics/books/:slug
 */
router.get('/books/:slug', async (req: Request, res: Response): Promise<void> => {
  try {
    const book = await getBookDetail(req.params.slug);
    if (!book) {
      res.status(404).json({ success: false, error: '书籍不存在' });
      return;
    }
    res.json({ success: true, data: book });
  } catch (error) {
    logger.error('获取书详情失败:', error);
    res.status(500).json({ success: false, error: '获取书详情失败' });
  }
});

/**
 * 章节正文（段落列表）
 * GET /api/classics/books/:slug/chapters/:n
 */
router.get('/books/:slug/chapters/:n', async (req: Request, res: Response): Promise<void> => {
  try {
    const n = parseInt(req.params.n, 10);
    if (!Number.isFinite(n) || n < 1) {
      res.status(400).json({ success: false, error: '章节号无效' });
      return;
    }
    // 会员权限：FREE_CLASSICS_SLUGS 里的书全书免费，其他书均需 basic+
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }
    const access = await checkClassicsAccess(userId, 'readChapter', n, req.params.slug);
    if (!access.allowed) {
      res.status(403).json({ success: false, error: 'UPGRADE_REQUIRED', reason: access.reason });
      return;
    }
    const chapter = await getChapterContent(req.params.slug, n);
    if (!chapter) {
      res.status(404).json({ success: false, error: '章节不存在' });
      return;
    }
    res.json({ success: true, data: chapter });
  } catch (error) {
    logger.error('获取章节失败:', error);
    res.status(500).json({ success: false, error: '获取章节失败' });
  }
});

// ==================== 阅读进度 ====================

/**
 * 所有书的进度摘要（书架批量展示用）
 * GET /api/classics/progress
 */
router.get('/progress', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }
    const progress = await getAllBookProgress(userId);
    res.json({ success: true, data: { progress } });
  } catch (error) {
    logger.error('获取全部进度失败:', error);
    res.status(500).json({ success: false, error: '获取全部进度失败' });
  }
});

/**
 * 最近在读（续读 Hero / 首页横滑）
 * GET /api/classics/progress/recent?limit=10
 */
router.get('/progress/recent', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 10;
    const books = await getRecentReadings(userId, limit);
    res.json({ success: true, data: { books } });
  } catch (error) {
    logger.error('获取最近在读失败:', error);
    res.status(500).json({ success: false, error: '获取最近在读失败' });
  }
});

/**
 * 单本书进度
 * GET /api/classics/books/:slug/progress
 */
router.get('/books/:slug/progress', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }
    const progress = await getBookProgress(userId, req.params.slug);
    res.json({ success: true, data: progress });
  } catch (error) {
    logger.error('获取书进度失败:', error);
    res.status(500).json({ success: false, error: '获取书进度失败' });
  }
});

/**
 * 上报/更新阅读进度
 * PUT /api/classics/books/:slug/progress
 * Body: { chapterNumber, paraIndex, sentenceIndex?, addedSeconds?, chapterCompleted? }
 */
router.put('/books/:slug/progress', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }
    const { chapterNumber, paraIndex, sentenceIndex, addedSeconds, chapterCompleted } = req.body || {};
    if (!Number.isFinite(chapterNumber) || chapterNumber < 1) {
      res.status(400).json({ success: false, error: 'chapterNumber 无效' });
      return;
    }
    const progress = await upsertBookProgress(userId, req.params.slug, {
      chapterNumber: Math.floor(chapterNumber),
      paraIndex: Math.max(0, Math.floor(Number(paraIndex) || 0)),
      sentenceIndex: Math.max(0, Math.floor(Number(sentenceIndex) || 0)),
      addedSeconds: Number(addedSeconds) || 0,
      chapterCompleted: Boolean(chapterCompleted),
    });
    if (!progress) {
      res.status(404).json({ success: false, error: '书籍或章节不存在' });
      return;
    }
    res.json({ success: true, data: progress });
  } catch (error) {
    logger.error('更新书进度失败:', error);
    res.status(500).json({ success: false, error: '更新书进度失败' });
  }
});

export default router;
