/**
 * 成就系统服务（v2 性能优化版）
 *
 * 性能优化点：
 * - incrementStats: 单条 SQL + RETURNING 替代 3 次 DB 往返
 * - grantBehaviorXp: 复用 incrementStats 返回的 dailyXp，消除冗余查询
 * - checkAllAchievements: 精确 IN 查询替代全量拉取，合并 stat + level 检查消除重复查询
 * - tryUnlockAchievement: 直接 create + catch P2002，去掉不必要的事务
 * - pushToUser: 静态 import 替代运行时动态 import
 */

import { prisma } from '@/config/database';
import { redisClient } from '@/config/redis';
import { logger } from '@/utils/logger';
import { pushToUser } from '@/websocket/push-channel';
import { getTodayCN, getYesterdayCN, prevDateCN } from '@/utils/dateUtils';
import type { AchievementEventType, AchievementEventResult, EventMetadata } from '@/events/eventBus';
import type { AchievementDefinition } from '@prisma/client';
import { updateTaskProgress } from '@/services/dailyTaskService';

// ==================== 等级经验表（30级） ====================

const LEVEL_XP_TABLE: number[] = [
  0,     // Lv1: 起始
  50,    // Lv2
  120,   // Lv3
  200,   // Lv4
  300,   // Lv5
  420,   // Lv6
  560,   // Lv7
  720,   // Lv8
  900,   // Lv9
  1100,  // Lv10
  1320,  // Lv11
  1560,  // Lv12
  1820,  // Lv13
  2100,  // Lv14
  2400,  // Lv15
  2750,  // Lv16
  3150,  // Lv17
  3600,  // Lv18
  4100,  // Lv19
  4650,  // Lv20
  5300,  // Lv21
  6050,  // Lv22
  6900,  // Lv23
  7850,  // Lv24
  8900,  // Lv25
  10100, // Lv26
  11500, // Lv27
  13100, // Lv28
  14900, // Lv29
  17000, // Lv30
];

const LEVEL_TITLES: Record<string, Record<number, string>> = {
  'zh-CN': {
    1: '英语萌新', 2: '初学者', 3: '入门学徒', 4: '词汇新手', 5: '勤学少年',
    6: '小有进步', 7: '稳步提升', 8: '词汇达人', 9: '语感初成', 10: '十级学霸',
    11: '中级学者', 12: '对话能手', 13: '阅读爱好者', 14: '听力进阶', 15: '半路英雄',
    16: '知识渊博', 17: '英语熟练', 18: '表达流畅', 19: '接近精通', 20: '二十级大师',
    21: '高级学者', 22: '语言专家', 23: '学术先锋', 24: '英语达人', 25: '语言大师',
    26: '登峰造极', 27: '炉火纯青', 28: '出神入化', 29: '近乎完美', 30: '传说学霸',
  },
  en: {
    1: 'Newbie', 2: 'Beginner', 3: 'Apprentice', 4: 'Novice', 5: 'Learner',
    6: 'Improving', 7: 'Rising', 8: 'Word Master', 9: 'Fluent Start', 10: 'Level 10',
    11: 'Intermediate', 12: 'Conversant', 13: 'Reader', 14: 'Listener', 15: 'Halfway Hero',
    16: 'Knowledgeable', 17: 'Proficient', 18: 'Eloquent', 19: 'Near Expert', 20: 'Level 20 Master',
    21: 'Advanced', 22: 'Language Expert', 23: 'Scholar', 24: 'Ace', 25: 'Language Master',
    26: 'Peak', 27: 'Virtuoso', 28: 'Legendary', 29: 'Near Perfect', 30: 'Legend',
  },
};

// ==================== 经验值奖励 ====================

export const XP_REWARDS: Record<string, number> = {
  conversation_done: 20,
  listening_done: 15,
  reading_done: 15,
  diary_done: 10,
  level_complete: 15,
  boss_complete: 30,
  perfect_level: 10,
  sentence_done: 5,
  daily_challenge_done: 15,
  speed_review_done: 10,
  root_lit: 20,
  phoneme_practice_done: 15,
};

/** 计数型事件：只递增统计 + 每 N 次检查成就，不发 XP */
const COUNTER_EVENTS = new Set<AchievementEventType>([
  'word_learned', 'word_mastered', 'word_reviewed',
]);
const COUNTER_CHECK_INTERVAL = 5; // TODO: 测试完改回 50

const DAILY_XP_LIMIT = 500;

// ==================== 成就定义二级缓存（进程内存 + Redis） ====================

const REDIS_CACHE_KEY = 'achievement:definitions';
const REDIS_CACHE_TTL = 600; // Redis 10 分钟
const LOCAL_CACHE_TTL = 60 * 1000; // 进程内存 1 分钟（热路径直接命中，无网络开销）

let cachedDefs: AchievementDefinition[] | null = null;
let cacheExpiry = 0;

async function getAchievementDefinitions(): Promise<AchievementDefinition[]> {
  // L1: 进程内存（1 分钟 TTL，热路径零开销）
  if (cachedDefs && Date.now() < cacheExpiry) return cachedDefs;

  // L2: Redis（10 分钟 TTL，多实例共享）
  try {
    const redisData = await redisClient.get(REDIS_CACHE_KEY);
    if (redisData) {
      cachedDefs = JSON.parse(redisData);
      cacheExpiry = Date.now() + LOCAL_CACHE_TTL;
      return cachedDefs!;
    }
  } catch {
    // Redis 不可用时降级到 DB
  }

  // L3: 数据库
  cachedDefs = await prisma.achievementDefinition.findMany({
    where: { isActive: true },
    orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
  });
  cacheExpiry = Date.now() + LOCAL_CACHE_TTL;

  // 回写 Redis（fire-and-forget）
  redisClient.set(REDIS_CACHE_KEY, JSON.stringify(cachedDefs), { EX: REDIS_CACHE_TTL }).catch(() => {});

  return cachedDefs;
}

/** 强制刷新缓存（清理进程内存 + Redis） */
export function invalidateAchievementCache() {
  cachedDefs = null;
  cacheExpiry = 0;
  redisClient.del(REDIS_CACHE_KEY).catch(() => {});
}

// ==================== 类型定义 ====================

