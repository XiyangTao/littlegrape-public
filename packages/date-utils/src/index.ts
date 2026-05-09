/**
 * @littlegrape/date-utils
 * 中国时区日期工具 — 服务端统一日期处理层
 *
 * 全局约定：
 *   - 服务端所有"日期"概念均以 Asia/Shanghai 为准
 *   - 禁止直接 new Date("YYYY-MM-DD")（会按 UTC 解析）
 *   - 禁止 new Date().toISOString().split('T')[0]（返回 UTC 日期）
 *   - 使用本包导出的函数替代上述模式
 */

const CN_TZ = 'Asia/Shanghai';
const DATE_FMT = new Intl.DateTimeFormat('en-CA', { timeZone: CN_TZ });

// ============ 日期字符串（YYYY-MM-DD，中国时区） ============

/** 当前中国日期 YYYY-MM-DD */
export function getTodayCN(): string {
  return DATE_FMT.format(new Date());
}

/** 昨天中国日期 */
export function getYesterdayCN(): string {
  return getNDaysAgoCN(1);
}

/** N 天前的中国日期（n 为负数时表示未来） */
export function getNDaysAgoCN(n: number): string {
  return DATE_FMT.format(new Date(Date.now() - n * 86_400_000));
}

/** 当前中国月份 YYYY-MM */
export function getMonthCN(): string {
  return getTodayCN().slice(0, 7);
}

/** 将 Date 格式化为中国日期 YYYY-MM-DD */
export function formatDateCN(date: Date): string {
  return DATE_FMT.format(date);
}

/** 日期字符串回退一天（正确处理跨月/跨年/闰年） */
export function prevDateCN(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00+08:00');
  d.setDate(d.getDate() - 1);
  return DATE_FMT.format(d);
}

// ============ Date 对象（UTC 时间点，用于 DB datetime 比较） ============

/** 北京时间今天 00:00 对应的 UTC Date */
export function getTodayStartCN(): Date {
  return new Date(getTodayCN() + 'T00:00:00+08:00');
}

/** 北京时间明天 00:00 对应的 UTC Date */
export function getTomorrowStartCN(): Date {
  return new Date(getNDaysAgoCN(-1) + 'T00:00:00+08:00');
}

/** 到北京时间明天 00:00 的剩余秒数（用于 Redis TTL） */
export function secondsUntilTomorrowCN(): number {
  return Math.ceil((getTomorrowStartCN().getTime() - Date.now()) / 1000);
}

// ============ 安全日期解析 ============

/**
 * 安全解析 YYYY-MM-DD 为北京时间 Date
 * 避免 new Date("YYYY-MM-DD") 被按 UTC 解析的陷阱
 */
export function parseDateCN(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00+08:00');
}

/**
 * 两个 YYYY-MM-DD 日期字符串之间的天数差（绝对值）
 * 使用北京时区解析，避免 UTC 偏移问题
 */
export function dateDiffDays(date1: string, date2: string): number {
  const d1 = parseDateCN(date1);
  const d2 = parseDateCN(date2);
  return Math.abs(Math.round((d2.getTime() - d1.getTime()) / 86_400_000));
}

// ============ 格式化 ============

/**
 * 北京时间 MM-DD（用 formatToParts 保证格式稳定）
 * 用于生日匹配等场景
 */
export function formatMonthDayCN(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CN_TZ,
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const mm = parts.find(p => p.type === 'month')!.value;
  const dd = parts.find(p => p.type === 'day')!.value;
  return `${mm}-${dd}`;
}

/**
 * 北京时间 YYMMDDHHmmss（用于订单号等需要时间戳标识的场景）
 */
export function formatDateTimeCN(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CN_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find(p => p.type === type)!.value;
  return `${get('year').slice(2)}${get('month')}${get('day')}${get('hour')}${get('minute')}${get('second')}`;
}

/**
 * 北京时间当前小时数 0-23
 * 用于推送静默时段判断等场景
 */
export function getCurrentHourCN(): number {
  return parseInt(
    new Intl.DateTimeFormat('en-US', {
      timeZone: CN_TZ,
      hour: 'numeric',
      hour12: false,
    }).format(new Date()),
  );
}
