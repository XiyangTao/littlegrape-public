/**
 * 关注系统服务
 * 单向关注制（类似微博），自然衍生关注/粉丝/互关三种关系
 */

import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { pushToUser } from '@/websocket/push-channel';

// ==================== 类型定义 ====================

export type FollowStatus = 'none' | 'following' | 'followed_by' | 'mutual';

export interface FollowListItem {
  userId: string;
  nickname: string | null;
  avatar: string | null;
  bio: string | null;
  followStatus: FollowStatus;
}

export interface FollowListResult {
  items: FollowListItem[];
  hasMore: boolean;
  nextCursor?: string;
}

export interface UserProfileData {
  user: { id: string; nickname: string | null; avatar: string | null; bio: string | null; gender: string | null };
  stats: { totalLearned: number; totalMastered: number; streakDays: number; level: number; xp: number };
  showcase: any[];
  social: { followingCount: number; followerCount: number; isFollowing: boolean; isFollowedBy: boolean; isMutual: boolean };
}

// ==================== 关注/取关 ====================

/** 关注用户 */
export async function followUser(followerId: string, followingId: string): Promise<void> {
  if (followerId === followingId) {
    throw new Error('cannot_follow_self');
  }

  try {
    await prisma.$transaction([
      prisma.userFollow.create({
        data: { followerId, followingId },
      }),
      prisma.user.update({ where: { id: followerId }, data: { followingCount: { increment: 1 } } }),
      prisma.user.update({ where: { id: followingId }, data: { followerCount: { increment: 1 } } }),
    ]);
  } catch (err: any) {
    // P2002: 已关注，幂等处理
    if (err.code === 'P2002') return;
    throw err;
  }

  // 检查是否互关
  const reverseFollow = await prisma.userFollow.findUnique({
    where: { followerId_followingId: { followerId: followingId, followingId: followerId } },
  });

  // 推送通知给被关注者
  const follower = await prisma.user.findUnique({
    where: { id: followerId },
    select: { nickname: true, avatar: true },
  });
  pushToUser(followingId, 'social', 'new_follower', {
    userId: followerId,
    nickname: follower?.nickname,
    avatar: follower?.avatar,
  });

  // 互关达成，推送给关注者
  if (reverseFollow) {
    const following = await prisma.user.findUnique({
      where: { id: followingId },
      select: { nickname: true, avatar: true },
    });
    pushToUser(followerId, 'social', 'mutual_follow', {
      userId: followingId,
      nickname: following?.nickname,
      avatar: following?.avatar,
    });
  }
}

/** 取消关注 */
export async function unfollowUser(followerId: string, followingId: string): Promise<void> {
  const deleted = await prisma.userFollow.deleteMany({
    where: { followerId, followingId },
  });

  if (deleted.count === 0) return; // 未关注，幂等

  // 原子递减计数
  await Promise.all([
    prisma.user.update({ where: { id: followerId }, data: { followingCount: { decrement: 1 } } }),
    prisma.user.update({ where: { id: followingId }, data: { followerCount: { decrement: 1 } } }),
  ]);
}

// ==================== 列表查询 ====================

/** 获取关注列表（我关注的人） */
export async function getFollowingList(
  userId: string,
  params: { cursor?: string; limit?: number },
  viewerId?: string,
): Promise<FollowListResult> {
  const limit = params.limit || 20;

  const records = await prisma.userFollow.findMany({
    where: { followerId: userId },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
  });

  const hasMore = records.length > limit;
  if (hasMore) records.pop();
  const targetIds = records.map(r => r.followingId);

  const users = await getUsers(targetIds);
  const statusMap = await checkFollowStatus(viewerId || userId, targetIds);

  return {
    items: records.map(r => {
      const user = users.get(r.followingId);
      return {
        userId: r.followingId,
        nickname: user?.nickname ?? null,
        avatar: user?.avatar ?? null,
        bio: user?.bio ?? null,
        followStatus: statusMap.get(r.followingId) || 'none',
      };
    }),
    hasMore,
    nextCursor: hasMore ? records[records.length - 1].id : undefined,
  };
}

/** 获取粉丝列表 */
export async function getFollowerList(
  userId: string,
  params: { cursor?: string; limit?: number },
  viewerId?: string,
): Promise<FollowListResult> {
  const limit = params.limit || 20;

  const records = await prisma.userFollow.findMany({
    where: { followingId: userId },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
  });

  const hasMore = records.length > limit;
  if (hasMore) records.pop();
  const targetIds = records.map(r => r.followerId);

  const users = await getUsers(targetIds);
  const statusMap = await checkFollowStatus(viewerId || userId, targetIds);

  return {
    items: records.map(r => {
      const user = users.get(r.followerId);
      return {
        userId: r.followerId,
        nickname: user?.nickname ?? null,
        avatar: user?.avatar ?? null,
        bio: user?.bio ?? null,
        followStatus: statusMap.get(r.followerId) || 'none',
      };
    }),
    hasMore,
    nextCursor: hasMore ? records[records.length - 1].id : undefined,
  };
}

