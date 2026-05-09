import { Router, Request, Response } from 'express';
import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';

const router = Router();

// ==================== 收藏功能 ====================

/**
 * 拉取收藏数据（增量同步 + 游标分页）
 * POST /api/words/favorites/sync
 * Body: { afterServerTime?: number, cursor?: string, limit?: number }
 */
router.post('/favorites/sync', async (req: Request, res: Response) => {
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
      whereClause.createdAt = { gt: new Date(afterServerTime) };
    }

    // 游标分页条件
    if (cursor) {
      const parts = cursor.split('_');
      if (parts.length >= 2) {
        const cursorCreatedAt = new Date(parseInt(parts[0], 10));
        const cursorId = parts.slice(1).join('_');
        if (afterServerTime) {
          delete whereClause.createdAt;
          whereClause.AND = [
            { createdAt: { gt: new Date(afterServerTime) } },
            {
              OR: [
                { createdAt: { gt: cursorCreatedAt } },
                { createdAt: cursorCreatedAt, id: { gt: cursorId } },
              ],
            },
          ];
        } else {
          whereClause.OR = [
            { createdAt: { gt: cursorCreatedAt } },
            { createdAt: cursorCreatedAt, id: { gt: cursorId } },
          ];
        }
      }
    }

    const favorites = await prisma.userFavoriteWord.findMany({
      where: whereClause,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: limitNum + 1,
    });

    const hasMore = favorites.length > limitNum;
    const resultFavorites = hasMore ? favorites.slice(0, limitNum) : favorites;

    let nextCursor: string | null = null;
    if (hasMore && resultFavorites.length > 0) {
      const lastItem = resultFavorites[resultFavorites.length - 1];
      nextCursor = `${lastItem.createdAt.getTime()}_${lastItem.id}`;
    }

    const formattedFavorites = resultFavorites.map((f) => ({
      id: f.id,
      wordId: f.wordId,
      createdAt: f.createdAt.getTime(),
    }));

    // serverTime: 当批数据的最后时间戳
    const serverTime = resultFavorites.length > 0
      ? resultFavorites[resultFavorites.length - 1].createdAt.getTime()
      : Date.now();

    res.json({
      success: true,
      data: {
        favorites: formattedFavorites,
        nextCursor,
        serverTime,
      },
    });
  } catch (error) {
    logger.error('Failed to sync favorites:', error);
    res.status(500).json({ success: false, error: 'Failed to sync favorites' });
  }
});

/**
 * 获取用户收藏的单词列表
 * GET /api/words/favorites
 */
router.get('/favorites', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const favorites = await prisma.userFavoriteWord.findMany({
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
      orderBy: { createdAt: 'desc' },
    });

    const formattedWords = favorites.map((f) => ({
      id: f.word.id,
      word: f.word.word,
      phoneticUs: f.word.phoneticUs,
      phoneticUk: f.word.phoneticUk,
      pos: f.word.pos,
      meaningCn: f.word.meaningCn,
      meaningEn: f.word.meaningEn,
      meanings: f.word.meanings.map((m) => ({
        pos: m.pos,
        meaningCn: m.meaningCn,
        meaningEn: m.meaningEn,
        exampleEn: m.exampleEn,
        exampleCn: m.exampleCn,
        register: m.register,
      })),
      etymology: f.word.etymology
        ? {
            root: f.word.etymology.root,
            rootMeaning: f.word.etymology.rootMeaning,
            prefix: f.word.etymology.prefix,
            prefixMeaning: f.word.etymology.prefixMeaning,
            suffix: f.word.etymology.suffix,
            suffixMeaning: f.word.etymology.suffixMeaning,
            analysis: f.word.etymology.analysis,
          }
        : null,
      collocations: f.word.collocations.map((c) => ({
        pattern: c.pattern,
        examples: c.examples,
        meaningCn: c.meaningCn,
      })),
      tags: f.word.tags.map((t) => t.tag),
      favoritedAt: f.createdAt,
    }));

    res.json({
      success: true,
      data: formattedWords,
      total: formattedWords.length,
    });
  } catch (error) {
    logger.error('Failed to fetch favorites:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch favorites',
    });
  }
});

/**
 * 获取收藏单词数量
 * GET /api/words/favorites/count
 */
router.get('/favorites/count', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const count = await prisma.userFavoriteWord.count({
      where: { userId },
    });

    res.json({
      success: true,
      data: { count },
    });
  } catch (error) {
    logger.error('Failed to count favorites:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to count favorites',
    });
  }
});

/**
 * 检查单词是否已收藏
 * GET /api/words/favorites/check/:wordId
 */
router.get('/favorites/check/:wordId', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { wordId } = req.params;

    const favorite = await prisma.userFavoriteWord.findUnique({
      where: {
        userId_wordId: { userId, wordId },
      },
    });

    res.json({
      success: true,
      data: { isFavorited: !!favorite },
    });
  } catch (error) {
    logger.error('Failed to check favorite:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check favorite',
    });
  }
});

/**
 * 添加收藏
 * POST /api/words/favorites
 * Body: { wordId: string }
 */
router.post('/favorites', async (req: Request, res: Response) => {
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

    // 检查单词是否存在
    const word = await prisma.word.findUnique({ where: { id: wordId } });
    if (!word) {
      res.status(404).json({
        success: false,
        error: 'Word not found',
      });
      return;
    }

    // 添加收藏（如果已存在则忽略）
    await prisma.userFavoriteWord.upsert({
      where: {
        userId_wordId: { userId, wordId },
      },
      create: { userId, wordId },
      update: {},
    });

    res.json({
      success: true,
      message: 'Word added to favorites',
    });
  } catch (error) {
    logger.error('Failed to add favorite:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add favorite',
    });
  }
});

/**
 * 取消收藏
 * DELETE /api/words/favorites/:wordId
 */
router.delete('/favorites/:wordId', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { wordId } = req.params;

    await prisma.userFavoriteWord.deleteMany({
      where: { userId, wordId },
    });

    res.json({
      success: true,
      message: 'Word removed from favorites',
    });
  } catch (error) {
    logger.error('Failed to remove favorite:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove favorite',
    });
  }
});

export default router;
