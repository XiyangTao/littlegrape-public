/**
 * 语法学习路由
 */

import { Router, Request, Response } from 'express';
import {
  seedGrammarData,
  getCategories,
  getCategoryPoints,
  getPointExplanation,
  getPointPractice,
  submitPracticeResult,
  markPointRead,
  getUserProgress,
  getPointLesson,
  submitLessonResult,
  calculateStarRating,
} from '@/services/grammarService';
import { logger } from '@/utils/logger';
import { emitAchievementEvent } from '@/events/eventBus';

const router = Router();

// 首次加载时初始化种子数据
seedGrammarData().catch(err => logger.error('初始化语法种子数据失败:', err));

/**
 * 获取语法分类列表
 * GET /api/grammar/categories
 */
router.get('/categories', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const categories = await getCategories(userId);
    res.json({ success: true, data: categories });
  } catch (error: unknown) {
    logger.error('获取语法分类失败:', error);
    res.status(500).json({ success: false, error: '获取语法分类失败' });
  }
});

/**
 * 获取分类下的语法点
 * GET /api/grammar/categories/:code/points
 */
router.get('/categories/:code/points', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const result = await getCategoryPoints(req.params.code, userId);
    if (!result) {
      res.status(404).json({ success: false, error: '分类不存在' });
      return;
    }
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    logger.error('获取语法点列表失败:', error);
    res.status(500).json({ success: false, error: '获取语法点列表失败' });
  }
});

/**
 * 获取语法点 AI 讲解
 * GET /api/grammar/points/:pointId/explanation
 */
router.get('/points/:pointId/explanation', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const result = await getPointExplanation(req.params.pointId);
    if (!result) {
      res.status(404).json({ success: false, error: '语法点不存在' });
      return;
    }

    res.json({ success: true, data: result });
  } catch (error: unknown) {
    logger.error('获取语法讲解失败:', error);
    res.status(500).json({ success: false, error: '获取语法讲解失败' });
  }
});

/**
 * 获取语法练习题
 * POST /api/grammar/points/:pointId/practice
 */
router.post('/points/:pointId/practice', async (req: Request, res: Response): Promise<void> => {
  try {
    const { count } = req.body;
    const result = await getPointPractice(req.params.pointId, count || 10);
    if (!result) {
      res.status(404).json({ success: false, error: '语法点不存在' });
      return;
    }
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    logger.error('获取语法练习题失败:', error);
    res.status(500).json({ success: false, error: '获取语法练习题失败' });
  }
});

/**
 * 提交练习结果
 * POST /api/grammar/practice/submit
 */
router.post('/practice/submit', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: '未认证' });
      return;
    }

    const { pointId, score, totalCount, correctCount } = req.body;
    if (!pointId || score === undefined) {
      res.status(400).json({ success: false, error: '缺少必要参数' });
      return;
    }

    const result = await submitPracticeResult(userId, pointId, { score, totalCount, correctCount });

    // 成就引擎：fire-and-forget
    emitAchievementEvent(userId, 'grammar_practice_done', { pointId, score, correctCount, totalCount });

    res.json({ success: true, data: result });
  } catch (error: unknown) {
    logger.error('提交语法练习结果失败:', error);
    res.status(500).json({ success: false, error: '提交练习结果失败' });
  }
});

/**
 * 获取课程式练习数据
 * POST /api/grammar/points/:pointId/lesson
 */
router.post('/points/:pointId/lesson', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await getPointLesson(req.params.pointId);
    if (!result) {
      res.status(404).json({ success: false, error: '语法点不存在' });
      return;
    }
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    logger.error('获取课程练习数据失败:', error);
    res.status(500).json({ success: false, error: '获取课程练习数据失败' });
  }
});

/**
 * 提交课程练习结果
 * POST /api/grammar/lesson/submit
 */
router.post('/lesson/submit', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: '未认证' });
      return;
    }

    const { pointId, score, totalCount, correctCount, starRating, phaseResults } = req.body;
    if (!pointId || score === undefined || !starRating) {
      res.status(400).json({ success: false, error: '缺少必要参数' });
      return;
    }

    const result = await submitLessonResult(userId, pointId, {
      score, totalCount, correctCount, starRating, phaseResults,
    });

    // 成就引擎：fire-and-forget
    emitAchievementEvent(userId, 'grammar_practice_done', {
      pointId, score, correctCount, totalCount, starRating, isLesson: true,
    });

    res.json({ success: true, data: result });
  } catch (error: unknown) {
    logger.error('提交课程练习结果失败:', error);
    res.status(500).json({ success: false, error: '提交课程练习结果失败' });
  }
});

/**
 * 获取用户语法进度
 * GET /api/grammar/progress
 */
router.get('/progress', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: '未认证' });
      return;
    }
    const progress = await getUserProgress(userId);
    res.json({ success: true, data: progress });
  } catch (error: unknown) {
    logger.error('获取语法进度失败:', error);
    res.status(500).json({ success: false, error: '获取语法进度失败' });
  }
});

export default router;
