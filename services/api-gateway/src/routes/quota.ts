/**
 * 配额路由
 * 用量配额查询接口
 */

import { Router, Request, Response } from 'express';
import { getUserQuotaStatus, checkQuotaAvailable } from '@/services/quotaService';
import { logger } from '@/utils/logger';

const router = Router();

/**
 * 获取用户配额状态
 * GET /api/quota
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: '未认证' });
      return;
    }

    const status = await getUserQuotaStatus(userId);
    res.json({ success: true, data: status });
  } catch (error: unknown) {
    logger.error('获取配额状态失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取配额状态失败',
    });
  }
});

/**
 * 检查配额是否可用
 * GET /api/quota/check
 */
router.get('/check', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: '未认证' });
      return;
    }

    const result = await checkQuotaAvailable(userId);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    logger.error('检查配额失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '检查配额失败',
    });
  }
});

export default router;
