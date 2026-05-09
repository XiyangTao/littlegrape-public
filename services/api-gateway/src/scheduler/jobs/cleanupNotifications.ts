/** 每天 03:00 — 清理 30 天以前的已读通知 */

import { Job } from 'bullmq';
import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

export async function cleanupNotifications(_job: Job): Promise<void> {
  try {
    const thirtyDaysAgo = new Date(Date.now() - THIRTY_DAYS);
    const result = await prisma.achievementNotification.deleteMany({
      where: {
        isRead: true,
        createdAt: { lt: thirtyDaysAgo },
      },
    });
    if (result.count > 0) {
      logger.info(`Cleaned up ${result.count} read notifications older than 30 days`);
    }
  } catch (error) {
    logger.error('cleanupNotifications failed:', error);
  }
}
