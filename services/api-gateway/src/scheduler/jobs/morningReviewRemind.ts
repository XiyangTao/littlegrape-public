/** 09:00 — 复习提醒：有 >= 5 个易错单词的用户 */

import { Job } from 'bullmq';
import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { createPushRecords } from './pushHelper';

const BATCH_SIZE = 200;

export async function morningReviewRemind(_job: Job): Promise<void> {
  let offset = 0;
  let totalSent = 0;

  while (true) {
    const batch: Array<{ userId: string; cnt: bigint }> = await prisma.$queryRaw`
      SELECT "userId", COUNT(*) as cnt
      FROM "user_difficult_words"
      GROUP BY "userId"
      HAVING COUNT(*) >= 5
      ORDER BY "userId"
      LIMIT ${BATCH_SIZE} OFFSET ${offset}
    `;

    if (batch.length === 0) break;

    const items = batch.map(u => ({
      userId: u.userId,
      content: `你有 ${Number(u.cnt)} 个易错单词需要复习，趁热打铁效果最好哦~`,
    }));

    const result = await createPushRecords(items, 'review_remind', 'in_app');
    totalSent += result.count;
    offset += BATCH_SIZE;
    if (batch.length < BATCH_SIZE) break;
  }

  if (totalSent > 0) logger.info(`Review remind: ${totalSent} users notified`);
}