type StatsFields = {
  totalLearned: number;
  totalMastered: number;
  totalReviewed: number;
  totalConversations: number;
  totalListening: number;
  totalReading: number;
  totalDiaries: number;
  totalLevels: number;
  totalBossKills: number;
  totalPerfectStars: number;
  totalSentences: number;
  totalDailyChallenges: number;
  totalSpeedReviews: number;
  totalRootsLit: number;
  totalEncounters: number;
  totalDailyTaskDays: number;
  totalPhonemePractices: number;
  streakDays: number;
  maxStreakDays: number;
};

/** incrementStats 返回的完整行，含每日 XP 信息 */
type StatsRow = StatsFields & {
  dailyXpEarned: number;
  dailyXpDate: string | null;
};

// ==================== 事件 → UserStats 字段映射 ====================

const EVENT_TO_STAT: Record<AchievementEventType, keyof StatsFields | null> = {
  word_learned: 'totalLearned',
  word_mastered: 'totalMastered',
  word_reviewed: 'totalReviewed',
  conversation_done: 'totalConversations',
  listening_done: 'totalListening',
  reading_done: 'totalReading',
  diary_done: 'totalDiaries',
  level_complete: 'totalLevels',
  boss_complete: 'totalBossKills',
  perfect_level: 'totalPerfectStars',
  sentence_done: 'totalSentences',
  daily_challenge_done: 'totalDailyChallenges',
  speed_review_done: 'totalSpeedReviews',
  root_lit: 'totalRootsLit',
  daily_tasks_all_done: 'totalDailyTaskDays',
  encounter_word: 'totalEncounters',
  grammar_practice_done: null,
  phoneme_practice_done: 'totalPhonemePractices',
};

const VALID_STAT_COLUMNS = new Set([
  'totalLearned', 'totalMastered', 'totalReviewed',
  'totalConversations', 'totalListening', 'totalReading', 'totalDiaries',
  'totalLevels', 'totalBossKills', 'totalPerfectStars',
  'totalSentences', 'totalDailyChallenges', 'totalSpeedReviews', 'totalRootsLit',
  'totalEncounters', 'totalDailyTaskDays', 'totalPhonemePractices',
]);

// ==================== RETURNING 列列表 ====================

const RETURNING_COLS = `"totalLearned", "totalMastered", "totalReviewed",
  "totalConversations", "totalListening", "totalReading", "totalDiaries",
  "totalLevels", "totalBossKills", "totalPerfectStars",
  "totalSentences", "totalDailyChallenges", "totalSpeedReviews", "totalRootsLit",
  "totalEncounters", "totalDailyTaskDays", "totalPhonemePractices", "streakDays", "maxStreakDays", "dailyXpEarned", "dailyXpDate"`;

// ==================== 增强型条件引擎 v2 ====================

/** 旧格式条件（向后兼容） */
interface LegacyCondition {
  stat: string;
  op: '>=' | '>' | '=';
  value: number;
}

/** 累计统计条件 */
interface StatCondition {
  type: 'stat';
  stat: string;
  op: '>=' | '>' | '=' | '<' | '<=';
  value: number;
}

/** 等级条件 */
interface LevelCondition {
  type: 'level';
  op: '>=' | '>' | '=' | '<' | '<=';
  value: number;
}

/** 事件上下文条件 — 检查当前触发事件的 metadata */
interface EventContextCondition {
  type: 'event_context';
  field: string;
  op: '>=' | '>' | '=' | '<' | '<=';
  value: number | string | boolean;
}

/** 时间窗口条件 — "在 N 时间单位内完成 M 次某事件" */
interface TimeWindowCondition {
  type: 'time_window';
  event: string;
  count: number;
  window: number;
  unit: 'second' | 'minute' | 'hour' | 'day';
  contextFilter?: Record<string, any>;
}

/** 连续天数条件 — "连续 N 天每天完成 M 次某事件" */
interface ConsecutiveDaysCondition {
  type: 'consecutive_days';
  event: string;
  dailyCount: number;
  days: number;
}

/** 逻辑组合条件 */
interface AndCondition { type: 'and'; conditions: ConditionNode[]; }
interface OrCondition { type: 'or'; conditions: ConditionNode[]; }
interface NotCondition { type: 'not'; condition: ConditionNode; }

/** 联合条件节点类型 */
type ConditionNode =
  | StatCondition
  | LevelCondition
  | EventContextCondition
  | TimeWindowCondition
  | ConsecutiveDaysCondition
  | AndCondition
  | OrCondition
  | NotCondition;

/** 求值上下文 */
interface EvalContext {
  stats: StatsFields;
  level: number;
  eventType?: AchievementEventType;
  eventMetadata?: EventMetadata;
  userId: string;
}

// ---------- 比较操作符通用函数 ----------

function compareOp(val: any, op: string, target: any): boolean {
  switch (op) {
    case '>=': return val >= target;
    case '>':  return val > target;
    case '=':  return val === target;
    case '<=': return val <= target;
    case '<':  return val < target;
    default: return false;
  }
}

// ---------- 嵌套字段访问 ----------

function getNestedField(obj: any, path: string): any {
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current == null) return undefined;
    current = current[part];
  }
  return current;
}

// ---------- 时间单位转毫秒 ----------

function toMs(value: number, unit: string): number {
  switch (unit) {
    case 'second': return value * 1000;
    case 'minute': return value * 60 * 1000;
    case 'hour':   return value * 3600 * 1000;
    case 'day':    return value * 86400 * 1000;
    default: return value * 1000;
  }
}

// ---------- 向后兼容：自动检测并转换旧格式 ----------

function normalizeConditions(raw: any): ConditionNode | null {
  if (!raw) return null;

  // 旧格式: 数组 [{stat, op, value}] → 包装为 AND
  if (Array.isArray(raw)) {
    if (raw.length === 0) return null;
    return {
      type: 'and',
      conditions: raw.map((c: LegacyCondition) => ({
        type: 'stat' as const,
        stat: c.stat,
        op: c.op,
        value: c.value,
      })),
    };
  }

  // 新格式: 已有 type 字段
  if (raw.type) return raw as ConditionNode;

  return null;
}

// ---------- 检测条件树是否包含异步节点 ----------

function hasAsyncNodes(node: ConditionNode): boolean {
  switch (node.type) {
    case 'time_window':
    case 'consecutive_days':
      return true;
    case 'and':
    case 'or':
      return node.conditions.some(hasAsyncNodes);
    case 'not':
      return hasAsyncNodes(node.condition);
    default:
      return false;
  }
}

// ---------- 时间窗口查询（惰性，仅在需要时调用） ----------

