/**
 * 成就展柜与分享服务
 * - 展柜 CRUD（最多 5 个展位，只能放已解锁成就）
 * - 成就排行榜
 */

import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';

const MAX_SHOWCASE_SLOTS = 5;

// ==================== 展柜 ====================

/** 获取用户展柜 */
export async function getShowcase(userId: string) {
  const items = await prisma.userBadgeShowcase.findMany({
    where: { userId },
    orderBy: { slotIndex: 'asc' },
  });

  // 补充成就详情
  if (items.length === 0) return [];

  const achievementCodes = items.map(i => i.achievementId);
  const defs = await prisma.achievementDefinition.findMany({
    where: { code: { in: achievementCodes } },
    select: {
      code: true,
      nameZh: true,
      nameEn: true,
      descriptionZh: true,
      descriptionEn: true,
      icon: true,
      rarity: true,
      category: true,
      xpReward: true,
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

/** 设置展柜（传入 slotIndex 和 achievementCode） */
export async function setShowcase(userId: string, slots: Array<{ slotIndex: number; achievementId: string }>) {
  // 验证 slotIndex 范围
  for (const slot of slots) {
    if (slot.slotIndex < 0 || slot.slotIndex >= MAX_SHOWCASE_SLOTS) {
      return { success: false, error: 'invalid_slot_index' };
    }
  }

  // 验证成就是否已解锁
  const achievementCodes = [...new Set(slots.map(s => s.achievementId))];
  const unlocked = await prisma.userAchievement.findMany({
    where: { userId, achievementId: { in: achievementCodes } },
    select: { achievementId: true },
  });
  const unlockedSet = new Set(unlocked.map(u => u.achievementId));

  for (const slot of slots) {
    if (!unlockedSet.has(slot.achievementId)) {
      return { success: false, error: 'achievement_not_unlocked' };
    }
  }

  // 事务性更新：先清除，再写入
  await prisma.$transaction(async (tx) => {
    await tx.userBadgeShowcase.deleteMany({ where: { userId } });
    for (const slot of slots) {
      await tx.userBadgeShowcase.create({
        data: {
          userId,
          achievementId: slot.achievementId,
          slotIndex: slot.slotIndex,
        },
      });
    }
  });

  return { success: true };
}

// ==================== 成就排行榜 ====================

/** 获取成就排行榜（按解锁数量排序） */
export async function getAchievementLeaderboard(limit: number = 20) {
  const rows: Array<{ userId: string; count: bigint }> = await prisma.$queryRawUnsafe(`
    SELECT "userId", COUNT(*) as "count"
    FROM "user_achievements"
    GROUP BY "userId"
    ORDER BY "count" DESC
    LIMIT $1
  `, limit);

  if (rows.length === 0) return [];

  const userIds = rows.map(r => r.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, nickname: true, avatar: true },
  });
  const userMap = new Map(users.map(u => [u.id, u]));

  // 查每个用户的等级
  const levels = await prisma.userLevel.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, level: true },
  });
  const levelMap = new Map(levels.map(l => [l.userId, l.level]));

  return rows.map((row, index) => {
    const user = userMap.get(row.userId);
    return {
      rank: index + 1,
      userId: row.userId,
      nickname: user?.nickname ?? 'Unknown',
      avatar: user?.avatar ?? null,
      level: levelMap.get(row.userId) ?? 1,
      achievementCount: Number(row.count),
    };
  });
}
