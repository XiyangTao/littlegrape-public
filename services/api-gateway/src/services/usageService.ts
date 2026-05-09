/**
 * 用量统计服务
 * - Redis: 实时计数（按服务按天）+ 配额成本累计
 * - PostgreSQL: 按天汇总持久化
 */

import { prisma } from '@/config/database';
import { redisClient } from '@/config/redis';
import { logger } from '@/utils/logger';
import { getTodayCN, getMonthCN } from '@/utils/dateUtils';
import { getQuotaCostKey, calculateCostIncrement } from '@/services/quotaService';

// 服务类型
export type ServiceType =
  | 'ai'
  | 'tts'
  | 'asr'
  | 'pronunciation'
  | 'translation'
  | 'text_translation'
  | 'interpretation_input_audio_tokens'
  | 'interpretation_output_text_tokens'
  | 'interpretation_output_audio_tokens';

// 用量查询结果
export interface UsageStats {
  today: number;
  month: number;
  byService: {
    ai: { today: number; month: number };
    tts: { today: number; month: number };
    asr: { today: number; month: number };
    pronunciation: { today: number; month: number };
    translation: { today: number; month: number };
    text_translation: { today: number; month: number };
  };
}

/**
 * 获取当前日期 YYYY-MM-DD
 */
function getCurrentDate(): string {
  return getTodayCN();
}

/**
 * 获取当前月份 YYYY-MM
 */
function getCurrentMonth(): string {
  return getMonthCN();
}

/**
 * 获取 Redis key（按服务按天的用量计数）
 */
function getRedisKey(userId: string, serviceType: ServiceType, date: string): string {
  return `usage:${userId}:${serviceType}:${date}`;
}

/**
 * 记录用量
 * 1. Redis INCRBYFLOAT 累加配额成本（quota:cost:{userId}）
 * 2. Redis INCRBY 按服务按天计数
 * 3. PostgreSQL 异步更新每日汇总
 *
 * 注意：INCRBYFLOAT 必须在第一个 await 之前发送到 Redis，
 * 确保 route handler 调用 res.json 时 Redis 已有最新值。
 */
export async function recordUsage(
  userId: string,
  serviceType: ServiceType,
  amount: number,
): Promise<void> {
  const date = getCurrentDate();
  const redisKey = getRedisKey(userId, serviceType, date);

  // 1. 累加配额成本到 Redis（发送命令但不 await，确保命令先于后续 GET 入队）
  const costIncrement = calculateCostIncrement(serviceType, amount);
  const costPromise = costIncrement > 0
    ? redisClient.incrByFloat(getQuotaCostKey(userId), costIncrement).catch(err => {
        logger.error('[Usage] 累加配额成本失败:', err);
      })
    : Promise.resolve();

  try {
    // 2. Redis 按服务按天计数 (原子操作)
    await Promise.all([
      costPromise,
      redisClient.incrBy(redisKey, amount),
    ]);
    // 设置过期时间 (48小时，确保跨天数据不丢失)
    await redisClient.expire(redisKey, 48 * 60 * 60);

    // 3. PostgreSQL 异步更新 (不阻塞请求)
    setImmediate(async () => {
      try {
        await prisma.userDailyUsage.upsert({
          where: {
            userId_serviceType_date: { userId, serviceType, date }
          },
          update: {
            totalAmount: { increment: amount }
          },
          create: {
            userId,
            serviceType,
            date,
            totalAmount: amount,
          }
        });
      } catch (error) {
        logger.error('用量写入数据库失败:', error);
      }
    });

    logger.info(`用量记录: user=${userId}, service=${serviceType}, amount=${amount}`);
  } catch (error) {
    logger.error('用量记录失败:', error);
    // 不抛出异常，避免影响主流程
  }
}

/**
 * 获取用户今日用量 (从 Redis 快速获取)
 */
export async function getTodayUsage(
  userId: string,
  serviceType?: ServiceType
): Promise<number> {
  const date = getCurrentDate();

  try {
    if (serviceType) {
      const key = getRedisKey(userId, serviceType, date);
      const value = await redisClient.get(key);
      return parseInt(value || '0', 10);
    }

    // 获取所有服务类型的总和
    const types: ServiceType[] = ['ai', 'tts', 'asr', 'pronunciation', 'translation', 'text_translation'];
    let total = 0;
    for (const type of types) {
      const key = getRedisKey(userId, type, date);
      const value = await redisClient.get(key);
      total += parseInt(value || '0', 10);
    }
    return total;
  } catch (error) {
    logger.error('获取今日用量失败:', error);
    return 0;
  }
}

/**
 * 获取用户当月用量 (从数据库查询)
 */
export async function getMonthUsage(
  userId: string,
  serviceType?: ServiceType
): Promise<number> {
  const month = getCurrentMonth();
  const startDate = `${month}-01`;
  const endDate = `${month}-31`;

  try {
    const where: any = {
      userId,
      date: { gte: startDate, lte: endDate }
    };
    if (serviceType) {
      where.serviceType = serviceType;
    }

    const result = await prisma.userDailyUsage.aggregate({
      where,
      _sum: { totalAmount: true }
    });

    return result._sum.totalAmount || 0;
  } catch (error) {
    logger.error('获取当月用量失败:', error);
    return 0;
  }
}

/**
 * 获取用户完整用量统计
 */
export async function getUserUsageStats(userId: string): Promise<UsageStats> {
  // 并行获取所有数据
  const [
    todayAi, todayTts, todayAsr, todayPronunciation, todayTranslation, todayTextTranslation,
    monthAi, monthTts, monthAsr, monthPronunciation, monthTranslation, monthTextTranslation
  ] = await Promise.all([
    getTodayUsage(userId, 'ai'),
    getTodayUsage(userId, 'tts'),
    getTodayUsage(userId, 'asr'),
    getTodayUsage(userId, 'pronunciation'),
    getTodayUsage(userId, 'translation'),
    getTodayUsage(userId, 'text_translation'),
    getMonthUsage(userId, 'ai'),
    getMonthUsage(userId, 'tts'),
    getMonthUsage(userId, 'asr'),
    getMonthUsage(userId, 'pronunciation'),
    getMonthUsage(userId, 'translation'),
    getMonthUsage(userId, 'text_translation')
  ]);

  return {
    today: todayAi + todayTts + todayAsr + todayPronunciation + todayTranslation + todayTextTranslation,
    month: monthAi + monthTts + monthAsr + monthPronunciation + monthTranslation + monthTextTranslation,
    byService: {
      ai: { today: todayAi, month: monthAi },
      tts: { today: todayTts, month: monthTts },
      asr: { today: todayAsr, month: monthAsr },
      pronunciation: { today: todayPronunciation, month: monthPronunciation },
      translation: { today: todayTranslation, month: monthTranslation },
      text_translation: { today: todayTextTranslation, month: monthTextTranslation }
    }
  };
}

/**
 * 获取用户指定日期范围的用量历史
 */
export async function getUsageHistory(
  userId: string,
  startDate: string,
  endDate: string,
  serviceType?: ServiceType
): Promise<Array<{ date: string; serviceType: string; totalAmount: number }>> {
  try {
    const where: any = {
      userId,
      date: { gte: startDate, lte: endDate }
    };
    if (serviceType) {
      where.serviceType = serviceType;
    }

    const records = await prisma.userDailyUsage.findMany({
      where,
      select: {
        date: true,
        serviceType: true,
        totalAmount: true
      },
      orderBy: { date: 'asc' }
    });

    return records;
  } catch (error) {
    logger.error('获取用量历史失败:', error);
    return [];
  }
}
