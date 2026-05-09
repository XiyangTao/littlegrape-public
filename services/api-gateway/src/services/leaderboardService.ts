/**
 * 排行榜服务
 * 基于现有数据实时聚合排名
 */

import { prisma } from '@/config/database';
import { getTodayCN, getNDaysAgoCN, dateDiffDays } from '@/utils/dateUtils';

export type LeaderboardType = 'learned' | 'mastered' | 'streak' | 'xp';
export type LeaderboardPeriod = 'week' | 'month' | 'all';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  nickname: string | null;
  avatar: string | null;
  value: number;
}

export interface LeaderboardScope {
  type: 'following';
  userId: string;
}

/** 获取排行榜 */
export async function getLeaderboard(
  type: LeaderboardType,
  period: LeaderboardPeriod,
  limit: number = 50,
  scope?: LeaderboardScope,
): Promise<LeaderboardEntry[]> {
  // 好友范围：获取关注用户 ID 列表（含自己）
  let userIdFilter: string[] | undefined;
  if (scope?.type === 'following') {
    const follows = await prisma.userFollow.findMany({
      where: { followerId: scope.userId },
      select: { followingId: true },
    });
    userIdFilter = [scope.userId, ...follows.map(f => f.followingId)];
  }

  switch (type) {
    case 'learned':
      return getLearnedLeaderboard(period, limit, userIdFilter);
    case 'mastered':
      return getMasteredLeaderboard(period, limit, userIdFilter);
    case 'streak':
      return getStreakLeaderboard(limit, userIdFilter);
    case 'xp':
      return getXPLeaderboard(limit, userIdFilter);
    default:
      return [];
  }
}

/** 学习单词排行 */
async function getLearnedLeaderboard(period: LeaderboardPeriod, limit: number, userIdFilter?: string[]): Promise<LeaderboardEntry[]> {
  const dateRange = getDateRange(period);

  const where: any = {};
  if (dateRange) { where.eventDate = { gte: dateRange.start, lte: dateRange.end }; }
  if (userIdFilter) { where.userId = { in: userIdFilter }; }

  const results = await prisma.userDailyStats.groupBy({
    by: ['userId'],
    _sum: { learnedCount: true },
    where: Object.keys(where).length > 0 ? where : undefined,
    orderBy: { _sum: { learnedCount: 'desc' } },
    take: limit,
  });

  return enrichWithUserInfo(
    results.map((r, i) => ({
      rank: i + 1,
      userId: r.userId,
      value: r._sum.learnedCount || 0,
    }))
  );
}

/** 掌握单词排行 */
async function getMasteredLeaderboard(period: LeaderboardPeriod, limit: number, userIdFilter?: string[]): Promise<LeaderboardEntry[]> {
  const dateRange = getDateRange(period);

  const where: any = {};
  if (dateRange) { where.eventDate = { gte: dateRange.start, lte: dateRange.end }; }
  if (userIdFilter) { where.userId = { in: userIdFilter }; }

  const results = await prisma.userDailyStats.groupBy({
    by: ['userId'],
    _sum: { masteredCount: true },
    where: Object.keys(where).length > 0 ? where : undefined,
    orderBy: { _sum: { masteredCount: 'desc' } },
    take: limit,
  });

  return enrichWithUserInfo(
    results.map((r, i) => ({
      rank: i + 1,
      userId: r.userId,
      value: r._sum.masteredCount || 0,
    }))
  );
}

/** 连续打卡排行（不分时间段） */
async function getStreakLeaderboard(limit: number, userIdFilter?: string[]): Promise<LeaderboardEntry[]> {
  // 计算每个用户的当前连续天数
  const where: any = {
    OR: [
      { learnedCount: { gt: 0 } },
      { masteredCount: { gt: 0 } },
      { reviewedCount: { gt: 0 } },
    ],
  };
  if (userIdFilter) { where.userId = { in: userIdFilter }; }

  const allStats = await prisma.userDailyStats.findMany({
    select: { userId: true, eventDate: true },
    where,
    orderBy: [{ userId: 'asc' }, { eventDate: 'desc' }],
  });

  // 按用户分组计算连续天数
  const streakMap = new Map<string, number>();
  let currentUserId = '';
  let streakCount = 0;
  let lastDate = '';

  const today = getTodayCN();
  const yesterday = getNDaysAgoCN(1);

  for (const stat of allStats) {
    if (stat.userId !== currentUserId) {
      if (currentUserId) streakMap.set(currentUserId, streakCount);
      currentUserId = stat.userId;
      lastDate = stat.eventDate;
      // 最新记录必须是今天或昨天，否则 streak 已断
      if (lastDate !== today && lastDate !== yesterday) {
        streakCount = 0;
      } else {
        streakCount = 1;
      }
    } else {
      if (streakCount === 0) continue; // 已断签，跳过后续记录
      const diff = dateDiffDays(stat.eventDate, lastDate);
      if (diff === 1) {
        streakCount++;
        lastDate = stat.eventDate;
      } else {
        break; // 连续中断，提前退出
      }
    }
  }
  if (currentUserId) streakMap.set(currentUserId, streakCount);

  // 排序取前 N
  const sorted = Array.from(streakMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  return enrichWithUserInfo(
    sorted.map(([userId, value], i) => ({ rank: i + 1, userId, value }))
  );
}

/** 经验值排行（不分时间段） */
async function getXPLeaderboard(limit: number, userIdFilter?: string[]): Promise<LeaderboardEntry[]> {
  const levels = await prisma.userLevel.findMany({
    where: userIdFilter ? { userId: { in: userIdFilter } } : undefined,
    orderBy: { xp: 'desc' },
    take: limit,
  });

  return enrichWithUserInfo(
    levels.map((l, i) => ({ rank: i + 1, userId: l.userId, value: l.xp }))
  );
}

/** 获取用户排名 */
export async function getUserRank(userId: string, type: LeaderboardType, period: LeaderboardPeriod): Promise<number | null> {
  const leaderboard = await getLeaderboard(type, period, 200);
  const entry = leaderboard.find(e => e.userId === userId);
  return entry?.rank ?? null;
}

// ==================== 工具函数 ====================

function getDateRange(period: LeaderboardPeriod): { start: string; end: string } | null {
  if (period === 'all') return null;
  const end = getTodayCN();
  const start = period === 'week' ? getNDaysAgoCN(6) : getNDaysAgoCN(29);
  return { start, end };
}

// dateDiffDays 已从 @/utils/dateUtils (共享包) 导入

async function enrichWithUserInfo(
  entries: Array<{ rank: number; userId: string; value: number }>
): Promise<LeaderboardEntry[]> {
  if (entries.length === 0) return [];

  const userIds = entries.map(e => e.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, nickname: true, avatar: true },
  });
  const userMap = new Map(users.map(u => [u.id, u]));

  return entries
    .filter(e => e.value > 0)
    .map(e => ({
      ...e,
      nickname: userMap.get(e.userId)?.nickname || null,
      avatar: userMap.get(e.userId)?.avatar || null,
    }));
}
