/**
 * 统一调度器入口
 */

import { registerAllJobs, schedulerQueue } from './queue';
import { createWorker, closeWorker } from './worker';
import { redisConnection } from './connection';
import { logger } from '@/utils/logger';

export async function initScheduler(): Promise<void> {
  await registerAllJobs();
  createWorker();
  logger.info('[Scheduler] 调度器已启动');
}

export async function shutdownScheduler(): Promise<void> {
  await closeWorker();
  await schedulerQueue.close();
  await redisConnection.quit();
  logger.info('[Scheduler] 调度器已关闭');
}
