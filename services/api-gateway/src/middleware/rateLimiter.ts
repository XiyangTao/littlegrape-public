import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { redisClient } from '@/config/redis';
import { logger } from '@/utils/logger';
import { getTodayCN, secondsUntilTomorrowCN } from '@/utils/dateUtils';

/**
 * 专业的SMS限流中间件
 * 使用 rate-limiter-flexible 实现多层限流保护
 */
export class SMSRateLimiter {
  private ipLimiter: RateLimiterRedis;
  private phoneHourlyLimiter: RateLimiterRedis;
  private phoneDailyLimiter: RateLimiterRedis;
  private deviceHourlyLimiter: RateLimiterRedis;
  private deviceDailyLimiter: RateLimiterRedis;

  constructor() {
    // IP限制 - 30分钟内最多30次
    this.ipLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'sms_ip_limit',
      points: 30, // 允许的请求次数
      duration: 30 * 60, // 时间窗口（秒）
      blockDuration: 30 * 60, // 阻止时长（秒）
    });

    // 手机号小时级限制 - 1小时内最多5次
    this.phoneHourlyLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'sms_phone_hourly',
      points: 5,
      duration: 60 * 60, // 1小时
      blockDuration: 60 * 60, // 阻止1小时
    });

    // 手机号日级限制 - 自然日内最多10次（通过键名控制按天重置）
    this.phoneDailyLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'sms_phone_daily',
      points: 10,
      duration: 25 * 60 * 60, // 25小时（确保跨越到第二天）
      blockDuration: 60, // 短暂阻止（实际阻止时间由我们的逻辑控制）
    });

    // 设备小时级限制 - 1小时内最多10次
    this.deviceHourlyLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'sms_device_hourly',
      points: 10,
      duration: 60 * 60, // 1小时
      blockDuration: 60 * 60, // 阻止1小时
    });

    // 设备日级限制 - 自然日内最多20次（通过键名控制按天重置）
    this.deviceDailyLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'sms_device_daily',
      points: 20,
      duration: 25 * 60 * 60, // 25小时（确保跨越到第二天）
      blockDuration: 60, // 短暂阻止（实际阻止时间由我们的逻辑控制）
    });
  }

  /**
   * 获取今天的日期键（本地时区）
   */
  private getTodayKey(): string {
    return getTodayCN();
  }

  /**
   * 获取设备ID（设备指纹）
   */
  private getDeviceID(req: Request): string {
    // 优先使用客户端提供的设备ID
    const deviceId = req.headers['x-device-id'] as string;
    if (deviceId && deviceId.trim() && deviceId !== 'undefined' && deviceId !== 'null') {
      return deviceId.trim();
    }

    // 备用方案：基于多个因素生成更强的设备指纹
    const ip = this.getClientIP(req);
    const userAgent = req.headers['user-agent'] || 'unknown';
    const acceptLanguage = req.headers['accept-language'] || '';
    const acceptEncoding = req.headers['accept-encoding'] || '';

    // 组合多个特征创建唯一但稳定的指纹
    const fingerprint = Buffer.from(
      `${userAgent}-${ip}-${acceptLanguage}-${acceptEncoding}`
    ).toString('base64').slice(0, 20);

    return `fallback-${fingerprint}`;
  }

  /**
   * 获取客户端IP地址
   */
  private getClientIP(req: Request): string {
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
           (req.headers['x-real-ip'] as string) ||
           req.connection?.remoteAddress ||
           req.socket?.remoteAddress ||
           req.ip || 'unknown';
  }

  /**
   * 检查IP限制（不消耗点数）
   */
  private async checkIPLimit(ip: string): Promise<void> {
    const resRateLimiter = await this.ipLimiter.get(ip);
    if (resRateLimiter && resRateLimiter.remainingPoints <= 0) {
      const secs = Math.round(resRateLimiter.msBeforeNext / 1000) || 1;
      logger.warn(`IP ${ip} 已达限流上限，剩余时间: ${secs}秒`);

      throw {
        status: 429,
        error: '该网络请求过于频繁，请稍后再试',
        retryAfter: secs
      };
    }
  }

  /**
   * 检查手机号小时级限制（不消耗点数）
   */
  private async checkPhoneHourlyLimit(phone: string): Promise<void> {
    const resRateLimiter = await this.phoneHourlyLimiter.get(phone);
    if (resRateLimiter && resRateLimiter.remainingPoints <= 0) {
      const secs = Math.round(resRateLimiter.msBeforeNext / 1000) || 1;
      const minutes = Math.ceil(secs / 60);
      logger.warn(`手机号 ${phone} 小时级限流，剩余时间: ${minutes}分钟`);

      throw {
        status: 429,
        error: `此手机号请求过于频繁，请${minutes}分钟后再试`,
        retryAfter: secs
      };
    }
  }

  /**
   * 检查手机号日级限制（不消耗点数）
   */
  private async checkPhoneDailyLimit(phone: string): Promise<void> {
    const today = this.getTodayKey();
    const dailyKey = `${phone}:${today}`;

    const resRateLimiter = await this.phoneDailyLimiter.get(dailyKey);
    if (resRateLimiter && resRateLimiter.remainingPoints <= 0) {
      const secs = secondsUntilTomorrowCN();
      const hours = Math.ceil(secs / 3600);

      logger.warn(`手机号 ${phone} 日级限流，今日剩余时间: ${hours}小时`);

      throw {
        status: 429,
        error: `此手机号今日请求次数已达上限`,
        retryAfter: secs
      };
    }
  }

  /**
   * 检查设备小时级限制（不消耗点数）
   */
  private async checkDeviceHourlyLimit(deviceId: string): Promise<void> {
    const resRateLimiter = await this.deviceHourlyLimiter.get(deviceId);
    if (resRateLimiter && resRateLimiter.remainingPoints <= 0) {
      const secs = Math.round(resRateLimiter.msBeforeNext / 1000) || 1;
      const minutes = Math.ceil(secs / 60);
      logger.warn(`设备 ${deviceId} 小时级限流，剩余时间: ${minutes}分钟`);

      throw {
        status: 429,
        error: `此设备请求过于频繁，请${minutes}分钟后再试`,
        retryAfter: secs
      };
    }
  }

  /**
   * 检查设备日级限制（不消耗点数）
   */
  private async checkDeviceDailyLimit(deviceId: string): Promise<void> {
    const today = this.getTodayKey();
    const dailyKey = `${deviceId}:${today}`;

    const resRateLimiter = await this.deviceDailyLimiter.get(dailyKey);
    if (resRateLimiter && resRateLimiter.remainingPoints <= 0) {
      const secs = secondsUntilTomorrowCN();
      const hours = Math.ceil(secs / 3600);

      logger.warn(`设备 ${deviceId} 日级限流，今日剩余时间: ${hours}小时`);

      throw {
        status: 429,
        error: `此设备今日请求次数已达上限`,
        retryAfter: secs
      };
    }
  }

  /**
   * 中间件函数
   */
  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const phone = req.body.phone;

      if (!phone) {
        return next(); // 如果没有手机号，跳过手机号限制
      }

      const ip = this.getClientIP(req);
      const deviceId = this.getDeviceID(req);

      try {
        // 并行检查所有限制（不消耗点数，提高性能）
        await Promise.all([
          this.checkIPLimit(ip),
          this.checkPhoneHourlyLimit(phone),
          this.checkPhoneDailyLimit(phone),
          this.checkDeviceHourlyLimit(deviceId),
          this.checkDeviceDailyLimit(deviceId)
        ]);

        // 所有检查通过，现在消耗点数
        const today = this.getTodayKey();
        const phoneDailyKey = `${phone}:${today}`;
        const deviceDailyKey = `${deviceId}:${today}`;

        const [ipRes, phoneHourlyRes, phoneDailyRes, deviceHourlyRes, deviceDailyRes] = await Promise.all([
          this.ipLimiter.consume(ip),
          this.phoneHourlyLimiter.consume(phone),
          this.phoneDailyLimiter.consume(phoneDailyKey),
          this.deviceHourlyLimiter.consume(deviceId),
          this.deviceDailyLimiter.consume(deviceDailyKey)
        ]);

        // 设置响应头
        res.set('X-RateLimit-Limit-IP', '30');
        res.set('X-RateLimit-Remaining-IP', String(ipRes.remainingPoints || 0));
        res.set('X-RateLimit-Reset-IP', new Date(Date.now() + ipRes.msBeforeNext).toISOString());

        res.set('X-RateLimit-Limit-Phone-Hourly', '5');
        res.set('X-RateLimit-Remaining-Phone-Hourly', String(phoneHourlyRes.remainingPoints || 0));

        res.set('X-RateLimit-Limit-Phone-Daily', '10');
        res.set('X-RateLimit-Remaining-Phone-Daily', String(phoneDailyRes.remainingPoints || 0));

        res.set('X-RateLimit-Limit-Device-Hourly', '10');
        res.set('X-RateLimit-Remaining-Device-Hourly', String(deviceHourlyRes.remainingPoints || 0));

        res.set('X-RateLimit-Limit-Device-Daily', '20');
        res.set('X-RateLimit-Remaining-Device-Daily', String(deviceDailyRes.remainingPoints || 0));

        next();

      } catch (error) {
        // 如果是限流错误（由 check* 方法抛出的对象），返回相应状态
        if (typeof error === 'object' && error !== null && 'status' in error && (error as { status: number }).status === 429) {
          const rlError = error as { status: number; error: string; retryAfter: number };
          logger.info(`限流触发: ${rlError.error}, 重试时间: ${rlError.retryAfter}秒`);
          return res.status(429).json({
            success: false,
            error: rlError.error,
            retryAfter: rlError.retryAfter
          });
        }

        // 其他错误（如Redis连接失败），允许请求通过，避免影响服务可用性
        const errMsg = error instanceof Error ? error.message : String(error);
        const errStack = error instanceof Error ? error.stack : undefined;
        logger.error('限流服务异常:', {
          error: errMsg,
          stack: errStack,
          phone,
          ip,
          deviceId
        });
        logger.warn('限流服务故障，允许请求通过');
        next();
      }
    };
  }

  /**
   * 获取限流状态（用于监控）
   */
  async getStatus(ip: string, phone: string, deviceId: string): Promise<{
    ip: unknown;
    phoneHourly: unknown;
    phoneDaily: unknown;
    deviceHourly: unknown;
    deviceDaily: unknown;
  }> {
    try {
      const today = this.getTodayKey();
      const phoneDailyKey = `${phone}:${today}`;
      const deviceDailyKey = `${deviceId}:${today}`;

      const [ipStatus, phoneHourlyStatus, phoneDailyStatus, deviceHourlyStatus, deviceDailyStatus] = await Promise.all([
        this.ipLimiter.get(ip),
        this.phoneHourlyLimiter.get(phone),
        this.phoneDailyLimiter.get(phoneDailyKey),
        this.deviceHourlyLimiter.get(deviceId),
        this.deviceDailyLimiter.get(deviceDailyKey)
      ]);

      return {
        ip: ipStatus,
        phoneHourly: phoneHourlyStatus,
        phoneDaily: phoneDailyStatus,
        deviceHourly: deviceHourlyStatus,
        deviceDaily: deviceDailyStatus
      };
    } catch (error) {
      logger.error('获取限流状态失败:', error);
      return { ip: null, phoneHourly: null, phoneDaily: null, deviceHourly: null, deviceDaily: null };
    }
  }

  /**
   * 重置特定键的限制（管理员功能）
   */
  async reset(type: 'ip' | 'phone-hourly' | 'phone-daily' | 'device-hourly' | 'device-daily', key: string, date?: string): Promise<void> {
    try {
      switch (type) {
        case 'ip':
          await this.ipLimiter.delete(key);
          break;
        case 'phone-hourly':
          await this.phoneHourlyLimiter.delete(key);
          break;
        case 'phone-daily':
          const phoneToday = date || this.getTodayKey();
          const phoneDailyKey = `${key}:${phoneToday}`;
          await this.phoneDailyLimiter.delete(phoneDailyKey);
          break;
        case 'device-hourly':
          await this.deviceHourlyLimiter.delete(key);
          break;
        case 'device-daily':
          const deviceToday = date || this.getTodayKey();
          const deviceDailyKey = `${key}:${deviceToday}`;
          await this.deviceDailyLimiter.delete(deviceDailyKey);
          break;
      }
      logger.info(`重置限流状态: ${type} - ${key}`);
    } catch (error) {
      logger.error(`重置限流状态失败: ${type} - ${key}`, error);
      throw error;
    }
  }
}

