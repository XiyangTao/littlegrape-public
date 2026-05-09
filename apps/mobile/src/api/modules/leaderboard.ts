import { Client } from '../client';
import { ENDPOINTS, buildQuery } from '../endpoints';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  nickname: string | null;
  avatar: string | null;
  value: number;
}

declare module '../client' {
  interface Client {
    getLeaderboard(type: string, period: string, scope?: string): Promise<{ success: boolean; data: LeaderboardEntry[] }>;
    getMyRank(type: string, period: string): Promise<{ success: boolean; data: { rank: number | null } }>;
  }
}

Client.prototype.getLeaderboard = async function(type: string, period: string, scope?: string) {
  return this.api.get(`${ENDPOINTS.LEADERBOARD}${buildQuery({ type, period, scope })}`);
};

Client.prototype.getMyRank = async function(type: string, period: string) {
  return this.api.get(`${ENDPOINTS.LEADERBOARD_RANK}${buildQuery({ type, period })}`);
};