/** 获取互关好友列表 */
export async function getMutualList(
  userId: string,
  params: { cursor?: string; limit?: number },
): Promise<FollowListResult> {
  const limit = params.limit || 20;

  // 双向 JOIN：我关注的人中，也关注了我的
  // 游标分页：用 a.id 作为游标，通过子查询获取游标行的 createdAt 进行比较
  let mutuals: Array<{ id: string; followingId: string }>;

  if (params.cursor) {
    mutuals = await prisma.$queryRaw`
      SELECT a."id", a."followingId"
      FROM "user_follows" a
      INNER JOIN "user_follows" b ON a."followingId" = b."followerId" AND b."followingId" = a."followerId"
      WHERE a."followerId" = ${userId}
        AND (a."createdAt", a."id") < (
          SELECT c."createdAt", c."id" FROM "user_follows" c WHERE c."id" = ${params.cursor}
        )
      ORDER BY a."createdAt" DESC, a."id" DESC
      LIMIT ${limit + 1}
    `;
  } else {
    mutuals = await prisma.$queryRaw`
      SELECT a."id", a."followingId"
      FROM "user_follows" a
      INNER JOIN "user_follows" b ON a."followingId" = b."followerId" AND b."followingId" = a."followerId"
      WHERE a."followerId" = ${userId}
      ORDER BY a."createdAt" DESC, a."id" DESC
      LIMIT ${limit + 1}
    `;
  }

  const hasMore = mutuals.length > limit;
  if (hasMore) mutuals.pop();
  const targetIds = mutuals.map(r => r.followingId);

  const users = await getUsers(targetIds);

  return {
    items: mutuals.map(r => {
      const user = users.get(r.followingId);
      return {
        userId: r.followingId,
        nickname: user?.nickname ?? null,
        avatar: user?.avatar ?? null,
        bio: user?.bio ?? null,
        followStatus: 'mutual' as FollowStatus,
      };
    }),
    hasMore,
    nextCursor: hasMore ? mutuals[mutuals.length - 1].id : undefined,
  };
}

// ==================== 搜索 ====================

/** 搜索用户 */
export async function searchUsers(
  keyword: string,
  currentUserId: string,
  params: { cursor?: string; limit?: number },
): Promise<FollowListResult> {
  const limit = params.limit || 20;
  const trimmed = keyword.trim();
  if (!trimmed) return { items: [], hasMore: false };

  const users = await prisma.user.findMany({
    where: {
      nickname: { contains: trimmed, mode: 'insensitive' },
      id: { not: currentUserId },
      isActive: true,
    },
    select: { id: true, nickname: true, avatar: true, bio: true },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
  });

  const hasMore = users.length > limit;
  if (hasMore) users.pop();
  const targetIds = users.map(u => u.id);
  const statusMap = await checkFollowStatus(currentUserId, targetIds);

  return {
    items: users.map(u => ({
      userId: u.id,
      nickname: u.nickname,
      avatar: u.avatar,
      bio: u.bio,
      followStatus: statusMap.get(u.id) || 'none',
    })),
    hasMore,
    nextCursor: hasMore ? users[users.length - 1].id : undefined,
  };
}

// ==================== 用户主页 ====================

