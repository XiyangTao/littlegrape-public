import express from 'express';
import { z } from 'zod';
import { AuthService } from '@/services/authService';
import { EmailService } from '@/services/emailService';
import { smsService } from '@/services/smsService';
import { logger } from '@/utils/logger';
import { smsRateLimiter, authRateLimiter } from '@/middleware/rateLimiter';
import { validate } from '@/middleware/validate';

const router = express.Router();

// ==================== Zod Schemas ====================

const phoneSchema = z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确');
const emailSchema = z.string().email('邮箱格式不正确');
const passwordSchema = z.string().min(6, '密码长度不能少于6位').max(100, '密码长度不能超过100位');
const codeTypeSchema = z.enum(['register', 'password_reset'], { message: '验证码类型无效，支持: register, password_reset' });

const passwordResetRequestSchema = z.object({
  phone: phoneSchema,
});

const passwordResetVerifySchema = z.object({
  phone: phoneSchema,
  code: z.string().min(1, '验证码为必填项'),
});

const passwordResetCompleteSchema = z.object({
  resetToken: z.string().min(1, '操作已过期，请返回重试'),
  newPassword: passwordSchema,
});

const registerEmailSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  username: z.string().optional(),
  nickname: z.string().optional(),
  verificationToken: z.string().min(1, '验证码为必填项'),
});

const sendEmailCodeSchema = z.object({
  email: emailSchema,
  type: codeTypeSchema.default('register'),
});

const verifyEmailCodeSchema = z.object({
  email: emailSchema,
  code: z.string().min(1, '验证码为必填项'),
  type: codeTypeSchema.default('register'),
});

const loginPasswordSchema = z.object({
  identifier: z.string().min(1, '用户名为必填项'),
  password: z.string().min(1, '密码为必填项'),
});

const sendPhoneCodeSchema = z.object({
  phone: phoneSchema,
});

const loginPhoneSchema = z.object({
  phone: phoneSchema,
  verifyCode: z.string().min(1, '验证码为必填项'),
});

const loginWechatSchema = z.object({
  code: z.string().min(1, '微信授权码为必填项'),
});

const loginCarrierSchema = z.object({
  accessToken: z.string().min(8, '一键登录凭证无效'),
});

const tokenRefreshSchema = z.object({
  refreshToken: z.string().min(1, '刷新令牌为必填项'),
});

const tokenVerifySchema = z.object({
  token: z.string().min(1, 'Token为必填项'),
  type: z.enum(['access', 'refresh']).default('access'),
});

// ==================== Routes ====================

// --- Password Reset Routes ---

// 1. 请求重置密码 (发送验证码)
router.post(
  '/password-reset/request',
  validate({ body: passwordResetRequestSchema }),
  smsRateLimiter.middleware(),
  async (req, res) => {
    try {
      const { phone } = req.body;
      await AuthService.requestPasswordReset(phone);
      return res.json({ success: true, message: '如果手机号已注册，您将会收到一条验证码短信。' });
    } catch (error) {
      logger.error('请求重置密码失败:', error);
      return res.status(500).json({ success: false, error: '服务器内部错误，请稍后重试' });
    }
  }
);

// 2. 验证重置码，获取授权
router.post(
  '/password-reset/verify',
  validate({ body: passwordResetVerifySchema }),
  authRateLimiter.verifyMiddleware(),
  async (req, res) => {
    try {
      const { phone, code } = req.body;
      const resetToken = await AuthService.verifyPasswordResetCode(phone, code);
      return res.json({ success: true, data: { resetToken } });
    } catch (error) {
      logger.error('验证重置密码验证码失败:', error);
      return res.status(400).json({ success: false, error: '验证码错误或已过期' });
    }
  }
);

// 3. 完成密码重置
router.post(
  '/password-reset/complete',
  validate({ body: passwordResetCompleteSchema }),
  async (req, res) => {
    try {
      const { resetToken, newPassword } = req.body;
      await AuthService.completePasswordReset(resetToken, newPassword);
      return res.json({ success: true, message: '密码重置成功' });
    } catch (error) {
      logger.error('完成密码重置失败:', error);
      const message = error instanceof Error ? error.message : '重置失败，请稍后重试';
      return res.status(400).json({ success: false, error: message });
    }
  }
);

// --- Existing Routes ---

