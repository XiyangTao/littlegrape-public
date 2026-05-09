import { Router, Request, Response } from 'express';
import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { getTodayCN } from '@/utils/dateUtils';
import { emitAchievementEvent } from '@/events/eventBus';

const router = Router();

// ==================== 学习进度记录 ====================

/**
 * 标记单词为已学习（发音通过）
 * POST /api/words/progress/learned
 * Body: { wordId: string }
 */
router.post('/progress/learned', async (req: Request, res: Response) => {
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

    const today = getTodayCN();

    // 创建或更新学习进度
    await prisma.userWordProgress.upsert({
      where: {
        userId_wordId: { userId, wordId },
      },
      create: {
        userId,
        wordId,
        status: 'learned',
        learnedAt: new Date(),
      },
      update: {}, // 如果已存在，不更新
    });

    // 更新每日统计
    await prisma.userDailyStats.upsert({
      where: {
        userId_eventDate: { userId, eventDate: today },
      },
      create: {
        userId,
        eventDate: today,
        learnedCount: 1,
      },
      update: {
        learnedCount: { increment: 1 },
      },
    });

    // 成就引擎：fire-and-forget，结果通过 WS 推送
    emitAchievementEvent(userId, 'word_learned', { wordId });

    res.json({
      success: true,
      message: 'Word marked as learned',
    });
  } catch (error) {
    logger.error('Failed to mark word as learned:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update progress',
    });
  }
});

/**
 * 标记单词为已掌握
 * POST /api/words/progress/mastered
 * Body: { wordId: string, isSkipped?: boolean }
 *
 * isSkipped=true 表示用户直接标记已掌握（跳过），只同步数据不触发事件和统计
 */
router.post('/progress/mastered', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { wordId, isSkipped } = req.body;
    if (!wordId) {
      res.status(400).json({
        success: false,
        error: 'Missing required parameter: wordId',
      });
      return;
    }

    const skipped = isSkipped === true;

    // 幂等保护：已 mastered 且 isSkipped 一致则跳过
    const existing = await prisma.userWordProgress.findUnique({
      where: { userId_wordId: { userId, wordId } },
      select: { status: true, isSkipped: true },
    });
    if (existing?.status === 'mastered' && existing.isSkipped === skipped) {
      res.json({ success: true, message: 'Word already mastered' });
      return;
    }

    // 更新学习进度为已掌握
    await prisma.userWordProgress.upsert({
      where: { userId_wordId: { userId, wordId } },
      create: {
        userId,
        wordId,
        status: 'mastered',
        masteredAt: new Date(),
        isSkipped: skipped,
      },
      update: {
        status: 'mastered',
        masteredAt: new Date(),
        isSkipped: skipped,
      },
    });

    // 非跳过：更新每日统计 + 触发成就事件
    if (!skipped) {
      const today = getTodayCN();
      await prisma.userDailyStats.upsert({
        where: {
          userId_eventDate: { userId, eventDate: today },
        },
        create: {
          userId,
          eventDate: today,
          masteredCount: 1,
        },
        update: {
          masteredCount: { increment: 1 },
        },
      });

      emitAchievementEvent(userId, 'word_mastered', { wordId });
    }

    res.json({
      success: true,
      message: 'Word marked as mastered',
    });
  } catch (error) {
    logger.error('Failed to mark word as mastered:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update progress',
    });
  }
});

// ==================== 学习进度同步 ====================

/**
 * 拉取学习进度（增量同步 + 游标分页）
 * POST /api/words/progress/sync
 * Body: { afterServerTime?: number, cursor?: string, limit?: number }
 *
 * - afterServerTime: 增量同步，只返回 updatedAt > afterServerTime 的数据
 * - cursor: 游标分页，格式 {updatedAt}_{id}
 * - serverTime: 返回当批数据的最后时间戳，客户端保存用于下次增量同步
 */
router.post('/progress/sync', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { afterServerTime, cursor, limit = 1000 } = req.body;
    const limitNum = Math.min(parseInt(limit, 10) || 1000, 1000); // 最大 1000 条

    // 构建查询条件
    const whereClause: any = { userId };

    // 增量同步条件（优先使用 afterServerTime）
    if (afterServerTime) {
      whereClause.updatedAt = { gt: new Date(afterServerTime) };
    }

    // 游标分页条件（用于大数据量分批）
    if (cursor) {
      const parts = cursor.split('_');
      if (parts.length >= 2) {
        const cursorUpdatedAt = new Date(parseInt(parts[0], 10));
        const cursorId = parts.slice(1).join('_');
        // 游标条件追加到 afterServerTime 条件之上
        whereClause.OR = [
          { updatedAt: { gt: cursorUpdatedAt } },
          { updatedAt: cursorUpdatedAt, id: { gt: cursorId } },
        ];
        // 如果有 afterServerTime，需要用 AND 组合
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
        }
      }
    }

    // 查询数据
    const progress = await prisma.userWordProgress.findMany({
      where: whereClause,
      orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
      take: limitNum + 1, // 多取一条用于判断是否有更多
    });

    // 判断是否有更多数据
    const hasMore = progress.length > limitNum;
    const resultProgress = hasMore ? progress.slice(0, limitNum) : progress;

    // 生成下一个游标
    let nextCursor: string | null = null;
    if (hasMore && resultProgress.length > 0) {
      const lastItem = resultProgress[resultProgress.length - 1];
      nextCursor = `${lastItem.updatedAt.getTime()}_${lastItem.id}`;
    }

    // 格式化返回数据
    const formattedProgress = resultProgress.map((p) => ({
      id: p.id,
      wordId: p.wordId,
      status: p.status,
      learnedAt: p.learnedAt ? p.learnedAt.getTime() : null,
      masteredAt: p.masteredAt ? p.masteredAt.getTime() : null,
      isSkipped: p.isSkipped,
      updatedAt: p.updatedAt.getTime(),
    }));

    // serverTime: 当批数据的最后时间戳（用于增量同步）
    const serverTime = resultProgress.length > 0
      ? resultProgress[resultProgress.length - 1].updatedAt.getTime()
      : Date.now();

    res.json({
      success: true,
      data: {
        progress: formattedProgress,
        nextCursor,
        serverTime,
      },
    });
  } catch (error) {
    logger.error('Failed to sync word progress:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync word progress',
    });
  }
});

export default router;
