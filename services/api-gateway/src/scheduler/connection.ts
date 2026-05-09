/**
 * BullMQ 专用 ioredis 连接
 * 与现有 node-redis redisClient 共存，连同一个 Redis 实例
 */

import Redis from 'ioredis';
import { config } from '@/config';

export const redisConnection = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  username: config.redis.username,
  password: config.redis.password,
  db: config.redis.db,
  maxRetriesPerRequest: null, // BullMQ 要求
});
