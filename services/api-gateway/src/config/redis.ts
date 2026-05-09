import { createClient } from 'redis';
import { config } from '@/config';
import { logger } from '@/utils/logger';

export const redisClient = createClient({
  socket: {
    host: config.redis.host,
    port: config.redis.port,
  },
  username: config.redis.username,
  password: config.redis.password,
  database: config.redis.db,
});

export async function connectRedis() {
  try {
    await redisClient.connect();
    logger.info('Redis连接成功');
  } catch (error) {
    logger.error('Redis连接失败:', error);
    throw error;
  }
}

export async function disconnectRedis() {
  try {
    await redisClient.disconnect();
    logger.info('Redis连接已关闭');
  } catch (error) {
    logger.error('关闭Redis连接时出错:', error);
  }
}

// 注意：优雅关闭处理在 src/index.ts 中统一管理