import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { config } from '@/config';
import nodemailer from 'nodemailer';
import { EmailTemplateManager } from '@/utils/emailTemplates';

export type VerificationCodeType = 'register' | 'password_reset';

export class EmailService {
  // 创建 nodemailer 传输器
  private static createTransporter() {
    return nodemailer.createTransport({
      host: config.email.smtp.host,
      port: config.email.smtp.port,
      secure: config.email.smtp.secure, // true for 465, false for other ports
      auth: {
        user: config.email.smtp.user,
        pass: config.email.smtp.pass,
      },
    });
  }

  // 生成6位数验证码
  static generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // 发送验证码
  static async sendVerificationCode(email: string, type: VerificationCodeType) {
    try {
      // 检查邮箱格式
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('邮箱格式不正确');
      }
      // 生成验证码
      const code = this.generateVerificationCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10分钟后过期

      // 删除旧的验证码（同一邮箱同一类型只能有一个有效验证码）
      await prisma.emailVerificationCode.deleteMany({
        where: {
          email,
          type
        }
      });

      // 发送邮件
      await this.sendEmail(email, code, type);
      logger.info(`验证码发送成功: ${email}, 类型: ${type}`);

      // 创建新验证码记录
      await prisma.emailVerificationCode.create({
        data: {
          email,
          code,
          type,
          expiresAt
        }
      });
      logger.info(`验证码记录创建成功: ${email}, 类型: ${type}`);
    } catch (error) {
      logger.error('发送验证码失败:', error);
      throw error;
    }
  }

  // 验证验证码
  static async verifyCode(email: string, code: string, type: VerificationCodeType): Promise<boolean> {
    try {
      // 查找验证码记录
      const verificationRecord = await prisma.emailVerificationCode.findUnique({
        where: {
          email_type: {
            email,
            type
          }
        }
      });

      if (!verificationRecord) {
        throw new Error('验证码错误');
      }

      // 检查是否已验证
      if (verificationRecord.verified) {
        throw new Error('验证码错误');
      }

      // 检查过期时间
      if (new Date() > verificationRecord.expiresAt) {
        throw new Error('验证码已过期');
      }

      // 检查尝试次数（防暴力破解）
      if (verificationRecord.attempts >= 10) {
        throw new Error('验证失败次数过多，请重新获取验证码');
      }

      // 验证码不匹配，增加尝试次数
      if (verificationRecord.code !== code) {
        await prisma.emailVerificationCode.update({
          where: {
            id: verificationRecord.id
          },
          data: {
            attempts: verificationRecord.attempts + 1
          }
        });
        throw new Error('验证码错误');
      }

      // 验证成功，标记为已验证
      await prisma.emailVerificationCode.update({
        where: {
          id: verificationRecord.id
        },
        data: {
          verified: true
        }
      });

      logger.info(`验证码验证成功: ${email}, 类型: ${type}`);
      return true;
    } catch (error) {
      logger.error('验证码验证失败:', error);
      throw error;
    }
  }

  // 发送邮件
  private static async sendEmail(email: string, code: string, type: VerificationCodeType): Promise<void> {
    try {
      logger.info('开始发送邮件', {
        to: email,
        type,
        smtpConfig: {
          host: config.email.smtp.host,
          port: config.email.smtp.port,
          secure: config.email.smtp.secure,
          user: config.email.smtp.user
        }
      });

      // 使用模板管理器生成邮件内容
      const template = EmailTemplateManager.getTemplate(type, { code });

      // 创建传输器
      const transporter = this.createTransporter();

      try {
        await transporter.verify();
      } catch (verifyError) {
        logger.error('SMTP连接验证失败:', verifyError);
        throw verifyError;
      }

      // 发送邮件
      const mailOptions = {
        from: {
          name: config.email.from.name,
          address: config.email.from.address,
        },
        to: email,
        subject: template.subject,
        text: template.text,
        html: template.html,
      };

      const result = await transporter.sendMail(mailOptions);
      logger.info(`邮件发送成功到 ${email}，MessageId: ${result.messageId}`);
    } catch (error) {
      logger.error(`邮件发送失败到 ${email}:`, {
        error: error,
        message: error instanceof Error ? error.message : '未知错误',
        stack: error instanceof Error ? error.stack : undefined,
        code: (error as any)?.code,
        errno: (error as any)?.errno,
        syscall: (error as any)?.syscall
      });
      throw new Error('邮件发送失败，请稍后重试');
    }
  }
}