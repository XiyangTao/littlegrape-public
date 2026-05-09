import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '@/config';
import { logger } from '@/utils/logger';
import { UserService } from '@/services/userService';
import { smsService } from '@/services/smsService';
import { wechatService, WechatService } from '@/services/wechatService';
import { getMobileByToken } from '@/services/pnvsService';

export interface JwtPayload {
  userId: string;
  email?: string;
  username?: string;
  type: 'access' | 'refresh';
}

export interface RegisterData {
  email: string;
  password: string;
  username?: string;
  nickname?: string;
  verificationToken: string;
}

export interface EmailVerifyPayload {
  email: string;
}

export interface LoginData {
  identifier: string; // 邮箱|昵称|手机号
  password: string;
}

export class AuthService {
  // 密码加密
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  // 密码验证
  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  // 生成 JWT Token
  static generateTokens(user: { id: string; email?: string; username?: string }) {
    const payload = {
      userId: user.id,
    };

    const accessToken = jwt.sign(
      { ...payload, type: 'access' as const },
      config.jwt.secret,
      { expiresIn: config.jwt.accessTokenExpiry as any }
    );

    const refreshToken = jwt.sign(
      { ...payload, type: 'refresh' as const },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshTokenExpiry as any }
    );

    return { accessToken, refreshToken };
  }

  // 验证码通过生成的临时token
  static generateEmailVerificationToken(email: string) {
    const payload : EmailVerifyPayload = {
      email,
    };
    return jwt.sign(payload, config.jwt.secret, { expiresIn: '10m' });
  }

  static verifyEmailVerificationToken(token: string) {
    try {
      const payload = jwt.verify(token, config.jwt.secret) as EmailVerifyPayload;
      return payload;
    } catch (error) {
      logger.debug('验证邮箱Token失败:', error);
      return null;
    }
  }

  // 生成密码重置授权Token
  static generatePasswordResetToken(userId: string) {
    const payload = { userId, type: 'password-reset' as const };
    return jwt.sign(payload, config.jwt.secret, { expiresIn: '10m' });
  }

  // 验证密码重置授权Token
  static verifyPasswordResetToken(token: string): { userId: string } | null {
    try {
      const payload = jwt.verify(token, config.jwt.secret) as { userId: string; type: string };
      if (payload.type !== 'password-reset') {
        return null;
      }
      return { userId: payload.userId };
    } catch (error) {
      logger.debug('验证密码重置Token失败:', error);
      return null;
    }
  }

  // 验证 JWT Token
  static verifyToken(token: string, type: 'access' | 'refresh'): JwtPayload | null {
    try {
      const secret = type === 'access' ? config.jwt.secret : config.jwt.refreshSecret;
      const decoded = jwt.verify(token, secret) as JwtPayload;

      if (decoded.type !== type) {
        return null;
      }
      return decoded;
    } catch (error) {
      logger.debug('Token verification failed:', error);
      return null;
    }
  }

  // 1. 请求密码重置 (发送验证码)
  static async requestPasswordReset(phone: string) {
    try {
      const user = await UserService.getUserByPhone(phone);
      // 安全注意：无论用户是否存在，都不要向上游透露此信息
      if (user) {
        await smsService.sendPasswordResetCode(phone);
      }
      // 即使没有找到用户，也返回成功，防止用户枚举攻击
      logger.info(`收到重置密码请求: ${phone}, 用户存在: ${!!user}`);
    } catch (error) {
      // 即使内部出错，也只记录日志，不向上抛出，保持接口行为一致
      logger.error('请求密码重置时发生错误:', error);
    }
  }

  // 2. 验证重置码并获取授权Token
  static async verifyPasswordResetCode(phone: string, code: string): Promise<string> {
    const isValid = await smsService.verifyCode(phone, code, 'password-reset');
    if (!isValid) {
      throw new Error('验证码错误或已过期');
    }

    const user = await UserService.getUserByPhone(phone);
    if (!user) {
      // 正常情况下，能收到验证码的手机号应该是存在的
      // 但以防万一，再次校验
      throw new Error('用户不存在');
    }

    // 生成一个一次性的、短时效的Token，用于下一步重置密码
    const resetToken = this.generatePasswordResetToken(user.id);
    return resetToken;
  }

  // 3. 完成密码重置
  static async completePasswordReset(resetToken: string, newPassword: string) {
    const payload = this.verifyPasswordResetToken(resetToken);
    if (!payload) {
      throw new Error('重置密码授权已失效，请重新操作');
    }

    if (newPassword.length < 6) {
      throw new Error('新密码长度不能少于6位');
    }

    const hashedPassword = await this.hashPassword(newPassword);
    await UserService.updateUserPassword(payload.userId, hashedPassword);

    logger.info(`用户密码重置成功: ${payload.userId}`);
  }

  // 邮箱注册
  static async registerWithEmail(registerData: RegisterData) {
    try {
      const { email, password, username, nickname, verificationToken } = registerData;

      const payload = this.verifyEmailVerificationToken(verificationToken);
      if (!payload || payload.email !== email) {
        throw new Error('验证码已失效');
      }

      // 加密密码
      const hashedPassword = await this.hashPassword(password);

      // 准备用户数据
      const baseNickname = nickname || username || email.split('@')[0];
      const finalNickname = await this.generateUniqueNickname(baseNickname);

      const userData = {
        email,
        password: hashedPassword,
        nickname: finalNickname,
      };

      // 调用 UserService 创建用户
      const user = await UserService.createUser(userData);

      logger.info(`新用户注册成功: ${email}`);
      return user;
    } catch (error) {
      logger.error('邮箱注册失败:', error);
      throw error;
    }
  }

  // 密码登录 (支持邮箱|昵称|手机号)
  static async loginWithPassword(loginData: LoginData) {
    try {
      const { identifier, password } = loginData;

      // 通过 UserService 查找用户 (支持邮箱|昵称|手机号)
      const user = await UserService.getUserByIdentifierWithPassword(identifier);

      if (!user) {
        throw new Error('用户名或密码错误');
      }

      if (!user.isActive) {
        throw new Error('账户已被停用');
      }

      if (!user.password) {
        throw new Error('该账户未设置密码，请使用其他方式登录');
      }

      // 验证密码
      const isValidPassword = await this.verifyPassword(password, user.password);
      if (!isValidPassword) {
        throw new Error('用户名或密码错误');
      }

      // 移除密码字段后返回，添加 hasPassword 标识
      const { password: _, ...userInfo } = user;
      logger.info(`用户登录成功: ${identifier}`);
      return { ...userInfo, hasPassword: true };
    } catch (error) {
      logger.error('密码登录失败:', error);
      throw error;
    }
  }

  // 生成随机4位字符
  private static generateRandomSuffix(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // 生成唯一昵称
  private static async generateUniqueNickname(baseNickname: string): Promise<string> {
    const isAvailable = await UserService.isNicknameAvailable(baseNickname);

    if (!isAvailable) {
      return `${baseNickname}_${this.generateRandomSuffix()}`;
    }

    return baseNickname;
  }

  // 手机号一键登录
  static async loginWithPhone(phone: string, verifyCode: string) {
    try {
      // 验证短信验证码
      const isValidCode = await smsService.verifyCode(phone, verifyCode);
      if (!isValidCode) {
        throw new Error('验证码错误或已过期');
      }

      // 通过 UserService 查找用户
      let user = await UserService.getUserByPhone(phone);

      if (!user) {
        // 首次手机登录，创建新用户
        const baseNickname = `用户${phone.slice(-4)}`;
        const finalNickname = await this.generateUniqueNickname(baseNickname);

        const userData = {
          phone,
          nickname: finalNickname,
        };

        user = await UserService.createUser(userData);
        logger.info(`新用户通过手机号注册: ${phone}`);
      } else {
        if (!user.isActive) {
          throw new Error('账户已被停用');
        }
        logger.info(`用户通过手机号登录: ${phone}`);
      }

      return user;
    } catch (error) {
      logger.error('手机号登录失败:', error);
      throw error;
    }
  }

  // 一键登录（运营商网关认证，via 阿里云 PNVS）
  static async loginWithCarrier(accessToken: string) {
    try {
      const phone = await getMobileByToken(accessToken);

      let user = await UserService.getUserByPhone(phone);

      if (!user) {
        const baseNickname = `用户${phone.slice(-4)}`;
        const finalNickname = await this.generateUniqueNickname(baseNickname);
        user = await UserService.createUser({ phone, nickname: finalNickname });
        logger.info(`新用户通过一键登录注册: ${phone}`);
      } else {
        if (!user.isActive) {
          throw new Error('账户已被停用');
        }
        logger.info(`用户通过一键登录: ${phone}`);
      }

      return user;
    } catch (error) {
      logger.error('一键登录失败:', error);
      throw error;
    }
  }

  // 微信登录（snsapi_userinfo）- 用于新用户注册
  static async loginWithWechat(wechatCode: string) {
    try {
      // 使用授权码获取微信用户信息
      const wechatUserInfo = await wechatService.getUserInfoByCode(wechatCode);

      // 通过 UserService 查找用户
      let user = await UserService.getUserByWechatOpenId(wechatUserInfo.openid);

      if (!user) {
        // 首次微信登录，创建新用户
        const baseNickname = wechatUserInfo.nickname || `微信用户${wechatUserInfo.openid.slice(-6)}`;
        const finalNickname = await this.generateUniqueNickname(baseNickname);

        const userData = {
          wechatOpenId: wechatUserInfo.openid,
          wechatUnionId: wechatUserInfo.unionid,
          wechatNickname: wechatUserInfo.nickname || null,  // 保存微信原始昵称
          wechatAvatar: wechatUserInfo.headimgurl || null,  // 保存微信原始头像
          nickname: finalNickname,
          avatar: wechatUserInfo.headimgurl,
          gender: WechatService.convertGender(wechatUserInfo.sex),
        };

        user = await UserService.createUser(userData);
        logger.info(`新用户通过微信注册: ${wechatUserInfo.openid}`);
      } else {
        if (!user.isActive) {
          throw new Error('账户已被停用');
        }
        // 更新微信昵称和头像（用户可能在微信端修改过）
        if (wechatUserInfo.nickname || wechatUserInfo.headimgurl) {
          user = await UserService.updateUser(user.id, {
            wechatNickname: wechatUserInfo.nickname || user.wechatNickname,
            wechatAvatar: wechatUserInfo.headimgurl || user.wechatAvatar,
          });
        }
        logger.info(`用户通过微信登录: ${wechatUserInfo.openid}`);
      }

      return user;
    } catch (error) {
      logger.error('微信登录失败:', error);
      throw error;
    }
  }

  // 刷新Token
  static async refreshToken(refreshToken: string) {
    try {
      const decoded = this.verifyToken(refreshToken, 'refresh');
      if (!decoded) {
        throw new Error('无效的刷新令牌');
      }

      // 通过 UserService 验证用户是否仍然存在且活跃
      const user = await UserService.getUserById(decoded.userId);

      if (!user || !user.isActive) {
        throw new Error('用户不存在或已被停用');
      }

      // 生成新的Token
      const tokens = this.generateTokens({
        id: user.id,
        email: user.email || undefined,
        username: user.username || undefined
      });
      logger.info(`Token刷新成功: ${user.id}`);
      return tokens;
    } catch (error) {
      logger.error('刷新Token失败:', error);
      throw error;
    }
  }
}