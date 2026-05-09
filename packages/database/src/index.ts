import { PrismaClient } from '@prisma/client';

// 重新导出所有 Prisma 类型，消费者不需要直接依赖 @prisma/client
export { PrismaClient } from '@prisma/client';
export * from '@prisma/client';

export interface DatabaseOptions {
  logQueries?: boolean;
  /** 连接池大小，默认 20（Prisma 默认仅 num_cpus*2+1 ≈ 5，对高并发不足） */
  connectionLimit?: number;
}

let _prisma: PrismaClient | null = null;

/** 获取 PrismaClient 单例 */
export function getPrisma(options?: DatabaseOptions): PrismaClient {
  if (!_prisma) {
    const baseUrl = process.env.POSTGRES_DATABASE_URL || '';
    const limit = options?.connectionLimit ?? 20;
    const separator = baseUrl.includes('?') ? '&' : '?';
    const pooledUrl = `${baseUrl}${separator}connection_limit=${limit}`;

    _prisma = new PrismaClient({
      log: options?.logQueries ? ['query', 'info', 'warn', 'error'] : ['error'],
      datasources: { db: { url: pooledUrl } },
    });
  }
  return _prisma;
}

/** 连接数据库 */
export async function connectDatabase(options?: DatabaseOptions): Promise<PrismaClient> {
  const prisma = getPrisma(options);
  await prisma.$connect();
  return prisma;
}

/** 断开连接 */
export async function disconnectDatabase(): Promise<void> {
  if (_prisma) {
    await _prisma.$disconnect();
    _prisma = null;
  }
}
