/**
 * Job: rss-fetch
 * 每天 02:00 — 从所有 RSS 源全并发抓取文章，导入为 pending 状态
 */

import { Job } from 'bullmq';
import { logger } from '@/utils/logger';
import { fetchAndImportArticles } from '@/services/rssService';
import { recoverStuckArticles } from '@/services/readingPipelineService';

export async function rssFetch(_job: Job): Promise<void> {
  try {
    // 恢复卡在中间状态的文章
    await recoverStuckArticles();

    // 全并发抓取所有 RSS 源
    const result = await fetchAndImportArticles();
    logger.info(
      `[rss-fetch] 完成: imported=${result.imported}, skipped=${result.skipped}, failed=${result.failed}`,
    );
  } catch (error) {
    logger.error('[rss-fetch] failed:', error);
  }
}
