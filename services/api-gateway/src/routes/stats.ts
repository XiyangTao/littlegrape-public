/**
 * 学习统计路由
 * /api/stats
 *
 * 同步策略：
 * - Push: 客户端发送 events + dailyStats，服务端存储
 * - Pull: 服务端返回 dailyStats（不返回 events）
 * - 按需获取某天 events：用于详情页展示
 */

import { Router, Request, Response } from 'express';
import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';

const router = Router();

// ==================== 新版同步接口（拆分） ====================

/**
 * 拉取每日统计数据（增量同步 + 游标分页）
 * POST /api/stats/daily-stats/sync
 * Body: { afterServerTime?: number, cursor?: string, limit?: number }
 */
router.post('/daily-stats/sync', async (req: Request, res: Response) => {
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
      whereClause.serverTime = { gt: new Date(afterServerTime) };
    }

    // 游标分页条件
    if (cursor) {
      const parts = cursor.split('_');
      if (parts.length >= 2) {
        const cursorServerTime = new Date(parseInt(parts[0], 10));
        const cursorId = parts.slice(1).join('_');
        if (afterServerTime) {
          delete whereClause.serverTime;
          whereClause.AND = [
            { serverTime: { gt: new Date(afterServerTime) } },
            {
              OR: [
                { serverTime: { gt: cursorServerTime } },
                { serverTime: cursorServerTime, id: { gt: cursorId } },
              ],
            },
          ];
        } else {
          whereClause.OR = [
            { serverTime: { gt: cursorServerTime } },
            { serverTime: cursorServerTime, id: { gt: cursorId } },
          ];
        }
      }
    }

    const dailyStats = await prisma.userDailyStats.findMany({
      where: whereClause,
      orderBy: [{ serverTime: 'asc' }, { id: 'asc' }],
      take: limitNum + 1,
    });

    const hasMore = dailyStats.length > limitNum;
    const resultStats = hasMore ? dailyStats.slice(0, limitNum) : dailyStats;

    let nextCursor: string | null = null;
    if (hasMore && resultStats.length > 0) {
      const lastItem = resultStats[resultStats.length - 1];
      nextCursor = `${lastItem.serverTime.getTime()}_${lastItem.id}`;
    }

    const formattedStats = resultStats.map((stat) => ({
      date: stat.eventDate,
      learnedCount: stat.learnedCount,
      masteredCount: stat.masteredCount,
      reviewedCount: stat.reviewedCount,
      grammarPracticedCount: stat.grammarPracticedCount,
      grammarMasteredCount: stat.grammarMasteredCount,
      phonemePracticedCount: stat.phonemePracticedCount,
      updatedAt: stat.serverTime.getTime(),
    }));

    // serverTime: 当批数据的最后时间戳
    const serverTime = resultStats.length > 0
      ? resultStats[resultStats.length - 1].serverTime.getTime()
      : Date.now();

    res.json({
      success: true,
      data: {
        dailyStats: formattedStats,
        nextCursor,
        serverTime,
      },
    });
  } catch (error) {
    logger.error('Failed to sync daily stats:', error);
    res.status(500).json({ success: false, error: 'Failed to sync daily stats' });
  }
});

/**
 * 拉取指定日期的学习事件（增量同步 + 游标分页）
 * POST /api/stats/today-events/sync
 * Body: { date: string, afterServerTime?: number, cursor?: string, limit?: number }
 *
 * 注意：只同步指定日期的 events，历史 events 不需要同步
 */
