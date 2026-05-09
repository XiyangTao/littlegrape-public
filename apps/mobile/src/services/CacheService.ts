/**
 * 缓存管理服务
 *
 * 统一管理应用中的各类缓存：
 * - 音频缓存（TTS、单词发音等）
 * - 图片缓存
 * - 其他临时文件
 *
 * 提供功能：
 * - 获取缓存大小
 * - 清除缓存
 * - 缓存文件管理
 */

import { Directory, File, Paths } from 'expo-file-system';

// 缓存目录配置
const CACHE_DIRS = {
  audio: 'audio',        // 音频缓存（TTS、单词发音）
  images: 'images',      // 图片缓存
  temp: 'temp',          // 临时文件
} as const;

type CacheType = keyof typeof CACHE_DIRS;

// 缓存信息
export interface CacheInfo {
  totalSize: number;           // 总大小（字节）
  totalSizeFormatted: string;  // 格式化的大小字符串
  details: {
    type: CacheType;
    size: number;
    sizeFormatted: string;
    fileCount: number;
  }[];
}

/**
 * 格式化文件大小
 */
function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = bytes / Math.pow(k, i);

  return `${size.toFixed(i > 0 ? 2 : 0)} ${units[i]}`;
}

/**
 * 获取指定目录的大小和文件数量
 */
function getDirectorySize(dir: Directory): { size: number; fileCount: number } {
  let totalSize = 0;
  let fileCount = 0;

  if (!dir.exists) {
    return { size: 0, fileCount: 0 };
  }

  try {
    const items = dir.list();

    for (const item of items) {
      if (item instanceof File) {
        const info = item.info();
        if (info.exists && info.size) {
          totalSize += info.size;
          fileCount++;
        }
      } else if (item instanceof Directory) {
        // 递归计算子目录
        const subResult = getDirectorySize(item);
        totalSize += subResult.size;
        fileCount += subResult.fileCount;
      }
    }
  } catch (error) {
    console.error('[CacheService] 计算目录大小失败:', error instanceof Error ? error.message : error);
  }

  return { size: totalSize, fileCount };
}

/**
 * 获取缓存目录
 */
function getCacheDir(type: CacheType): Directory {
  return new Directory(Paths.cache, CACHE_DIRS[type]);
}

/**
 * 确保缓存目录存在
 */
export function ensureCacheDir(type: CacheType): Directory {
  const dir = getCacheDir(type);
  if (!dir.exists) {
    dir.create();
  }
  return dir;
}

/**
 * 获取缓存文件路径
 */
export function getCacheFile(type: CacheType, filename: string): File {
  return new File(Paths.cache, CACHE_DIRS[type], filename);
}

/**
 * 简单的字符串 hash 函数
 */
export function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

/**
 * 获取基于内容 hash 的缓存文件
 */
export function getHashedCacheFile(type: CacheType, content: string, extension: string = ''): File {
  const hash = hashString(content);
  const filename = extension ? `${hash}.${extension}` : hash;
  return getCacheFile(type, filename);
}

/**
 * 获取缓存信息
 */
export async function getCacheInfo(): Promise<CacheInfo> {
  const details: CacheInfo['details'] = [];
  let totalSize = 0;

  for (const [type, dirName] of Object.entries(CACHE_DIRS)) {
    const dir = new Directory(Paths.cache, dirName);
    const { size, fileCount } = getDirectorySize(dir);

    details.push({
      type: type as CacheType,
      size,
      sizeFormatted: formatSize(size),
      fileCount,
    });

    totalSize += size;
  }

  return {
    totalSize,
    totalSizeFormatted: formatSize(totalSize),
    details,
  };
}

/**
 * 清除指定类型的缓存
 */
export async function clearCache(type: CacheType): Promise<void> {
  const dir = getCacheDir(type);

  if (dir.exists) {
    try {
      dir.delete();
      if (__DEV__) console.log(`[CacheService] 已清除${type}缓存`);
    } catch (error) {
      console.error(`[CacheService] 清除${type}缓存失败:`, error instanceof Error ? error.message : error);
      throw error;
    }
  }
}

/**
 * 清除所有缓存
 */
export async function clearAllCache(): Promise<void> {
  const errors: string[] = [];

  for (const type of Object.keys(CACHE_DIRS) as CacheType[]) {
    try {
      await clearCache(type);
    } catch (error) {
      errors.push(`${type}: ${error}`);
    }
  }

  if (errors.length > 0) {
    console.error('[CacheService] 部分缓存清除失败:', errors);
    throw new Error(`部分缓存清除失败: ${errors.join(', ')}`);
  }

  if (__DEV__) console.log('[CacheService] 所有缓存已清除');
}

/**
 * 清理旧缓存文件（保留最新的 N 个）
 */
export async function cleanupOldCache(type: CacheType, maxFiles: number): Promise<number> {
  const dir = getCacheDir(type);

  if (!dir.exists) return 0;

  try {
    const items = dir.list();
    const files = items.filter((item): item is File => item instanceof File);

    if (files.length <= maxFiles) return 0;

    // 获取文件信息并按修改时间排序
    const fileInfos = files.map(file => {
      const info = file.info();
      return { file, modTime: info.exists ? (info.modificationTime || 0) : 0 };
    });

    // 按修改时间排序，删除最旧的文件
    fileInfos.sort((a, b) => a.modTime - b.modTime);
    const filesToDelete = fileInfos.slice(0, files.length - maxFiles);

    for (const { file } of filesToDelete) {
      file.delete();
    }

    if (__DEV__) console.log(`[CacheService] 已清理${filesToDelete.length}个过期${type}缓存文件`);
    return filesToDelete.length;
  } catch (error) {
    console.error(`[CacheService] 清理${type}缓存失败:`, error instanceof Error ? error.message : error);
    return 0;
  }
}

// 默认导出
export default {
  getCacheInfo,
  clearCache,
  clearAllCache,
  cleanupOldCache,
  ensureCacheDir,
  getCacheFile,
  getHashedCacheFile,
  hashString,
  formatSize,
};
