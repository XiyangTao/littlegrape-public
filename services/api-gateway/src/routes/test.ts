import express from 'express';
import { EmailService } from '@/services/emailService';
import { UserService } from '@/services/userService';
import { logger } from '@/utils/logger';
import { config } from '@/config';

const router = express.Router();

// 中间件：仅开发环境可用
router.use((_req, res, next) => {
  if (config.server.runtimeEnv !== 'development') {
    return res.status(403).json({
      success: false,
      error: '测试接口仅在开发环境可用'
    });
  } else {
    return next();
  }
});

// 清理测试数据 (仅开发环境)
router.delete('/user/cleanup', async (req, res) => {
  try {
    // 仅在开发环境允许
    if (config.server.runtimeEnv !== 'development') {
      return res.status(403).json({
        success: false,
        error: '此接口仅在开发环境可用'
      });
    }

    const { emails, phones, wechatOpenIds } = req.body;

    // 调用UserService清理数据
    const result = await UserService.cleanupTestData({
      emails,
      phones,
      wechatOpenIds
    });

    return res.json({
      success: true,
      message: '测试数据清理完成',
      data: {
        deletedCount: result.deletedCount
      }
    });
  } catch (error: unknown) {
    logger.error('清理测试数据失败:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '清理失败'
    });
  }
});

// 测试邮件发送功能
router.post('/email/send', async (req, res) => {
  try {
    const { email, type = 'register' } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: '邮箱为必填项'
      });
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: '邮箱格式不正确'
      });
    }

    // 验证类型
    if (!['register', 'password_reset'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: '验证码类型无效，支持: register, password_reset'
      });
    }

    // 发送测试验证码
    await EmailService.sendVerificationCode(email, type);

    return res.json({
      success: true,
      message: `测试验证码发送成功 (${type})`,
      data: {
        email,
        type,
        note: '验证码已发送到邮箱，请查收。'
      }
    });
  } catch (error: unknown) {
    logger.error('测试邮件发送失败:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '邮件发送失败'
    });
  }
});

// 验证验证码功能测试
router.post('/email/verify', async (req, res) => {
  try {
    const { email, code, type = 'register' } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        error: '邮箱和验证码为必填项'
      });
    }

    // 验证验证码
    const isValid = await EmailService.verifyCode(email, code, type);

    return res.json({
      success: true,
      message: '验证码验证成功',
      data: {
        email,
        type,
        valid: isValid
      }
    });
  } catch (error: unknown) {
    logger.error('测试验证码验证失败:', error);
    return res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : '验证码验证失败'
    });
  }
});


export default router;