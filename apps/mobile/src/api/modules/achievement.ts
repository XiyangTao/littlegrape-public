import { Client } from '../client';
import { ENDPOINTS } from '../endpoints';

export interface UserLevelInfo {
  level: number;
  xp: number;
  xpInCurrentLevel: number;
  xpForNextLevel: number;
  isMaxLevel: boolean;
  title: string;
  titleEn: string;
}

export interface AchievementInfo {
  id: string;
  name: Record<string, string>;
  description: Record<string, string>;
  icon: string;
  category: string;
  xpReward: number;
  unlocked: boolean;
  unlockedAt: string | null;
  progress: { current: number; target: number; percent: number } | null;
  tier?: number;
  seriesCode?: string | null;
  isHidden?: boolean;
  rarity?: string | null;       // common | rare | epic | legendary
  rarityPercent?: number | null;
  isLimited?: boolean;
  seasonCode?: string | null;
  availableUntil?: string | null;
}

export interface AddXPResult {
  levelUp: boolean;
  newLevel: number;
  totalXp: number;
}

export interface StatsSnapshot {
  totalLearned: number;
  totalMastered: number;
  totalReviewed: number;
  totalConversations: number;
  totalListening: number;
  totalReading: number;
  totalDiaries: number;
  streakDays: number;
  maxStreakDays?: number;
}

export interface AchievementEventResult {
  xpGained: number;
  levelUp: boolean;
  newLevel: number | null;
  totalXp: number;
  statsSnapshot?: StatsSnapshot;
  newAchievements: AchievementInfo[];
}

export interface AchievementNotification {
  id: string;
  achievementId: string;
  type: 'unlock' | 'tier_up';
  payload: any;
  isRead: boolean;
  createdAt: string;
}

export interface ShowcaseItem {
  slotIndex: number;
  achievementId: string;
  name: Record<string, string> | null;
  description: Record<string, string> | null;
  icon: string;
  rarity: string;
  category?: string;
  xpReward: number;
}

export interface AchievementLeaderboardEntry {
  rank: number;
  userId: string;
  nickname: string;
  avatar: string | null;
  level: number;
  achievementCount: number;
}

declare module '../client' {
  interface Client {
    getUserLevel(): Promise<{ success: boolean; data: UserLevelInfo }>;
    getAchievements(): Promise<{ success: boolean; data: AchievementInfo[] }>;
    addXP(action: string): Promise<{ success: boolean; data: AddXPResult }>;
    checkAchievements(): Promise<{ success: boolean; data: { newlyUnlocked: string[] } }>;
    getUnreadNotifications(): Promise<{ success: boolean; data: AchievementNotification[] }>;
    markNotificationsRead(achievementIds: string[]): Promise<{ success: boolean }>;
    getShowcase(userId: string): Promise<{ success: boolean; data: ShowcaseItem[] }>;
    setShowcase(slots: Array<{ slotIndex: number; achievementId: string }>): Promise<{ success: boolean }>;
    getAchievementLeaderboard(limit?: number): Promise<{ success: boolean; data: AchievementLeaderboardEntry[] }>;
  }
}

Client.prototype.getUserLevel = async function() {
  return this.api.get(ENDPOINTS.ACHIEVEMENT_LEVEL);
};

Client.prototype.getAchievements = async function() {
  return this.api.get(ENDPOINTS.ACHIEVEMENT_LIST);
};

Client.prototype.addXP = async function(action: string) {
  return this.api.post(ENDPOINTS.ACHIEVEMENT_XP, { action });
};

Client.prototype.checkAchievements = async function() {
  return this.api.post(ENDPOINTS.ACHIEVEMENT_CHECK);
};

Client.prototype.getUnreadNotifications = async function() {
  return this.api.get(ENDPOINTS.ACHIEVEMENT_NOTIFICATIONS);
};

Client.prototype.markNotificationsRead = async function(achievementIds: string[]) {
  return this.api.post(ENDPOINTS.ACHIEVEMENT_NOTIFICATIONS_READ, { achievementIds });
};

Client.prototype.getShowcase = async function(userId: string) {
  return this.api.get(`${ENDPOINTS.ACHIEVEMENT_SHOWCASE}/${userId}`);
};

Client.prototype.setShowcase = async function(slots) {
  return this.api.post(ENDPOINTS.ACHIEVEMENT_SHOWCASE, { slots });
};

Client.prototype.getAchievementLeaderboard = async function(limit?: number) {
  const query = limit ? `?limit=${limit}` : '';
  return this.api.get(`${ENDPOINTS.ACHIEVEMENT_LEADERBOARD}${query}`);
};
