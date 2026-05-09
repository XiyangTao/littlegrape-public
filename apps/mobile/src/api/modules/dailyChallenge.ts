/**
 * 每日挑战赛 API 模块
 */
import { Client } from '../client';
import { ENDPOINTS } from '../endpoints';

// Types
export interface DailyChallengeQuestion {
  wordId: string;
  word: string;
  meaningCn: string;
  type: string;
  options: string[];
  correctIndex: number;
  sentence?: string;
}

export interface DailyChallenge {
  id: string;
  date: string;
  questions: DailyChallengeQuestion[];
  totalQuestions: number;
  timeLimit: number;
}

export interface ChallengeSubmitData {
  date: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  maxCombo: number;
  duration: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  nickname: string;
  avatar: string | null;
  score: number;
  correctCount: number;
  maxCombo: number;
  duration: number;
}

export interface DailyChallengeStats {
  totalDays: number;
  avgScore: number;
  bestScore: number;
  currentStreak: number;
}

// Extend Client
declare module '../client' {
  interface Client {
    getDailyChallenge(): Promise<{ success: boolean; data: DailyChallenge }>;
    submitDailyChallenge(data: ChallengeSubmitData): Promise<{ success: boolean; data: any }>;
    getDailyChallengeLeaderboard(date?: string): Promise<{ success: boolean; data: { leaderboard: LeaderboardEntry[]; myRank: number | null } }>;
    getDailyChallengeStats(): Promise<{ success: boolean; data: DailyChallengeStats }>;
  }
}

Client.prototype.getDailyChallenge = async function() {
  return this.api.get(ENDPOINTS.DAILY_CHALLENGE_TODAY);
};

Client.prototype.submitDailyChallenge = async function(data: ChallengeSubmitData) {
  return this.api.post(ENDPOINTS.DAILY_CHALLENGE_SUBMIT, data);
};

Client.prototype.getDailyChallengeLeaderboard = async function(date?: string) {
  const query = date ? `?date=${date}` : '';
  return this.api.get(`${ENDPOINTS.DAILY_CHALLENGE_LEADERBOARD}${query}`);
};

Client.prototype.getDailyChallengeStats = async function() {
  return this.api.get(ENDPOINTS.DAILY_CHALLENGE_MY_STATS);
};