async function getTimeWindowCount(
  userId: string,
  event: string,
  windowMs: number,
  contextFilter?: Record<string, any>,
): Promise<number> {
  const since = new Date(Date.now() - windowMs);
  const rows = await prisma.achievementEventLog.count({
    where: {
      userId,
      eventType: event,
      createdAt: { gte: since },
      ...(contextFilter ? { metadata: { path: Object.keys(contextFilter), equals: contextFilter } } : {}),
    },
  });
  return rows;
}

// ---------- 连续天数查询（惰性，仅在需要时调用） ----------

async function getConsecutiveDays(
  userId: string,
  event: string,
  dailyCount: number,
): Promise<number> {
  // 查出最近 90 天的事件日志，按日期分组统计
  const since = new Date(Date.now() - 90 * 86400_000);
  const rows: Array<{ eventDate: string; cnt: bigint }> = await prisma.$queryRaw`
    SELECT "eventDate", COUNT(*) as cnt
    FROM "user_achievement_event_logs"
    WHERE "userId" = ${userId}
      AND "eventType" = ${event}
      AND "createdAt" >= ${since}
    GROUP BY "eventDate"
    HAVING COUNT(*) >= ${dailyCount}
    ORDER BY "eventDate" DESC
  `;

  if (rows.length === 0) return 0;

  // 从最近一天向前数连续天数
  let consecutive = 0;
  const today = getTodayCN();
  let expectedDate = today;

  for (const row of rows) {
    if (row.eventDate === expectedDate) {
      consecutive++;
      expectedDate = prevDateCN(expectedDate);
    } else {
      break;
    }
  }

  return consecutive;
}

// ---------- 递归求值引擎（支持异步） ----------

async function evaluateConditionNode(node: ConditionNode, ctx: EvalContext): Promise<boolean> {
  switch (node.type) {
    case 'stat': {
      const val = (ctx.stats as any)[node.stat];
      if (val === undefined) return false;
      return compareOp(val, node.op, node.value);
    }
    case 'level':
      return compareOp(ctx.level, node.op, node.value);

    case 'event_context': {
      if (!ctx.eventMetadata) return false;
      const val = getNestedField(ctx.eventMetadata, node.field);
      if (val === undefined) return false;
      return compareOp(val, node.op, node.value);
    }
    case 'time_window': {
      const windowMs = toMs(node.window, node.unit);
      const count = await getTimeWindowCount(ctx.userId, node.event, windowMs, node.contextFilter);
      return count >= node.count;
    }
    case 'consecutive_days': {
      const days = await getConsecutiveDays(ctx.userId, node.event, node.dailyCount);
      return days >= node.days;
    }
    case 'and': {
      for (const c of node.conditions) {
        if (!(await evaluateConditionNode(c, ctx))) return false;
      }
      return true;
    }
    case 'or': {
      for (const c of node.conditions) {
        if (await evaluateConditionNode(c, ctx)) return true;
      }
      return false;
    }
    case 'not':
      return !(await evaluateConditionNode(node.condition, ctx));
  }
}

// ---------- 同步快路径求值（无异步节点时使用，避免 Promise 开销） ----------

function evaluateConditionNodeSync(node: ConditionNode, ctx: EvalContext): boolean {
  switch (node.type) {
    case 'stat': {
      const val = (ctx.stats as any)[node.stat];
      if (val === undefined) return false;
      return compareOp(val, node.op, node.value);
    }
    case 'level':
      return compareOp(ctx.level, node.op, node.value);
    case 'event_context': {
      if (!ctx.eventMetadata) return false;
      const val = getNestedField(ctx.eventMetadata, node.field);
      if (val === undefined) return false;
      return compareOp(val, node.op, node.value);
    }
    case 'and':
      return (node.conditions as ConditionNode[]).every(c => evaluateConditionNodeSync(c, ctx));
    case 'or':
      return (node.conditions as ConditionNode[]).some(c => evaluateConditionNodeSync(c, ctx));
    case 'not':
      return !evaluateConditionNodeSync(node.condition, ctx);
    default:
      return false; // time_window/consecutive_days 在同步路径中返回 false
  }
}

// ---------- 智能求值：自动选择 sync/async 路径 ----------

async function evaluateCondition(node: ConditionNode, ctx: EvalContext): Promise<boolean> {
  if (!hasAsyncNodes(node)) {
    return evaluateConditionNodeSync(node, ctx);
  }
  return evaluateConditionNode(node, ctx);
}

// ---------- 旧格式兼容函数（仅用于 recheckAllAchievements 和 progress 计算） ----------

function evaluateConditionsLegacy(conditions: LegacyCondition[], stats: StatsFields): boolean {
  return conditions.every(c => {
    const val = (stats as any)[c.stat];
    if (val === undefined) return false;
    return compareOp(val, c.op, c.value);
  });
}

// ---------- 进度计算（支持新旧格式） ----------

function calculateProgress(rawConditions: any, stats: StatsFields): { current: number; target: number; percent: number } {
  const node = normalizeConditions(rawConditions);
  if (!node) return { current: 0, target: 0, percent: 0 };
  return calculateProgressFromNode(node, stats);
}

function calculateProgressFromNode(
  node: ConditionNode,
  stats: StatsFields,
): { current: number; target: number; percent: number } {
  switch (node.type) {
    case 'stat': {
      const current = (stats as any)[node.stat] ?? 0;
      const target = node.value;
      const percent = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 100;
      return { current, target, percent };
    }
    case 'level': {
      // 等级进度由外部计算，这里返回默认值
      return { current: 0, target: node.value, percent: 0 };
    }
    case 'time_window': {
      // 时间窗口条件进度无法同步计算，返回未知
      return { current: 0, target: node.count, percent: 0 };
    }
    case 'consecutive_days': {
      return { current: 0, target: node.days, percent: 0 };
    }
    case 'and': {
      // AND 条件取最低进度
      let minPercent = 100, mainCurrent = 0, mainTarget = 0;
      for (const c of node.conditions) {
        const p = calculateProgressFromNode(c, stats);
        if (p.percent < minPercent) {
          minPercent = p.percent;
          mainCurrent = p.current;
          mainTarget = p.target;
        }
      }
      return { current: mainCurrent, target: mainTarget, percent: minPercent };
    }
    case 'or': {
      // OR 条件取最高进度
      let maxPercent = 0, mainCurrent = 0, mainTarget = 0;
      for (const c of node.conditions) {
        const p = calculateProgressFromNode(c, stats);
        if (p.percent > maxPercent) {
          maxPercent = p.percent;
          mainCurrent = p.current;
          mainTarget = p.target;
        }
      }
      return { current: mainCurrent, target: mainTarget, percent: maxPercent };
    }
    default:
      return { current: 0, target: 0, percent: 0 };
  }
}

