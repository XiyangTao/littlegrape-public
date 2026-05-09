import express from 'express';
import bcrypt from 'bcryptjs';
import { UserService } from '@/services/userService';
import { OSSService } from '@/services/ossService';
import { smsService } from '@/services/smsService';
import { wechatService } from '@/services/wechatService';
import { getUserProfile } from '@/services/followService';
import { moderateText } from '@/services/moderationService';
import { logger } from '@/utils/logger';

const router = express.Router();

/**
 * 查看指定用户的公开资料
 * GET /api/user/:userId/profile
 *
 * 策略：OPTIONAL
 * - 未登录用户：只能看到公开信息（昵称、头像）
 * - 已登录用户：能看到更多信息，或者显示互动按钮
 */
router.get('/:userId/profile', async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUser = req.user; // 可能为 undefined（未登录）

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: '用户ID为必填项'
      });
    }

    // 使用 followService.getUserProfile 获取完整主页数据
    const profileData = await getUserProfile(userId, currentUser?.id);

    return res.json({
      success: true,
      data: {
        ...profileData,
        isOwnProfile: currentUser?.id === userId,
        viewerContext: {
          isLoggedIn: !!currentUser,
          canInteract: !!currentUser,
        },
      },
    });
  } catch (error: unknown) {
    logger.error('获取用户资料失败:', error);

    if (error instanceof Error && error.message === 'user_not_found') {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取用户资料失败'
    });
  }
});

/**
 * 获取当前登录用户的个人资料
 * GET /api/user/profile
 *
 * 策略：REQUIRED（由路由守卫的兜底规则处理）
 */
router.get('/profile', async (req, res) => {
  try {
    const userId = req.user!.id; // 由于是 REQUIRED，user 必定存在

    // 从数据库获取完整用户信息
    const user = await UserService.getUserById(userId);

    return res.json({
      success: true,
      message: '获取个人资料成功',
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          nickname: user.nickname,
          phone: user.phone,
          avatar: user.avatar,
          gender: user.gender,
          birthday: user.birthday,
          bio: user.bio,
          hasPassword: !!user.password,
          hasWechat: !!user.wechatOpenId,
          wechatNickname: user.wechatNickname,
          wechatAvatar: user.wechatAvatar,
          isActive: user.isActive
        }
      }
    });
  } catch (error: unknown) {
    logger.error('获取个人资料失败:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取个人资料失败'
    });
  }
});

/**
 * 更新当前登录用户的个人资料
 * PUT /api/user/profile
 *
 * 策略：REQUIRED（由路由守卫的兜底规则处理）
 */
router.put('/profile', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { username, nickname, avatar, gender, birthday, bio } = req.body;

    // 基本验证
    if (username && typeof username !== 'string') {
      return res.status(400).json({
        success: false,
        error: '用户名必须是字符串'
      });
    }

    if (nickname && typeof nickname !== 'string') {
      return res.status(400).json({
        success: false,
        error: '昵称必须是字符串'
      });
    }

    if (avatar && typeof avatar !== 'string') {
      return res.status(400).json({
        success: false,
        error: '头像URL必须是字符串'
      });
    }

    if (gender && !['male', 'female', 'private'].includes(gender)) {
      return res.status(400).json({
        success: false,
        error: '性别必须是male、female或private之一'
      });
    }

    if (birthday && typeof birthday !== 'string') {
      return res.status(400).json({
        success: false,
        error: '生日必须是字符串'
      });
    }

    // 验证生日格式
    if (birthday) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(birthday)) {
        return res.status(400).json({
          success: false,
          error: '生日格式必须为YYYY-MM-DD'
        });
      }

      const date = new Date(birthday);
      if (isNaN(date.getTime())) {
        return res.status(400).json({
          success: false,
          error: '生日日期无效'
        });
      }
    }

    if (bio && typeof bio !== 'string') {
      return res.status(400).json({
        success: false,
        error: '个人简介必须是字符串'
      });
    }

    if (bio && bio.length > 200) {
      return res.status(400).json({
        success: false,
        error: '个人简介不能超过200个字符'
      });
    }

    // 内容审核：nickname / bio 只在本次有变化时审核（避免重复扣费）
    if (nickname && nickname !== req.user!.nickname) {
      const r = await moderateText(nickname, 'nickname', userId);
      if (!r.pass) {
        logger.info('Nickname moderation blocked', { userId, labels: r.labels });
        return res.status(400).json({
          success: false,
          error: r.reason || '昵称不符合社区规范，请修改',
          code: 'MODERATION_REJECTED',
        });
      }
    }

    if (bio && bio !== req.user!.bio) {
      const r = await moderateText(bio, 'bio', userId);
      if (!r.pass) {
        logger.info('Bio moderation blocked', { userId, labels: r.labels });
        return res.status(400).json({
          success: false,
          error: r.reason || '个人简介不符合社区规范，请修改',
          code: 'MODERATION_REJECTED',
        });
      }
    }

    // 如果更新头像，先删除旧头像
    if (avatar && avatar !== req.user!.avatar) {
      const oldAvatar = req.user!.avatar;

      if (oldAvatar) {
        try {
          // 从 CDN URL 中提取 ossPath
          // CDN URL 格式: https://cdn.domain.com/path/to/file.jpg
          // ossPath 格式: path/to/file.jpg
          const url = new URL(oldAvatar);
          const ossPath = url.pathname.substring(1); // 移除开头的 '/'

          logger.info('删除旧头像', { userId, oldAvatar, ossPath });

          // 删除旧头像文件
          const deleteResult = await OSSService.deleteFile(ossPath);

          if (deleteResult.success) {
            logger.info('旧头像删除成功', { userId, ossPath });
          } else {
            logger.warn('旧头像删除失败', { userId, ossPath, error: deleteResult.error });
          }
        } catch (error: unknown) {
          // 删除失败不影响更新流程，只记录日志
          logger.error('删除旧头像异常', { userId, oldAvatar, error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }
    }

    // 更新用户信息
    const updatedUser = await UserService.updateUser(userId, {
      username,
      nickname,
      avatar,
      gender,
      birthday,
      bio
    });

    return res.json({
      success: true,
      message: '个人资料更新成功',
      data: { user: updatedUser }
    });
  } catch (error: unknown) {
    logger.error('更新个人资料失败:', error);
    return res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : '更新个人资料失败'
    });
  }
});

