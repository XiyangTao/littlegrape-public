/**
 * 点词查义 — 公共字典 + AI 兜底
 *
 * 不挂 quotaCheck：结果写入 WordLookupCache 全局共享，不按用户维度计量。
 * 客户端对应请求带 metadata.skipQuotaPrompt，避免 429 时触发全局配额弹窗。
 */

import { Router, Request, Response } from 'express';
import { lookupWord } from '@/services/wordLookupService';
import { logger } from '@/utils/logger';

const router = Router();

/**
 * GET /api/words/lookup?text=prejudice
 */
router.get('/lookup', async (req: Request, res: Response): Promise<void> => {
  try {
    const text = typeof req.query.text === 'string' ? req.query.text : '';
    if (!text) {
      res.status(400).json({ success: false, error: 'text 不能为空' });
      return;
    }
    const result = await lookupWord(text);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('查词失败:', error);
    res.status(500).json({ success: false, error: '查词失败' });
  }
});

export default router;