router.post('/today-events/sync', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { date, afterServerTime, cursor, limit = 1000 } = req.body as {
      date: string;
      afterServerTime?: number;
      cursor?: string;
      limit?: number;
    };
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ success: false, error: 'Invalid date format, expected YYYY-MM-DD' });
      return;
    }

    const limitNum = Math.min(parseInt(String(limit), 10) || 1000, 1000);

    // 构建查询条件
    const whereClause: any = { userId, eventDate: date };

    // 增量同步条件（使用 eventTime 作为时间戳）
    if (afterServerTime) {
      whereClause.eventTime = { gt: BigInt(afterServerTime) };
    }

    // 游标分页条件
    if (cursor) {
      const parts = cursor.split('_');
      if (parts.length >= 2) {
        const cursorEventTime = BigInt(parseInt(parts[0], 10));
        const cursorId = parts.slice(1).join('_');
        if (afterServerTime) {
          delete whereClause.eventTime;
          whereClause.AND = [
            { eventTime: { gt: BigInt(afterServerTime) } },
            {
              OR: [
                { eventTime: { gt: cursorEventTime } },
                { eventTime: cursorEventTime, id: { gt: cursorId } },
              ],
            },
          ];
        } else {
          whereClause.OR = [
            { eventTime: { gt: cursorEventTime } },
            { eventTime: cursorEventTime, id: { gt: cursorId } },
          ];
        }
      }
    }

    const events = await prisma.userLearningEvent.findMany({
      where: whereClause,
      orderBy: [{ eventTime: 'asc' }, { id: 'asc' }],
      take: limitNum + 1,
    });

    const hasMore = events.length > limitNum;
    const resultEvents = hasMore ? events.slice(0, limitNum) : events;

    let nextCursor: string | null = null;
    if (hasMore && resultEvents.length > 0) {
      const lastItem = resultEvents[resultEvents.length - 1];
      nextCursor = `${Number(lastItem.eventTime)}_${lastItem.id}`;
    }

    // serverTime: 当批数据的最后时间戳
    const serverTime = resultEvents.length > 0
      ? Number(resultEvents[resultEvents.length - 1].eventTime)
      : Date.now();

    res.json({
      success: true,
      data: {
        events: resultEvents.map((event) => ({
          id: event.id,
          eventType: event.eventType,
          entityType: event.entityType,
          entityId: event.entityId,
          quantity: event.quantity,
          eventDate: event.eventDate,
          eventTime: Number(event.eventTime),
        })),
        nextCursor,
        serverTime,
      },
    });
  } catch (error) {
    logger.error('Failed to sync today events:', error);
    res.status(500).json({ success: false, error: 'Failed to sync today events' });
  }
});

// ==================== 旧版同步接口（保持兼容） ====================

/**
 * 拉取同步数据（旧版，保持兼容）
 * POST /api/stats/sync
 *
 * 参数：
 * - lastSyncAt: 上次同步时间戳（可选）
 * - today: 客户端"今天"的日期字符串 YYYY-MM-DD（用于拉取当天 events）
 *
 * 返回：
 * - dailyStats: lastSyncAt 之后更新的每日统计
 * - todayEvents: 指定日期的学习事件（用于多设备同步）
 */
router.post('/sync', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { lastSyncAt, today } = req.body as { lastSyncAt?: number; today?: string };

    // 构建 dailyStats 查询条件
    const whereCondition: any = { userId };
    if (lastSyncAt) {
      whereCondition.serverTime = { gt: new Date(lastSyncAt) };
    }

    // 并行获取 dailyStats 和 指定日期的 events
    const [dailyStats, todayEvents] = await Promise.all([
      prisma.userDailyStats.findMany({
        where: whereCondition,
        orderBy: { eventDate: 'asc' },
      }),
      // 按 eventDate 字段查询
      today
        ? prisma.userLearningEvent.findMany({
            where: { userId, eventDate: today },
            orderBy: { eventTime: 'asc' },
          })
        : Promise.resolve([]),
    ]);

    res.json({
      success: true,
      data: {
        dailyStats: dailyStats.map((stat) => ({
          date: stat.eventDate,
          learnedCount: stat.learnedCount,
          masteredCount: stat.masteredCount,
          reviewedCount: stat.reviewedCount,
          grammarPracticedCount: stat.grammarPracticedCount,
          grammarMasteredCount: stat.grammarMasteredCount,
          phonemePracticedCount: stat.phonemePracticedCount,
          updatedAt: stat.serverTime.getTime(),
        })),
        todayEvents: todayEvents.map((event) => ({
          id: event.id,
          eventType: event.eventType,
          entityType: event.entityType,
          entityId: event.entityId,
          quantity: event.quantity,
          eventDate: event.eventDate,
          eventTime: Number(event.eventTime),
        })),
        serverTime: Date.now(),
      },
    });
  } catch (error) {
    logger.error('Failed to sync stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync stats',
    });
  }
});

/**
 * 推送学习数据
 * POST /api/stats/push
 *
 * 接收 events + dailyStats，直接存储
 */