/** 获取用户公开主页数据 */
export async function getUserProfile(targetUserId: string, viewerId?: string): Promise<UserProfileData> {
  // 并行查询基础信息、统计、等级、展柜
  const [user, stats, level, showcase] = await Promise.all([
    prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true, nickname: true, avatar: true, bio: true, gender: true,
        followingCount: true, followerCount: true,
      },
    }),
    prisma.userDailyStats.aggregate({
      where: { userId: targetUserId },
      _sum: { learnedCount: true, masteredCount: true },
    }),
    prisma.userLevel.findUnique({
      where: { userId: targetUserId },
      select: { level: true, xp: true },
    }),
    getShowcase(targetUserId),
  ]);

  if (!user) throw new Error('user_not_found');

  // 计算连续天数
  const streakDays = await calculateStreak(targetUserId);

  // 关注关系
  let isFollowing = false;
  let isFollowedBy = false;
  if (viewerId && viewerId !== targetUserId) {
    const [following, followedBy] = await Promise.all([
      prisma.userFollow.findUnique({
        where: { followerId_followingId: { followerId: viewerId, followingId: targetUserId } },
      }),
      prisma.userFollow.findUnique({
        where: { followerId_followingId: { followerId: targetUserId, followingId: viewerId } },
      }),
    ]);
    isFollowing = !!following;
    isFollowedBy = !!followedBy;
  }

  return {
    user: {
      id: user.id,
      nickname: user.nickname,
      avatar: user.avatar,
      bio: user.bio,
      gender: user.gender,
    },
    stats: {
      totalLearned: stats._sum.learnedCount || 0,
      totalMastered: stats._sum.masteredCount || 0,
      streakDays,
      level: level?.level ?? 1,
      xp: level?.xp ?? 0,
    },
    showcase,
    social: {
      followingCount: user.followingCount,
      followerCount: user.followerCount,
      isFollowing,
      isFollowedBy,
      isMutual: isFollowing && isFollowedBy,
    },
  };
}

// ==================== 批量检查关注关系 ====================

/** 批量检查关注关系 */
export async function checkFollowStatus(
  userId: string,
  targetIds: string[],
): Promise<Map<string, FollowStatus>> {
  if (targetIds.length === 0) return new Map();

  const [following, followers] = await Promise.all([
    prisma.userFollow.findMany({
      where: { followerId: userId, followingId: { in: targetIds } },
      select: { followingId: true },
    }),
    prisma.userFollow.findMany({
      where: { followingId: userId, followerId: { in: targetIds } },
      select: { followerId: true },
    }),
  ]);

  const followingSet = new Set(following.map(f => f.followingId));
  const followerSet = new Set(followers.map(f => f.followerId));

  const result = new Map<string, FollowStatus>();
  for (const id of targetIds) {
    const iFollow = followingSet.has(id);
    const theyFollow = followerSet.has(id);
    if (iFollow && theyFollow) result.set(id, 'mutual');
    else if (iFollow) result.set(id, 'following');
    else if (theyFollow) result.set(id, 'followed_by');
    else result.set(id, 'none');
  }
  return result;
}

// ==================== 工具函数 ====================

async function getUsers(userIds: string[]) {
  if (userIds.length === 0) return new Map();
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, nickname: true, avatar: true, bio: true },
  });
  return new Map(users.map(u => [u.id, u]));
}

async function getShowcase(userId: string) {
  const items = await prisma.userBadgeShowcase.findMany({
    where: { userId },
    orderBy: { slotIndex: 'asc' },
  });
  if (items.length === 0) return [];

  const codes = items.map(i => i.achievementId);
  const defs = await prisma.achievementDefinition.findMany({
    where: { code: { in: codes } },
    select: {
      code: true, nameZh: true, nameEn: true,
      descriptionZh: true, descriptionEn: true,
      icon: true, rarity: true, category: true, xpReward: true,
    },
  });
  const defMap = new Map(defs.map(d => [d.code, d]));

  return items.map(item => {
    const def = defMap.get(item.achievementId);
    return {
      slotIndex: item.slotIndex,
      achievementId: item.achievementId,
      name: def ? { 'zh-CN': def.nameZh, en: def.nameEn } : null,
      description: def ? { 'zh-CN': def.descriptionZh, en: def.descriptionEn } : null,
      icon: def?.icon ?? 'help-outline',
      rarity: def?.rarity ?? 'common',
      category: def?.category,
      xpReward: def?.xpReward ?? 0,
    };
  });
}

async function calculateStreak(userId: string): Promise<number> {
  const stats = await prisma.userDailyStats.findMany({
    where: {
      userId,
      OR: [
        { learnedCount: { gt: 0 } },
        { masteredCount: { gt: 0 } },
        { reviewedCount: { gt: 0 } },
      ],
    },
    select: { eventDate: true },
    orderBy: { eventDate: 'desc' },
  });

  if (stats.length === 0) return 0;

  const today = new Date();
  today.setHours(today.getHours() + 8); // 中国时区
  const todayStr = today.toISOString().slice(0, 10);
  const yesterdayDate = new Date(today);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().slice(0, 10);

  if (stats[0].eventDate !== todayStr && stats[0].eventDate !== yesterdayStr) {
    return 0;
  }

  let streak = 1;
  for (let i = 1; i < stats.length; i++) {
    const prev = new Date(stats[i - 1].eventDate);
    const curr = new Date(stats[i].eventDate);
    const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
    if (Math.round(diff) === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}
