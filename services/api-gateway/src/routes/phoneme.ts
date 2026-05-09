import express, { Request, Response } from 'express';
import { z } from 'zod';
import { phonemeCategories, PHONEME_DATA_VERSION } from '@/config/phonemes';
import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { emitAchievementEvent } from '@/events/eventBus';

const router = express.Router();

const phonemeQuerySchema = z.object({
  version: z.coerce.number().int().nonnegative().optional().default(0),
});

/**
 * 获取音素数据
 * GET /api/phonemes?version=N
 * version == 服务端版本 → { success: true, data: { version, categories: null } }
 * version != 服务端版本 → { success: true, data: { version, categories: [...] } }
 */
router.get('/', (req, res) => {
  const parsed = phonemeQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: 'Invalid query parameter: version must be a non-negative integer',
    });
    return;
  }

  const clientVersion = parsed.data.version;

  if (clientVersion === PHONEME_DATA_VERSION) {
    res.json({
      success: true,
      data: { version: PHONEME_DATA_VERSION, categories: null },
    });
    return;
  }

  res.json({
    success: true,
    data: { version: PHONEME_DATA_VERSION, categories: phonemeCategories },
  });
});

// ==================== 音素进度同步 ====================

/**
 * 拉取音素进度（增量同步 + 游标分页）
 * POST /api/phonemes/progress/sync
 * Body: { afterServerTime?: number, cursor?: string, limit?: number }
 */
router.post('/progress/sync', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { afterServerTime, cursor, limit = 1000 } = req.body;
    const limitNum = Math.min(parseInt(limit, 10) || 1000, 1000);

    const whereClause: any = { userId };

    if (afterServerTime) {
      whereClause.updatedAt = { gt: new Date(afterServerTime) };
    }

    if (cursor) {
      const parts = cursor.split('_');
      if (parts.length >= 2) {
        const cursorUpdatedAt = new Date(parseInt(parts[0], 10));
        const cursorId = parts.slice(1).join('_');
        whereClause.OR = [
          { updatedAt: { gt: cursorUpdatedAt } },
          { updatedAt: cursorUpdatedAt, id: { gt: cursorId } },
        ];
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

    const progress = await prisma.userPhonemeProgress.findMany({
      where: whereClause,
      orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
      take: limitNum + 1,
    });

    const hasMore = progress.length > limitNum;
    const resultProgress = hasMore ? progress.slice(0, limitNum) : progress;

    let nextCursor: string | null = null;
    if (hasMore && resultProgress.length > 0) {
      const lastItem = resultProgress[resultProgress.length - 1];
      nextCursor = `${lastItem.updatedAt.getTime()}_${lastItem.id}`;
    }

    const formattedProgress = resultProgress.map((p) => ({
      id: p.id,
      phonemeSymbol: p.phonemeSymbol,
      practiceCount: p.practiceCount,
      totalWordCount: p.totalWordCount,
      avgScore: p.avgScore,
      bestScore: p.bestScore,
      lastScore: p.lastScore,
      masteryLevel: p.masteryLevel,
      listenCorrectCount: p.listenCorrectCount,
      listenTotalCount: p.listenTotalCount,
      lastPracticedAt: p.lastPracticedAt ? p.lastPracticedAt.getTime() : null,
      updatedAt: p.updatedAt.getTime(),
    }));

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
    logger.error('Failed to sync phoneme progress:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync phoneme progress',
    });
  }
});

/**
 * 推送音素进度
 * POST /api/phonemes/progress/push
 * Body: { progress: Array<{phonemeSymbol, practiceCount, totalWordCount, avgScore, bestScore, lastScore, masteryLevel, listenCorrectCount, listenTotalCount, lastPracticedAt, updatedAt}> }
 */
router.post('/progress/push', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { progress } = req.body;
    if (!Array.isArray(progress) || progress.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Missing required parameter: progress',
      });
      return;
    }

    if (progress.length > 500) {
      res.status(400).json({
        success: false,
        error: 'Too many records, max 500 per request',
      });
      return;
    }

    let syncedCount = 0;

    const validItems = progress.filter((item: any) => item.phonemeSymbol && item.updatedAt);

    // 批量查询现有记录
    const symbols = validItems.map((item: any) => item.phonemeSymbol);
    const existingRecords = await prisma.userPhonemeProgress.findMany({
      where: { userId, phonemeSymbol: { in: symbols } },
      select: { phonemeSymbol: true, updatedAt: true },
    });
    const existingMap = new Map(
      existingRecords.map((r) => [r.phonemeSymbol, r.updatedAt.getTime()])
    );

    for (const item of validItems) {
      const {
        phonemeSymbol, practiceCount, totalWordCount,
        avgScore, bestScore, lastScore, masteryLevel,
        listenCorrectCount, listenTotalCount, lastPracticedAt, updatedAt,
      } = item;

      // 服务端数据更新则跳过（last-write-wins）
      const existingUpdatedAt = existingMap.get(phonemeSymbol);
      if (existingUpdatedAt && existingUpdatedAt > updatedAt) {
        continue;
      }

      await prisma.userPhonemeProgress.upsert({
        where: { userId_phonemeSymbol: { userId, phonemeSymbol } },
        create: {
          userId,
          phonemeSymbol,
          practiceCount: practiceCount ?? 0,
          totalWordCount: totalWordCount ?? 0,
          avgScore: avgScore ?? 0,
          bestScore: bestScore ?? 0,
          lastScore: lastScore ?? 0,
          masteryLevel: masteryLevel ?? 'none',
          listenCorrectCount: listenCorrectCount ?? 0,
          listenTotalCount: listenTotalCount ?? 0,
          lastPracticedAt: lastPracticedAt ? new Date(lastPracticedAt) : null,
        },
        update: {
          practiceCount: practiceCount ?? 0,
          totalWordCount: totalWordCount ?? 0,
          avgScore: avgScore ?? 0,
          bestScore: bestScore ?? 0,
          lastScore: lastScore ?? 0,
          masteryLevel: masteryLevel ?? 'none',
          listenCorrectCount: listenCorrectCount ?? 0,
          listenTotalCount: listenTotalCount ?? 0,
          lastPracticedAt: lastPracticedAt ? new Date(lastPracticedAt) : null,
        },
      });
      syncedCount++;
    }

    res.json({
      success: true,
      data: {
        syncedCount,
        serverTime: Date.now(),
      },
    });
  } catch (error) {
    logger.error('Failed to push phoneme progress:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to push phoneme progress',
    });
  }
});

/**
 * 发音练习完成事件上报
 * POST /api/phonemes/practice-done
 */
router.post('/practice-done', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    emitAchievementEvent(userId, 'phoneme_practice_done', req.body);

    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to report phoneme practice done:', error);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

export default router;
