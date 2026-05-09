import { Client } from '../client';
import { ENDPOINTS } from '../endpoints';

export type LearningPhase = 'beginner' | 'elementary' | 'intermediate' | 'upper_intermediate' | 'advanced';

export interface Recommendation {
  type: 'word_learn' | 'word_review' | 'conversation' | 'reading' | 'listening' | 'pronunciation' | 'story' | 'diary' | 'vocabulary_test';
  priority: number;
  reason: string;
  reasonZh: string;
  targetRoute: string;
  meta?: Record<string, any>;
}

export interface LearningPathData {
  phase: LearningPhase;
  phaseProgress: number;
  level: number;
  xp: number;
  totalLearned: number;
  totalMastered: number;
  streakDays: number;
  estimatedVocabulary: number | null;
  todayStats: { learned: number; reviewed: number; mastered: number };
  dailyGoals: { newWords: number; review: number };
  recommendations: Recommendation[];
  weeklyActivity: number[];
}

declare module '../client' {
  interface Client {
    getLearningPath(): Promise<{ success: boolean; data: LearningPathData }>;
  }
}

Client.prototype.getLearningPath = async function() {
  return this.api.get(ENDPOINTS.LEARNING_PATH);
};
