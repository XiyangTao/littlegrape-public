/**
 * Job: article-qualify
 * 每天 02:30 / 14:30 — 清洗+筛选所有 pending 文章，20 并发
 */

import { Job } from 'bullmq';
import { logger } from '@/utils/logger';
import { qualifyArticle, cleanArticle } from '@/services/readingPipelineService';
import { prisma } from '@/config/database';

const AI_CONCURRENCY = 20;

/** 并发控制：N 个 worker 从共享队列取任务 */
async function runConcurrent<T>(
  items: T[],
  fn: (item: T) => Promise<void>,
  concurrency: number,
): Promise<void> {
  let i = 0;
  const next = async (): Promise<void> => {
    while (i < items.length) {
      const item = items[i++];
      await fn(item);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => next()),
  );
}

export async function articleQualify(_job: Job): Promise<void> {
  try {
    // 只处理最近 30 天的 pending 文章
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const pendingArticles = await prisma.readingArticle.findMany({
      where: { pipelineStatus: 'pending', createdAt: { gte: thirtyDaysAgo } },
      select: { id: true },
    });

    if (pendingArticles.length === 0) {
      logger.info('[article-qualify] 无待处理文章');
      return;
    }

    logger.info(`[article-qualify] ${pendingArticles.length} 篇待筛选+清洗，并发=${AI_CONCURRENCY}`);

    let qualified = 0;
    let rejected = 0;
    let skipped = 0;
    let failed = 0;

    await runConcurrent(
      pendingArticles,
      async (a) => {
        try {
          // 先清洗噪音（图片标注、广告等），再用干净内容做质量筛选
          await cleanArticle(a.id);

          // 清洗可能已标记 rejected（词数不足），检查后再筛选
          const afterClean = await prisma.readingArticle.findUnique({
            where: { id: a.id },
            select: { pipelineStatus: true },
          });
          if (afterClean?.pipelineStatus !== 'pending') {
            rejected++;
            return;
          }

          await qualifyArticle(a.id);

          const afterQualify = await prisma.readingArticle.findUnique({
            where: { id: a.id },
            select: { pipelineStatus: true },
          });
          if (afterQualify?.pipelineStatus === 'qualified') {
            qualified++;
          } else if (afterQualify?.pipelineStatus === 'pending') {
            skipped++; // AI 调用失败，保持 pending 待下次重试
          } else {
            rejected++;
          }
        } catch {
          failed++;
        }
      },
      AI_CONCURRENCY,
    );

    logger.info(
      `[article-qualify] 完成: qualified=${qualified}, rejected=${rejected}, skipped=${skipped}, failed=${failed}`,
    );
  } catch (error) {
    logger.error('[article-qualify] failed:', error);
  }
}
