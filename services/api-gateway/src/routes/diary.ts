/**
 * 口语日记路由
 */

import { Router, Request, Response } from 'express';
import {
  getDailyTopic,
  createDiary,
  getUserDiaries,
  getDiaryByDate,
  buildAnalysisPrompt,
} from '@/services/diaryService';
import { logger } from '@/utils/logger';
import { emitAchievementEvent } from '@/events/eventBus';

const router = Router();

/**
 * 获取今日话题
 * GET /api/diary/topic
 */
router.get('/topic', async (req: Request, res: Response): Promise<void> => {
  try {
    const date = req.query.date as string | undefined;
    const topic = getDailyTopic(date);
    res.json({ success: true, data: topic });
  } catch (error: unknown) {
    logger.error('获取话题失败:', error);
    res.status(500).json({ success: false, error: '获取话题失败' });
  }
});

/**
 * 提交口语日记
 * POST /api/diary
 * Body: { topic, topicZh?, userText, audioUrl?, duration?, eventDate }
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: '未认证' });
      return;
    }

    const { topic, topicZh, userText, audioUrl, duration, eventDate } = req.body;
    if (!topic || !userText || !eventDate) {
      res.status(400).json({ success: false, error: '缺少必要参数' });
      return;
    }

    // 验证 eventDate 格式 (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate) || isNaN(Date.parse(eventDate))) {
      res.status(400).json({ success: false, error: 'eventDate 格式无效，应为 YYYY-MM-DD' });
      return;
    }

    // 创建日记（AI 分析稍后异步）
    const diary = await createDiary({
      userId,
      topic,
      topicZh,
      userText,
      audioUrl,
      duration,
      eventDate,
    });

    // 成就引擎：fire-and-forget，结果通过 WS 推送
    emitAchievementEvent(userId, 'diary_done', { topic, duration });

    res.json({ success: true, data: diary });
  } catch (error: unknown) {
    logger.error('提交日记失败:', error);
    res.status(500).json({ success: false, error: '提交日记失败' });
  }
});

/**
 * AI 分析口语（返回纠错和建议）
 * POST /api/diary/analyze
 * Body: { diaryId, userText, topic }
 */
router.post('/analyze', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: '未认证' });
      return;
    }

    const { userText, topic } = req.body;
    if (!userText || !topic) {
      res.status(400).json({ success: false, error: '缺少必要参数' });
      return;
    }

    // 构建分析 prompt
    const prompt = buildAnalysisPrompt(userText, topic);

    // 返回 prompt 供客户端调用 chat API 获取分析结果
    // 这样复用现有的 AI 调用和配额检查流程
    res.json({
      success: true,
      data: {
        analysisPrompt: prompt,
      },
    });
  } catch (error: unknown) {
    logger.error('分析口语失败:', error);
    res.status(500).json({ success: false, error: '分析口语失败' });
  }
});

/**
 * 获取日记列表
 * GET /api/diary/list
 */
router.get('/list', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: '未认证' });
      return;
    }

    const diaries = await getUserDiaries(userId);
    res.json({ success: true, data: diaries });
  } catch (error: unknown) {
    logger.error('获取日记列表失败:', error);
    res.status(500).json({ success: false, error: '获取日记列表失败' });
  }
});

/**
 * 获取某天的日记
 * GET /api/diary/date/:date
 */
router.get('/date/:date', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: '未认证' });
      return;
    }

    const diary = await getDiaryByDate(userId, req.params.date);
    res.json({ success: true, data: diary });
  } catch (error: unknown) {
    logger.error('获取日记失败:', error);
    res.status(500).json({ success: false, error: '获取日记失败' });
  }
});

export default router;