/**
 * 发送绑定手机号验证码
 * POST /api/user/bindPhone/sendCode
 *
 * 策略：REQUIRED
 */
router.post('/bindPhone/sendCode', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { phone } = req.body;

    // 参数验证
    if (!phone) {
      return res.status(400).json({
        success: false,
        error: '手机号为必填项'
      });
    }

    // 手机号格式验证
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        error: '手机号格式不正确'
      });
    }

    // 检查手机号是否已被其他用户绑定
    const existingUser = await UserService.getUserByPhone(phone);
    if (existingUser && existingUser.id !== userId) {
      return res.status(400).json({
        success: false,
        error: '该手机号已被其他账号绑定'
      });
    }

    // 发送验证码
    const result = await smsService.sendBindPhoneCode(phone);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: '验证码发送失败，请稍后重试'
      });
    }

    logger.info(`绑定手机号验证码已发送: ${userId} -> ${phone}`);

    return res.json({
      success: true,
      message: '验证码已发送'
    });
  } catch (error: unknown) {
    logger.error('发送绑定手机号验证码失败:', error);
    return res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : '发送验证码失败'
    });
  }
});

/**
 * 绑定手机号
 * POST /api/user/bindPhone
 *
 * 策略：REQUIRED
 */
router.post('/bindPhone', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { phone, verifyCode } = req.body;

    // 参数验证
    if (!phone) {
      return res.status(400).json({
        success: false,
        error: '手机号为必填项'
      });
    }

    if (!verifyCode) {
      return res.status(400).json({
        success: false,
        error: '验证码为必填项'
      });
    }

    // 手机号格式验证
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        error: '手机号格式不正确'
      });
    }

    // 检查手机号是否已被其他用户绑定
    const existingUser = await UserService.getUserByPhone(phone);
    if (existingUser && existingUser.id !== userId) {
      return res.status(400).json({
        success: false,
        error: '该手机号已被其他账号绑定'
      });
    }

    // 验证短信验证码（使用 bind-phone 类型）
    const isValidCode = await smsService.verifyCode(phone, verifyCode, 'bind-phone');
    if (!isValidCode) {
      return res.status(400).json({
        success: false,
        error: '验证码错误或已过期'
      });
    }

    // 更新用户手机号
    const updatedUser = await UserService.updateUser(userId, { phone });

    logger.info(`用户绑定手机号成功: ${userId} -> ${phone}`);

    return res.json({
      success: true,
      message: '手机号绑定成功',
      data: { user: updatedUser }
    });
  } catch (error: unknown) {
    logger.error('绑定手机号失败:', error);
    return res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : '绑定手机号失败'
    });
  }
});

/**
 * 绑定微信
 * POST /api/user/bindWechat
 *
 * 策略：REQUIRED
 */
