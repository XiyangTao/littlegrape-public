import { Client } from '../client';
import { ENDPOINTS } from '../endpoints';

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
  costBreakdown: {
    ai: number;
    tts: number;
    asr: number;
    pronunciation: number;
    translation: number;
    text_translation: number;
    total: number;
  };
  // 到期剩余天数（后端统一计算）
  daysLeft: number | null;
  // 待生效续费信息
  nextPlanType: string | null;
  nextPlanName: string | null;
  nextPeriodEnd: string | null;
}

export interface QuotaCheckResult {
  available: boolean;
  message?: string;
}

/**
 * 后端 piggyback 注入的轻量用量摘要（纯用量，不含会员）。
 *
 * 设计：piggyback 通道只同步高频弱一致的用量；会员字段（planType / costBudget / periodEnd）
 * 由 GET /api/quota 权威路径 + WS subscription:updated 推送维护，不让用量节奏污染会员状态。
 */
export interface UsageSummary {
  quotaStatus: 'active' | 'warning' | 'exceeded';
  usagePercentage: number;
  costConsumed: number;
}

declare module '../client' {
  interface Client {
    getQuotaStatus(): Promise<{ success: boolean; data: QuotaStatus }>;
    checkQuotaAvailable(): Promise<{ success: boolean; data: QuotaCheckResult }>;
  }
}

Client.prototype.getQuotaStatus = async function(): Promise<{ success: boolean; data: QuotaStatus }> {
  return this.api.get(ENDPOINTS.QUOTA);
};

Client.prototype.checkQuotaAvailable = async function(): Promise<{ success: boolean; data: QuotaCheckResult }> {
  return this.api.get(ENDPOINTS.QUOTA_CHECK);
};
