/**
 * 安全解析 JSON 字符串
 *
 * 解析失败时返回 fallback 值，不会抛出异常。
 * 开发模式下会打印警告日志便于排查。
 */
export function safeJsonParse<T>(json: string | null | undefined, fallback: T): T {
  if (json == null) return fallback;
  try {
    return JSON.parse(json);
  } catch {
    if (__DEV__) {
      console.warn('[safeJsonParse] Invalid JSON:', json.substring(0, 100));
    }
    return fallback;
  }
}
