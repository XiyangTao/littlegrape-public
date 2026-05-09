import express from 'express';
import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { getTodayCN } from '@/utils/dateUtils';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { redisClient } from '@/config/redis';

// 反馈每日限流器 - 每个用户每天最多5次
const feedbackDailyLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'feedback_user_daily',
  points: 5,
  duration: 25 * 60 * 60, // 25小时（确保跨越到第二天）
});

// 获取今天的日期键
function getTodayKey(): string {
  return getTodayCN();
}

const router = express.Router();

/**
 * 提交用户反馈
 * POST /api/feedback
 *
 * 策略：REQUIRED
 */
router.post('/', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { type, content, images, deviceInfo } = req.body;

    // 检查每日提交限制
    const today = getTodayKey();
    const dailyKey = `${userId}:${today}`;

    try {
      const rateLimitRes = await feedbackDailyLimiter.get(dailyKey);
      if (rateLimitRes && rateLimitRes.remainingPoints <= 0) {
        logger.warn(`用户 ${userId} 今日反馈次数已达上限`);
        return res.status(429).json({
          success: false,
          error: '今日反馈次数已达上限（每日最多5次）'
        });
      }
    } catch (rateLimitError) {
      // Redis 异常时允许通过，避免影响服务
      logger.error('反馈限流检查失败:', rateLimitError);
    }

    // 参数验证
    if (!type) {
      return res.status(400).json({
        success: false,
        error: '反馈类型为必填项'
      });
    }

    if (!['bug', 'feature', 'other'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: '反馈类型无效'
      });
    }

    if (!content || typeof content !== 'string') {
      return res.status(400).json({
        success: false,
        error: '反馈内容为必填项'
      });
    }

    if (content.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: '反馈内容至少10个字符'
      });
    }

    if (content.length > 500) {
      return res.status(400).json({
        success: false,
        error: '反馈内容不能超过500个字符'
      });
    }

    // 验证图片数组
    if (images) {
      if (!Array.isArray(images)) {
        return res.status(400).json({
          success: false,
          error: '图片格式无效'
        });
      }

      if (images.length > 5) {
        return res.status(400).json({
          success: false,
          error: '最多上传5张图片'
        });
      }

      // 验证每个图片 URL
      for (const url of images) {
        if (typeof url !== 'string' || !url.startsWith('http')) {
          return res.status(400).json({
            success: false,
            error: '图片URL格式无效'
          });
        }
      }
    }

    // 创建反馈记录
    const feedback = await prisma.userFeedback.create({
      data: {
        userId,
        type,
        content: content.trim(),
        images: images && images.length > 0 ? images : undefined,
        deviceInfo: deviceInfo ? JSON.stringify(deviceInfo) : undefined,
      },
      select: {
        id: true,
        type: true,
        content: true,
        images: true,
        status: true,
        createdAt: true,
      }
    });

    // 消耗一次限流点数
    try {
      await feedbackDailyLimiter.consume(dailyKey);
    } catch (consumeError) {
      logger.error('反馈限流计数失败:', consumeError);
    }

    logger.info(`用户提交反馈成功: userId=${userId}, type=${type}, feedbackId=${feedback.id}`);

    return res.json({
      success: true,
      message: '反馈提交成功，感谢您的宝贵意见',
      data: { feedback }
    });
  } catch (error: unknown) {
    logger.error('提交反馈失败:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '提交反馈失败'
    });
  }
});

export default router;
