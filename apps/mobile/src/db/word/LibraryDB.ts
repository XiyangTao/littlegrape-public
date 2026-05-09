import { getDatabase } from '../DatabaseManager';
import { rowToLibraryInfo } from './helpers';

// 初始化函数（保留用于兼容，实际迁移由 DatabaseManager 处理）
export async function initWordDatabase(): Promise<void> {
  await getDatabase();
}

// 获取所有可用词库
export async function getAllAvailableLibraries(): Promise<{ tag: string; wordCount: number }[]> {
  const db = await getDatabase();
  const result = await db.execute(
    'SELECT tag, word_count FROM library_info ORDER BY word_count DESC'
  );
  return (result.rows as any[]).map(rowToLibraryInfo);
}
