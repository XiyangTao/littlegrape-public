/** 每小时 — 赛季管理：自动激活/关闭赛季 */

import { Job } from 'bullmq';
import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { invalidateAchievementCache } from '@/services/achievementService';

export async function manageSeasons(_job: Job): Promise<void> {
  try {
    const now = new Date();

    // 激活已到开始时间但未激活的赛季
    const activated = await prisma.season.updateMany({
      where: {
        isActive: false,
        startDate: { lte: now },
        endDate: { gt: now },
      },
      data: { isActive: true },
    });
    if (activated.count > 0) {
      logger.info(`Season management: activated ${activated.count} seasons`);
      invalidateAchievementCache();
    }

    // 关闭已过期的赛季
    const deactivated = await prisma.season.updateMany({
      where: {
        isActive: true,
        endDate: { lte: now },
      },
      data: { isActive: false },
    });
    if (deactivated.count > 0) {
      logger.info(`Season management: deactivated ${deactivated.count} expired seasons`);
      invalidateAchievementCache();
    }
  } catch (error) {
    logger.error('manageSeasons failed:', error);
  }
}
