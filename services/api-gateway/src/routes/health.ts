import express from 'express';
import { prisma } from '@/config/database';
import { redisClient } from '@/config/redis';
import { config } from '@/config';
import { logger } from '@/utils/logger';

const router = express.Router();

/**
 * 健康检查端点
 * GET /health
 */
router.get('/', async (req, res) => {
  const startTime = Date.now();
  let dbStatus = 'available';
  let redisStatus = 'available';

  // 检查数据库连接
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    dbStatus = 'unavailable';
    logger.warn('Database health check failed:', error);
  }

  // 检查Redis连接
  try {
    await redisClient.ping();
  } catch (error) {
    redisStatus = 'unavailable';
    logger.warn('Redis health check failed:', error);
  }

  const isHealthy = dbStatus === 'available' && redisStatus === 'available';
  const checkDuration = Date.now() - startTime;

  const healthData = {
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: config.server.runtimeEnv,
    checkDuration: `${checkDuration}ms`,
    services: {
      api_gateway: 'running',
      database: dbStatus,
      redis: redisStatus
    }
  };

  // 记录健康检查结果
  if (isHealthy) {
    logger.debug('Health check passed', healthData);
  } else {
    logger.warn('Health check failed', healthData);
  }

  res.status(isHealthy ? 200 : 503).json(healthData);
});

export default router;