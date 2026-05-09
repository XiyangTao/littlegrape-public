/**
 * 轻量事件总线
 * 解耦业务路由与成就逻辑，不引入 MQ
 *
 * 所有事件 fire-and-forget，业务路由不阻塞。
 * 事件分类由 achievementService 内部处理（counter 型 vs action 型）。
 */

import { logger } from '@/utils/logger';

export type AchievementEventType =
  | 'word_learned'
  | 'word_mastered'
  | 'word_reviewed'
  | 'conversation_done'
  | 'listening_done'
  | 'reading_done'
  | 'diary_done'
  | 'level_complete'
  | 'boss_complete'
  | 'perfect_level'
  | 'sentence_done'
  | 'daily_challenge_done'
  | 'speed_review_done'
  | 'root_lit'
  | 'daily_tasks_all_done'
  | 'encounter_word'
  | 'grammar_practice_done'
  | 'phoneme_practice_done';

/** 事件上下文 metadata */
export type EventMetadata = Record<string, any>;

export interface AchievementEventResult {
  xpGained: number;
  levelUp: boolean;
  newLevel: number | null;
  totalXp: number;
  statsSnapshot?: {
    totalLearned: number;
    totalMastered: number;
    totalReviewed: number;
    totalConversations: number;
    totalListening: number;
    totalReading: number;
    totalDiaries: number;
    totalLevels: number;
    totalBossKills: number;
    totalPerfectStars: number;
    totalSentences: number;
    totalDailyChallenges: number;
    totalSpeedReviews: number;
    totalRootsLit: number;
    totalEncounters: number;
    streakDays: number;
  };
  newAchievements: Array<{
    id: string;
    name: Record<string, string>;
    description: Record<string, string>;
    icon: string;
    category: string;
    xpReward: number;
  }>;
}

type AchievementHandler = (params: {
  userId: string;
  eventType: AchievementEventType;
  metadata?: EventMetadata;
}) => Promise<AchievementEventResult | null>;

let handler: AchievementHandler | null = null;

/** 应用启动时注册成就处理器 */
export function registerAchievementHandler(h: AchievementHandler) {
  handler = h;
}

// ==================== Fire-and-forget 分发（含重试） ====================

const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 1000;

function fireImmediate(userId: string, eventType: AchievementEventType, metadata?: EventMetadata): void {
  if (!handler) {
    logger.warn('Achievement handler not registered, skipping event:', eventType);
    return;
  }

  const attempt = async (retryCount: number): Promise<void> => {
    try {
      await handler!({ userId, eventType, metadata });
    } catch (error) {
      if (retryCount < MAX_RETRIES) {
        const delay = RETRY_BASE_DELAY_MS * Math.pow(2, retryCount);
        logger.warn(`emitAchievementEvent failed (attempt ${retryCount + 1}/${MAX_RETRIES + 1}), retrying in ${delay}ms:`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
        return attempt(retryCount + 1);
      }
      logger.error(`emitAchievementEvent failed after ${MAX_RETRIES + 1} attempts:`, error);
    }
  };

  attempt(0).catch(() => {
    // 兜底：确保不会有未捕获的 Promise rejection
  });
}

// ==================== 公开入口 ====================

/**
 * 业务路由调用，触发成就事件（fire-and-forget）。
 * 事件分类（counter/action）由 achievementService 内部处理。
 */
export function emitAchievementEvent(
  userId: string,
  eventType: AchievementEventType,
  metadata?: EventMetadata,
): void {
  if (!handler) {
    logger.warn('Achievement handler not registered, skipping event:', eventType);
    return;
  }

  fireImmediate(userId, eventType, metadata);
}