// 邮箱注册
router.post(
  '/register/email',
  validate({ body: registerEmailSchema }),
  authRateLimiter.registerMiddleware(),
  async (req, res) => {
    try {
      const { email, password, username, nickname, verificationToken } = req.body;

      const user = await AuthService.registerWithEmail({
        email,
        password,
        username,
        nickname,
        verificationToken
      });

      const tokens = AuthService.generateTokens({
        id: user.id,
        email: user.email || undefined,
        username: user.username || undefined
      });

      return res.status(201).json({
        success: true,
        message: '注册成功',
        data: {
          user: {
            id: user.id,
            email: user.email,
            phone: user.phone,
            username: user.username,
            nickname: user.nickname,
            avatar: user.avatar,
            gender: user.gender,
            birthday: user.birthday,
            bio: user.bio,
            createdAt: user.createdAt,
          },
          tokens
        }
      });
    } catch (error) {
      logger.error('邮箱注册失败:', error);
      const message = error instanceof Error ? error.message : '注册失败';
      return res.status(400).json({ success: false, error: message });
    }
  }
);

// 发送邮箱验证码
router.post(
  '/email/send-code',
  validate({ body: sendEmailCodeSchema }),
  authRateLimiter.emailMiddleware(),
  async (req, res) => {
    try {
      const { email, type } = req.body;
      await EmailService.sendVerificationCode(email, type);
      return res.json({ success: true, message: '验证码发送成功' });
    } catch (error) {
      logger.error('发送邮箱验证码失败:', error);
      const message = error instanceof Error ? error.message : '发送验证码失败';
      return res.status(400).json({ success: false, error: message });
    }
  }
);

// 验证邮箱验证码
router.post(
  '/email/verify-code',
  validate({ body: verifyEmailCodeSchema }),
  async (req, res) => {
    try {
      const { email, code, type } = req.body;
      await EmailService.verifyCode(email, code, type);
      const verificationToken = AuthService.generateEmailVerificationToken(email);
      return res.json({
        data: { verificationToken },
        success: true,
        message: '验证码验证成功'
      });
    } catch (error) {
      logger.error('验证邮箱验证码失败:', error);
      const message = error instanceof Error ? error.message : '验证验证码失败';
      return res.status(400).json({ success: false, error: message });
    }
  }
);

// 密码登录 (支持邮箱|昵称|手机号)
router.post(
  '/login/password',
  validate({ body: loginPasswordSchema }),
  authRateLimiter.loginMiddleware(),
  async (req, res) => {
    try {
      const { identifier, password } = req.body;

      const user = await AuthService.loginWithPassword({ identifier, password });

      const tokens = AuthService.generateTokens({
        id: user.id,
        email: user.email || undefined,
        username: user.username || undefined
      });

      return res.json({
        success: true,
        message: '登录成功',
        data: {
          user: {
            id: user.id,
            email: user.email,
            phone: user.phone,
            username: user.username,
            nickname: user.nickname,
            avatar: user.avatar,
            gender: user.gender,
            birthday: user.birthday,
            bio: user.bio,
            hasPassword: user.hasPassword,
            hasWechat: !!user.wechatOpenId,
            wechatNickname: user.wechatNickname,
            wechatAvatar: user.wechatAvatar,
            createdAt: user.createdAt,
          },
          tokens
        }
      });
    } catch (error) {
      logger.error('密码登录失败:', error);
      // 记录登录失败
      const { identifier } = req.body;
      if (identifier) {
        authRateLimiter.recordLoginFailure(identifier).catch(() => {});
      }
      const message = error instanceof Error ? error.message : '登录失败';
      return res.status(400).json({ success: false, error: message });
    }
  }
);

// 发送手机验证码
router.post(
  '/phone/send-code',
  validate({ body: sendPhoneCodeSchema }),
  smsRateLimiter.middleware(),
  async (req, res) => {
    try {
      const { phone } = req.body;

      const canSend = await smsService.canSendCode(phone);
      if (!canSend) {
        return res.status(400).json({ success: false, error: '发送过于频繁' });
      }

      const result = await smsService.sendLoginCode(phone);

      if (result.success) {
        return res.json({ success: true, message: '验证码发送成功' });
      } else {
        logger.error(`短信验证码发送失败: ${phone}`);
        return res.status(500).json({ success: false, error: '验证码发送失败，请稍后重试' });
      }
    } catch (error) {
      logger.error('发送短信验证码异常:', error);
      return res.status(500).json({ success: false, error: '服务器错误，请稍后重试' });
    }
  }
);

