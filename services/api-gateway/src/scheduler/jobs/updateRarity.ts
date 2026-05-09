/** 每 6 小时 — 计算成就稀有度百分比并批量更新 */

import { Job } from 'bullmq';
import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { invalidateAchievementCache } from '@/services/achievementService';

export async function updateRarity(_job: Job): Promise<void> {
  try {
    const totalUsers = await prisma.userStats.count();
    if (totalUsers === 0) return;

    const counts: Array<{ achievementId: string; count: bigint }> = await prisma.$queryRaw`
      SELECT "achievementId", COUNT(*) as "count"
      FROM "user_achievements"
      GROUP BY "achievementId"
    `;
    const countMap = new Map(counts.map(c => [c.achievementId, Number(c.count)]));

    const defs = await prisma.achievementDefinition.findMany({
      where: { isActive: true },
      select: { id: true, code: true },
    });

    const updates = defs.map(def => {
      const unlockedCount = countMap.get(def.code) || 0;
      const percent = Math.round((unlockedCount / totalUsers) * 10000) / 100;
      let rarity: string;
      if (percent <= 1) rarity = 'legendary';
      else if (percent <= 5) rarity = 'epic';
      else if (percent <= 20) rarity = 'rare';
      else rarity = 'common';

      return prisma.achievementDefinition.update({
        where: { id: def.id },
        data: { rarity, rarityPercent: percent },
      });
    });

    await prisma.$transaction(updates);
    invalidateAchievementCache();
    logger.info(`Achievement rarity updated for ${defs.length} definitions (${totalUsers} users)`);
  } catch (error) {
    logger.error('updateRarity failed:', error);
  }
}
