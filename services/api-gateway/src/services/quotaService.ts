/**
 * 配额服务（Subscription 模型）
 *
 * 基于 Plan + UserSubscription 表管理用户订阅和用量配额。
 * 每次购买/续费/升级新增 subscription 行，不做原地 update。
 *
 * 配额检查采用 Redis 累计成本计数器（亚毫秒级）：
 * - quota:cost:{userId} 存储当前订阅周期的 costConsumed
 * - 每次 recordUsage 时 INCRBYFLOAT 累加成本
 * - checkQuotaAvailable 只需 Redis GET + 内存缓存，不查 PG
 * - 订阅变更时 DEL key 重置
 * - Redis key 丢失时从 PG lazy rebuild
 */

import { prisma } from '@/config/database';
import { redisClient } from '@/config/redis';
import { Prisma } from '@prisma/client';
import { logger } from '@/utils/logger';
import { formatDateCN } from '@/utils/dateUtils';

/** Prisma 事务客户端类型（兼容 prisma 和 tx） */
type TxClient = Prisma.TransactionClient;

// ==================== 定价配置 ====================

/**
 * 服务单价（¥）— 基于上游实际成本 ×1.3 毛利
 *
 * 同声传译：按火山官方后付费单价计费（输入 80 元/M、输出文本 80 元/M、输出音频 300 元/M），
 * 乘 1.3 毛利后为 ¥/token。三种 token 分别记账，与火山账单完全对齐。
 */
const SERVICE_PRICING = {
  ai: 0.0000018,          // ¥/token
  asr: 0.00108,           // ¥/秒
  tts: 0.000124,          // ¥/字符
  pronunciation: 0.00219, // ¥/秒
  translation: 0.00368,   // ¥/秒
  text_translation: 0.000133, // ¥/字符
  interpretation_input_audio_tokens:  0.000104, // ¥/token — 80 元/M × 1.3
  interpretation_output_text_tokens:  0.000104, // ¥/token — 80 元/M × 1.3
  interpretation_output_audio_tokens: 0.00039,  // ¥/token — 300 元/M × 1.3（仅 s2s 模式）
} as const;

/** 用量到计费单位的转换因子 */
const USAGE_TO_BILLING_UNIT = {
  asr: 0.001,           // 毫秒 → 秒
  tts: 1,               // 字符 → 字符
  ai: 1,                // token → token
  pronunciation: 0.001, // 毫秒 → 秒
  translation: 0.001,   // 毫秒 → 秒
  text_translation: 1,  // 字符 → 字符
  interpretation_input_audio_tokens:  1, // token 直接用
  interpretation_output_text_tokens:  1,
  interpretation_output_audio_tokens: 1,
} as const;

/** 套餐 seed 数据（启动时写入 Plan 表，运行时从缓存读取） */
const PLAN_SEED_DATA = [
  { planType: 'free',  name: '免费版', nameEn: 'Free',  monthlyPrice: 0,    yearlyPrice: 0,    costBudget: 0,  displayOrder: 0 },
  { planType: 'basic', name: '基础版', nameEn: 'Basic', monthlyPrice: 9.9,  yearlyPrice: 99.9, costBudget: 10, displayOrder: 1 },
  { planType: 'pro',   name: 'Pro',   nameEn: 'Pro',   monthlyPrice: 19.9, yearlyPrice: 199,  costBudget: 20, displayOrder: 2 },
  { planType: 'max',   name: 'Max',   nameEn: 'Max',   monthlyPrice: 49.9, yearlyPrice: 499,  costBudget: 50, displayOrder: 3 },
] as const;

type PlanType = 'free' | 'basic' | 'pro' | 'max';
type ServiceType = keyof typeof SERVICE_PRICING;

// ==================== Plan 缓存 ====================

interface PlanDef {
  id: string;
  planType: string;
  name: string;
  nameEn: string;
  monthlyPrice: number;
  yearlyPrice: number;
  costBudget: number;
  displayOrder: number;
  isActive: boolean;
}

let planCache: Map<string, PlanDef> = new Map();
let planCacheReady = false;

