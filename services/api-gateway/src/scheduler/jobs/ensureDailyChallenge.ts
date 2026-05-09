/** 每小时 — 确保每日挑战已生成 */

import { Job } from 'bullmq';
import { logger } from '@/utils/logger';
import { getTodayChallenge } from '@/services/dailyChallengeService';

export async function ensureDailyChallenge(_job: Job): Promise<void> {
  try {
    await getTodayChallenge();
    logger.info('[DailyChallengeCron] 每日挑战已就绪');
  } catch (err) {
    logger.error('[DailyChallengeCron] 检查/生成每日挑战失败:', err);
  }
}
