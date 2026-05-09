import { Client } from '../client';
import { ENDPOINTS, buildQuery } from '../endpoints';

// ==================== 类型定义 ====================

export interface ServiceUsageDetail {
  today: number;
  month: number;
}

export interface UsageStats {
  today: number;
  month: number;
  byService: {
    ai: ServiceUsageDetail;
    tts: ServiceUsageDetail;
    asr: ServiceUsageDetail;
    pronunciation: ServiceUsageDetail;
    translation?: ServiceUsageDetail;
    text_translation?: ServiceUsageDetail;
  };
}

export interface UsageHistoryRecord {
  date: string;
  serviceType: string;
  totalAmount: number;
}

export interface UsageHistoryResponse {
  start_date: string;
  end_date: string;
  records: UsageHistoryRecord[];
}

// ==================== Client 扩展 ====================

declare module '../client' {
  interface Client {
    getUsageStats(userId: string): Promise<{ success: boolean; data: UsageStats }>;
    getUsageHistory(userId: string, startDate: string, endDate: string): Promise<{ success: boolean; data: UsageHistoryResponse }>;
  }
}

Client.prototype.getUsageStats = async function (userId: string) {
  return this.api.get(ENDPOINTS.USAGE + buildQuery({ user_id: userId }));
};

Client.prototype.getUsageHistory = async function (userId: string, startDate: string, endDate: string) {
  return this.api.get(ENDPOINTS.USAGE_HISTORY + buildQuery({ user_id: userId, start_date: startDate, end_date: endDate }));
};
