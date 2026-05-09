/**
 * 短 ID 生成器
 *
 * 使用 FNV-1a hash + 时间戳后缀生成短 ID
 * 保持唯一性的同时大幅缩短 ID 长度
 */

/**
 * FNV-1a hash 算法
 * 简单高效，无依赖
 */
function fnv1aHash(str: string): number {
  let hash = 2166136261; // FNV offset basis
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0; // FNV prime
  }
  return hash;
}

/**
 * 生成短 ID
 * @param uniqueKey 唯一键（如 userId_eventType_entityId）
 * @param timestamp 时间戳
 * @returns 短 ID（约 13-15 字符）
 */
export function generateShortId(uniqueKey: string, timestamp: number): string {
  const hash = fnv1aHash(uniqueKey).toString(36);
  const timePart = (timestamp % 10000000).toString(36);
  return `${hash}_${timePart}`;
}
