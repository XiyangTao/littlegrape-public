/**
 * BullMQ Worker — job 分发
 */

import { Worker, Job } from 'bullmq';
import { redisConnection } from './connection';
import { logger } from '@/utils/logger';

// Push jobs
import { morningReviewRemind } from './jobs/morningReviewRemind';
import { birthdayGreeting } from './jobs/birthdayGreeting';
import { weeklySummary } from './jobs/weeklySummary';
import { streakRecovery } from './jobs/streakRecovery';
import { inactiveRemind } from './jobs/inactiveRemind';
import { eveningCheckInRemind } from './jobs/eveningCheckInRemind';

// Achievement jobs
import { updateRarity } from './jobs/updateRarity';
import { compensationCheck } from './jobs/compensationCheck';
import { cleanupNotifications } from './jobs/cleanupNotifications';
import { manageSeasons } from './jobs/manageSeasons';
import { ensureDailyChallenge } from './jobs/ensureDailyChallenge';

// RSS 精读管道
import { rssFetch } from './jobs/rssFetch';
import { articleQualify } from './jobs/articleQualify';
import { articleSchedule } from './jobs/articleSchedule';

type JobHandler = (job: Job) => Promise<void>;

const jobHandlers: Record<string, JobHandler> = {
  'morning-review-remind': morningReviewRemind,
  'birthday-greeting': birthdayGreeting,
  'weekly-summary': weeklySummary,
  'streak-recovery': streakRecovery,
  'inactive-remind': inactiveRemind,
  'evening-checkin-remind': eveningCheckInRemind,
  'update-rarity': updateRarity,
  'compensation-check': compensationCheck,
  'cleanup-notifications': cleanupNotifications,
  'manage-seasons': manageSeasons,
  'ensure-daily-challenge': ensureDailyChallenge,
  'rss-fetch': rssFetch,
  'article-qualify': articleQualify,
  'article-schedule': articleSchedule,
};

/** 可手动触发的 job 名称白名单 */
export const TRIGGERABLE_JOBS = ['rss-fetch', 'article-qualify', 'article-schedule'] as const;

let worker: Worker | null = null;

export function createWorker(): Worker {
  worker = new Worker(
    'scheduler-jobs',
    async (job: Job) => {
      const handler = jobHandlers[job.name];
      if (!handler) {
        logger.warn(`[Scheduler] Unknown job: ${job.name}`);
        return;
      }
      logger.info(`[Scheduler] Processing job: ${job.name}`);
      await handler(job);
    },
    {
      connection: redisConnection,
      concurrency: 1,
      lockDuration: 3_600_000, // 1 小时，article-schedule 可能处理 21 篇文章
    },
  );

  worker.on('failed', (job, err) => {
    logger.error(`[Scheduler] Job ${job?.name} failed:`, err);
  });

  worker.on('error', (err) => {
    logger.error('[Scheduler] Worker error:', err);
  });

  return worker;
}

export async function closeWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
  }
}
