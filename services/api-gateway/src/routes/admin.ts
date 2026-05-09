/**
 * 管理员路由 — 手动触发定时任务、文章管道操作等
 * 所有端点需要 x-admin-key 请求头校验
 */

import { Router, Request, Response, NextFunction } from 'express';
import { schedulerQueue } from '@/scheduler/queue';
import { TRIGGERABLE_JOBS } from '@/scheduler/worker';
import { processArticle, compressArticle, importAndProcess, generateArticleAudio } from '@/services/readingPipelineService';
import { backfillSourcePublishedAt } from '@/services/rssService';
import { logger } from '@/utils/logger';
import { config } from '@/config';

const router = Router();

/** Admin API Key 校验中间件 */
router.use((req: Request, res: Response, next: NextFunction) => {
  const key = req.headers['x-admin-key'] as string;
  if (!key || key !== config.admin.apiKey) {
    res.status(403).json({ success: false, error: '无效的管理员密钥' });
    return;
  }
  next();
});

// ─── Job 触发 ──────────────────────────────────────────

/**
 * POST /api/admin/trigger-job
 * Body: { "jobName": "rss-fetch" | "article-qualify" | "article-schedule" }
 */
router.post('/trigger-job', async (req: Request, res: Response) => {
  const { jobName } = req.body;

  if (!jobName || !TRIGGERABLE_JOBS.includes(jobName)) {
    res.status(400).json({
      success: false,
      message: `无效的 jobName，可选值: ${TRIGGERABLE_JOBS.join(', ')}`,
    });
    return;
  }

  await schedulerQueue.add(jobName, {}, {
    removeOnComplete: true,
    removeOnFail: true,
  });

  res.json({ success: true, message: `Job ${jobName} 已入队` });
});

// ─── 文章管道操作（单篇） ──────────────────────────────

/**
 * POST /api/admin/pipeline/compress
 * Body: { "articleId": "xxx" }
 */
router.post('/pipeline/compress', async (req: Request, res: Response): Promise<void> => {
  try {
    const { articleId } = req.body;
    if (!articleId) {
      res.status(400).json({ success: false, error: '缺少 articleId' });
      return;
    }
    await compressArticle(articleId);
    res.json({ success: true, message: '压缩完成' });
  } catch (error: unknown) {
    logger.error('文章压缩失败:', error);
    res.status(500).json({ success: false, error: '文章压缩失败' });
  }
});

/**
 * POST /api/admin/pipeline/process
 * Body: { "articleId": "xxx" }
 */
router.post('/pipeline/process', async (req: Request, res: Response): Promise<void> => {
  try {
    const { articleId } = req.body;
    if (!articleId) {
      res.status(400).json({ success: false, error: '缺少 articleId' });
      return;
    }
    await processArticle(articleId);
    res.json({ success: true, message: '处理完成' });
  } catch (error: unknown) {
    logger.error('文章处理失败:', error);
    res.status(500).json({ success: false, error: '文章处理失败' });
  }
});

/**
 * POST /api/admin/pipeline/generate-audio
 * Body: { "articleId": "xxx" }
 */
router.post('/pipeline/generate-audio', async (req: Request, res: Response): Promise<void> => {
  try {
    const { articleId } = req.body;
    if (!articleId) {
      res.status(400).json({ success: false, error: '缺少 articleId' });
      return;
    }
    await generateArticleAudio(articleId);
    res.json({ success: true, message: '音频生成完成' });
  } catch (error: unknown) {
    logger.error('文章音频生成失败:', error);
    res.status(500).json({ success: false, error: '文章音频生成失败' });
  }
});

/**
 * POST /api/admin/pipeline/import
 * Body: { "title": "xxx", "content": "xxx", ... }
 */
router.post('/pipeline/import', async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, content, level, category, source, sourceUrl, publishDate } = req.body;
    if (!title || !content) {
      res.status(400).json({ success: false, error: '缺少 title 或 content' });
      return;
    }
    const articleId = await importAndProcess({
      title, content, level, category, source, sourceUrl, publishDate,
    });
    res.json({ success: true, data: { articleId } });
  } catch (error: unknown) {
    logger.error('导入文章失败:', error);
    res.status(500).json({ success: false, error: '导入文章失败' });
  }
});

/**
 * POST /api/admin/pipeline/backfill-dates
 * 回填已有文章的 sourcePublishedAt
 */
router.post('/pipeline/backfill-dates', async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await backfillSourcePublishedAt();
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    logger.error('回填发布日期失败:', error);
    res.status(500).json({ success: false, error: '回填发布日期失败' });
  }
});

export default router;
