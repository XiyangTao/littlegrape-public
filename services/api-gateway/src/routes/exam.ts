/**
 * 考试专题路由
 */

import { Router, Request, Response } from 'express';
import { getExamTypes, generateExam, submitExamResult, getUserExamStats, getUserExamRecords } from '@/services/examService';
import { logger } from '@/utils/logger';

const router = Router();

/**
 * 获取考试类型列表 + 用户统计
 * GET /api/exam/types
 */
router.get('/types', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const types = getExamTypes();
    let stats = {};
    if (userId) {
      stats = await getUserExamStats(userId);
    }
    res.json({ success: true, data: { types, stats } });
  } catch (error: unknown) {
    logger.error('获取考试类型失败:', error);
    res.status(500).json({ success: false, error: '获取考试类型失败' });
  }
});

/**
 * 生成模拟考试
 * GET /api/exam/generate?type=cet4
 */
router.get('/generate', async (req: Request, res: Response): Promise<void> => {
  try {
    const examTypeId = req.query.type as string;
    if (!examTypeId) { res.status(400).json({ success: false, error: '请指定考试类型' }); return; }
    const exam = await generateExam(examTypeId);
    res.json({ success: true, data: exam });
  } catch (error: unknown) {
    logger.error('生成考试题失败:', error);
    res.status(500).json({ success: false, error: '生成考试题失败' });
  }
});

/**
 * 提交考试成绩
 * POST /api/exam/submit
 */
router.post('/submit', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ success: false, error: '未认证' }); return; }
    const { examTypeId, score, totalQuestions, correctCount, duration, answers } = req.body;
    const record = await submitExamResult(userId, examTypeId, score, totalQuestions, correctCount, duration, answers);
    res.json({ success: true, data: record });
  } catch (error: unknown) {
    logger.error('提交考试成绩失败:', error);
    res.status(500).json({ success: false, error: '提交考试成绩失败' });
  }
});

/**
 * 获取考试记录
 * GET /api/exam/records?type=cet4
 */
router.get('/records', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ success: false, error: '未认证' }); return; }
    const examTypeId = req.query.type as string | undefined;
    const records = await getUserExamRecords(userId, examTypeId);
    res.json({ success: true, data: records });
  } catch (error: unknown) {
    logger.error('获取考试记录失败:', error);
    res.status(500).json({ success: false, error: '获取考试记录失败' });
  }
});

export default router;
