/**
 * Job: article-schedule
 * 每天 03:30 — 为未来 7 天各选 2 篇不同 level 的文章并完整处理（压缩→精读→音频→ready）
 * 两阶段：串行选文章（避免并发选到同一篇）→ 并发处理文章
 * 失败的任务会重试一次（重新选文章 + 处理）
 */

import { Job } from 'bullmq';
import { logger } from '@/utils/logger';
import { selectDailyArticle, processDailyArticle, processArticle, generateArticleAudio } from '@/services/readingPipelineService';
import { prisma } from '@/config/database';

const ALL_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
const ARTICLES_PER_DAY = 2;
const SCHEDULE_DAYS_AHEAD = 15;
const PROCESS_CONCURRENCY = 6;

/** 随机选 N 个不重复的 level */
function pickRandomLevels(n: number): typeof ALL_LEVELS[number][] {
  const shuffled = [...ALL_LEVELS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

/** 获取 YYYY-MM-DD 格式的日期字符串（Asia/Shanghai 时区） */
function getDateString(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
}

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

/** 待处理的文章任务 */
interface ArticleTask {
  articleId: string;
  targetDate: string;
  level: string;
  /** compressed 走 process+audio，processed 只走 audio，其他走完整流程 */
  resumeFrom: 'compressed' | 'processed' | 'full';
}

/** 需要重试的槽位 */
interface RetrySlot {
  targetDate: string;
  level: string;
}

/**
 * 阶段 1：串行收集所有需要处理的文章
 * 返回待处理任务列表和已跳过数量
 */
async function collectTasks(): Promise<{ tasks: ArticleTask[]; skipped: number }> {
  let skipped = 0;
  const tasks: ArticleTask[] = [];

  for (let dayOffset = 0; dayOffset < SCHEDULE_DAYS_AHEAD; dayOffset++) {
    const targetDate = getDateString(dayOffset);

    const levels = pickRandomLevels(ARTICLES_PER_DAY);
    for (const level of levels) {
      try {
        // 幂等检查：该日该 level 已有 ready 文章则跳过
        const existing = await prisma.readingArticle.findFirst({
          where: { publishDate: targetDate, level, pipelineStatus: 'ready' },
          select: { id: true },
        });
        if (existing) {
          skipped++;
          continue;
        }

        // 检查是否有正在处理中的文章（避免重复选取）
        const inProgress = await prisma.readingArticle.findFirst({
          where: {
            publishDate: targetDate,
            level,
            pipelineStatus: { in: ['compressing', 'compressed', 'processing', 'processed'] },
          },
          select: { id: true, pipelineStatus: true },
        });

        if (inProgress) {
          const resumeFrom = inProgress.pipelineStatus === 'processed' ? 'processed'
            : inProgress.pipelineStatus === 'compressed' ? 'compressed' : 'full';
          tasks.push({
            articleId: inProgress.id,
            targetDate,
            level,
            resumeFrom,
          });
          logger.info(`[article-schedule] 收集遗留文章: ${inProgress.id}, status=${inProgress.pipelineStatus}`);
          continue;
        }

        // 优先复用孤儿 processed 文章（AI 产物已完成，只差音频）
        const orphanProcessed = await prisma.readingArticle.findFirst({
          where: { pipelineStatus: 'processed', level, publishDate: null, pipelineFailCount: { lt: 1 } },
          select: { id: true, title: true },
        });
        if (orphanProcessed) {
          await prisma.readingArticle.update({
            where: { id: orphanProcessed.id },
            data: { publishDate: targetDate },
          });
          tasks.push({ articleId: orphanProcessed.id, targetDate, level, resumeFrom: 'processed' });
          logger.info(`[article-schedule] 复用 processed 文章: ${orphanProcessed.title}`);
          continue;
        }

        // 从 qualified 池选文章
        const selectedId = await selectDailyArticle(level, targetDate);
        if (!selectedId) {
          logger.info(`[article-schedule] ${level} 无可用文章，跳过 ${targetDate}`);
          continue;
        }

        tasks.push({ articleId: selectedId, targetDate, level, resumeFrom: 'full' });
      } catch (error) {
        logger.error(`[article-schedule] ${level} ${targetDate} 选文章异常:`, error);
      }
    }
  }

  return { tasks, skipped };
}

/**
 * 阶段 2：并发处理文章，返回失败的槽位列表
 */
async function processTasks(tasks: ArticleTask[]): Promise<{ processed: number; failed: number; retrySlots: RetrySlot[] }> {
  let processed = 0;
  let failed = 0;
  const retrySlots: RetrySlot[] = [];

  await runConcurrent(
    tasks,
    async (task) => {
      const { articleId, targetDate, level, resumeFrom } = task;
      try {
        if (resumeFrom === 'processed') {
          // AI 内容已完成，只需生成音频
          try {
            await generateArticleAudio(articleId);
          } catch (e) {
            logger.error(`文章音频生成失败，重试一次: ${articleId}`, e);
            await generateArticleAudio(articleId);
          }
        } else if (resumeFrom === 'compressed') {
          await processArticle(articleId);
          try {
            await generateArticleAudio(articleId);
          } catch (e) {
            logger.error(`文章音频生成失败，重试一次: ${articleId}`, e);
            await generateArticleAudio(articleId);
          }
        } else {
          await processDailyArticle(articleId);
        }
        processed++;
        logger.info(`[article-schedule] ${level} 文章处理完成: ${targetDate} - ${articleId}`);
      } catch (error) {
        failed++;
        logger.error(`[article-schedule] ${level} 文章处理失败，回退: ${articleId}`, error);

        // 回退文章状态
        const current = await prisma.readingArticle.findUnique({
          where: { id: articleId },
          select: { pipelineStatus: true },
        });
        const status = current?.pipelineStatus || '';
        if (['rejected', 'compress_failed'].includes(status)) {
          // 确定性失败，只清 publishDate
          await prisma.readingArticle.update({
            where: { id: articleId },
            data: { publishDate: null },
          });
        } else if (['processed', 'failed'].includes(status)) {
          // AI 产物已完成，保持 processed 状态（failed 也可能部分产物已生成），只清 publishDate
          await prisma.readingArticle.update({
            where: { id: articleId },
            data: { pipelineStatus: 'processed', publishDate: null, pipelineFailCount: { increment: 1 } },
          });
        } else {
          // compressing/compressed/processing 等中间状态，回退到 qualified
          await prisma.readingArticle.update({
            where: { id: articleId },
            data: { pipelineStatus: 'qualified', publishDate: null, pipelineFailCount: { increment: 1 } },
          });
        }

        retrySlots.push({ targetDate, level });
      }
    },
    PROCESS_CONCURRENCY,
  );

  return { processed, failed, retrySlots };
}

/**
 * 重试：为失败的槽位重新选文章并处理
 */
async function retryFailedSlots(slots: RetrySlot[]): Promise<{ processed: number; failed: number }> {
  const tasks: ArticleTask[] = [];

  // 串行选文章
  for (const { targetDate, level } of slots) {
    try {
      const selectedId = await selectDailyArticle(level, targetDate);
      if (!selectedId) {
        logger.info(`[article-schedule] 重试: ${level} 无可用文章，跳过 ${targetDate}`);
        continue;
      }
      tasks.push({ articleId: selectedId, targetDate, level, resumeFrom: 'full' });
    } catch (error) {
      logger.error(`[article-schedule] 重试选文章异常: ${level} ${targetDate}`, error);
    }
  }

  if (tasks.length === 0) return { processed: 0, failed: 0 };

  logger.info(`[article-schedule] 重试 ${tasks.length} 篇文章`);
  const result = await processTasks(tasks);
  return { processed: result.processed, failed: result.failed };
}

export async function articleSchedule(_job: Job): Promise<void> {
  try {
    logger.info(`[article-schedule] 开始处理未来 ${SCHEDULE_DAYS_AHEAD} 天文章，并发=${PROCESS_CONCURRENCY}`);

    // 阶段 1：串行收集任务
    const { tasks, skipped } = await collectTasks();

    if (tasks.length === 0) {
      logger.info(`[article-schedule] 完成: 无需处理，skipped=${skipped}`);
      return;
    }

    // 阶段 2：并发处理
    logger.info(`[article-schedule] ${tasks.length} 篇文章待处理`);
    const result = await processTasks(tasks);

    // 阶段 3：失败的重试一次
    let retryProcessed = 0;
    let retryFailed = 0;
    if (result.retrySlots.length > 0) {
      const retry = await retryFailedSlots(result.retrySlots);
      retryProcessed = retry.processed;
      retryFailed = retry.failed;
    }

    logger.info(
      `[article-schedule] 完成: processed=${result.processed + retryProcessed}, ` +
      `skipped=${skipped}, failed=${result.failed}(retry: +${retryProcessed}/-${retryFailed})`,
    );
  } catch (error) {
    logger.error('[article-schedule] failed:', error);
  }
}
