import winston from 'winston';
import { config } from '@/config';
import path from 'path';

const { combine, timestamp, errors, json, colorize } = winston.format;

// 创建logger实例
export const logger = winston.createLogger({
  level: config.logging.level,
  format: combine(
    timestamp(),
    errors({ stack: true }),
    json()
  ),
  defaultMeta: {
    service: config.logging.serviceName,
    environment: config.server.runtimeEnv
  },
  transports: [
    // 写入错误日志到文件
    new winston.transports.File({
      filename: path.join(config.logging.logDir, 'error.log'),
      level: 'error',
      maxsize: config.logging.maxFileSize,
      maxFiles: config.logging.maxFiles
    }),
    // 写入所有日志到文件
    new winston.transports.File({
      filename: path.join(config.logging.logDir, 'combined.log'),
      maxsize: config.logging.maxFileSize,
      maxFiles: config.logging.maxFiles
    }),
    // 同时输出到控制台（所有环境）
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          let metaStr = '';
          if (Object.keys(meta).length) {
            try {
              metaStr = ` ${JSON.stringify(meta)}`;
            } catch {
              const seen = new WeakSet();
              metaStr = ` ${JSON.stringify(meta, (_, v) => {
                if (typeof v === 'object' && v !== null) {
                  if (seen.has(v)) return '[Circular]';
                  seen.add(v);
                }
                return v;
              })}`;
            }
          }
          return `${timestamp} [${level}]: ${message}${metaStr}`;
        })
      )
    })
  ],
});