/** 每周一 09:00 — 每周总结 */

import { Job } from 'bullmq';
import { prisma } from '@/config/database';
import { getNDaysAgoCN } from '@/utils/dateUtils';
import { logger } from '@/utils/logger';
import { createPushRecords } from './pushHelper';

const BATCH_SIZE = 200;

export async function weeklySummary(_job: Job): Promise<void> {
  const oneWeekAgo = getNDaysAgoCN(7);
  let cursor: string | undefined;
  let totalSent = 0;

  while (true) {
    const batch = await prisma.userStats.findMany({
      where: { lastActiveDate: { gte: oneWeekAgo } },
      select: { userId: true, totalLearned: true, streakDays: true },
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { userId: cursor } } : {}),
      orderBy: { userId: 'asc' },
    });

    if (batch.length === 0) break;

    const items = batch.map(u => ({
      userId: u.userId,
      content: `新的一周开始了！你已累计学习 ${u.totalLearned} 个单词，连续打卡 ${u.streakDays} 天。继续加油~`,
    }));

    const result = await createPushRecords(items, 'weekly_summary', 'in_app');
    totalSent += result.count;
    cursor = batch[batch.length - 1].userId;
    if (batch.length < BATCH_SIZE) break;
  }

  if (totalSent > 0) logger.info(`Weekly summary: ${totalSent} users`);
}
