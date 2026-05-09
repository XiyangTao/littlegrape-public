/** 09:00 — 生日祝福 */

import { Job } from 'bullmq';
import { prisma } from '@/config/database';
import { formatMonthDayCN } from '@/utils/dateUtils';
import { logger } from '@/utils/logger';
import { createPushRecords } from './pushHelper';

export async function birthdayGreeting(_job: Job): Promise<void> {
  const todayMD = formatMonthDayCN();

  const users = await prisma.user.findMany({
    where: { birthday: { endsWith: todayMD } },
    select: { id: true, nickname: true },
  });

  if (users.length === 0) return;

  const items = users.map(u => ({
    userId: u.id,
    content: `${u.nickname || '同学'}，生日快乐！希望新的一岁里英语越来越棒~`,
  }));

  const result = await createPushRecords(items, 'birthday', 'in_app');
  if (result.count > 0) logger.info(`Birthday greeting: ${result.count} users`);
}