router.post('/bindWechat', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { code } = req.body;

    // 参数验证
    if (!code) {
      return res.status(400).json({
        success: false,
        error: '微信授权码为必填项'
      });
    }

    // 检查用户是否已绑定微信
    const currentUser = await UserService.getUserById(userId);
    if (currentUser.wechatOpenId) {
      return res.status(400).json({
        success: false,
        error: '您已绑定微信账号'
      });
    }

    // 获取微信用户信息
    const wechatUserInfo = await wechatService.getUserInfoByCode(code);

    // 检查该微信是否已被其他用户绑定
    const existingWechatUser = await UserService.getUserByWechatOpenId(wechatUserInfo.openid);
    if (existingWechatUser) {
      return res.status(400).json({
        success: false,
        error: '该微信账号已被其他用户绑定'
      });
    }

    // 构建更新数据
    const updateData: any = {
      wechatOpenId: wechatUserInfo.openid,
      wechatUnionId: wechatUserInfo.unionid,
      wechatNickname: wechatUserInfo.nickname || null,
      wechatAvatar: wechatUserInfo.headimgurl || null,
    };

    // 如果用户没有设置头像，使用微信头像
    if (!currentUser.avatar && wechatUserInfo.headimgurl) {
      updateData.avatar = wechatUserInfo.headimgurl;
    }

    // 如果用户昵称是默认的（用户xxxx），尝试使用微信昵称
    const isDefaultNickname = currentUser.nickname && /^用户\d{4}$/.test(currentUser.nickname);
    if (isDefaultNickname && wechatUserInfo.nickname) {
      const isAvailable = await UserService.isNicknameAvailable(wechatUserInfo.nickname, userId);
      if (isAvailable) {
        updateData.nickname = wechatUserInfo.nickname;
      }
    }

    // 更新用户的微信绑定信息
    const updatedUser = await UserService.updateUser(userId, updateData);

    logger.info(`用户绑定微信成功: ${userId} -> ${wechatUserInfo.openid}, avatar=${updatedUser.avatar}`);

    return res.json({
      success: true,
      message: '微信绑定成功',
      data: { user: updatedUser }
    });
  } catch (error: unknown) {
    logger.error('绑定微信失败:', error);
    return res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : '绑定微信失败'
    });
  }
});

/**
 * 首次设置密码（用户当前没有密码）
 * POST /api/user/setPassword
 *
 * 策略：REQUIRED
 * 无需额外验证，信任当前登录态
 */
router.post('/setPassword', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { newPassword } = req.body;

    // 参数验证
    if (!newPassword) {
      return res.status(400).json({
        success: false,
        error: '新密码为必填项'
      });
    }

    // 密码长度验证
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: '密码长度至少6位'
      });
    }

    // 检查用户是否已有密码
    const user = await UserService.getUserById(userId);
    if (user.password) {
      return res.status(400).json({
        success: false,
        error: '您已设置过密码，请使用修改密码功能'
      });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // 更新密码
    await UserService.updateUserPassword(userId, hashedPassword);

    logger.info(`用户首次设置密码成功: ${userId}`);

    return res.json({
      success: true,
      message: '密码设置成功'
    });
  } catch (error: unknown) {
    logger.error('设置密码失败:', error);
    return res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : '设置密码失败'
    });
  }
});

/**
 * 修改密码（用户已有密码）
 * POST /api/user/changePassword
 *
 * 策略：REQUIRED
 * 需要验证旧密码
 */
router.post('/changePassword', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { currentPassword, newPassword } = req.body;

    // 参数验证
    if (!currentPassword) {
      return res.status(400).json({
        success: false,
        error: '当前密码为必填项'
      });
    }

    if (!newPassword) {
      return res.status(400).json({
        success: false,
        error: '新密码为必填项'
      });
    }

    // 密码长度验证
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: '新密码长度至少6位'
      });
    }

    // 获取用户当前密码
    const user = await UserService.getUserById(userId);
    if (!user.password) {
      return res.status(400).json({
        success: false,
        error: '您尚未设置密码，请先设置密码'
      });
    }

    // 验证旧密码
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        error: '当前密码错误'
      });
    }

    // 加密新密码
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // 更新密码
    await UserService.updateUserPassword(userId, hashedPassword);

    logger.info(`用户修改密码成功: ${userId}`);

    return res.json({
      success: true,
      message: '密码修改成功'
    });
  } catch (error: unknown) {
    logger.error('修改密码失败:', error);
    return res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : '修改密码失败'
    });
  }
});

/**
 * 检查用户名是否可用
 * GET /api/user/check/username/:username
 *
 * 策略：PUBLIC（需要在路由守卫中配置）
 */
router.get('/check/username/:username', async (req, res) => {
  try {
    const { username } = req.params;

    if (!username || username.length < 3) {
      return res.status(400).json({
        success: false,
        error: '用户名长度至少3位'
      });
    }

    // 用户名格式验证
    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({
        success: false,
        error: '用户名只能包含字母、数字、下划线和横线'
      });
    }

    const isAvailable = await UserService.isNicknameAvailable(username);

    return res.json({
      success: true,
      data: {
        username,
        available: isAvailable,
        message: isAvailable ? '用户名可用' : '用户名已被使用'
      }
    });
  } catch (error: unknown) {
    logger.error('检查用户名可用性失败:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '检查用户名失败'
    });
  }
});

export default router;