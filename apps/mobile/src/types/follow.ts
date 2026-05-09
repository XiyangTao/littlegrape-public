export type FollowStatus = 'none' | 'following' | 'followed_by' | 'mutual';

export interface FollowUser {
  userId: string;
  nickname: string | null;
  avatar: string | null;
  bio: string | null;
  followStatus: FollowStatus;
}

export interface FollowListResult {
  items: FollowUser[];
  total: number;
  page: number;
  hasMore: boolean;
}

export interface UserProfileData {
  user: { id: string; nickname: string | null; avatar: string | null; bio: string | null; gender: string | null };
  stats: { totalLearned: number; totalMastered: number; streakDays: number; level: number; xp: number };
  showcase: ShowcaseItem[];
  social: { followingCount: number; followerCount: number; isFollowing: boolean; isFollowedBy: boolean; isMutual: boolean };
  isOwnProfile: boolean;
}

export interface ShowcaseItem {
  slotIndex: number;
  achievementId: string;
  name: { 'zh-CN': string; en: string } | null;
  description: { 'zh-CN': string; en: string } | null;
  icon: string;
  rarity: string;
  category: string | null;
  xpReward: number;
}
