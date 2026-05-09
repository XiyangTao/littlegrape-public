/** 每 30 分钟 — 补偿检测：扫描最近活跃用户，兜底检查成就 */

import { Job } from 'bullmq';
import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { getTodayCN } from '@/utils/dateUtils';
import { recheckAllAchievements } from '@/services/achievementService';

const COMPENSATION_CONCURRENCY = 10;

export async function compensationCheck(_job: Job): Promise<void> {
  try {
    const todayStr = getTodayCN();

    const activeUsers = await prisma.userStats.findMany({
      where: { lastActiveDate: todayStr },
      select: { userId: true },
      take: 100,
    });

    let checkedCount = 0;

    for (let i = 0; i < activeUsers.length; i += COMPENSATION_CONCURRENCY) {
      const batch = activeUsers.slice(i, i + COMPENSATION_CONCURRENCY);
      const results = await Promise.allSettled(
        batch.map(({ userId }) => recheckAllAchievements(userId)),
      );

      for (const r of results) {
        if (r.status === 'fulfilled' && r.value.newAchievements.length > 0) {
          checkedCount++;
        } else if (r.status === 'rejected') {
          logger.error('Compensation check failed for a user:', r.reason);
        }
      }
    }

    if (checkedCount > 0) {
      logger.info(`Achievement compensation: ${checkedCount}/${activeUsers.length} users had new achievements`);
    }
  } catch (error) {
    logger.error('compensationCheck failed:', error);
  }
}
