/**
 * 练习题路由 — 转发到 AI Service 生成多邻国式练习题
 */

import { Router, Request, Response } from 'express';
import { aiServiceClient } from '@/clients/aiServiceClient';
import { logger } from '@/utils/logger';
import { quotaCheck } from '@/middleware/quotaMiddleware';
import { requireFeature } from '@/middleware/requireFeature';
import { recordUsage } from '@/services/usageService';

const router = Router();

/**
 * 生成练习题
 * POST /api/exercise/generate
 */
router.post('/generate', requireFeature('aiChat'), quotaCheck, async (req: Request, res: Response): Promise<void> => {
  try {
    const { exerciseType, topic, difficulty, count } = req.body;

    if (!exerciseType) {
      res.status(400).json({ success: false, error: '缺少 exerciseType 参数' });
      return;
    }

    const result = await aiServiceClient.generateExercise({
      exerciseType,
      topic,
      difficulty,
      count,
    });

    // 记录 AI 用量
    const userId = req.user?.id;
    const totalTokens = (result as any)?.token_usage?.total_tokens;
    if (userId && totalTokens && totalTokens > 0) {
      recordUsage(userId, 'ai', totalTokens).catch(err => {
        logger.error('练习题生成用量记录失败:', err);
      });
    }

    res.json({ success: true, data: result });
  } catch (error: unknown) {
    const axiosErr = error as any;
    const status = axiosErr.response?.status;
    if (status === 400) {
      res.status(400).json({ success: false, error: axiosErr.response?.data?.detail || '参数错误' });
      return;
    }
    logger.error('生成练习题失败:', error);
    res.status(500).json({ success: false, error: '生成练习题失败' });
  }
});

/**
 * 解释答案
 * POST /api/exercise/explain
 */
router.post('/explain', requireFeature('aiChat'), quotaCheck, async (req: Request, res: Response): Promise<void> => {
  try {
    const { question, isCorrect } = req.body;

    if (!question) {
      res.status(400).json({ success: false, error: '缺少 question 参数' });
      return;
    }

    const result = await aiServiceClient.explainExercise({ question, isCorrect });

    // 记录 AI 用量
    const userId = req.user?.id;
    const totalTokens = (result as any)?.token_usage?.total_tokens;
    if (userId && totalTokens && totalTokens > 0) {
      recordUsage(userId, 'ai', totalTokens).catch(err => {
        logger.error('练习题解释用量记录失败:', err);
      });
    }

    res.json({ success: true, data: result });
  } catch (error: unknown) {
    logger.error('解释练习题失败:', error);
    res.status(500).json({ success: true, data: { explanation: '解释生成失败，请稍后重试' } });
  }
});

/**
 * 冒险场景对话
 * POST /api/exercise/adventure/respond
 */
router.post('/adventure/respond', requireFeature('aiChat'), quotaCheck, async (req: Request, res: Response): Promise<void> => {
  try {
    const { scenarioTitle, character, objectives, conversationHistory } = req.body;

    if (!scenarioTitle || !character) {
      res.status(400).json({ success: false, error: '缺少必要参数' });
      return;
    }

    const result = await aiServiceClient.adventureRespond({
      scenarioTitle,
      character,
      objectives,
      conversationHistory,
    });

    // 记录 AI 用量
    const userId = req.user?.id;
    const totalTokens = (result as any)?.token_usage?.total_tokens;
    if (userId && totalTokens && totalTokens > 0) {
      recordUsage(userId, 'ai', totalTokens).catch(err => {
        logger.error('冒险对话用量记录失败:', err);
      });
    }

    res.json({ success: true, data: result });
  } catch (error: unknown) {
    logger.error('冒险场景对话失败:', error);
    // 返回兜底回复
    res.json({
      success: true,
      data: {
        response: "I'm sorry, could you say that again?",
        completedObjectives: [],
      },
    });
  }
});

export default router;
