import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { config } from '@/config';

const { combine, timestamp, errors, colorize } = winston.format;

/** 安全 JSON 序列化，处理循环引用和 AxiosError 等复杂对象 */
function safeStringify(obj: any): string {
  const seen = new WeakSet();
  return JSON.stringify(obj, (_key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) return '[Circular]';
      seen.add(value);
    }
    // 跳过 Axios 的 request/response 大对象
    if (_key === 'request' || _key === 'config') return undefined;
    if (value instanceof Error) {
      return { message: value.message, stack: value.stack?.split('\n').slice(0, 3).join('\n') };
    }
    return value;
  });
}

// 创建logger实例
export const logger = winston.createLogger({
  level: config.logging.level,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, service, environment, ...meta }) => {
      const metaStr = Object.keys(meta).length ? ` ${safeStringify(meta)}` : '';
      return `${timestamp} [${service}] ${level.toUpperCase()}: ${message}${metaStr}`;
    })
  ),
  defaultMeta: {
    service: 'api-gateway',
    environment: config.server.runtimeEnv
  },
  transports: [
    // 错误日志 - 按日期滚动
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',              // 单个文件最大 20MB
      maxFiles: '30d',             // 保留 30 天
      createSymlink: true,         // 创建符号链接到最新文件
      symlinkName: 'error.log'     // 符号链接名称
    }),

    // 综合日志 - 按日期滚动
    new DailyRotateFile({
      filename: 'logs/api-gateway-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',              // 单个文件最大 20MB
      maxFiles: '30d',             // 保留 30 天
      createSymlink: true,         // 创建符号链接到最新文件
      symlinkName: 'api-gateway.log'  // 符号链接名称
    }),
  ],
});

// 在开发环境下也输出到控制台
if (config.server.runtimeEnv !== 'production') {
  logger.add(new winston.transports.Console({
    format: combine(
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      colorize(),
      winston.format.printf(({ timestamp, level, message, service }) => {
        return `${timestamp} [${service}] ${level}: ${message}`;
      })
    )
  }));
}

// 导出结构化日志方法
export const logInfo = (message: string, meta?: any) => {
  logger.info(message, meta);
};

export const logError = (message: string, error?: any, meta?: any) => {
  logger.error(message, { error, ...meta });
};

export const logWarn = (message: string, meta?: any) => {
  logger.warn(message, meta);
};

export const logDebug = (message: string, meta?: any) => {
  logger.debug(message, meta);
};