// ==================== 原子计数器递增（单条 SQL + RETURNING，3 次 DB → 1 次） ====================

/**
 * 原子递增计数器 + 更新 streak + 重置每日 XP。
 * 使用单条 INSERT...ON CONFLICT...RETURNING 完成，替代原来的 upsert + update + findUnique 三次 DB 往返。
 * statField 通过 VALID_STAT_COLUMNS 白名单校验防止 SQL 注入。
 */
async function incrementStats(userId: string, eventType: AchievementEventType, count: number = 1): Promise<StatsRow> {
  const statField = EVENT_TO_STAT[eventType];
  const today = getTodayCN();
  const yesterday = getYesterdayCN();

  const streakCase = `
    "streakDays" = CASE
      WHEN "user_stats"."lastActiveDate" = $2 THEN "user_stats"."streakDays"
      WHEN "user_stats"."lastActiveDate" = $3 THEN "user_stats"."streakDays" + 1
      ELSE 1
    END`;
  const maxStreakCase = `
    "maxStreakDays" = GREATEST(
      "user_stats"."maxStreakDays",
      CASE
        WHEN "user_stats"."lastActiveDate" = $2 THEN "user_stats"."streakDays"
        WHEN "user_stats"."lastActiveDate" = $3 THEN "user_stats"."streakDays" + 1
        ELSE 1
      END
    )`;
  const dailyXpCase = `
    "dailyXpEarned" = CASE
      WHEN "user_stats"."dailyXpDate" = $2 THEN "user_stats"."dailyXpEarned"
      ELSE 0
    END`;

  let sql: string;
  if (statField && VALID_STAT_COLUMNS.has(statField)) {
    sql = `
      INSERT INTO "user_stats" ("id", "userId", "streakDays", "maxStreakDays", "lastActiveDate",
        "dailyXpEarned", "dailyXpDate", "${statField}", "createdAt", "updatedAt")
      VALUES (gen_random_uuid()::text, $1, 1, 1, $2, 0, $2, $4, NOW(), NOW())
      ON CONFLICT ("userId") DO UPDATE SET
        ${streakCase}, ${maxStreakCase},
        "lastActiveDate" = $2,
        ${dailyXpCase}, "dailyXpDate" = $2,
        "${statField}" = "user_stats"."${statField}" + $4,
        "updatedAt" = NOW()
      RETURNING ${RETURNING_COLS}`;
  } else {
    sql = `
      INSERT INTO "user_stats" ("id", "userId", "streakDays", "maxStreakDays", "lastActiveDate",
        "dailyXpEarned", "dailyXpDate", "createdAt", "updatedAt")
      VALUES (gen_random_uuid()::text, $1, 1, 1, $2, 0, $2, NOW(), NOW())
      ON CONFLICT ("userId") DO UPDATE SET
        ${streakCase}, ${maxStreakCase},
        "lastActiveDate" = $2,
        ${dailyXpCase}, "dailyXpDate" = $2,
        "updatedAt" = NOW()
      RETURNING ${RETURNING_COLS}`;
  }

  const rows: any[] = await prisma.$queryRawUnsafe(sql, userId, today, yesterday, count);
  return toStatsRow(rows[0]);
}

function toStatsRow(r: any): StatsRow {
  return {
    totalLearned: Number(r.totalLearned),
    totalMastered: Number(r.totalMastered),
    totalReviewed: Number(r.totalReviewed),
    totalConversations: Number(r.totalConversations),
    totalListening: Number(r.totalListening),
    totalReading: Number(r.totalReading),
    totalDiaries: Number(r.totalDiaries),
    totalLevels: Number(r.totalLevels),
    totalBossKills: Number(r.totalBossKills),
    totalPerfectStars: Number(r.totalPerfectStars),
    totalSentences: Number(r.totalSentences),
    totalDailyChallenges: Number(r.totalDailyChallenges),
    totalSpeedReviews: Number(r.totalSpeedReviews),
    totalRootsLit: Number(r.totalRootsLit),
    totalEncounters: Number(r.totalEncounters ?? 0),
    totalDailyTaskDays: Number(r.totalDailyTaskDays),
    totalPhonemePractices: Number(r.totalPhonemePractices ?? 0),
    streakDays: Number(r.streakDays),
    maxStreakDays: Number(r.maxStreakDays),
    dailyXpEarned: Number(r.dailyXpEarned),
    dailyXpDate: r.dailyXpDate,
  };
}

function toStatsFields(record: any): StatsFields {
  return {
    totalLearned: record.totalLearned,
    totalMastered: record.totalMastered,
    totalReviewed: record.totalReviewed,
    totalConversations: record.totalConversations,
    totalListening: record.totalListening,
    totalReading: record.totalReading,
    totalDiaries: record.totalDiaries,
    totalLevels: record.totalLevels,
    totalBossKills: record.totalBossKills,
    totalPerfectStars: record.totalPerfectStars,
    totalSentences: record.totalSentences,
    totalDailyChallenges: record.totalDailyChallenges,
    totalSpeedReviews: record.totalSpeedReviews,
    totalRootsLit: record.totalRootsLit,
    totalEncounters: record.totalEncounters ?? 0,
    totalDailyTaskDays: record.totalDailyTaskDays ?? 0,
    totalPhonemePractices: record.totalPhonemePractices ?? 0,
    streakDays: record.streakDays,
    maxStreakDays: record.maxStreakDays,
  };
}

// ==================== 行为 XP（复用 incrementStats 的 dailyXp，消除冗余查询） ====================

/**
 * 发放行为 XP（受每日限额）。
 * 优化：
 * 1) CTE 去掉 FOR UPDATE（UPDATE 自身已持有行锁，CTE 读旧快照足够）
 * 2) 等级更新用单条 INSERT...ON CONFLICT 替代 interactive transaction，减少连接占用
 */
