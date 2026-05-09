import Dysmsapi20170525, * as $Dysmsapi20170525 from '@alicloud/dysmsapi20170525';
import { Config } from '@alicloud/openapi-client';
import { redisClient } from '@/config/redis';
import { config } from '@/config';
import { logger } from '@/utils/logger';


export class SmsService {
  private client: Dysmsapi20170525;

  constructor() {
    const clientConfig = new Config({
      accessKeyId: config.sms.accessKeyId,
      accessKeySecret: config.sms.accessKeySecret,
      endpoint: 'dysmsapi.aliyuncs.com'
    });
    this.client = new Dysmsapi20170525(clientConfig);
  }

  /**
   * 发送短信
   * @param phone 手机号
   * @param templateCode 模板代码
   * @param templateParam 模板参数
   * @returns 是否发送成功
   */
  async sendSms(phone: string, templateCode: string, templateParam: Record<string, any>): Promise<boolean> {
    try {
      const sendSmsRequest = new $Dysmsapi20170525.SendSmsRequest({
        phoneNumbers: phone,
        signName: config.sms.signName,
        templateCode: templateCode,
        templateParam: JSON.stringify(templateParam)
      });

      const response = await this.client.sendSms(sendSmsRequest);

      if (response.body?.code === 'OK') {
        return true;
      } else {
        const errorMsg = response.body?.message || '未知错误';
        logger.error(`短信发送失败: ${errorMsg}，手机号: ${phone}`);
        return false;
      }
    } catch (error: any) {
      logger.error(`发送短信异常: ${error.message || error}`);
      return false;
    }
  }

  /**
   * 发送登录验证码
   * @param phone 手机号
   * @returns 发送结果和验证码
   */
  async sendLoginCode(phone: string): Promise<{ success: boolean; code?: string }> {
    // 检查是否可以发送
    const canSend = await this.canSendCode(phone);
    if (!canSend) {
      return { success: false };
    }

    // 生成验证码
    const code = this.generateVerificationCode();

    // 发送短信
    const success = await this.sendSms(phone, config.sms.templates.login, { code });

    if (success) {
      logger.info(`短信验证码发送成功: ${phone}, ${code}`);
      // 存储验证码到Redis，10分钟过期
      await redisClient.setEx(`sms_code:login:${phone}`, 600, code);
      // 记录发送时间
      await this.recordSentTime(phone);
      return { success: true, code };
    } else {
      return { success: false };
    }
  }

  /**
   * 发送重置密码验证码
   * @param phone 手机号
   * @returns 发送结果和验证码
   */
  async sendPasswordResetCode(phone: string): Promise<{ success: boolean; code?: string }> {
    const canSend = await this.canSendCode(phone);
    if (!canSend) {
      return { success: false };
    }

    const code = this.generateVerificationCode();
    const success = await this.sendSms(phone, config.sms.templates.passwordReset, { code });

    if (success) {
      logger.info(`重置密码短信验证码发送成功: ${phone}, ${code}`);
      await redisClient.setEx(`sms_code:password-reset:${phone}`, 600, code);
      await this.recordSentTime(phone);
      return { success: true, code };
    } else {
      logger.error(`重置密码短信验证码发送失败: ${phone}`);
      return { success: false };
    }
  }

  /**
   * 发送绑定手机号验证码
   * @param phone 手机号
   * @returns 发送结果和验证码
   */
  async sendBindPhoneCode(phone: string): Promise<{ success: boolean; code?: string }> {
    const canSend = await this.canSendCode(phone);
    if (!canSend) {
      return { success: false };
    }

    const code = this.generateVerificationCode();
    const success = await this.sendSms(phone, config.sms.templates.bindPhone, { code });

    if (success) {
      logger.info(`绑定手机号短信验证码发送成功: ${phone}, ${code}`);
      await redisClient.setEx(`sms_code:bind-phone:${phone}`, 600, code);
      await this.recordSentTime(phone);
      return { success: true, code };
    } else {
      logger.error(`绑定手机号短信验证码发送失败: ${phone}`);
      return { success: false };
    }
  }

  /**
   * 验证短信验证码
   * @param phone 手机号
   * @param code 用户输入的验证码
   * @param type 验证码类型
   * @returns 验证是否成功
   */
  async verifyCode(phone: string, code: string, type: 'login' | 'password-reset' | 'bind-phone' = 'login'): Promise<boolean> {
    try {
      const key = `sms_code:${type}:${phone}`;
      const storedCode = await redisClient.get(key);

      if (!storedCode) {
        return false; // 验证码已过期或不存在
      }

      if (storedCode === code) {
        // 验证成功后删除验证码
        await redisClient.del(key);
        return true;
      }

      return false;
    } catch (error) {
      console.error('验证码验证异常:', error);
      return false;
    }
  }

  /**
   * 生成6位数字验证码
   * @returns 验证码字符串
   */
  generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * 检查手机号是否可以发送验证码（防止频繁发送）
   * @param phone 手机号
   * @returns 是否可以发送
   */
  async canSendCode(phone: string): Promise<boolean> {
    try {
      const lastSentTime = await redisClient.get(`sms_sent:${phone}`);

      if (lastSentTime) {
        const timeDiff = Date.now() - parseInt(lastSentTime);
        // 60秒内不能重复发送
        return timeDiff >= 60000;
      }

      return true;
    } catch (error) {
      console.error('检查发送频率异常:', error);
      return false;
    }
  }

  /**
   * 记录发送时间（用于防止频繁发送）
   * @param phone 手机号
   */
  async recordSentTime(phone: string): Promise<void> {
    try {
      // 记录发送时间，10分钟过期
      await redisClient.setEx(`sms_sent:${phone}`, 600, Date.now().toString());
    } catch (error) {
      console.error('记录发送时间异常:', error);
    }
  }
}

export const smsService = new SmsService();