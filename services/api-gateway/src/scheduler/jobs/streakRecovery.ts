/** 10:00 — 断签挽回 */

import { Job } from 'bullmq';
import { prisma } from '@/config/database';
import { getYesterdayCN } from '@/utils/dateUtils';
import { logger } from '@/utils/logger';
import { createPushRecords } from './pushHelper';

const BATCH_SIZE = 200;

export async function streakRecovery(_job: Job): Promise<void> {
  const yesterday = getYesterdayCN();
  let cursor: string | undefined;
  let totalSent = 0;

  while (true) {
    const batch = await prisma.userStats.findMany({
      where: {
        streakDays: 0,
        maxStreakDays: { gte: 3 },
        lastActiveDate: yesterday,
      },
      select: { userId: true, maxStreakDays: true },
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { userId: cursor } } : {}),
      orderBy: { userId: 'asc' },
    });

    if (batch.length === 0) break;

    const items = batch.map(u => ({
      userId: u.userId,
      content: `你曾经连续学习了 ${u.maxStreakDays} 天，好不容易建立的习惯别放弃！今天继续吧~`,
    }));

    const result = await createPushRecords(items, 'streak_recover', 'in_app');
    totalSent += result.count;
    cursor = batch[batch.length - 1].userId;
    if (batch.length < BATCH_SIZE) break;
  }

  if (totalSent > 0) logger.info(`Streak recovery: ${totalSent} users`);
}
