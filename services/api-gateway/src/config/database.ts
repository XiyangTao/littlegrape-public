/**
 * 数据库连接 — @littlegrape/database 的 thin wrapper
 * 保留原有导出接口（prisma, connectDatabase, disconnectDatabase），
 * 26 个导入此文件的模块无需修改。
 */

import { getPrisma, disconnectDatabase as dbDisconnect } from '@littlegrape/database';
import { config } from '@/config';
import { logger } from '@/utils/logger';

export const prisma = getPrisma({ logQueries: config.database.logQueries });

export async function connectDatabase() {
  try {
    await prisma.$connect();
    logger.info('数据库连接成功');
  } catch (error) {
    logger.error('数据库连接失败:', error);
    throw error;
  }
}

export async function disconnectDatabase() {
  try {
    await dbDisconnect();
    logger.info('数据库连接已关闭');
  } catch (error) {
    logger.error('关闭数据库连接时出错:', error);
  }
}

// 注意：优雅关闭处理在 src/index.ts 中统一管理
