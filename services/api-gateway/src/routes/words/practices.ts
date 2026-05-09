import { Router, Request, Response } from 'express';
import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';

const router = Router();

/**
 * 批量获取单词练习题
 * POST /api/words/practices/batch
 * Body: { wordIds: string[], questionsPerWord?: number }
 */
router.post('/practices/batch', async (req: Request, res: Response) => {
  try {
    const { wordIds, questionsPerWord = 3 } = req.body;
    logger.info(`[practices/batch] questionsPerWord=${questionsPerWord}, wordIds=${wordIds?.length}`);

    if (!wordIds || !Array.isArray(wordIds) || wordIds.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Missing required parameter: wordIds (non-empty array)',
      });
      return;
    }

    // 限制单次最多 50 个单词
    const limitedWordIds = wordIds.slice(0, 50);

    // 查询所有相关练习题（过滤低分题目）
    const practices = await prisma.wordPractice.findMany({
      where: {
        wordId: { in: limitedWordIds },
        score: { gte: 9 },
      },
      select: {
        id: true,
        wordId: true,
        type: true,
        data: true,
      },
    });

    // 按 wordId 分组并随机抽取
    const grouped: Record<string, typeof practices> = {};
    for (const p of practices) {
      if (!grouped[p.wordId]) {
        grouped[p.wordId] = [];
      }
      grouped[p.wordId].push(p);
    }

    // 每个单词随机抽 N 道
    const result: Record<string, any[]> = {};
    for (const wordId of limitedWordIds) {
      const wordPractices = grouped[wordId] || [];
      const shuffled = wordPractices.sort(() => Math.random() - 0.5);
      result[wordId] = shuffled.slice(0, questionsPerWord).map((p) => ({
        id: p.id,
        type: p.type,
        ...((p.data as object) || {}),
      }));
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Failed to fetch word practices batch:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch word practices',
    });
  }
});

/**
 * 获取单个单词的练习题
 * GET /api/words/:wordId/practices
 */
router.get('/:wordId/practices', async (req: Request, res: Response) => {
  try {
    const { wordId } = req.params;

    const practices = await prisma.wordPractice.findMany({
      where: { wordId },
      select: {
        id: true,
        type: true,
        data: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const typeCounts: Record<string, number> = {};
    for (const p of practices) {
      typeCounts[p.type] = (typeCounts[p.type] || 0) + 1;
    }

    res.json({
      success: true,
      data: practices.map((p) => ({
        id: p.id,
        type: p.type,
        ...((p.data as object) || {}),
        createdAt: p.createdAt,
      })),
      total: practices.length,
      typeCounts,
    });
  } catch (error) {
    logger.error('Failed to fetch word practices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch word practices',
    });
  }
});

export default router;
