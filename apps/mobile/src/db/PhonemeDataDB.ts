import { getDatabase, runSerialWrite } from './DatabaseManager';
import { apiClient } from '@/api';
import type { PhonemeCategory } from '@/data/phonemes';

// ==================== 查询操作 ====================

/**
 * 读取缓存的音素数据
 */
export async function getCachedPhonemeData(): Promise<{
  version: number;
  categories: PhonemeCategory[];
} | null> {
  const db = await getDatabase();
  const result = await db.execute(
    'SELECT version, data_json FROM phoneme_data_cache WHERE id = ?',
    [1]
  );

  const row = result.rows[0] as any | undefined;
  if (!row) return null;

  try {
    return {
      version: row.version,
      categories: JSON.parse(row.data_json),
    };
  } catch {
    return null;
  }
}

/**
 * 读取缓存版本号（用于 API 请求参数）
 */
export async function getCachedPhonemeVersion(): Promise<number> {
  const db = await getDatabase();
  const result = await db.execute(
    'SELECT version FROM phoneme_data_cache WHERE id = ?',
    [1]
  );

  const row = result.rows[0] as any | undefined;
  return row?.version ?? 0;
}

// ==================== 写入操作 ====================

/**
 * 写入/更新音素数据缓存
 */
export async function cachePhonemeData(
  version: number,
  categories: PhonemeCategory[]
): Promise<void> {
  return runSerialWrite(async () => {
    const db = await getDatabase();
    const now = Date.now();
    const dataJson = JSON.stringify(categories);

    await db.execute(
      `INSERT INTO phoneme_data_cache (id, version, data_json, cached_at)
       VALUES (1, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         version = excluded.version,
         data_json = excluded.data_json,
         cached_at = excluded.cached_at`,
      [version, dataJson, now]
    );
  });
}

// ==================== 同步操作 ====================

/**
 * 完整的同步流程：读缓存版本号 → 调 API → 有新数据则更新缓存
 * 在 AppStore.loadAuthenticatedResources() 中调用
 */
export async function syncPhonemeData(): Promise<void> {
  try {
    const cachedVersion = await getCachedPhonemeVersion();
    const response = await apiClient.getPhonemeData(cachedVersion);

    if (response.success && response.data.categories) {
      await cachePhonemeData(response.data.version, response.data.categories);
    }
  } catch (error) {
    console.error('[PhonemeDataDB] 同步音素数据失败:', error);
  }
}
