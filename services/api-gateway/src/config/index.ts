import { z } from 'zod';
import dotenv from 'dotenv';
import { findUpSync } from 'find-up';

// 在配置模块中自行加载环境变量，避免循环依赖
const envPath = findUpSync('.env', { cwd: process.cwd() });
if (envPath) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

// 定义配置结构的验证 schema
const configSchema = z.object({
  // 服务器配置
  server: z.object({
    port: z.number(),
    host: z.string(),
    runtimeEnv: z.enum(['development', 'production', 'test']),
    requestBodyLimit: z.string(),
  }),

  // 日志配置
  logging: z.object({
    level: z.enum(['error', 'warn', 'info', 'debug'])
  }),

  // 数据库配置
  database: z.object({
    logQueries: z.boolean(),
  }),

  // Redis 配置
  redis: z.object({
    host: z.string(),
    port: z.number(),
    username: z.string().optional(),
    password: z.string().optional(),
    db: z.number(),
  }),

  // JWT 配置
  jwt: z.object({
    secret: z.string(),
    refreshSecret: z.string(),
    accessTokenExpiry: z.string(),
    refreshTokenExpiry: z.string(),
  }),

  // CORS 配置
  cors: z.object({
    origin: z.union([z.string(), z.array(z.string())]),
    credentials: z.boolean(),
  }),

  // 邮件配置
  email: z.object({
    smtp: z.object({
      host: z.string(),
      port: z.number(),
      secure: z.boolean(), // true for 465, false for other ports
      user: z.string(),
      pass: z.string(),
    }),
    from: z.object({
      name: z.string(),
      address: z.string(),
    }),
  }),

  // 外部服务配置
  services: z.object({
    speechService: z.object({
      url: z.string(),
    }),
    aiService: z.object({
      url: z.string(),
    }),
  }),

  // 阿里云短信服务配置
  sms: z.object({
    accessKeyId: z.string(),
    accessKeySecret: z.string(),
    signName: z.string(),
    templates: z.object({
      login: z.string(),
      passwordReset: z.string(),
      bindPhone: z.string(),
    }),
  }),

  // 阿里云OSS配置
  oss: z.object({
    region: z.string(),
    accessKeyId: z.string(),
    accessKeySecret: z.string(),
    bucketName: z.string(),
    cdnDomain: z.string(),
  }),

  // 阿里云 PNVS 一键登录（GetMobile 接口仅需阿里云账号 AK，schemeCode 由客户端 SDK 持有）
  pnvs: z.object({
    accessKeyId: z.string(),
    accessKeySecret: z.string(),
  }),

  // 微信登录配置
  wechat: z.object({
    appId: z.string(),
    appSecret: z.string(),
  }),

  // 支付宝配置
  alipay: z.object({
    appId: z.string(),
    privateKey: z.string(),
    alipayPublicKey: z.string(),
    gateway: z.string(),
    notifyUrl: z.string(),
  }),

  // 管理员配置
  admin: z.object({
    apiKey: z.string().min(16),
  }),
});

// 从环境变量构建配置对象
function buildConfig() {
  const rawConfig = {
    server: {
      port: parseInt(process.env.API_GATEWAY_PORT!),
      host: process.env.API_GATEWAY_HOST || '0.0.0.0',
      runtimeEnv: process.env.RUNTIME_ENV!,
      requestBodyLimit: process.env.REQUEST_BODY_LIMIT!,
    },
    logging: {
      level: process.env.LOG_LEVEL!
    },
    database: {
      logQueries: process.env.LOG_QUERIES === 'true',
    },
    redis: {
      host: process.env.REDIS_HOST!,
      port: parseInt(process.env.REDIS_PORT!),
      username: process.env.REDIS_USERNAME,
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB!),
    },
    jwt: {
      secret: process.env.JWT_SECRET!,
      refreshSecret: process.env.JWT_REFRESH_SECRET!,
      accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY!,
      refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY!,
    },
    cors: {
      origin: process.env.CORS_ORIGIN ?
        (process.env.CORS_ORIGIN === '*' ? '*' : process.env.CORS_ORIGIN.split(',')) :
        '*',
      credentials: process.env.CORS_CREDENTIALS === 'true',
    },
    email: {
      smtp: {
        host: process.env.SMTP_HOST!,
        port: parseInt(process.env.SMTP_PORT!),
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASS!,
      },
      from: {
        name: process.env.EMAIL_FROM_NAME!,
        address: process.env.EMAIL_FROM_ADDRESS!,
      },
    },
    services: {
      speechService: {
        url: process.env.SPEECH_SERVICE_URL || `http://localhost:${process.env.SPEECH_SERVICE_PORT!}`,
      },
      aiService: {
        url: process.env.AI_SERVICE_URL || `http://localhost:${process.env.AI_SERVICE_PORT!}`,
      },
    },
    sms: {
      accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID!,
      accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET!,
      signName: process.env.ALIYUN_SMS_SIGN_NAME!,
      templates: {
        login: process.env.ALIYUN_SMS_TEMPLATE_LOGIN!,
        passwordReset: process.env.ALIYUN_SMS_TEMPLATE_PASSWORD_RESET!,
        bindPhone: process.env.ALIYUN_SMS_TEMPLATE_BIND_PHONE!,
      },
    },
    oss: {
      region: process.env.ALIYUN_OSS_REGION!,
      accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID!,
      accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET!,
      bucketName: process.env.ALIYUN_OSS_BUCKET_NAME!,
      cdnDomain: process.env.ALIYUN_OSS_CDN_DOMAIN!,
    },
    pnvs: {
      accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID!,
      accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET!,
    },
    wechat: {
      appId: process.env.WECHAT_APP_ID!,
      appSecret: process.env.WECHAT_APP_SECRET!,
    },
    alipay: {
      appId: process.env.ALIPAY_APP_ID!,
      privateKey: process.env.ALIPAY_APP_PRIVATE_KEY!,
      alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY!,
      gateway: process.env.ALIPAY_GATEWAY || 'https://openapi.alipay.com/gateway.do',
      notifyUrl: process.env.ALIPAY_NOTIFY_URL!,
    },
    admin: {
      apiKey: process.env.ADMIN_API_KEY!,
    },
  };

  // 验证配置
  const result = configSchema.safeParse(rawConfig);

  if (!result.success) {
    console.error('配置验证失败:', JSON.stringify(result.error.errors, null, 2));
    throw new Error('Invalid configuration');
  }


  return result.data;
}

// 导出配置对象
export const config = buildConfig();

// 导出类型
export type Config = z.infer<typeof configSchema>;