/** 启动时调用：seed Plan 表 + 加载缓存 */
export async function initializePlans(): Promise<void> {
  try {
    for (const seed of PLAN_SEED_DATA) {
      await prisma.plan.upsert({
        where: { planType: seed.planType },
        create: seed,
        update: seed,
      });
    }

    const plans = await prisma.plan.findMany({ where: { isActive: true }, orderBy: { displayOrder: 'asc' } });
    planCache = new Map(plans.map(p => [p.planType, {
      id: p.id,
      planType: p.planType,
      name: p.name,
      nameEn: p.nameEn,
      monthlyPrice: Number(p.monthlyPrice),
      yearlyPrice: Number(p.yearlyPrice),
      costBudget: Number(p.costBudget),
      displayOrder: p.displayOrder,
      isActive: p.isActive,
    }]));
    planCacheReady = true;
    logger.info(`[Quota] Plan 缓存已加载: ${planCache.size} 个套餐`);
  } catch (error) {
    logger.error('[Quota] 初始化 Plan 失败:', error);
  }
}

/** 获取套餐定义（从缓存） */
function getPlan(planType: string): PlanDef | undefined {
  return planCache.get(planType);
}

/** 获取套餐定义（从缓存），无则用 fallback */
function getPlanOrFree(planType: string): PlanDef {
  return planCache.get(planType) || planCache.get('free')!;
}

// ==================== 类型定义 ====================

export interface CostBreakdown {
  ai: number;
  tts: number;
  asr: number;
  pronunciation: number;
  translation: number;
  text_translation: number;
  interpretation_input_audio_tokens: number;
  interpretation_output_text_tokens: number;
  interpretation_output_audio_tokens: number;
  total: number;
}

/** API 返回的配额状态（向后兼容旧 QuotaStatus 格式） */
export interface QuotaStatus {
  planType: string;
  planName: string;
  billingCycle: string;
  isTrial: boolean;
  periodStart: string | null;
  periodEnd: string | null;
  costBudget: number;
  costConsumed: number;
  usagePercentage: number;
  quotaStatus: 'active' | 'warning' | 'exceeded';
  costBreakdown: CostBreakdown;
  // 到期剩余天数（后端统一计算，前端直接使用）
  daysLeft: number | null;
  // 待生效续费信息（向后兼容）
  nextPlanType: string | null;
  nextPlanName: string | null;
  nextPeriodEnd: string | null;
}

export interface QuotaCheckResult {
  available: boolean;
  message?: string;
}

/** 计算距离 periodEnd 的自然天数（UTC+8 北京时间） */
function calculateDaysLeft(periodEnd: Date): number {
  const now = new Date();
  // 转为北京时间的日期部分进行比较
  const BJ_OFFSET_MS = 8 * 60 * 60 * 1000;
  const endBJ = new Date(periodEnd.getTime() + BJ_OFFSET_MS);
  const nowBJ = new Date(now.getTime() + BJ_OFFSET_MS);
  const endDay = Date.UTC(endBJ.getUTCFullYear(), endBJ.getUTCMonth(), endBJ.getUTCDate());
  const todayDay = Date.UTC(nowBJ.getUTCFullYear(), nowBJ.getUTCMonth(), nowBJ.getUTCDate());
  return Math.max(0, Math.round((endDay - todayDay) / (1000 * 60 * 60 * 24)));
}

/**
 * Piggyback 用的轻量用量摘要（纯用量维度，不含会员信息）。
 *
 * 设计意图：piggyback 只承载"高频弱一致"的用量数据；会员维度（planType / costBudget /
 * periodEnd 等）由 GET /api/quota 慢路径权威更新，会员变化时通过 WS subscription:updated
 * 触发客户端重拉 —— 防止用量节奏的抖动污染会员状态。
 */
export interface UsageSummary {
  quotaStatus: 'active' | 'warning' | 'exceeded';
  usagePercentage: number;
  costConsumed: number;
}

// ==================== Redis 配额成本计数器 ====================

const QUOTA_COST_PREFIX = 'quota:cost:';

/** 获取用户的 Redis 配额成本 key */
export function getQuotaCostKey(userId: string): string {
  return `${QUOTA_COST_PREFIX}${userId}`;
}

