/**
 * 精读路由
 */

import { Router, Request, Response } from 'express';
import {
  getArticleList,
  getArticleMonths,
  getArticleDetail,
  getUserReadingProgress,
  updateReadingProgress,
  getDailyReading,
  getIntensiveArticle,
  submitQuiz,
  updateReadingStep,
} from '@/services/readingService';
import { logger } from '@/utils/logger';
import { emitAchievementEvent } from '@/events/eventBus';

const router = Router();

/**
 * 获取文章列表
 * GET /api/reading/articles
 */
router.get('/articles', async (req: Request, res: Response): Promise<void> => {
  try {
    const { level, category, yearMonth, cursor, limit } = req.query;
    const result = await getArticleList({
      level: level as string,
      category: category as string,
      yearMonth: yearMonth as string,
      cursor: cursor as string,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    logger.error('获取文章列表失败:', error);
    res.status(500).json({ success: false, error: '获取文章列表失败' });
  }
});

/**
 * 获取有文章的月份列表
 * GET /api/reading/articles/months
 */
router.get('/articles/months', async (_req: Request, res: Response): Promise<void> => {
  try {
    const months = await getArticleMonths();
    res.json({ success: true, data: months });
  } catch (error: unknown) {
    logger.error('获取文章月份失败:', error);
    res.status(500).json({ success: false, error: '获取文章月份失败' });
  }
});

/**
 * 获取文章详情
 * GET /api/reading/articles/:id
 */
router.get('/articles/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const article = await getArticleDetail(req.params.id);
    if (!article) {
      res.status(404).json({ success: false, error: '文章不存在' });
      return;
    }
    res.json({ success: true, data: article });
  } catch (error: unknown) {
    logger.error('获取文章详情失败:', error);
    res.status(500).json({ success: false, error: '获取文章详情失败' });
  }
});

/**
 * 获取用户阅读进度
 * GET /api/reading/progress
 */
router.get('/progress', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: '未认证' });
      return;
    }
    const progress = await getUserReadingProgress(userId);
    res.json({ success: true, data: progress });
  } catch (error: unknown) {
    logger.error('获取阅读进度失败:', error);
    res.status(500).json({ success: false, error: '获取阅读进度失败' });
  }
});

/**
 * 更新阅读进度
 * POST /api/reading/progress
 */
router.post('/progress', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: '未认证' });
      return;
    }
    const { articleId, status, readTime, quizScore } = req.body;
    if (!articleId) {
      res.status(400).json({ success: false, error: '缺少 articleId' });
      return;
    }
    const result = await updateReadingProgress(userId, articleId, { status, readTime, quizScore });

    // reading_done 事件统一在提交答案路由中触发，避免重复
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    logger.error('更新阅读进度失败:', error);
    res.status(500).json({ success: false, error: '更新阅读进度失败' });
  }
});

// ==================== 精读扩展端点 ====================

/**
 * 今日精读推荐
 * GET /api/reading/daily
 */
router.get('/daily', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: '未认证' });
      return;
    }
    const result = await getDailyReading(userId);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    logger.error('获取今日精读失败:', error);
    res.status(500).json({ success: false, error: '获取今日精读失败' });
  }
});

/**
 * 完整精读数据（含结构化内容）
 * GET /api/reading/articles/:id/intensive
 */
router.get('/articles/:id/intensive', async (req: Request, res: Response): Promise<void> => {
  try {
    const article = await getIntensiveArticle(req.params.id);
    if (!article) {
      res.status(404).json({ success: false, error: '文章不存在' });
      return;
    }
    res.json({ success: true, data: article });
  } catch (error: unknown) {
    logger.error('获取精读数据失败:', error);
    res.status(500).json({ success: false, error: '获取精读数据失败' });
  }
});

/**
 * 提交练习答案
 * POST /api/reading/articles/:id/quiz
 */
router.post('/articles/:id/quiz', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: '未认证' });
      return;
    }
    const { answers } = req.body;
    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      res.status(400).json({ success: false, error: '缺少 answers' });
      return;
    }
    const result = await submitQuiz(userId, req.params.id, answers);

    // 成就引擎
    emitAchievementEvent(userId, 'reading_done', {
      articleId: req.params.id,
      quizScore: result.score,
    });

    res.json({ success: true, data: result });
  } catch (error: unknown) {
    logger.error('提交练习答案失败:', error);
    res.status(500).json({ success: false, error: '提交练习答案失败' });
  }
});

/**
 * 更新精读步骤进度
 * POST /api/reading/articles/:id/step
 */
router.post('/articles/:id/step', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: '未认证' });
      return;
    }
    const { step, paragraph } = req.body;
    if (step === undefined) {
      res.status(400).json({ success: false, error: '缺少 step' });
      return;
    }
    const result = await updateReadingStep(userId, req.params.id, step, paragraph);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    logger.error('更新精读步骤失败:', error);
    res.status(500).json({ success: false, error: '更新精读步骤失败' });
  }
});

export default router;