// 导出单例实例
export const smsRateLimiter = new SMSRateLimiter();

/**
 * 认证路由通用限流
 * 三层限流：IP、邮箱/手机、登录失败
 */
export class AuthRateLimiter {
  // IP 限制 — 15分钟30次
  private ipLimiter: RateLimiterRedis;
  // 账号标识限制 — 5分钟5次（邮箱/手机号维度）
  private identifierLimiter: RateLimiterRedis;
  // 登录失败限制 — 15分钟10次
  private loginFailLimiter: RateLimiterRedis;

  constructor() {
    this.ipLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'auth_ip',
      points: 30,
      duration: 15 * 60,
      blockDuration: 15 * 60,
    });

    this.identifierLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'auth_id',
      points: 5,
      duration: 5 * 60,
      blockDuration: 5 * 60,
    });

    this.loginFailLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'auth_login_fail',
      points: 10,
      duration: 15 * 60,
      blockDuration: 15 * 60,
    });
  }

  private getClientIP(req: Request): string {
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
           (req.headers['x-real-ip'] as string) ||
           req.connection?.remoteAddress ||
           req.socket?.remoteAddress ||
           req.ip || 'unknown';
  }

  private rateLimitResponse(res: Response, retryAfter: number, message: string) {
    res.set('Retry-After', String(retryAfter));
    return res.status(429).json({
      success: false,
      error: message,
      retryAfter,
    });
  }

  /**
   * 邮箱发送验证码限流（IP + 邮箱）
   */
  emailMiddleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const ip = this.getClientIP(req);
      const email = req.body.email;
      try {
        await this.ipLimiter.consume(ip);
        if (email) await this.identifierLimiter.consume(email);
        next();
      } catch (rlError) {
        if (rlError instanceof Error) { logger.error('认证限流异常:', rlError); return next(); }
        const secs = Math.round(((rlError as { msBeforeNext?: number }).msBeforeNext ?? 0) / 1000) || 60;
        return this.rateLimitResponse(res, secs, '请求过于频繁，请稍后再试');
      }
    };
  }

  /**
   * 密码登录限流（IP + 登录失败计数）
   */
  loginMiddleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const ip = this.getClientIP(req);
      const identifier = req.body.identifier;
      try {
        await this.ipLimiter.consume(ip);
        // 检查登录失败次数（仅检查不消耗，登录失败时在路由中调用 recordLoginFailure）
        if (identifier) {
          const failRes = await this.loginFailLimiter.get(identifier);
          if (failRes && failRes.remainingPoints <= 0) {
            const secs = Math.round(failRes.msBeforeNext / 1000) || 60;
            return this.rateLimitResponse(res, secs, '登录失败次数过多，请稍后再试');
          }
        }
        next();
      } catch (rlError) {
        if (rlError instanceof Error) { logger.error('认证限流异常:', rlError); return next(); }
        const secs = Math.round(((rlError as { msBeforeNext?: number }).msBeforeNext ?? 0) / 1000) || 60;
        return this.rateLimitResponse(res, secs, '请求过于频繁，请稍后再试');
      }
    };
  }

  /**
   * 注册限流（IP + 邮箱）
   */
  registerMiddleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const ip = this.getClientIP(req);
      const email = req.body.email;
      try {
        await this.ipLimiter.consume(ip);
        if (email) await this.identifierLimiter.consume(email);
        next();
      } catch (rlError) {
        if (rlError instanceof Error) { logger.error('认证限流异常:', rlError); return next(); }
        const secs = Math.round(((rlError as { msBeforeNext?: number }).msBeforeNext ?? 0) / 1000) || 60;
        return this.rateLimitResponse(res, secs, '请求过于频繁，请稍后再试');
      }
    };
  }

  /**
   * 验证码验证限流（IP + 手机号/邮箱）
   */
  verifyMiddleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const ip = this.getClientIP(req);
      const identifier = req.body.phone || req.body.email;
      try {
        await this.ipLimiter.consume(ip);
        if (identifier) await this.identifierLimiter.consume(`verify:${identifier}`);
        next();
      } catch (rlError) {
        if (rlError instanceof Error) { logger.error('认证限流异常:', rlError); return next(); }
        const secs = Math.round(((rlError as { msBeforeNext?: number }).msBeforeNext ?? 0) / 1000) || 60;
        return this.rateLimitResponse(res, secs, '请求过于频繁，请稍后再试');
      }
    };
  }

  /**
   * 记录登录失败（在路由中密码错误时调用）
   */
  async recordLoginFailure(identifier: string): Promise<void> {
    try {
      await this.loginFailLimiter.consume(identifier);
    } catch {
      // 已被限流，不需要处理
    }
  }
}

export const authRateLimiter = new AuthRateLimiter();