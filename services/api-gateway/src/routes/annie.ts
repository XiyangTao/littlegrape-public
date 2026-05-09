/**
 * 安妮老师的英语课路由
 *
 * GET  /api/annie/lessons?course=l1                       — 列表 + 用户进度
 * GET  /api/annie/lessons/:course/:lessonNumber           — 单课详情 + 当前用户进度
 * POST /api/annie/lessons/:course/:lessonNumber/progress  — 增量更新某关数据 / 标记完成
 *
 * conversation 评判直接复用 /api/story/evaluate, 不在此路由暴露.
 */

import { Router, Request, Response } from 'express';
import { listLessons, getLesson, updateProgress } from '@/services/annieService';
import { logger } from '@/utils/logger';

const router = Router();

/** 列表 */
router.get('/lessons', async (req: Request, res: Response): Promise<void> => {
  try {
    const course = (req.query.course as string) || 'l1';
    const userId = req.user?.id;
    const lessons = await listLessons(course, userId);
    res.json({ success: true, data: lessons });
  } catch (error: unknown) {
    logger.error('获取安妮课程列表失败:', error);
    res.status(500).json({ success: false, error: '获取课程列表失败' });
  }
});

/** 单课详情 */
router.get('/lessons/:course/:lessonNumber', async (req: Request, res: Response): Promise<void> => {
  try {
    const { course } = req.params;
    const lessonNumber = parseInt(req.params.lessonNumber, 10);
    if (Number.isNaN(lessonNumber)) {
      res.status(400).json({ success: false, error: 'lessonNumber 必须是数字' });
      return;
    }
    const userId = req.user?.id;
    const lesson = await getLesson(course, lessonNumber, userId);
    if (!lesson) {
      res.status(404).json({ success: false, error: '课程不存在或未发布' });
      return;
    }
    res.json({ success: true, data: lesson });
  } catch (error: unknown) {
    logger.error('获取安妮课程详情失败:', error);
    res.status(500).json({ success: false, error: '获取课程详情失败' });
  }
});

/** 进度更新（增量） */
router.post('/lessons/:course/:lessonNumber/progress', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: '未认证' });
      return;
    }
    const { course } = req.params;
    const lessonNumber = parseInt(req.params.lessonNumber, 10);
    if (Number.isNaN(lessonNumber)) {
      res.status(400).json({ success: false, error: 'lessonNumber 必须是数字' });
      return;
    }
    const result = await updateProgress(userId, course, lessonNumber, req.body || {});
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    logger.error('更新安妮课程进度失败:', error);
    res.status(500).json({ success: false, error: '更新进度失败' });
  }
});

export default router;
