/**
 * 数据库模块统一导出
 */

// 数据库管理器
export {
  getDatabase,
  closeDatabase,
  resetDatabase,
  getDatabaseInfo,
  runSerialWrite,
  ensureWordsData,
} from './DatabaseManager';

// 迁移相关
export {
  CURRENT_VERSION,
  runMigrations,
  getDatabaseVersion,
  tableExists,
  columnExists,
  addColumnIfNotExists,
} from './migrations';
export type { Migration } from './migrations';

// 会话数据库
export * from './ConversationDB';

// 单词数据库
export * from './WordDB';
