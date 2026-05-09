/**
 * 日期工具（Mobile 端）
 * 统一使用 Asia/Shanghai 时区，与后端保持一致
 *
 * 约定：
 *   - 禁止直接 new Date("YYYY-MM-DD")（会按 UTC 解析，可能偏移一天）
 *   - 解析日期字符串统一使用 parseLocalDate()
 *   - 解析服务端时间戳统一使用 parseUTCTimestamp()
 */

const CN_TZ = 'Asia/Shanghai';
const PARTS_FMT = new Intl.DateTimeFormat('en-US', {
  timeZone: CN_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** 北京时间日期字符串 YYYY-MM-DD（用 formatToParts 保证格式确定性） */
export function getLocalDateString(timestamp: number = Date.now()): string {
  const parts = PARTS_FMT.formatToParts(new Date(timestamp));
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** 日期显示（如 "2026年2月28日"），支持 YYYY-MM-DD 和 ISO 时间戳 */
export function formatDateDisplay(date: Date | string): string {
  let d: Date;
  if (typeof date === 'string') {
    d = date.includes('T') ? parseUTCTimestamp(date) : parseLocalDate(date);
  } else {
    d = date;
  }
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric',
    timeZone: CN_TZ,
  });
}

/**
 * 安全解析 YYYY-MM-DD 为北京时间午夜的 Date
 * 避免 new Date("YYYY-MM-DD") 被按 UTC 解析的陷阱
 */
export function parseLocalDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00+08:00');
}

/**
 * 解析 UTC 时间字符串
 * 服务器可能返回不带 Z 后缀的 UTC 时间（如 Python datetime.utcnow().isoformat()）
 */
export function parseUTCTimestamp(timestamp: string): Date {
  if (timestamp.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(timestamp)) {
    return new Date(timestamp);
  }
  return new Date(timestamp + 'Z');
}

/** 北京时间今天 00:00:00 的 UTC 毫秒时间戳，用于 SQLite 查询 */
export function getTodayStartTimestamp(): number {
  return parseLocalDate(getLocalDateString()).getTime();
}

/** 判断两个时间戳是否在北京时间同一天 */
export function isSameDayCN(t1: number, t2: number): boolean {
  return getLocalDateString(t1) === getLocalDateString(t2);
}