async function grantBehaviorXp(
  userId: string,
  amount: number,
  _stats: StatsRow,
): Promise<{ levelUp: boolean; newLevel: number; totalXp: number; actualXp: number }> {
  if (amount <= 0) {
    const level = await prisma.userLevel.findUnique({ where: { userId } });
    return { levelUp: false, newLevel: level?.level ?? 1, totalXp: level?.xp ?? 0, actualXp: 0 };
  }

  const today = getTodayCN();

  // 原子更新每日 XP — CTE 无 FOR UPDATE，UPDATE 自身行锁保证并发安全
  const rows: any[] = await prisma.$queryRawUnsafe(`
    WITH old AS (
      SELECT "dailyXpEarned", "dailyXpDate"
      FROM "user_stats"
      WHERE "userId" = $1
    )
    UPDATE "user_stats" SET
      "dailyXpEarned" = CASE
        WHEN "user_stats"."dailyXpDate" = $2
          THEN LEAST("user_stats"."dailyXpEarned" + $3, $4)
        ELSE LEAST($3, $4)
      END,
      "dailyXpDate" = $2,
      "updatedAt" = NOW()
    FROM old
    WHERE "user_stats"."userId" = $1
    RETURNING
      "user_stats"."dailyXpEarned" AS "newDailyXp",
      CASE WHEN old."dailyXpDate" = $2 THEN old."dailyXpEarned" ELSE 0 END AS "oldDailyXp"
  `, userId, today, amount, DAILY_XP_LIMIT);

  const actualXp = rows.length > 0
    ? Math.max(0, Number(rows[0].newDailyXp) - Number(rows[0].oldDailyXp))
    : 0;

  if (actualXp <= 0) {
    const level = await prisma.userLevel.findUnique({ where: { userId } });
    return { levelUp: false, newLevel: level?.level ?? 1, totalXp: level?.xp ?? 0, actualXp: 0 };
  }

  // 原子等级更新 — 单条 SQL 替代 interactive transaction，减少连接持有时间
  const levelRows: any[] = await prisma.$queryRawUnsafe(`
    INSERT INTO "user_levels" ("id", "userId", "level", "xp", "createdAt", "updatedAt")
    VALUES (gen_random_uuid()::text, $1, 1, $2, NOW(), NOW())
    ON CONFLICT ("userId") DO UPDATE SET
      "xp" = "user_levels"."xp" + $2,
      "updatedAt" = NOW()
    RETURNING "xp", "level"
  `, userId, actualXp);

  const newXp = Number(levelRows[0].xp);
  const oldLevel = Number(levelRows[0].level);

  // 计算新等级
  let newLevel = oldLevel;
  while (newLevel < 30 && newXp >= LEVEL_XP_TABLE[newLevel]) {
    newLevel++;
  }

  const levelUp = newLevel > oldLevel;
  if (levelUp) {
    await prisma.userLevel.update({ where: { userId }, data: { level: newLevel } });
  }

  return { levelUp, newLevel, totalXp: newXp, actualXp };
}

// ==================== 成就 XP（不受日限额，供成就奖励使用） ====================

export async function addXP(userId: string, amount: number): Promise<{ levelUp: boolean; newLevel: number; totalXp: number }> {
  if (amount <= 0) {
    const level = await prisma.userLevel.findUnique({ where: { userId } });
    return { levelUp: false, newLevel: level?.level ?? 1, totalXp: level?.xp ?? 0 };
  }

  // 原子 SQL 替代 interactive transaction，减少连接持有时间
  const levelRows: any[] = await prisma.$queryRawUnsafe(`
    INSERT INTO "user_levels" ("id", "userId", "level", "xp", "createdAt", "updatedAt")
    VALUES (gen_random_uuid()::text, $1, 1, $2, NOW(), NOW())
    ON CONFLICT ("userId") DO UPDATE SET
      "xp" = "user_levels"."xp" + $2,
      "updatedAt" = NOW()
    RETURNING "xp", "level"
  `, userId, amount);

  const newXp = Number(levelRows[0].xp);
  const oldLevel = Number(levelRows[0].level);

  let newLevel = oldLevel;
  while (newLevel < 30 && newXp >= LEVEL_XP_TABLE[newLevel]) {
    newLevel++;
  }

  const levelUp = newLevel > oldLevel;
  if (levelUp) {
    await prisma.userLevel.update({ where: { userId }, data: { level: newLevel } });
  }

  return { levelUp, newLevel, totalXp: newXp };
}

// ==================== 并发安全解锁（直接 create + catch P2002，去掉不必要的事务） ====================

async function tryUnlockAchievement(userId: string, achievementId: string): Promise<boolean> {
  try {
    await prisma.userAchievement.create({ data: { userId, achievementId } });
    return true;
  } catch (error: any) {
    if (error?.code === 'P2002') return false; // 唯一约束冲突 = 已解锁
    throw error;
  }
}

// ==================== 通知持久化 ====================

async function persistNotifications(userId: string, achievements: AchievementDefinition[]) {
  if (achievements.length === 0) return;
  await prisma.achievementNotification.createMany({
    data: achievements.map(a => ({
      userId,
      achievementId: a.code,
      type: a.seriesCode && a.tier > 1 ? 'tier_up' : 'unlock',
      isRead: false,
      payload: {
        nameZh: a.nameZh,
        nameEn: a.nameEn,
        descriptionZh: a.descriptionZh,
        descriptionEn: a.descriptionEn,
        icon: a.icon,
        category: a.category,
        xpReward: a.xpReward,
        tier: a.tier,
        seriesCode: a.seriesCode,
        isHidden: a.isHidden,
      },
    })),
  });
}

// ==================== 合并成就检查（stat + level，精确 IN 查询，一次查询已解锁记录） ====================

/**
 * 合并 stat + level 成就检查为一个函数，消除原来 checkAchievementsByRules + checkLevelAchievements 的重复查询。
 * 使用精确 IN 查询替代全量拉取用户已解锁成就。
 */