router.post('/push', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { events, dailyStats } = req.body as {
      events: Array<{
        id: string;
        eventType: string;
        entityType: string | null;
        entityId: string | null;
        quantity: number;
        eventDate: string;
        eventTime: number;
      }>;
      dailyStats: Array<{
        date: string;
        learnedCount: number;
        masteredCount: number;
        reviewedCount: number;
        grammarPracticedCount?: number;
        grammarMasteredCount?: number;
        phonemePracticedCount?: number;
      }>;
    };

    let eventsSynced = 0;
    let statsSynced = 0;

    logger.info(`[Stats Push] userId=${userId}, events=${events?.length || 0}, dailyStats=${dailyStats?.length || 0}`);

    // 1. 存储 events（upsert 去重）
    if (events && events.length > 0) {
      for (const event of events) {
        try {
          await prisma.userLearningEvent.upsert({
            where: { id: event.id },
            create: {
              id: event.id,
              userId,
              eventType: event.eventType,
              entityType: event.entityType,
              entityId: event.entityId,
              quantity: event.quantity || 1,
              eventDate: event.eventDate,
              eventTime: BigInt(event.eventTime),
            },
            update: {},
          });
          eventsSynced++;
        } catch (err) {
          logger.warn('Failed to upsert event:', event.id, err);
        }
      }
    }

    // 2. 存储 dailyStats（直接覆盖更新）
    if (dailyStats && dailyStats.length > 0) {
      for (const stat of dailyStats) {
        try {
          await prisma.$executeRaw`
            INSERT INTO user_daily_stats ("id", "userId", "eventDate", "learnedCount", "masteredCount", "reviewedCount", "grammarPracticedCount", "grammarMasteredCount", "phonemePracticedCount", "createdAt", "serverTime")
            VALUES (
              ${`${userId}_${stat.date}`},
              ${userId},
              ${stat.date},
              ${stat.learnedCount},
              ${stat.masteredCount},
              ${stat.reviewedCount},
              ${stat.grammarPracticedCount || 0},
              ${stat.grammarMasteredCount || 0},
              ${stat.phonemePracticedCount || 0},
              NOW(),
              NOW()
            )
            ON CONFLICT ("userId", "eventDate") DO UPDATE SET
              "learnedCount" = EXCLUDED."learnedCount",
              "masteredCount" = EXCLUDED."masteredCount",
              "reviewedCount" = EXCLUDED."reviewedCount",
              "grammarPracticedCount" = EXCLUDED."grammarPracticedCount",
              "grammarMasteredCount" = EXCLUDED."grammarMasteredCount",
              "phonemePracticedCount" = EXCLUDED."phonemePracticedCount",
              "serverTime" = NOW()
          `;
          statsSynced++;
        } catch (err) {
          logger.warn('Failed to upsert daily stat:', stat.date, err);
        }
      }
    }

    logger.info(`[Stats Push] userId=${userId}, eventsSynced=${eventsSynced}, statsSynced=${statsSynced}`);

    res.json({
      success: true,
      data: {
        eventsSynced,
        statsSynced,
      },
    });
  } catch (error) {
    logger.error('[Stats Push] Failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to push stats',
    });
  }
});

/**
 * 获取某天的学习事件详情
 * GET /api/stats/events/:date
 *
 * 用于详情页按需加载
 */
router.get('/events/:date', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { date } = req.params;

    // 验证日期格式
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ success: false, error: 'Invalid date format' });
      return;
    }

    // 按 eventDate 字段查询
    const events = await prisma.userLearningEvent.findMany({
      where: { userId, eventDate: date },
      orderBy: { eventTime: 'asc' },
    });

    res.json({
      success: true,
      data: {
        date,
        events: events.map((event) => ({
          id: event.id,
          eventType: event.eventType,
          entityType: event.entityType,
          entityId: event.entityId,
          quantity: event.quantity,
          date: event.eventDate,
          createdAt: Number(event.eventTime),
        })),
      },
    });
  } catch (error) {
    logger.error('Failed to fetch events for date:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch events',
    });
  }
});

// ==================== 词汇量测试同步接口 ====================

/** 每用户最大保留的词汇量测试记录数 */
const MAX_VOCABULARY_TESTS_PER_USER = 500;

/**
 * 拉取词汇量测试记录（增量同步 + 游标分页）
 * POST /api/stats/vocabulary-tests/sync
 * Body: { afterServerTime?: number, cursor?: string, limit?: number }
 */
