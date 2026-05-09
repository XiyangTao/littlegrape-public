import { createClient } from 'redis';
import { logger } from '@/utils/logger';
import { config } from '@/config';

// Redis客户端实例
export let redisClient: ReturnType<typeof createClient> | null = null;

// 初始化Redis连接
export async function initializeRedis() {
  try {
    redisClient = createClient({
      socket: {
        host: config.redis.host,
        port: config.redis.port,
        reconnectStrategy: (retries) => {
          if (retries > 3) {
            logger.error('Redis connection failed after 3 retries');
            return false;
          }
          return Math.min(retries * 1000, 3000);
        }
      },
      ...(config.redis.password && { password: config.redis.password }),
      database: config.redis.db
    });

    redisClient.on('error', (error) => {
      logger.error('Redis client error:', error);
    });

    redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready');
    });

    redisClient.on('reconnecting', () => {
      logger.warn('Redis client reconnecting');
    });

    await redisClient.connect();
    logger.info('Redis initialized successfully');
  } catch (error) {
    logger.warn('Redis initialization failed, caching disabled:', error);
    redisClient = null;
  }
}

// Redis缓存工具类
export class RedisCache {
  private client: ReturnType<typeof createClient> | null;

  constructor(client: ReturnType<typeof createClient> | null = null) {
    this.client = client || redisClient;
  }

  async get(key: string): Promise<string | null> {
    if (!this.client) return null;

    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<boolean> {
    if (!this.client) return false;

    try {
      if (ttl) {
        await this.client.setEx(key, ttl, value);
      } else {
        await this.client.set(key, value);
      }
      return true;
    } catch (error) {
      logger.error(`Redis SET error for key ${key}:`, error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error(`Redis DEL error for key ${key}:`, error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  async setWithExpiry(key: string, value: string, seconds: number): Promise<boolean> {
    if (!this.client) return false;

    try {
      await this.client.setEx(key, seconds, value);
      return true;
    } catch (error) {
      logger.error(`Redis SETEX error for key ${key}:`, error);
      return false;
    }
  }

  async increment(key: string, by: number = 1): Promise<number | null> {
    if (!this.client) return null;

    try {
      if (by === 1) {
        return await this.client.incr(key);
      } else {
        return await this.client.incrBy(key, by);
      }
    } catch (error) {
      logger.error(`Redis INCR error for key ${key}:`, error);
      return null;
    }
  }

  async getHash(key: string): Promise<Record<string, string> | null> {
    if (!this.client) return null;

    try {
      return await this.client.hGetAll(key);
    } catch (error) {
      logger.error(`Redis HGETALL error for key ${key}:`, error);
      return null;
    }
  }

  async setHash(key: string, hash: Record<string, string>): Promise<boolean> {
    if (!this.client) return false;

    try {
      await this.client.hSet(key, hash);
      return true;
    } catch (error) {
      logger.error(`Redis HSET error for key ${key}:`, error);
      return false;
    }
  }
}

// 获取Redis客户端实例
export function getRedisClient() {
  return redisClient;
}

// 获取缓存工具实例
export function getCache() {
  return new RedisCache();
}

// 初始化Redis（在应用启动时调用）
initializeRedis().catch(error => {
  logger.error('Failed to initialize Redis:', error);
});