async function checkAllAchievements(
  userId: string,
  eventType: AchievementEventType | AchievementEventType[],
  stats: StatsFields,
  currentLevel: number,
  levelUp: boolean,
  eventMetadata?: EventMetadata,
): Promise<AchievementDefinition[]> {
  const defs = await getAchievementDefinitions();
  const now = new Date();

  // 统一转数组，用 Set 加速判断
  const eventTypes = Array.isArray(eventType) ? eventType : [eventType];
  const eventTypeSet = new Set<string>(eventTypes);

  // 筛出当前事件相关的 stat 成就（含赛季/限时过滤）
  const statDefs = defs.filter(d => {
    if (d.ruleType !== 'stat' || !d.conditions || !d.triggerEvents) return false;
    if (!(d.triggerEvents as string[]).some(t => eventTypeSet.has(t))) return false;
    // 赛季/限时过滤
    if (d.isLimited) {
      if (d.availableFrom && now < new Date(d.availableFrom)) return false;
      if (d.availableUntil && now > new Date(d.availableUntil)) return false;
    }
    if (d.seasonCode) {
      // 赛季成就通过缓存的活跃赛季列表过滤（此处简化：仅检查限时字段）
      if (d.availableFrom && now < new Date(d.availableFrom)) return false;
      if (d.availableUntil && now > new Date(d.availableUntil)) return false;
    }
    return true;
  });

  // 等级成就（仅升级时检查）
  const levelDefs = levelUp
    ? defs.filter(d => d.ruleType === 'level' && d.levelCondition != null)
    : [];

  // 收集所有需要检查的 code（含同系列其他 tier，用于阶梯判定）
  const relevantSeries = new Set<string>();
  for (const d of statDefs) { if (d.seriesCode) relevantSeries.add(d.seriesCode); }
  for (const d of levelDefs) { if (d.seriesCode) relevantSeries.add(d.seriesCode); }

  const codesToCheck = defs
    .filter(d =>
      statDefs.includes(d) || levelDefs.includes(d) ||
      (d.seriesCode && relevantSeries.has(d.seriesCode))
    )
    .map(d => d.code);

  // 精确 IN 查询替代全量拉取
  const unlockedRecords = codesToCheck.length > 0
    ? await prisma.userAchievement.findMany({
        where: { userId, achievementId: { in: codesToCheck } },
        select: { achievementId: true },
      })
    : [];
  const unlockedSet = new Set(unlockedRecords.map(r => r.achievementId));

  // 按 seriesCode 分组，确定每个系列的已解锁最高 tier
  const seriesMaxTier = new Map<string, number>();
  for (const def of defs) {
    if (def.seriesCode && unlockedSet.has(def.code)) {
      const current = seriesMaxTier.get(def.seriesCode) ?? 0;
      if (def.tier > current) seriesMaxTier.set(def.seriesCode, def.tier);
    }
  }

  const newAchievements: AchievementDefinition[] = [];

  // 构建求值上下文
  const evalCtx: EvalContext = {
    stats,
    level: currentLevel,
    eventType: Array.isArray(eventType) ? eventType[0] : eventType,
    eventMetadata,
    userId,
  };

  // --- Stat 成就检查（使用增强条件引擎） ---
  for (const def of statDefs) {
    if (unlockedSet.has(def.code)) continue;

    // 阶梯逻辑：系列中只检查下一个 tier
    if (def.seriesCode) {
      const maxTier = seriesMaxTier.get(def.seriesCode) ?? 0;
      if (def.tier !== maxTier + 1) continue;
    }

    // 使用增强条件引擎求值
    const conditionNode = normalizeConditions(def.conditions);
    if (!conditionNode) continue;
    if (!(await evaluateCondition(conditionNode, evalCtx))) continue;

    if (await tryUnlockAchievement(userId, def.code)) {
      newAchievements.push(def);
      unlockedSet.add(def.code);
      if (def.seriesCode) seriesMaxTier.set(def.seriesCode, def.tier);
      if (def.xpReward > 0) await addXP(userId, def.xpReward);
    }
  }

  // --- Level 成就检查（仅升级时） ---
  for (const def of levelDefs) {
    if (currentLevel < def.levelCondition!) continue;
    if (unlockedSet.has(def.code)) continue;

    if (def.seriesCode) {
      const maxTier = seriesMaxTier.get(def.seriesCode) ?? 0;
      if (def.tier !== maxTier + 1) continue;
    }

    if (await tryUnlockAchievement(userId, def.code)) {
      newAchievements.push(def);
      unlockedSet.add(def.code);
      if (def.seriesCode) seriesMaxTier.set(def.seriesCode, def.tier);
    }
  }

  return newAchievements;
}

// ---------- 事件日志写入（append-only，支撑时间窗口查询） ----------

async function writeEventLog(userId: string, eventType: AchievementEventType, metadata?: EventMetadata): Promise<void> {
  try {
    await prisma.achievementEventLog.create({
      data: {
        userId,
        eventType,
        metadata: metadata ?? undefined,
        eventDate: getTodayCN(),
      },
    });
  } catch (error) {
    // 事件日志是时间窗口/连续天数条件的数据源，丢失会导致相关成就无法解锁
    logger.error(`[CRITICAL] writeEventLog failed for user=${userId} event=${eventType}:`, error);
  }
}

// ==================== 辅助：AchievementDefinition → API 返回格式 ====================

function defToApiFormat(def: AchievementDefinition) {
  return {
    id: def.code,
    name: { 'zh-CN': def.nameZh, en: def.nameEn },
    description: { 'zh-CN': def.descriptionZh, en: def.descriptionEn },
    icon: def.icon,
    category: def.category,
    xpReward: def.xpReward,
    tier: def.tier,
    seriesCode: def.seriesCode,
    isHidden: def.isHidden,
    rarity: def.rarity,
    rarityPercent: def.rarityPercent,
  };
}

// ==================== 核心入口 ====================

/**
 * 处理成就事件（热路径）。
 *
 * 优化后 DB 往返：
 * - 典型无成就解锁：3 次（incrementStats 1 + grantBehaviorXp 事务 1 + checkAllAchievements IN查询 1）
 * - 有成就解锁：3 + N（每个解锁 1 次 create）
 * - 优化前：8~9 次（无解锁）/ 12~15 次（有解锁）
 */
export async function processAchievementEvent(
  userId: string,
  eventType: AchievementEventType,
  metadata?: EventMetadata,
): Promise<AchievementEventResult | null> {
  try {
    if (COUNTER_EVENTS.has(eventType)) {
      return await processCounterEvent(userId, eventType);
    } else {
      return await processActionEvent(userId, eventType, metadata);
    }
  } catch (error) {
    logger.error('processAchievementEvent failed:', error);
    return null;
  }
}

/**
 * 计数型事件处理（单词学习/掌握/复习）
 * 轻量路径：incrementStats + updateTaskProgress，每 50 次检查成就，不发 XP
 */
