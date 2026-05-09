/**
 * 听力训练路由
 */

import { Router, Request, Response } from 'express';
import {
  getMaterialList,
  getMaterialDetail,
  getUserListeningProgress,
  updateListeningProgress,
  seedListeningMaterials,
} from '@/services/listeningService';
import { logger } from '@/utils/logger';
import { emitAchievementEvent } from '@/events/eventBus';

const router = Router();

// 首次加载时初始化种子数据
seedListeningMaterials().catch(err => logger.error('初始化听力材料失败:', err));

/**
 * 获取听力材料列表
 * GET /api/listening/materials
 */
router.get('/materials', async (req: Request, res: Response): Promise<void> => {
  try {
    const { level, category, user_id } = req.query;
    const materials = await getMaterialList({
      level: level as string,
      category: category as string,
      userId: user_id as string,
    });
    res.json({ success: true, data: materials });
  } catch (error: unknown) {
    logger.error('获取听力材料列表失败:', error);
    res.status(500).json({ success: false, error: '获取听力材料列表失败' });
  }
});

/**
 * 获取听力材料详情
 * GET /api/listening/materials/:id
 */
router.get('/materials/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const material = await getMaterialDetail(req.params.id);
    if (!material) {
      res.status(404).json({ success: false, error: '材料不存在' });
      return;
    }
    res.json({ success: true, data: material });
  } catch (error: unknown) {
    logger.error('获取听力材料详情失败:', error);
    res.status(500).json({ success: false, error: '获取听力材料详情失败' });
  }
});

/**
 * 获取用户听力进度
 * GET /api/listening/progress
 */
router.get('/progress', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: '未认证' });
      return;
    }
    const progress = await getUserListeningProgress(userId);
    res.json({ success: true, data: progress });
  } catch (error: unknown) {
    logger.error('获取听力进度失败:', error);
    res.status(500).json({ success: false, error: '获取听力进度失败' });
  }
});

/**
 * 更新听力进度
 * POST /api/listening/progress
 */
router.post('/progress', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: '未认证' });
      return;
    }
    const { materialId, mode, dictationScore, quizScore } = req.body;
    if (!materialId || !mode) {
      res.status(400).json({ success: false, error: '缺少 materialId 或 mode' });
      return;
    }
    const result = await updateListeningProgress(userId, materialId, { mode, dictationScore, quizScore });

    // 成就引擎：fire-and-forget，结果通过 WS 推送
    emitAchievementEvent(userId, 'listening_done', { materialId, mode, dictationScore, quizScore });

    res.json({ success: true, data: result });
  } catch (error: unknown) {
    logger.error('更新听力进度失败:', error);
    res.status(500).json({ success: false, error: '更新听力进度失败' });
  }
});

export default router;
