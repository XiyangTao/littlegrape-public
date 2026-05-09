/**
 * 统一功能权限检查（后端）
 *
 * 职责：给定 userId 和 feature key，判断用户当前订阅是否有权使用该功能。
 * 与 quota（预算）解耦：本 service 只看 "能不能用"，不看 "预算够不够"；
 * 预算检查仍由 quotaService.checkQuotaAvailable 处理。
 *
 * 新增 feature 的流程：
 *   1. 在 FEATURE_KEYS 加新 key
 *   2. 在 PLAN_FEATURES 里指定哪些 planType 能用
 *   3. 所有需要守护的路由调 checkFeatureAccess
 *
 * 特殊规则放在 checkFeatureAccess 内部（如 classicsChapter 免费书单 bypass），
 * 不污染 matrix（避免为每个特例写死规则）。
 */
import { getActiveSubscription } from './quotaService';

// ==================== 功能清单 ====================

/** 所有需要付费守护的 feature key */
export const FEATURE_KEYS = [
  'aiChat',
  'story',
  'pronunciation',          // 通用发音评估（剧情/完美发音/练习题共用）
  'asr',                    // 语音识别（按火山 API 计费，所有调用均付费）
  'voiceTranslation',
  'textTranslation',
  'tts',                    // 通用 TTS
  'readingExplanation',     // 精读文章的 AI 讲解
  'wordExplanation',        // 单词深度讲解（不同于免费的点词查义）
  'classicsAudio',          // 名著朗读 / 讲解音频 / 跟读
  'classicsChapter',        // 名著章节访问（见 FREE_CLASSICS_SLUGS 免费书单）
] as const;

/** 免费书单：这些书全书免费，其他书所有章节均需 basic+（与前端 useFeatureGate 保持一致） */
export const FREE_CLASSICS_SLUGS = new Set<string>([
  'the-wonderful-wizard-of-oz',
]);

export type FeatureKey = typeof FEATURE_KEYS[number];

/** 套餐类型 */
export type PlanType = 'free' | 'basic' | 'pro' | 'max';

// ==================== 权限矩阵 ====================

/**
 * 套餐 → 可用功能集合。
 * 一处配置，全项目共享。
 *
 * 原则：basic 解锁所有付费 feature；pro/max 功能相同、预算更多（当前产品定位）。
 * 未来如果 pro/max 有独占功能，在各自数组里添加即可。
 */
export const PLAN_FEATURES: Record<PlanType, ReadonlySet<FeatureKey>> = {
  free: new Set<FeatureKey>([
    // Free 用户无付费功能（classicsChapter 第 1 章走特殊规则，不在这里）
  ]),
  basic: new Set<FeatureKey>([...FEATURE_KEYS]),
  pro: new Set<FeatureKey>([...FEATURE_KEYS]),
  max: new Set<FeatureKey>([...FEATURE_KEYS]),
};

// ==================== 检查入口 ====================

export interface FeatureAccessPayload {
  /** classicsChapter 专用：要访问的章节号 */
  chapterNumber?: number;
  /** classicsChapter 专用：书的 slug（FREE_CLASSICS_SLUGS 里的书全书免费） */
  bookSlug?: string;
}

export interface FeatureAccessResult {
  allowed: boolean;
  reason?: 'UPGRADE_REQUIRED';
}

/**
 * 检查用户对指定 feature 的访问权限。
 *
 * 顺序：
 *   1. 取 active subscription（无则视为 free）
 *   2. 特殊规则（如 classicsChapter 第 1 章）
 *   3. 查 PLAN_FEATURES 矩阵
 */
export async function checkFeatureAccess(
  userId: string,
  feature: FeatureKey,
  payload?: FeatureAccessPayload,
): Promise<FeatureAccessResult> {
  // classicsChapter：FREE_CLASSICS_SLUGS 里的书全书免费，无需查订阅
  if (feature === 'classicsChapter' && payload?.bookSlug && FREE_CLASSICS_SLUGS.has(payload.bookSlug)) {
    return { allowed: true };
  }

  const sub = await getActiveSubscription(userId);
  const planType: PlanType = (sub?.planType as PlanType) || 'free';
  const allowed = PLAN_FEATURES[planType]?.has(feature) ?? false;

  return allowed ? { allowed: true } : { allowed: false, reason: 'UPGRADE_REQUIRED' };
}