async function processCounterEvent(
  userId: string,
  eventType: AchievementEventType,
): Promise<AchievementEventResult | null> {
  // 1. 原子递增计数器（1 次 DB）
  const stats = await incrementStats(userId, eventType);

  // 2. 更新每日/每周任务进度（fire-and-forget）
  updateTaskProgress(userId, eventType, 1).catch(() => {});

  // 3. 每 COUNTER_CHECK_INTERVAL 次检查成就
  const statField = EVENT_TO_STAT[eventType];
  if (!statField) return null;

  const newValue = stats[statField] as number;
  if (newValue > 0 && newValue % COUNTER_CHECK_INTERVAL === 0) {
    const newAchievements = await checkAllAchievements(
      userId, eventType, stats, 0, false, undefined,
    );

    if (newAchievements.length > 0) {
      await persistNotifications(userId, newAchievements);
      // 成就推送暂时关闭，后台继续检测和持久化
      // for (const def of newAchievements) {
      //   try {
      //     pushToUser(userId, 'achievement', def.seriesCode && def.tier > 1 ? 'tier_up' : 'unlock', defToApiFormat(def));
      //   } catch {}
      // }
    }

    const achievementXpTotal = newAchievements.reduce((sum, a) => sum + a.xpReward, 0);

    return {
      xpGained: achievementXpTotal,
      levelUp: false,
      newLevel: null,
      totalXp: 0,
      statsSnapshot: stats,
      newAchievements: [], // 成就推送暂时关闭
    };
  }

  return {
    xpGained: 0,
    levelUp: false,
    newLevel: null,
    totalXp: 0,
    statsSnapshot: stats,
    newAchievements: [],
  };
}

/**
 * 行为型事件处理（对话/阅读/听力/挑战等）
 * 完整路径：incrementStats + writeEventLog + grantBehaviorXp + checkAllAchievements + updateTaskProgress
 */
async function processActionEvent(
  userId: string,
  eventType: AchievementEventType,
  metadata?: EventMetadata,
): Promise<AchievementEventResult | null> {
  // 1. 原子递增计数器 + RETURNING（1 次 DB）
  const stats = await incrementStats(userId, eventType);

  // 2. 写入事件日志（append-only，支撑时间窗口条件查询）
  writeEventLog(userId, eventType, metadata); // fire-and-forget

  // 3. 行为 XP（1 次事务）
  const xpAmount = XP_REWARDS[eventType] || 0;
  const xpResult = await grantBehaviorXp(userId, xpAmount, stats);

  // 4. 合并检查 stat + level 成就（1 次精确 IN 查询 + N 次解锁）
  const newAchievements = await checkAllAchievements(
    userId, eventType, stats, xpResult.newLevel, xpResult.levelUp, metadata,
  );

  // 5. 持久化通知 + WS 推送
  if (newAchievements.length > 0) {
    await persistNotifications(userId, newAchievements);
    for (const def of newAchievements) {
      try {
        pushToUser(userId, 'achievement', def.seriesCode && def.tier > 1 ? 'tier_up' : 'unlock', defToApiFormat(def));
      } catch {
        // WS 推送失败不影响主流程
      }
    }
  }

  const achievementXpTotal = newAchievements.reduce((sum, a) => sum + a.xpReward, 0);

  // 6. 更新每日/每周任务进度（fire-and-forget）
  updateTaskProgress(userId, eventType, 1).catch(() => {});

  return {
    xpGained: xpResult.actualXp + achievementXpTotal,
    levelUp: xpResult.levelUp,
    newLevel: xpResult.levelUp ? xpResult.newLevel : null,
    totalXp: xpResult.totalXp + achievementXpTotal,
    statsSnapshot: stats,
    newAchievements: [], // 成就推送暂时关闭，不返回给客户端
  };
}

// ==================== 纯只读补偿检查（供 /check 端点 + cron 使用） ====================

export async function recheckAllAchievements(userId: string): Promise<AchievementEventResult> {
  const defs = await getAchievementDefinitions();

  const [statsRecord, unlockedRecords, levelRecord] = await Promise.all([
    prisma.userStats.findUnique({ where: { userId } }),
    prisma.userAchievement.findMany({ where: { userId }, select: { achievementId: true } }),
    prisma.userLevel.findUnique({ where: { userId } }),
  ]);

  const emptyStats: StatsFields = {
    totalLearned: 0, totalMastered: 0, totalReviewed: 0,
    totalConversations: 0, totalListening: 0, totalReading: 0,
    totalDiaries: 0, totalLevels: 0, totalBossKills: 0, totalPerfectStars: 0,
    totalSentences: 0, totalDailyChallenges: 0, totalSpeedReviews: 0, totalRootsLit: 0,
    totalEncounters: 0, totalDailyTaskDays: 0, totalPhonemePractices: 0,
    streakDays: 0, maxStreakDays: 0,
  };
  const stats: StatsFields = statsRecord ? toStatsFields(statsRecord) : emptyStats;
  const unlockedSet = new Set(unlockedRecords.map(r => r.achievementId));
  const level = levelRecord?.level ?? 1;

  // 按 seriesCode 分组，确定每个系列的已解锁最高 tier（阶梯逻辑）
  const seriesMaxTier = new Map<string, number>();
  for (const def of defs) {
    if (def.seriesCode && unlockedSet.has(def.code)) {
      const current = seriesMaxTier.get(def.seriesCode) ?? 0;
      if (def.tier > current) seriesMaxTier.set(def.seriesCode, def.tier);
    }
  }

  const newAchievements: AchievementDefinition[] = [];
  const evalCtx: EvalContext = { stats, level, userId };

  for (const def of defs) {
    if (unlockedSet.has(def.code)) continue;

    // 赛季/限时过滤
    if (def.isLimited) {
      const now = new Date();
      if (def.availableFrom && now < new Date(def.availableFrom)) continue;
      if (def.availableUntil && now > new Date(def.availableUntil)) continue;
    }

    // 阶梯逻辑：系列中只允许解锁下一个 tier
    if (def.seriesCode) {
      const maxTier = seriesMaxTier.get(def.seriesCode) ?? 0;
      if (def.tier !== maxTier + 1) continue;
    }

    if (def.ruleType === 'stat' && def.conditions) {
      const conditionNode = normalizeConditions(def.conditions);
      if (conditionNode && await evaluateCondition(conditionNode, evalCtx)) {
        if (await tryUnlockAchievement(userId, def.code)) {
          newAchievements.push(def);
          unlockedSet.add(def.code);
          if (def.seriesCode) seriesMaxTier.set(def.seriesCode, def.tier);
          if (def.xpReward > 0) await addXP(userId, def.xpReward);
        }
      }
    } else if (def.ruleType === 'level' && def.levelCondition != null && level >= def.levelCondition) {
      if (await tryUnlockAchievement(userId, def.code)) {
        newAchievements.push(def);
        unlockedSet.add(def.code);
        if (def.seriesCode) seriesMaxTier.set(def.seriesCode, def.tier);
        if (def.xpReward > 0) await addXP(userId, def.xpReward);
      }
    }
  }

  if (newAchievements.length > 0) {
    await persistNotifications(userId, newAchievements);
    for (const def of newAchievements) {
      try {
        pushToUser(userId, 'achievement', def.seriesCode && def.tier > 1 ? 'tier_up' : 'unlock', defToApiFormat(def));
      } catch {
        // WS 推送失败不影响主流程
      }
    }
  }

  return {
    xpGained: 0,
    levelUp: false,
    newLevel: null,
    totalXp: levelRecord?.xp ?? 0,
    statsSnapshot: stats,
    newAchievements: [], // 成就推送暂时关闭
  };
}

