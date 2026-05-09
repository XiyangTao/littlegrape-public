/** 20:00 — 打卡提醒（昨天学了今天没学的用户） */

import { Job } from 'bullmq';
import { prisma } from '@/config/database';
import { getTodayCN, getYesterdayCN } from '@/utils/dateUtils';
import { logger } from '@/utils/logger';
import { createPushRecords } from './pushHelper';

const BATCH_SIZE = 200;

export async function eveningCheckInRemind(_job: Job): Promise<void> {
  const today = getTodayCN();
  const yesterday = getYesterdayCN();
  let offset = 0;
  let totalSent = 0;

  while (true) {
    const batch: Array<{ userId: string }> = await prisma.$queryRaw`
      SELECT y."userId"
      FROM "user_daily_stats" y
      LEFT JOIN "user_daily_stats" t
        ON y."userId" = t."userId" AND t."eventDate" = ${today} AND t."learnedCount" > 0
      WHERE y."eventDate" = ${yesterday}
        AND y."learnedCount" > 0
        AND t."userId" IS NULL
      ORDER BY y."userId"
      LIMIT ${BATCH_SIZE} OFFSET ${offset}
    `;

    if (batch.length === 0) break;

    const items = batch.map(u => ({
      userId: u.userId,
      content: '今天还没有开始学习哦，保持连续打卡，你的坚持终会得到回报！',
    }));

    const result = await createPushRecords(items, 'daily_remind', 'notification');
    totalSent += result.count;
    offset += BATCH_SIZE;
    if (batch.length < BATCH_SIZE) break;
  }

  if (totalSent > 0) logger.info(`Check-in remind: ${totalSent} users`);
}
