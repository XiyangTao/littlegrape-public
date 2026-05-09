import { Router, Request, Response } from 'express';
import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';

const router = Router();

// ==================== 生词本功能 ====================

/**
 * 拉取生词本数据（增量同步 + 游标分页）
 * POST /api/words/difficult/sync
 * Body: { afterServerTime?: number, cursor?: string, limit?: number }
 */
router.post('/difficult/sync', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { afterServerTime, cursor, limit = 1000 } = req.body;
    const limitNum = Math.min(parseInt(limit, 10) || 1000, 1000);

    // 构建查询条件
    const whereClause: any = { userId };

    // 增量同步条件
    if (afterServerTime) {
      whereClause.updatedAt = { gt: new Date(afterServerTime) };
    }

    // 游标分页条件
    if (cursor) {
      const parts = cursor.split('_');
      if (parts.length >= 2) {
        const cursorUpdatedAt = new Date(parseInt(parts[0], 10));
        const cursorId = parts.slice(1).join('_');
        if (afterServerTime) {
          delete whereClause.updatedAt;
          whereClause.AND = [
            { updatedAt: { gt: new Date(afterServerTime) } },
            {
              OR: [
                { updatedAt: { gt: cursorUpdatedAt } },
                { updatedAt: cursorUpdatedAt, id: { gt: cursorId } },
              ],
            },
          ];
        } else {
          whereClause.OR = [
            { updatedAt: { gt: cursorUpdatedAt } },
            { updatedAt: cursorUpdatedAt, id: { gt: cursorId } },
          ];
        }
      }
    }

    const difficultWords = await prisma.userDifficultWord.findMany({
      where: whereClause,
      orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
      take: limitNum + 1,
    });

    const hasMore = difficultWords.length > limitNum;
    const resultWords = hasMore ? difficultWords.slice(0, limitNum) : difficultWords;

    let nextCursor: string | null = null;
    if (hasMore && resultWords.length > 0) {
      const lastItem = resultWords[resultWords.length - 1];
      nextCursor = `${lastItem.updatedAt.getTime()}_${lastItem.id}`;
    }

    const formattedWords = resultWords.map((d) => ({
      id: d.id,
      wordId: d.wordId,
      wrongCount: d.wrongCount,
      correctCount: d.correctCount,
      lastWrongAt: d.lastWrongAt.getTime(),
      createdAt: d.createdAt.getTime(),
      updatedAt: d.updatedAt.getTime(),
    }));

    // serverTime: 当批数据的最后时间戳
    const serverTime = resultWords.length > 0
      ? resultWords[resultWords.length - 1].updatedAt.getTime()
      : Date.now();

    res.json({
      success: true,
      data: {
        words: formattedWords,
        nextCursor,
        serverTime,
      },
    });
  } catch (error) {
    logger.error('Failed to sync difficult words:', error);
    res.status(500).json({ success: false, error: 'Failed to sync difficult words' });
  }
});

/**
 * 获取用户生词本列表
 * GET /api/words/difficult
 */
router.get('/difficult', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const difficultWords = await prisma.userDifficultWord.findMany({
      where: { userId },
      include: {
        word: {
          include: {
            meanings: { orderBy: { orderIndex: 'asc' } },
            etymology: true,
            collocations: true,
            tags: true,
          },
        },
      },
      orderBy: { lastWrongAt: 'desc' },
    });

    const formattedWords = difficultWords.map((d) => ({
      id: d.word.id,
      word: d.word.word,
      phoneticUs: d.word.phoneticUs,
      phoneticUk: d.word.phoneticUk,
      pos: d.word.pos,
      meaningCn: d.word.meaningCn,
      meaningEn: d.word.meaningEn,
      meanings: d.word.meanings.map((m) => ({
        pos: m.pos,
        meaningCn: m.meaningCn,
        meaningEn: m.meaningEn,
        exampleEn: m.exampleEn,
        exampleCn: m.exampleCn,
        register: m.register,
      })),
      etymology: d.word.etymology
        ? {
            root: d.word.etymology.root,
            rootMeaning: d.word.etymology.rootMeaning,
            prefix: d.word.etymology.prefix,
            prefixMeaning: d.word.etymology.prefixMeaning,
            suffix: d.word.etymology.suffix,
            suffixMeaning: d.word.etymology.suffixMeaning,
            analysis: d.word.etymology.analysis,
          }
        : null,
      collocations: d.word.collocations.map((c) => ({
        pattern: c.pattern,
        examples: c.examples,
        meaningCn: c.meaningCn,
      })),
      tags: d.word.tags.map((t) => t.tag),
      wrongCount: d.wrongCount,
      correctCount: d.correctCount,
      lastWrongAt: d.lastWrongAt,
    }));

    res.json({
      success: true,
      data: formattedWords,
      total: formattedWords.length,
    });
  } catch (error) {
    logger.error('Failed to fetch difficult words:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch difficult words',
    });
  }
});

