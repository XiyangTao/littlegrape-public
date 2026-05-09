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
  }),

  // Azure Speech 配置
  azure: z.object({
    speechKey: z.string(),
    speechRegion: z.string(),
    speechEndpoint: z.string().optional(),
    translatorEndpoint: z.string(),
    translatorKey: z.string().optional(),
    translatorRegion: z.string().optional(),
  }),

  // 豆包语音合成 (Doubao TTS V1) 配置
  doubao: z.object({
    appId: z.string(),
    accessToken: z.string(),
    cluster: z.string(),
  }),

  // 讯飞语音配置
  xunfei: z.object({
    appId: z.string(),
    apiKey: z.string(),
    apiSecret: z.string(),
  }),

  // 火山引擎同声传译配置
  volcanoAst: z.object({
    appKey: z.string(),
    accessKey: z.string(),
    resourceId: z.string(),
    wsUrl: z.string(),
  }),

  // Redis 配置
  redis: z.object({
    host: z.string(),
    port: z.number(),
    password: z.string().optional(),
    db: z.number(),
  }),

  // 日志配置
  logging: z.object({
    level: z.enum(['error', 'warn', 'info', 'debug', 'verbose']),
    logDir: z.string(),
    maxFileSize: z.number(),
    maxFiles: z.number(),
    serviceName: z.string(),
  }),

  // 允许的来源（CORS）
  cors: z.object({
    origin: z.union([z.string(), z.array(z.string())]),
    credentials: z.boolean(),
  }),
});

// 从环境变量构建配置对象
function buildConfig() {
  const rawConfig = {
    server: {
      port: parseInt(process.env.SPEECH_SERVICE_PORT || process.env.PORT || '3001'),
      host: process.env.SPEECH_SERVICE_HOST || '0.0.0.0',
      runtimeEnv: process.env.RUNTIME_ENV || 'development',
    },
    azure: {
      speechKey: process.env.AZURE_SPEECH_KEY || '',
      speechRegion: process.env.AZURE_SPEECH_REGION || '',
      speechEndpoint: process.env.AZURE_SPEECH_ENDPOINT,
      translatorEndpoint: process.env.AZURE_TRANSLATOR_ENDPOINT
        || ((process.env.AZURE_SPEECH_REGION || '').startsWith('china')
          ? 'https://api.translator.azure.cn'
          : 'https://api.cognitive.microsofttranslator.com'),
      translatorKey: process.env.AZURE_TRANSLATOR_KEY,
      translatorRegion: process.env.AZURE_TRANSLATOR_REGION,
    },
    doubao: {
      appId: process.env.DOUBAO_TTS_APP_ID || '',
      accessToken: process.env.DOUBAO_TTS_ACCESS_TOKEN || '',
      cluster: process.env.DOUBAO_TTS_CLUSTER || 'volcano_tts',
    },
    xunfei: {
      appId: process.env.XUNFEI_APP_ID || '',
      apiKey: process.env.XUNFEI_API_KEY || '',
      apiSecret: process.env.XUNFEI_API_SECRET || '',
    },
    volcanoAst: {
      appKey: process.env.VOLCANO_AST_APP_KEY || '',
      accessKey: process.env.VOLCANO_AST_ACCESS_KEY || '',
      resourceId: process.env.VOLCANO_AST_RESOURCE_ID || 'volc.service_type.10053',
      wsUrl: process.env.VOLCANO_AST_WS_URL || 'wss://openspeech.bytedance.com/api/v4/ast/v2/translate',
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
    },
    logging: {
      level: (process.env.LOG_LEVEL || 'info') as 'error' | 'warn' | 'info' | 'debug' | 'verbose',
      logDir: process.env.LOG_DIR || 'logs',
      maxFileSize: parseInt(process.env.LOG_MAX_FILE_SIZE || '10485760'), // 10MB
      maxFiles: parseInt(process.env.LOG_MAX_FILES || '5'),
      serviceName: 'speech-service',
    },
    cors: {
      origin: process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',')
        : ['http://localhost:3000'],
      credentials: true,
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