// 手机号登录
router.post(
  '/login/phone',
  validate({ body: loginPhoneSchema }),
  async (req, res) => {
    try {
      const { phone, verifyCode } = req.body;

      const user = await AuthService.loginWithPhone(phone, verifyCode);

      const tokens = AuthService.generateTokens({
        id: user.id,
        email: user.email || undefined,
        username: user.username || undefined
      });

      return res.json({
        success: true,
        message: '登录成功',
        data: {
          user: {
            id: user.id,
            email: user.email,
            phone: user.phone,
            username: user.username,
            nickname: user.nickname,
            avatar: user.avatar,
            gender: user.gender,
            birthday: user.birthday,
            bio: user.bio,
            hasPassword: user.hasPassword,
            hasWechat: !!user.wechatOpenId,
            wechatNickname: user.wechatNickname,
            wechatAvatar: user.wechatAvatar,
            createdAt: user.createdAt,
          },
          tokens
        }
      });
    } catch (error) {
      logger.error('手机号登录失败:', error);
      const message = error instanceof Error ? error.message : '登录失败';
      return res.status(400).json({ success: false, error: message });
    }
  }
);

// 一键登录（运营商网关认证 via 阿里云 PNVS）
router.post(
  '/login/carrier',
  validate({ body: loginCarrierSchema }),
  authRateLimiter.loginMiddleware(),
  async (req, res) => {
    try {
      const { accessToken } = req.body;
      const user = await AuthService.loginWithCarrier(accessToken);

      const tokens = AuthService.generateTokens({
        id: user.id,
        email: user.email || undefined,
        username: user.username || undefined,
      });

      return res.json({
        success: true,
        message: '登录成功',
        data: {
          user: {
            id: user.id,
            email: user.email,
            phone: user.phone,
            username: user.username,
            nickname: user.nickname,
            avatar: user.avatar,
            gender: user.gender,
            birthday: user.birthday,
            bio: user.bio,
            hasPassword: user.hasPassword,
            hasWechat: !!user.wechatOpenId,
            wechatNickname: user.wechatNickname,
            wechatAvatar: user.wechatAvatar,
            createdAt: user.createdAt,
          },
          tokens,
        },
      });
    } catch (error) {
      logger.error('一键登录失败:', error);
      const message = error instanceof Error ? error.message : '登录失败';
      return res.status(400).json({ success: false, error: message });
    }
  }
);

// 微信登录（snsapi_userinfo）- 用于新用户注册或需要获取完整信息
router.post(
  '/login/wechat',
  validate({ body: loginWechatSchema }),
  async (req, res) => {
    try {
      const { code } = req.body;
      logger.info(`[微信登录] 收到请求, code前8位: ${code?.substring(0, 8)}`);

      logger.info('[微信登录] 调用 AuthService.loginWithWechat...');
      const user = await AuthService.loginWithWechat(code);
      logger.info(`[微信登录] AuthService返回, userId: ${user?.id}`);

      if (!user) {
        return res.status(400).json({ success: false, error: '微信登录失败' });
      }

      const tokens = AuthService.generateTokens({
        id: user.id,
        email: user.email || undefined,
        username: user.username || undefined
      });

      logger.info(`[微信登录] 登录成功, userId: ${user.id}, nickname: ${user.nickname}`);
      return res.json({
        success: true,
        message: '登录成功',
        data: {
          user: {
            id: user.id,
            email: user.email,
            phone: user.phone,
            username: user.username,
            nickname: user.nickname,
            avatar: user.avatar,
            gender: user.gender,
            birthday: user.birthday,
            bio: user.bio,
            hasPassword: user.hasPassword,
            hasWechat: !!user.wechatOpenId,
            wechatNickname: user.wechatNickname,
            wechatAvatar: user.wechatAvatar,
            createdAt: user.createdAt,
          },
          tokens
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '登录失败';
      const stack = error instanceof Error ? error.stack?.substring(0, 300) : '';
      logger.error('[微信登录] 失败:', message, stack);
      return res.status(400).json({ success: false, error: message });
    }
  }
);

// 刷新 token
router.post(
  '/token/refresh',
  validate({ body: tokenRefreshSchema }),
  async (req, res) => {
    try {
      const { refreshToken } = req.body;
      const tokens = await AuthService.refreshToken(refreshToken);
      return res.json({ success: true, message: 'Token刷新成功', data: { tokens } });
    } catch (error) {
      logger.error('Token刷新失败:', error);
      const message = error instanceof Error ? error.message : 'Token刷新失败';
      return res.status(401).json({ success: false, error: message });
    }
  }
);

// 验证 token
router.post(
  '/token/verify',
  validate({ body: tokenVerifySchema }),
  async (req, res) => {
    try {
      const { token, type } = req.body;
      const payload = AuthService.verifyToken(token, type);

      if (!payload) {
        return res.status(401).json({ success: false, error: 'Token无效或已过期' });
      }

      return res.json({ success: true, message: 'Token验证成功', data: { payload } });
    } catch (error) {
      logger.error('Token验证失败:', error);
      const message = error instanceof Error ? error.message : 'Token验证失败';
      return res.status(401).json({ success: false, error: message });
    }
  }
);

export default router;