/** 计算用量对应的成本增量（纯函数，无 IO） */
export function calculateCostIncrement(serviceType: string, amount: number): number {
  const st = serviceType as ServiceType;
  if (!(st in SERVICE_PRICING)) return 0;
  const billingUnits = amount * USAGE_TO_BILLING_UNIT[st];
  return billingUnits * SERVICE_PRICING[st];
}

/** 从 Redis 获取累计成本，key 不存在返回 null */
async function getQuotaCostFromRedis(userId: string): Promise<number | null> {
  try {
    const val = await redisClient.get(getQuotaCostKey(userId));
    return val !== null ? parseFloat(val) : null;
  } catch (error) {
    logger.error('[Quota] Redis 读取配额成本失败:', error);
    return null;
  }
}

/** 重置 Redis 配额成本 key（订阅变更时调用） */
export async function resetQuotaCostKey(userId: string): Promise<void> {
  try {
    await redisClient.del(getQuotaCostKey(userId));
    logger.info(`[Quota] 已重置配额成本 key: userId=${userId}`);
  } catch (error) {
    logger.error('[Quota] 重置配额成本 key 失败:', error);
  }
}

/** 从 PG 重建 Redis 配额成本（lazy rebuild，Redis key 丢失时触发） */
async function rebuildQuotaCost(userId: string, sub: CachedSubscription): Promise<number> {
  const costBreakdown = await calculateCurrentCost(userId, sub.periodStart, sub.periodEnd);
  const costConsumed = Math.max(0, costBreakdown.total - sub.costOffset);

  try {
    const key = getQuotaCostKey(userId);
    await redisClient.set(key, costConsumed.toString());
    // TTL: 订阅到期时间 + 1 天 buffer
    const ttlSeconds = Math.max(86400, Math.floor((sub.periodEnd.getTime() - Date.now()) / 1000) + 86400);
    await redisClient.expire(key, ttlSeconds);
    logger.info(`[Quota] Lazy rebuild 配额成本: userId=${userId}, costConsumed=${costConsumed}`);
  } catch (error) {
    logger.error('[Quota] Lazy rebuild 写入 Redis 失败:', error);
  }

  return costConsumed;
}

// ==================== 订阅内存缓存 ====================

interface CachedSubscription {
  id: string;
  planType: string;
  costBudget: number;
  costOffset: number;
  periodStart: Date;
  periodEnd: Date;
  billingCycle: string;
  isTrial: boolean;
}

const subscriptionCache = new Map<string, { sub: CachedSubscription | null; expiresAt: number }>();
const SUB_CACHE_TTL_MS = 60_000; // 60 秒

/** 清除指定用户的订阅缓存，并推送通知让客户端立即刷新（消除 60s 缓存陈旧窗口） */
export function invalidateSubscriptionCache(userId: string): void {
  subscriptionCache.delete(userId);
  // 动态 require 避免循环引用（push-channel 可能还未初始化）
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { pushToUser } = require('@/websocket/push-channel');
    pushToUser(userId, 'subscription', 'updated', { timestamp: Date.now() });
  } catch {
    // push-channel 未就绪或无在线连接，静默忽略（客户端下次刷新仍会用最新数据）
  }
}

/** 获取用户 active subscription，带内存缓存 */
async function getActiveSubscriptionCached(userId: string): Promise<CachedSubscription | null> {
  const cached = subscriptionCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.sub;
  }

  const sub = await getActiveSubscription(userId);
  if (!sub) {
    subscriptionCache.set(userId, { sub: null, expiresAt: Date.now() + SUB_CACHE_TTL_MS });
    return null;
  }

  const cachedSub: CachedSubscription = {
    id: sub.id,
    planType: sub.planType,
    costBudget: Number(sub.costBudget),
    costOffset: Number(sub.costOffset) || 0,
    periodStart: sub.periodStart,
    periodEnd: sub.periodEnd,
    billingCycle: sub.billingCycle,
    isTrial: sub.isTrial,
  };
  subscriptionCache.set(userId, { sub: cachedSub, expiresAt: Date.now() + SUB_CACHE_TTL_MS });
  return cachedSub;
}

/** 清除用户所有配额缓存（订阅内存 + Redis key，测试和登出用） */
export async function clearQuotaCaches(userId: string): Promise<void> {
  invalidateSubscriptionCache(userId);
  await resetQuotaCostKey(userId);
}

