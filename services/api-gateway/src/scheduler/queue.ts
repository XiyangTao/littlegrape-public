/**
 * BullMQ 队列 + repeatable jobs 注册
 */

import { Queue } from 'bullmq';
import { redisConnection } from './connection';
import { logger } from '@/utils/logger';

const QUEUE_NAME = 'scheduler-jobs';

export const schedulerQueue = new Queue(QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 1,
  },
});

interface RepeatableJobDef {
  name: string;
  cron: string;
  tz: string;
}

const REPEATABLE_JOBS: RepeatableJobDef[] = [
  // Push jobs（迁移自 push-worker）
  { name: 'morning-review-remind', cron: '0 9 * * *', tz: 'Asia/Shanghai' },
  { name: 'birthday-greeting', cron: '0 9 * * *', tz: 'Asia/Shanghai' },
  { name: 'weekly-summary', cron: '0 9 * * 1', tz: 'Asia/Shanghai' },
  { name: 'streak-recovery', cron: '0 10 * * *', tz: 'Asia/Shanghai' },
  { name: 'inactive-remind', cron: '0 10 * * *', tz: 'Asia/Shanghai' },
  { name: 'evening-checkin-remind', cron: '0 20 * * *', tz: 'Asia/Shanghai' },
  // Achievement jobs（迁移自 achievementCron）
  { name: 'update-rarity', cron: '0 */6 * * *', tz: 'Asia/Shanghai' },
  { name: 'compensation-check', cron: '*/30 * * * *', tz: 'Asia/Shanghai' },
  { name: 'cleanup-notifications', cron: '0 3 * * *', tz: 'Asia/Shanghai' },
  { name: 'manage-seasons', cron: '0 * * * *', tz: 'Asia/Shanghai' },
  { name: 'ensure-daily-challenge', cron: '0 * * * *', tz: 'Asia/Shanghai' },
  // RSS 精读管道（手动执行，通过 /api/admin/trigger-job 触发）
  // { name: 'rss-fetch', cron: '0 2 * * *', tz: 'Asia/Shanghai' },
  // { name: 'article-qualify', cron: '30 2,14 * * *', tz: 'Asia/Shanghai' },
  // { name: 'article-schedule', cron: '30 3 * * *', tz: 'Asia/Shanghai' },
];

/** 清除旧 repeatable jobs，注册全部 */
export async function registerAllJobs(): Promise<void> {
  // 清除旧的 repeatable jobs（防止 cron 变更后残留）
  const existing = await schedulerQueue.getRepeatableJobs();
  for (const job of existing) {
    await schedulerQueue.removeRepeatableByKey(job.key);
  }

  // 注册全部 repeatable jobs
  for (const def of REPEATABLE_JOBS) {
    await schedulerQueue.add(def.name, {}, {
      repeat: { pattern: def.cron, tz: def.tz },
    });
  }

  logger.info(`[Scheduler] ${REPEATABLE_JOBS.length} repeatable jobs registered`);
}
