/**
 * 每日/每周任务 API 模块
 */
import { Client } from '../client';
import { ENDPOINTS } from '../endpoints';

// Types
export interface DailyTask {
  id: string;
  templateCode: string;
  taskDate: string;
  type: 'daily' | 'weekly';
  nameZh: string;
  nameEn: string;
  icon: string;
  targetValue: number;
  xpReward: number;
  currentValue: number;
  isCompleted: boolean;
  completedAt: string | null;
  isClaimed: boolean;
  claimedAt: string | null;
}

export interface DailyBonus {
  xpReward: number;
  allCompleted: boolean;
  isClaimed: boolean;
}

export interface DailyTasksResponse {
  daily: DailyTask[];
  weekly: DailyTask[];
  dailyBonus: DailyBonus;
}

export interface ClaimResult {
  success: boolean;
  xpGained?: number;
  levelUp?: boolean;
  newLevel?: number;
  totalXp?: number;
  error?: string;
}

// Module Augmentation
declare module '../client' {
  interface Client {
    getDailyTasks(): Promise<{ success: boolean; data: DailyTasksResponse }>;
    claimTaskReward(taskId: string): Promise<{ success: boolean; data: ClaimResult }>;
    claimDailyBonus(): Promise<{ success: boolean; data: ClaimResult }>;
  }
}

Client.prototype.getDailyTasks = async function () {
  return this.api.get(ENDPOINTS.TASKS_DAILY);
};

Client.prototype.claimTaskReward = async function (taskId: string) {
  return this.api.post(`${ENDPOINTS.TASKS_CLAIM}/${taskId}/claim`);
};

Client.prototype.claimDailyBonus = async function () {
  return this.api.post(ENDPOINTS.TASKS_DAILY_BONUS);
};
