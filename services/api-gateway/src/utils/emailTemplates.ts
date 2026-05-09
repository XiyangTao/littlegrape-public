import { VerificationCodeType } from '@/services/emailService';

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface TemplateData {
  code: string;
  [key: string]: any;
}

export class EmailTemplateManager {
  private static readonly baseStyles = `
    .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
    .content { padding: 30px; background-color: #f8f9fa; }
    .code { font-size: 32px; font-weight: bold; text-align: center; margin: 20px 0; letter-spacing: 3px; }
    .footer { padding: 20px; text-align: center; color: #6c757d; font-size: 14px; }
  `;

  private static readonly templates: Record<VerificationCodeType, (data: TemplateData) => EmailTemplate> = {
    register: (data: TemplateData) => ({
      subject: '【LittleGrape】邮箱验证码',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            ${EmailTemplateManager.baseStyles}
            .header { background-color: #007bff; color: white; padding: 20px; text-align: center; }
            .code { color: #007bff; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>欢迎注册 LittleGrape</h1>
            </div>
            <div class="content">
              <p>您好！</p>
              <p>感谢您注册 LittleGrape，您的邮箱验证码是：</p>
              <div class="code">${data.code}</div>
              <p>验证码有效期为 <strong>10分钟</strong>，请及时使用。</p>
              <p>如果这不是您的操作，请忽略此邮件。</p>
            </div>
            <div class="footer">
              <p>此邮件由系统自动发送，请勿回复。</p>
              <p>LittleGrape Team</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `欢迎注册 LittleGrape！您的邮箱验证码是：${data.code}，有效期10分钟。如果这不是您的操作，请忽略此邮件。`
    }),

    password_reset: (data: TemplateData) => ({
      subject: '【LittleGrape】密码重置验证码',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            ${EmailTemplateManager.baseStyles}
            .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; }
            .code { color: #dc3545; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>密码重置</h1>
            </div>
            <div class="content">
              <p>您好！</p>
              <p>您正在重置 LittleGrape 账户密码，验证码是：</p>
              <div class="code">${data.code}</div>
              <p>验证码有效期为 <strong>10分钟</strong>，请及时使用。</p>
              <p>如果这不是您的操作，请立即检查账户安全，并忽略此邮件。</p>
            </div>
            <div class="footer">
              <p>此邮件由系统自动发送，请勿回复。</p>
              <p>LittleGrape Team</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `LittleGrape 密码重置验证码：${data.code}，有效期10分钟。如果这不是您的操作，请立即检查账户安全。`
    })
  };

  /**
   * 获取指定类型的邮件模板
   */
  static getTemplate(type: VerificationCodeType, data: TemplateData): EmailTemplate {
    const templateGenerator = this.templates[type];
    if (!templateGenerator) {
      throw new Error(`未找到邮件模板类型: ${type}`);
    }
    return templateGenerator(data);
  }

  /**
   * 添加新的邮件模板类型
   */
  static addTemplate(type: string, generator: (data: TemplateData) => EmailTemplate): void {
    // @ts-ignore - 允许动态添加模板类型
    this.templates[type] = generator;
  }
}