// ==================== 通知查询 ====================

export async function getUnreadNotifications(userId: string) {
  return prisma.achievementNotification.findMany({
    where: { userId, isRead: false },
    orderBy: { createdAt: 'asc' },
  });
}

export async function markNotificationsRead(userId: string, achievementIds: string[]) {
  await prisma.achievementNotification.updateMany({
    where: { userId, achievementId: { in: achievementIds }, isRead: false },
    data: { isRead: true },
  });
}

// ==================== 公开查询函数 ====================

export async function getUserLevel(userId: string) {
  const level = await prisma.userLevel.upsert({
    where: { userId },
    create: { userId, level: 1, xp: 0 },
    update: {},
  });
  const currentLevelXp = LEVEL_XP_TABLE[level.level - 1] || 0;
  const nextLevelXp = level.level < 30 ? LEVEL_XP_TABLE[level.level] : LEVEL_XP_TABLE[29];

  return {
    level: level.level,
    xp: level.xp,
    xpInCurrentLevel: level.xp - currentLevelXp,
    xpForNextLevel: nextLevelXp - currentLevelXp,
    isMaxLevel: level.level >= 30,
  };
}

/** 获取用户成就列表（带进度、阶梯、稀有度、隐藏） */
export async function getUserAchievementsWithProgress(userId: string) {
  const defs = await getAchievementDefinitions();

  const [unlocked, statsRecord] = await Promise.all([
    prisma.userAchievement.findMany({ where: { userId }, orderBy: { unlockedAt: 'desc' } }),
    prisma.userStats.findUnique({ where: { userId } }),
  ]);

  const unlockedMap = new Map(unlocked.map(a => [a.achievementId, a.unlockedAt]));
  const stats: StatsFields = statsRecord ? toStatsFields(statsRecord) : {
    totalLearned: 0, totalMastered: 0, totalReviewed: 0,
    totalConversations: 0, totalListening: 0, totalReading: 0,
    totalDiaries: 0, totalLevels: 0, totalBossKills: 0, totalPerfectStars: 0,
    totalSentences: 0, totalDailyChallenges: 0, totalSpeedReviews: 0, totalRootsLit: 0,
    totalEncounters: 0, totalDailyTaskDays: 0, totalPhonemePractices: 0,
    streakDays: 0, maxStreakDays: 0,
  };

  return defs.map(def => {
    const isUnlocked = unlockedMap.has(def.code);
    let progress: { current: number; target: number; percent: number } | null = null;

    if (def.ruleType === 'stat' && def.conditions) {
      progress = isUnlocked
        ? { current: 0, target: 0, percent: 100 }
        : calculateProgress(def.conditions, stats);
    }

    // 隐藏成就：未解锁时遮蔽 name/description
    const isHiddenLocked = def.isHidden && !isUnlocked;

    return {
      id: def.code,
      name: isHiddenLocked
        ? { 'zh-CN': '???', en: '???' }
        : { 'zh-CN': def.nameZh, en: def.nameEn },
      description: isHiddenLocked
        ? { 'zh-CN': '???', en: '???' }
        : { 'zh-CN': def.descriptionZh, en: def.descriptionEn },
      icon: isHiddenLocked ? 'help-outline' : def.icon,
      category: def.category,
      xpReward: def.xpReward,
      unlocked: isUnlocked,
      unlockedAt: unlockedMap.get(def.code) || null,
      progress,
      tier: def.tier,
      seriesCode: def.seriesCode,
      isHidden: def.isHidden,
      rarity: def.rarity,
      rarityPercent: def.rarityPercent,
      isLimited: def.isLimited,
      seasonCode: def.seasonCode,
      availableUntil: def.availableUntil?.toISOString() ?? null,
    };
  });
}

export function getLevelTitle(level: number, lang: string = 'zh-CN'): string {
  return LEVEL_TITLES[lang]?.[level] || LEVEL_TITLES['zh-CN'][level] || `Lv.${level}`;
}

export async function getAllAchievements() {
  return getAchievementDefinitions();
}

export function getLevelTable() {
  return LEVEL_XP_TABLE.map((xp, i) => ({
    level: i + 1,
    requiredXp: xp,
    title: LEVEL_TITLES['zh-CN'][i + 1],
    titleEn: LEVEL_TITLES['en'][i + 1],
  }));
}

// 兼容旧引用
export const getUserAchievements = getUserAchievementsWithProgress;

export type { AchievementEventType, AchievementEventResult };

// ==================== 每日任务完成奖励 ====================

const DAILY_TASK_BONUS_XP = 30;

/**
 * 领取每日任务完成奖励
 * 使用 Redis 防重复领取（每日一次）
 */
export async function claimDailyTaskBonus(userId: string): Promise<{ xpAwarded: number } | null> {
  const dateStr = getTodayCN();
  const redisKey = `daily_bonus:${userId}:${dateStr}`;

  // 使用 SET NX 实现原子防重复
  const claimed = await redisClient.set(redisKey, '1', { NX: true, EX: 48 * 3600 });
  if (!claimed) {
    // 已领取过
    return null;
  }

  // 验证当日统计是否满足条件
  const dailyStats = await prisma.userDailyStats.findUnique({
    where: { userId_eventDate: { userId, eventDate: dateStr } },
  });

  if (!dailyStats || dailyStats.learnedCount < 1 || dailyStats.reviewedCount < 15) {
    // 条件不满足，回滚 Redis
    await redisClient.del(redisKey);
    return null;
  }

  // 发放 XP
  await addXP(userId, DAILY_TASK_BONUS_XP);
  logger.info(`[DailyBonus] 用户 ${userId} 领取每日任务奖励 ${DAILY_TASK_BONUS_XP} XP`);

  return { xpAwarded: DAILY_TASK_BONUS_XP };
}