/**
 * 获取生词本单词数量
 * GET /api/words/difficult/count
 */
router.get('/difficult/count', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const count = await prisma.userDifficultWord.count({
      where: { userId },
    });

    res.json({
      success: true,
      data: { count },
    });
  } catch (error) {
    logger.error('Failed to count difficult words:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to count difficult words',
    });
  }
});

/**
 * 记录答错（自动加入生词本）
 * POST /api/words/difficult/wrong
 * Body: { wordId: string }
 */
router.post('/difficult/wrong', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { wordId } = req.body;
    if (!wordId) {
      res.status(400).json({
        success: false,
        error: 'Missing required parameter: wordId',
      });
      return;
    }

    // 添加或更新生词本记录
    await prisma.userDifficultWord.upsert({
      where: {
        userId_wordId: { userId, wordId },
      },
      create: {
        userId,
        wordId,
        wrongCount: 1,
        correctCount: 0,
        lastWrongAt: new Date(),
      },
      update: {
        wrongCount: { increment: 1 },
        correctCount: 0, // 答错时重置连续答对次数
        lastWrongAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: 'Word added to difficult list',
    });
  } catch (error) {
    logger.error('Failed to add difficult word:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add difficult word',
    });
  }
});

/**
 * 记录答对（连续答对后自动移出生词本）
 * POST /api/words/difficult/correct
 * Body: { wordId: string }
 */
router.post('/difficult/correct', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { wordId } = req.body;
    if (!wordId) {
      res.status(400).json({
        success: false,
        error: 'Missing required parameter: wordId',
      });
      return;
    }

    // 查找生词本记录
    const difficultWord = await prisma.userDifficultWord.findUnique({
      where: {
        userId_wordId: { userId, wordId },
      },
    });

    if (!difficultWord) {
      // 不在生词本中，无需处理
      res.json({
        success: true,
        message: 'Word not in difficult list',
        removed: false,
      });
      return;
    }

    const newCorrectCount = difficultWord.correctCount + 1;

    // 连续答对3次，从生词本移出
    if (newCorrectCount >= 3) {
      await prisma.userDifficultWord.delete({
        where: {
          userId_wordId: { userId, wordId },
        },
      });

      res.json({
        success: true,
        message: 'Word removed from difficult list',
        removed: true,
      });
    } else {
      // 增加答对次数
      await prisma.userDifficultWord.update({
        where: {
          userId_wordId: { userId, wordId },
        },
        data: {
          correctCount: newCorrectCount,
        },
      });

      res.json({
        success: true,
        message: `Correct count: ${newCorrectCount}/3`,
        removed: false,
        correctCount: newCorrectCount,
      });
    }
  } catch (error) {
    logger.error('Failed to record correct answer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record correct answer',
    });
  }
});

/**
 * 清空用户所有生词
 * DELETE /api/words/difficult/all
 * 注意：必须在 /difficult/:wordId 之前注册，避免 "all" 被当作 wordId
 */
router.delete('/difficult/all', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { count } = await prisma.userDifficultWord.deleteMany({
      where: { userId },
    });

    res.json({ success: true, message: `Cleared ${count} difficult words`, data: { count } });
  } catch (error) {
    logger.error('Failed to clear difficult words:', error);
    res.status(500).json({ success: false, error: 'Failed to clear difficult words' });
  }
});

/**
 * 移除单个生词
 * DELETE /api/words/difficult/:wordId
 */
router.delete('/difficult/:wordId', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { wordId } = req.params;

    await prisma.userDifficultWord.deleteMany({
      where: { userId, wordId },
    });

    res.json({ success: true, message: 'Word removed from difficult list' });
  } catch (error) {
    logger.error('Failed to remove difficult word:', error);
    res.status(500).json({ success: false, error: 'Failed to remove difficult word' });
  }
});

export default router;