// ==================== 核心功能 ====================

/**
 * 获取用户当前有效订阅
 * 无 active 订阅 → 返回 null（视为免费用户）
 */
export async function getActiveSubscription(userId: string, db: TxClient = prisma) {
  return db.userSubscription.findFirst({
    where: { userId, status: 'active' },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * 获取用户待生效的续费订阅
 */
async function getScheduledSubscription(userId: string, db: TxClient = prisma) {
  return db.userSubscription.findFirst({
    where: { userId, status: 'scheduled' },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * 计算用户在指定周期内的成本消耗（PG 聚合查询）
 * 用于：升级差价计算、lazy rebuild、完整配额状态
 */
export async function calculateCurrentCost(
  userId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<CostBreakdown> {
  const startDate = formatDateCN(periodStart);
  const endDate = formatDateCN(periodEnd);

  try {
    const usageRecords = await prisma.userDailyUsage.groupBy({
      by: ['serviceType'],
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
      },
      _sum: { totalAmount: true },
    });

    const breakdown: CostBreakdown = {
      ai: 0, tts: 0, asr: 0, pronunciation: 0, translation: 0, text_translation: 0,
      interpretation_input_audio_tokens: 0,
      interpretation_output_text_tokens: 0,
      interpretation_output_audio_tokens: 0,
      total: 0,
    };

    for (const record of usageRecords) {
      const serviceType = record.serviceType as ServiceType;
      const rawAmount = record._sum.totalAmount ?? 0;

      if (serviceType in SERVICE_PRICING) {
        const billingUnits = rawAmount * USAGE_TO_BILLING_UNIT[serviceType];
        const cost = billingUnits * SERVICE_PRICING[serviceType];
        breakdown[serviceType] = Math.round(cost * 1000000) / 1000000;
      }
    }

    breakdown.total = Math.round(
      (breakdown.ai + breakdown.tts + breakdown.asr + breakdown.pronunciation + breakdown.translation + breakdown.text_translation
        + breakdown.interpretation_input_audio_tokens + breakdown.interpretation_output_text_tokens + breakdown.interpretation_output_audio_tokens) * 1000000
    ) / 1000000;

    return breakdown;
  } catch (error) {
    logger.error('计算成本失败:', error);
    return {
      ai: 0, tts: 0, asr: 0, pronunciation: 0, translation: 0, text_translation: 0,
      interpretation_input_audio_tokens: 0,
      interpretation_output_text_tokens: 0,
      interpretation_output_audio_tokens: 0,
      total: 0,
    };
  }
}

// ==================== 配额状态判断工具 ====================

/** 从 costConsumed 和 costBudget 计算配额状态 */
function computeQuotaState(costConsumed: number, costBudget: number) {
  const usagePercentage = costBudget > 0
    ? Math.round((costConsumed / costBudget) * 10000) / 100
    : 100;

  let quotaStatus: 'active' | 'warning' | 'exceeded' = 'active';
  if (usagePercentage >= 100) {
    quotaStatus = 'exceeded';
  } else if (usagePercentage >= 80) {
    quotaStatus = 'warning';
  }

  return { usagePercentage, quotaStatus };
}

/** 从 QuotaStatus 构建 QuotaCheckResult */
function buildCheckResult(status: QuotaStatus): QuotaCheckResult {
  if (status.quotaStatus === 'exceeded') {
    return { available: false, message: '用量已达上限，升级套餐即可继续使用' };
  }
  if (status.quotaStatus === 'warning') {
    return { available: true, message: `您的用量已达 ${status.usagePercentage}%，请注意合理使用` };
  }
  return { available: true };
}

// ==================== 配额检查（热路径：Redis + 内存缓存） ====================

/**
 * 检查用户配额是否可用
 * 快速路径：内存缓存(订阅) + Redis GET(成本) → 亚毫秒
 * 慢速路径：订阅过期时走 getUserQuotaStatus 处理到期逻辑
 */
export async function checkQuotaAvailable(userId: string): Promise<QuotaCheckResult> {
  try {
    const sub = await getActiveSubscriptionCached(userId);

    // 无 active 订阅 → free 用户
    if (!sub) {
      return { available: false, message: '用量已达上限，升级套餐即可继续使用' };
    }

    // 检查是否过期 → 走慢路径处理到期逻辑
    if (new Date() > sub.periodEnd) {
      invalidateSubscriptionCache(userId);
      const status = await getUserQuotaStatus(userId);
      return buildCheckResult(status);
    }

    // 快速路径：Redis GET
    let costConsumed = await getQuotaCostFromRedis(userId);
    if (costConsumed === null) {
      costConsumed = await rebuildQuotaCost(userId, sub);
    }

    const { usagePercentage, quotaStatus } = computeQuotaState(costConsumed, sub.costBudget);

    if (quotaStatus === 'exceeded') {
      return { available: false, message: '用量已达上限，升级套餐即可继续使用' };
    }
    if (quotaStatus === 'warning') {
      return { available: true, message: `您的用量已达 ${usagePercentage}%，请注意合理使用` };
    }
    return { available: true };
  } catch (error) {
    logger.error('配额检查失败，放行请求:', error);
    return { available: true };
  }
}

/**
 * 获取实时用量摘要（供 piggyback 注入响应）。
 *
 * 设计：仅返回纯用量字段。订阅缺失（未登录、缓存窗口、订阅刚被置 expired 等）时返回 null
 * —— 让中间件直接跳过 piggyback 注入，绝不向前端发送"伪造的 free 兜底"，避免覆盖正确的会员状态。
 */
export async function getUsageSummary(userId: string): Promise<UsageSummary | null> {
  try {
    const sub = await getActiveSubscriptionCached(userId);
    if (!sub) return null;

    let costConsumed = await getQuotaCostFromRedis(userId);
    if (costConsumed === null) {
      costConsumed = await rebuildQuotaCost(userId, sub);
    }

    const { usagePercentage, quotaStatus } = computeQuotaState(costConsumed, sub.costBudget);

    return {
      quotaStatus,
      usagePercentage,
      costConsumed: Math.round(costConsumed * 10000) / 10000,
    };
  } catch (error) {
    logger.error('[Quota] 获取用量摘要失败:', error);
    return null;
  }
}

// ==================== 完整配额状态（慢路径：PG 查询） ====================

/**
 * 获取用户配额状态（含到期自动处理、完整 costBreakdown）
 * 用于 GET /api/quota 端点和到期处理，非热路径
 */
export async function getUserQuotaStatus(userId: string): Promise<QuotaStatus> {
  let activeSub = await getActiveSubscription(userId);

  // 无 active 订阅 → free 用户
  if (!activeSub) {
    const freePlan = getPlanOrFree('free');
    return buildFreeQuotaStatus(freePlan);
  }

  const now = new Date();

  // 到期处理
  if (now > activeSub.periodEnd) {
    const scheduled = await getScheduledSubscription(userId);

    if (scheduled) {
      // 有待生效续费 → 激活
      const nextStart = new Date(activeSub.periodEnd);
      nextStart.setDate(nextStart.getDate() + 1);

      await prisma.$transaction(async (tx) => {
        await tx.userSubscription.update({
          where: { id: activeSub!.id },
          data: { status: 'expired' },
        });
        await tx.userSubscription.update({
          where: { id: scheduled.id },
          data: {
            status: 'active',
            periodStart: startOfDay(nextStart),
          },
        });
      });

      activeSub = await getActiveSubscription(userId);
      if (!activeSub) {
        activeSub = await createTrialSubscription(userId);
      }

      // 新周期：重置 Redis + 订阅缓存
      await resetQuotaCostKey(userId);
      invalidateSubscriptionCache(userId);
      logger.info(`[Quota] 套餐到期，续费已激活: userId=${userId}, plan=${activeSub.planType}`);
    } else {
      // 无续费 → 标记过期，用户变为 free
      await prisma.userSubscription.update({
        where: { id: activeSub.id },
        data: { status: 'expired' },
      });

      await resetQuotaCostKey(userId);
      invalidateSubscriptionCache(userId);
      logger.info(`[Quota] 套餐到期，自动降级: userId=${userId}, plan=${activeSub.planType}`);

      const freePlan = getPlanOrFree('free');
      return buildFreeQuotaStatus(freePlan);
    }
  }

  // 构建配额状态（PG 查询获取完整 breakdown）
  const planType = activeSub.planType;
  const planDef = getPlanOrFree(planType);
  const costBudget = Number(activeSub.costBudget);
  const isTrial = activeSub.isTrial;

  const costBreakdown = await calculateCurrentCost(userId, activeSub.periodStart, activeSub.periodEnd);
  const costOffset = Number(activeSub.costOffset) || 0;
  const costConsumed = Math.max(0, costBreakdown.total - costOffset);

  // 用 PG 值校准 Redis（隐式对账）
  try {
    const key = getQuotaCostKey(userId);
    await redisClient.set(key, costConsumed.toString());
    const ttlSeconds = Math.max(86400, Math.floor((activeSub.periodEnd.getTime() - Date.now()) / 1000) + 86400);
    await redisClient.expire(key, ttlSeconds);
  } catch (e) {
    logger.error('[Quota] Redis 对账写入失败:', e);
  }

  const { usagePercentage, quotaStatus } = computeQuotaState(costConsumed, costBudget);

  // 查待生效续费信息
  const scheduled = await getScheduledSubscription(userId);
  const scheduledPlan = scheduled ? getPlan(scheduled.planType) : null;

  const daysLeft = calculateDaysLeft(activeSub.periodEnd);

  return {
    planType,
    planName: isTrial ? `${planDef.name}(${getPlanOrFree('free').name})` : planDef.name,
    billingCycle: activeSub.billingCycle,
    isTrial,
    periodStart: activeSub.periodStart.toISOString(),
    periodEnd: activeSub.periodEnd.toISOString(),
    costBudget,
    costConsumed: Math.round(costConsumed * 10000) / 10000,
    usagePercentage,
    quotaStatus,
    costBreakdown,
    daysLeft,

    nextPlanType: scheduled?.planType || null,
    nextPlanName: scheduledPlan?.name || null,
    nextPeriodEnd: scheduled?.periodEnd.toISOString() || null,
  };
}

/** 构建 free 用户的配额状态 */
function buildFreeQuotaStatus(freePlan: PlanDef): QuotaStatus {
  const emptyCostBreakdown: CostBreakdown = {
    ai: 0, tts: 0, asr: 0, pronunciation: 0, translation: 0, text_translation: 0,
    interpretation_input_audio_tokens: 0,
    interpretation_output_text_tokens: 0,
    interpretation_output_audio_tokens: 0,
    total: 0,
  };

  return {
    planType: 'free',
    planName: freePlan.name,
    billingCycle: 'monthly',
    isTrial: false,
    periodStart: null,
    periodEnd: null,
    costBudget: 0,
    costConsumed: 0,
    usagePercentage: 100,
    quotaStatus: 'exceeded',
    costBreakdown: emptyCostBreakdown,
    daysLeft: null,
    nextPlanType: null,
    nextPlanName: null,
    nextPeriodEnd: null,
  };
}

// ==================== 体验期 ====================

/**
 * 创建体验期订阅（新用户送 3 天基础版）
 */
export async function createTrialSubscription(userId: string) {
  const basicPlan = getPlanOrFree('basic');
  const now = new Date();
  const periodStart = startOfDay(now);
  const trialEnd = new Date(periodStart);
  trialEnd.setDate(trialEnd.getDate() + 2); // 3 天：今天 + 2 天
  const periodEnd = endOfDay(trialEnd);

  const sub = await prisma.userSubscription.create({
    data: {
      userId,
      planId: basicPlan.id,
      planType: 'basic',
      status: 'active',
      billingCycle: 'monthly',
      isTrial: true,
      costBudget: 1, // 体验预算
      periodStart,
      periodEnd,
    },
  });

  invalidateSubscriptionCache(userId);
  return sub;
}

// ==================== 日期工具 ====================

function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const targetMonth = result.getMonth() + months;
  const dayOfMonth = result.getDate();
  result.setMonth(targetMonth);
  if (result.getDate() !== dayOfMonth) {
    result.setDate(0);
  }
  return result;
}

/**
 * 计算周期结束日期：从 startDate 起算 months 个月，结束于前一天的 23:59:59.999
 */
function calcPeriodEnd(startDate: Date, months: number): Date {
  const endDate = addMonths(startDate, months);
  endDate.setDate(endDate.getDate() - 1);
  return endOfDay(endDate);
}

// ==================== 升级/续费/购买 ====================

/**
 * 计算升级差价
 */
export async function calculateUpgradePrice(
  userId: string,
  newPlanType: PlanType,
  billingCycle: 'monthly' | 'yearly',
): Promise<{ amount: number; periodEnd: Date; isRenewal: boolean }> {
  const newPlanDef = getPlan(newPlanType);
  if (!newPlanDef || newPlanType === 'free') throw new Error('无效的套餐类型');

  const activeSub = await getActiveSubscription(userId);
  const now = new Date();
  const newPrice = billingCycle === 'yearly' ? newPlanDef.yearlyPrice : newPlanDef.monthlyPrice;

  // 判断月付→年付切换
  const isCycleUpgrade = activeSub && activeSub.planType === newPlanType && activeSub.billingCycle === 'monthly' && billingCycle === 'yearly';

  // 同级续费：从到期日次日延续（体验期不算续费，月付→年付不走续费）
  if (activeSub && activeSub.planType === newPlanType && !isCycleUpgrade && activeSub.periodEnd > now && !activeSub.isTrial) {
    const renewStart = new Date(activeSub.periodEnd);
    renewStart.setDate(renewStart.getDate() + 1);
    const renewStartDay = startOfDay(renewStart);
    const periodEnd = calcPeriodEnd(renewStartDay, billingCycle === 'yearly' ? 12 : 1);
    return { amount: newPrice, periodEnd, isRenewal: true };
  }

  // 升级/周期切换：按比例折算旧套餐剩余价值（体验期视同免费用户）
  if (activeSub && activeSub.planType !== 'free' && activeSub.periodEnd > now && !activeSub.isTrial) {
    const oldPlanDef = getPlan(activeSub.planType);
    if (oldPlanDef) {
      const oldPrice = activeSub.billingCycle === 'yearly' ? oldPlanDef.yearlyPrice : oldPlanDef.monthlyPrice;

      // 按用量折算剩余价值：用了多少额度，退剩余比例的付款
      const oldCostBudget = Number(activeSub.costBudget);
      const oldCostOffset = Number(activeSub.costOffset) || 0;
      const oldCost = await calculateCurrentCost(userId, activeSub.periodStart, activeSub.periodEnd);
      const oldConsumed = Math.max(0, oldCost.total - oldCostOffset);
      const usageRatio = oldCostBudget > 0 ? Math.min(1, oldConsumed / oldCostBudget) : 1;
      const oldRemainingValue = oldPrice * (1 - usageRatio);

      // 已续费金额抵扣
      let renewalCredit = 0;
      const scheduled = await getScheduledSubscription(userId);
      if (scheduled?.orderId) {
        const renewalOrder = await prisma.userOrder.findUnique({ where: { id: scheduled.orderId } });
        if (renewalOrder && renewalOrder.status === 'paid') {
          renewalCredit = Number(renewalOrder.amount);
        }
      }

      const todayStart = startOfDay(now);
      const newPeriodEnd = calcPeriodEnd(todayStart, billingCycle === 'yearly' ? 12 : 1);
      const amount = Math.max(0, Math.round((newPrice - oldRemainingValue - renewalCredit) * 100) / 100);

      return { amount, periodEnd: newPeriodEnd, isRenewal: false };
    }
  }

  // 新用户或免费用户：全价
  const todayStart = startOfDay(now);
  const periodEnd = calcPeriodEnd(todayStart, billingCycle === 'yearly' ? 12 : 1);
  return { amount: newPrice, periodEnd, isRenewal: false };
}

/**
 * 升级用户套餐（支付成功后调用）：创建新 active 订阅，supersede 旧订阅
 */
export async function upgradeUserPlan(
  userId: string, planType: PlanType, billingCycle: 'monthly' | 'yearly' = 'monthly',
  orderId: string,
  db: TxClient = prisma,
): Promise<string> {
  const planDef = getPlan(planType);
  if (!planDef || planType === 'free') {
    throw new Error('无效的套餐类型');
  }

  const now = new Date();
  const todayStart = startOfDay(now);
  const periodEnd = calcPeriodEnd(todayStart, billingCycle === 'yearly' ? 12 : 1);

  // 1. 处理 scheduled 续费订阅：cancelled + 订单 credited（与 active 无关，放前面）
  const activeSub = await getActiveSubscription(userId, db);
  if (activeSub) {
    const scheduled = await getScheduledSubscription(userId, db);
    if (scheduled) {
      await db.userSubscription.update({
        where: { id: scheduled.id },
        data: { status: 'cancelled', cancelledAt: now },
      });
      if (scheduled.orderId) {
        await db.userOrder.update({
          where: { id: scheduled.orderId },
          data: { status: 'credited' },
        }).catch(err => logger.error('标记续费订单为 credited 失败:', err));
      }
    }
  }

  // 2. 计算 costOffset：新周期开始日（今天）已有的用量成本，应从新预算中扣除
  const todayCost = await calculateCurrentCost(userId, todayStart, endOfDay(now));
  const costOffset = todayCost.total;

  // 3. 旧 active 订阅先标记 superseded（supersededBy 稍后回填）
  //    顺序很重要：DB 有 partial unique index(userId) WHERE status='active'，
  //    必须先把旧的"摘掉"active 状态，再 insert 新的，否则 unique 冲突。
  if (activeSub) {
    await db.userSubscription.update({
      where: { id: activeSub.id },
      data: { status: 'superseded', supersededAt: now },
    });
  }

  // 4. 创建新 active 订阅（此时 DB 里无 active，unique 约束不冲突）
  const newSub = await db.userSubscription.create({
    data: {
      userId,
      planId: planDef.id,
      planType,
      status: 'active',
      billingCycle,
      isTrial: false,
      costBudget: billingCycle === 'yearly' ? planDef.costBudget * 12 : planDef.costBudget,
      costOffset,
      periodStart: todayStart,
      periodEnd,
      orderId,
    },
  });

  // 5. 回填旧订阅的 supersededBy 引用
  if (activeSub) {
    await db.userSubscription.update({
      where: { id: activeSub.id },
      data: { supersededBy: newSub.id },
    });
  }

  // 5. 重置 Redis 配额成本 + 订阅缓存
  await resetQuotaCostKey(userId);
  invalidateSubscriptionCache(userId);

  return newSub.id;
}

/**
 * 处理续费（支付成功后调用）：创建 scheduled 订阅
 */
export async function scheduleRenewal(
  userId: string, planType: PlanType, billingCycle: 'monthly' | 'yearly', orderId: string,
  db: TxClient = prisma,
): Promise<string> {
  const planDef = getPlan(planType);
  if (!planDef) throw new Error('无效的套餐类型');

  const activeSub = await getActiveSubscription(userId, db);
  if (!activeSub) throw new Error('用户无有效订阅');

  const renewStart = new Date(activeSub.periodEnd);
  renewStart.setDate(renewStart.getDate() + 1);
  const renewStartDay = startOfDay(renewStart);
  const periodEnd = calcPeriodEnd(renewStartDay, billingCycle === 'yearly' ? 12 : 1);

  const newSub = await db.userSubscription.create({
    data: {
      userId,
      planId: planDef.id,
      planType,
      status: 'scheduled',
      billingCycle,
      isTrial: false,
      costBudget: billingCycle === 'yearly' ? planDef.costBudget * 12 : planDef.costBudget,
      periodStart: renewStartDay,
      periodEnd,
      orderId,
    },
  });

  invalidateSubscriptionCache(userId);
  return newSub.id;
}

/**
 * 获取套餐列表（供客户端展示，向后兼容旧格式）
 */
export function getPlanList() {
  const plans = Array.from(planCache.values()).filter(p => p.isActive);
  plans.sort((a, b) => a.displayOrder - b.displayOrder);
  return plans.map(p => ({
    planType: p.planType,
    name: p.name,
    nameEn: p.nameEn,
    price: p.monthlyPrice,       // 向后兼容：前端用 price 字段
    yearlyPrice: p.yearlyPrice,
    costBudget: p.costBudget,
    hasExpiry: p.planType !== 'free',
  }));
}
