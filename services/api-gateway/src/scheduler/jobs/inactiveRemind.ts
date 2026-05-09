/** 10:00 — 长期未学提醒（3 天以上） */

import { Job } from 'bullmq';
import { prisma } from '@/config/database';
import { getNDaysAgoCN } from '@/utils/dateUtils';
import { logger } from '@/utils/logger';
import { createPushRecords } from './pushHelper';

const BATCH_SIZE = 200;

export async function inactiveRemind(_job: Job): Promise<void> {
  const threeDaysAgo = getNDaysAgoCN(3);
  let cursor: string | undefined;
  let totalSent = 0;

  while (true) {
    const batch = await prisma.userStats.findMany({
      where: {
        lastActiveDate: { lte: threeDaysAgo },
        totalLearned: { gt: 0 },
      },
      select: { userId: true },
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { userId: cursor } } : {}),
      orderBy: { userId: 'asc' },
    });

    if (batch.length === 0) break;

    const items = batch.map(u => ({
      userId: u.userId,
      content: '好久没见到你了，你的单词们在想你！哪怕每天 5 分钟，也能保持记忆哦~',
    }));

    const result = await createPushRecords(items, 'inactive_remind', 'notification');
    totalSent += result.count;
    cursor = batch[batch.length - 1].userId;
    if (batch.length < BATCH_SIZE) break;
  }

  if (totalSent > 0) logger.info(`Inactive remind: ${totalSent} users`);
}
