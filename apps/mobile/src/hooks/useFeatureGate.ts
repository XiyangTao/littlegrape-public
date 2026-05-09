/**
 * 功能权限预检 Hook
 *
 * 矩阵驱动：PLAN_FEATURES 定义每个套餐可用的 feature，锁定判定基于此矩阵。
 * 与后端 featureAccessService.ts 保持同步（任何改动两边都要同步修改）。
 *
 * 订阅过期由后端响应式处理（getUserQuotaStatus 自动降级/续费激活），
 * 前端信任后端 planType 状态（trial 用户的 planType 已经是 'basic'，矩阵自动放行）。
 * 用量耗尽由后端 429 + QuotaExceededModal 统一处理。
 */

import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useQuotaStore } from '@/stores';

// ==================== 矩阵（与后端 featureAccessService.PLAN_FEATURES 对齐）====================

/** 需要付费的功能 */
export type PremiumFeature =
  | 'aiChat'
  | 'story'
  | 'pronunciation'
  | 'asr'
  | 'voiceTranslation'
  | 'textTranslation'
  | 'tts'
  | 'readingExplanation'
  | 'wordExplanation'
  | 'classicsAudio'
  | 'classicsChapter';

type PlanType = 'free' | 'basic' | 'pro' | 'max';

/** 所有付费 feature —— basic 及以上全部解锁 */
const ALL_FEATURES = new Set<PremiumFeature>([
  'aiChat',
  'story',
  'pronunciation',
  'asr',
  'voiceTranslation',
  'textTranslation',
  'tts',
  'readingExplanation',
  'wordExplanation',
  'classicsAudio',
  'classicsChapter',
]);

const PLAN_FEATURES: Record<PlanType, ReadonlySet<PremiumFeature>> = {
  free: new Set(),
  basic: ALL_FEATURES,
  pro: ALL_FEATURES,
  max: ALL_FEATURES,
};

/** 免费书单：这些书全书免费（与后端 featureAccessService.FREE_CLASSICS_SLUGS 保持一致） */
const FREE_CLASSICS_SLUGS = new Set<string>([
  'the-wonderful-wizard-of-oz',
]);

// ==================== 类型定义 ====================

/** guard / isAllowed 的可选参数 */
export interface FeatureGatePayload {
  /** classicsChapter 专用：要访问的章节号 */
  chapterNumber?: number;
  /** classicsChapter 专用：书的 slug（FREE_CLASSICS_SLUGS 里的书全书免费） */
  bookSlug?: string;
}

export interface FeatureGateResult {
  /** 当前用户对该 feature 是否被锁定（供 UI 显示会员徽章 / 锁图标） */
  locked: boolean;
  /** 是否允许：支持 payload 做细粒度判断（如 classicsChapter 的章节号） */
  isAllowed: (payload?: FeatureGatePayload) => boolean;
  /** 操作前调用：锁定时自动跳转套餐页，返回是否放行 */
  guard: (payload?: FeatureGatePayload) => boolean;
}

// ==================== Hook 实现 ====================

function resolveEffectivePlan(planType: string | undefined): PlanType {
  if (planType === 'basic' || planType === 'pro' || planType === 'max') return planType;
  return 'free';
}

export function useFeatureGate(feature: PremiumFeature): FeatureGateResult {
  const quota = useQuotaStore((s) => s.quota);
  const refreshQuotaSilently = useQuotaStore((s) => s.refreshQuotaSilently);
  const navigation = useNavigation<any>();

  const effectivePlan = resolveEffectivePlan(quota?.planType);
  const periodEnd = quota?.periodEnd ?? null;

  // locked：不考虑 payload 粒度的"用户是否有此 feature 权限"
  const locked = !PLAN_FEATURES[effectivePlan].has(feature);

  const isAllowed = useCallback((payload?: FeatureGatePayload): boolean => {
    // classicsChapter 特殊：FREE_CLASSICS_SLUGS 里的书全书免费
    if (feature === 'classicsChapter' && payload?.bookSlug && FREE_CLASSICS_SLUGS.has(payload.bookSlug)) return true;
    return PLAN_FEATURES[effectivePlan].has(feature);
  }, [feature, effectivePlan]);

  const guard = useCallback((payload?: FeatureGatePayload): boolean => {
    if (!isAllowed(payload)) {
      navigation.navigate('PlanSelect');
      return false;
    }
    // 本地检测到可能已过期 → 主动刷新让后端处理，当前操作放行（后端 429 兜底）
    if (periodEnd && new Date() > new Date(periodEnd)) {
      refreshQuotaSilently();
    }
    return true;
  }, [isAllowed, periodEnd, navigation, refreshQuotaSilently]);

  return { locked, isAllowed, guard };
}