router.post('/vocabulary-tests/sync', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { afterServerTime, cursor, limit = 500 } = req.body;
    const limitNum = Math.min(parseInt(limit, 10) || 500, MAX_VOCABULARY_TESTS_PER_USER);

    // 构建查询条件
    const whereClause: any = { userId };

    // 增量同步条件
    if (afterServerTime) {
      whereClause.serverTime = { gt: new Date(afterServerTime) };
    }

    // 游标分页条件
    if (cursor) {
      const parts = cursor.split('_');
      if (parts.length >= 2) {
        const cursorServerTime = new Date(parseInt(parts[0], 10));
        const cursorId = parts.slice(1).join('_');
        if (afterServerTime) {
          delete whereClause.serverTime;
          whereClause.AND = [
            { serverTime: { gt: new Date(afterServerTime) } },
            {
              OR: [
                { serverTime: { gt: cursorServerTime } },
                { serverTime: cursorServerTime, id: { gt: cursorId } },
              ],
            },
          ];
        } else {
          whereClause.OR = [
            { serverTime: { gt: cursorServerTime } },
            { serverTime: cursorServerTime, id: { gt: cursorId } },
          ];
        }
      }
    }

    const tests = await prisma.userVocabularyTest.findMany({
      where: whereClause,
      orderBy: [{ serverTime: 'asc' }, { id: 'asc' }],
      take: limitNum + 1,
    });

    const hasMore = tests.length > limitNum;
    const resultTests = hasMore ? tests.slice(0, limitNum) : tests;

    let nextCursor: string | null = null;
    if (hasMore && resultTests.length > 0) {
      const lastItem = resultTests[resultTests.length - 1];
      nextCursor = `${lastItem.serverTime.getTime()}_${lastItem.id}`;
    }

    // serverTime: 当批数据的最后时间戳
    const serverTime = resultTests.length > 0
      ? resultTests[resultTests.length - 1].serverTime.getTime()
      : Date.now();

    res.json({
      success: true,
      data: {
        tests: resultTests.map((test) => ({
          id: test.id,
          estimatedVocabulary: test.estimatedVocabulary,
          totalQuestions: test.totalQuestions,
          correctCount: test.correctCount,
          duration: test.duration,
          level: test.level,
          levelDescription: test.levelDescription,
          confidenceLower: test.confidenceLower,
          confidenceUpper: test.confidenceUpper,
          eventTime: Number(test.eventTime),
        })),
        nextCursor,
        serverTime,
      },
    });
  } catch (error) {
    logger.error('Failed to sync vocabulary tests:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync vocabulary tests',
    });
  }
});

/**
 * 推送词汇量测试记录
 * POST /api/stats/vocabulary-tests/push
 *
 * 接收测试记录，存储并清理超出限制的旧记录
 */
router.post('/vocabulary-tests/push', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { tests } = req.body as {
      tests: Array<{
        id: string;
        estimatedVocabulary: number;
        totalQuestions: number;
        correctCount: number;
        duration: number;
        level: string;
        levelDescription: string;
        confidenceLower: number;
        confidenceUpper: number;
        eventTime: number;
      }>;
    };

    let testsSynced = 0;

    logger.info(`[VocabularyTests Push] userId=${userId}, tests=${tests?.length || 0}`);

    // 存储测试记录（upsert 去重）
    if (tests && tests.length > 0) {
      for (const test of tests) {
        try {
          await prisma.userVocabularyTest.upsert({
            where: { id: test.id },
            create: {
              id: test.id,
              userId,
              estimatedVocabulary: test.estimatedVocabulary,
              totalQuestions: test.totalQuestions,
              correctCount: test.correctCount,
              duration: test.duration,
              level: test.level,
              levelDescription: test.levelDescription,
              confidenceLower: test.confidenceLower,
              confidenceUpper: test.confidenceUpper,
              eventTime: BigInt(test.eventTime),
            },
            update: {},
          });
          testsSynced++;
        } catch (err) {
          logger.warn('Failed to upsert vocabulary test:', test.id, err);
        }
      }
    }

    // 清理超出限制的旧记录
    const totalCount = await prisma.userVocabularyTest.count({ where: { userId } });
    if (totalCount > MAX_VOCABULARY_TESTS_PER_USER) {
      const toDelete = totalCount - MAX_VOCABULARY_TESTS_PER_USER;
      const oldestTests = await prisma.userVocabularyTest.findMany({
        where: { userId },
        orderBy: { eventTime: 'asc' },
        take: toDelete,
        select: { id: true },
      });
      await prisma.userVocabularyTest.deleteMany({
        where: { id: { in: oldestTests.map((t) => t.id) } },
      });
      logger.info(`[VocabularyTests Push] Cleaned ${toDelete} old records for user ${userId}`);
    }

    logger.info(`[VocabularyTests Push] userId=${userId}, testsSynced=${testsSynced}`);

    res.json({
      success: true,
      data: {
        testsSynced,
      },
    });
  } catch (error) {
    logger.error('[VocabularyTests Push] Failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to push vocabulary tests',
    });
  }
});

export default router;
