/**
 * 每日任务系统服务
 *
 * 核心流程：
 * 1. getOrCreateDailyTasks — 惰性生成每日任务（槽位制：词汇+听说+读写，保证技能多样性）
 * 2. updateTaskProgress — 在 processAchievementEvent 末尾调用，根据事件类型递增任务进度
 * 3. claimTaskReward — 领取单任务奖励（XP）
 * 4. claimDailyBonus — 全部每日任务完成后领取额外奖励（连续完成天数递增）
 */

import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { getTodayCN, getYesterdayCN, getNDaysAgoCN, prevDateCN } from '@/utils/dateUtils';
import { addXP } from '@/services/achievementService';
import { emitAchievementEvent } from '@/events/eventBus';
import type { AchievementEventType } from '@/events/eventBus';

// ==================== 常量 ====================

const DAILY_TASK_COUNT = 3;

/** Bonus 连续完成加成 */
const DAILY_BONUS_BASE_XP = 30;
const DAILY_BONUS_MAX_XP = 70;
const DAILY_BONUS_INCREMENT = 5;

/** 引导探索：用户从未使用过的功能，权重乘以此系数 */
const EXPLORE_WEIGHT_MULTIPLIER = 3;

/** 事件类型 → 任务 triggerEvent 映射 */
const EVENT_TO_TRIGGER: Record<string, string> = {
  word_learned: 'word_learned',
  word_mastered: 'word_mastered',
  word_reviewed: 'word_reviewed',
  conversation_done: 'conversation_done',
  listening_done: 'listening_done',
  reading_done: 'reading_done',
  diary_done: 'diary_done',
  level_complete: 'level_complete',
  boss_complete: 'boss_complete',
  sentence_done: 'sentence_done',
  daily_challenge_done: 'daily_challenge_done',
  speed_review_done: 'speed_review_done',
  phoneme_practice_done: 'phoneme_practice_done',
};

/** 槽位分类：每个槽位对应的 triggerEvent 列表 */
const SLOT_TRIGGER_EVENTS: Record<string, string[]> = {
  vocabulary: ['word_learned', 'word_reviewed', 'word_mastered'],
  listening_speaking: ['conversation_done', 'listening_done', 'diary_done', 'phoneme_practice_done'],
  reading_writing: ['reading_done', 'sentence_done', 'daily_challenge_done'],
};

/** triggerEvent → UserStats 字段映射（用于引导探索） */
const TRIGGER_TO_STATS_FIELD: Record<string, string> = {
  conversation_done: 'totalConversations',
  listening_done: 'totalListening',
  diary_done: 'totalDiaries',
  reading_done: 'totalReading',
  sentence_done: 'totalSentences',
  daily_challenge_done: 'totalDailyChallenges',
  phoneme_practice_done: 'totalPhonemePractices',
};

// ==================== 核心函数 ====================

/**
 * 获取或创建当天的每日任务
 * 惰性生成：首次访问时按槽位制生成 3 个任务（词汇+听说+读写）
 */
export async function getOrCreateDailyTasks(userId: string) {
  const today = getTodayCN();

  // 查询已有任务
  const existingTasks = await prisma.userDailyTask.findMany({
    where: { userId, type: 'daily', taskDate: today },
    orderBy: { createdAt: 'asc' },
  });

  let tasks = existingTasks;

  // 如果缺少每日任务，生成
  if (existingTasks.length === 0) {
    tasks = await generateDailyTasks(userId, today);
  }

  // 查询今日 bonus 是否已领
  const bonus = await prisma.userDailyTaskBonus.findUnique({
    where: { userId_taskDate: { userId, taskDate: today } },
  });

  const allDailyCompleted = tasks.length > 0 && tasks.every(t => t.isCompleted);

  // 动态计算 bonus XP（连续完成加成）
  const bonusXp = await calculateBonusXp(userId, today);

  return {
    daily: tasks,
    weekly: [],
    dailyBonus: {
      xpReward: bonusXp,
      allCompleted: allDailyCompleted,
      isClaimed: !!bonus,
    },
  };
}

/**
 * 根据事件类型更新匹配的任务进度
 * 在 processAchievementEvent 末尾 fire-and-forget 调用
 */
export async function updateTaskProgress(
  userId: string,
  eventType: AchievementEventType,
  count: number = 1,
): Promise<void> {
  const triggerEvent = EVENT_TO_TRIGGER[eventType];
  if (!triggerEvent) return;

  const today = getTodayCN();

  try {
    const cache = await ensureTriggerCache();

    // 查找匹配的未完成任务（仅每日任务）
    const tasks = await prisma.userDailyTask.findMany({
      where: {
        userId,
        isCompleted: false,
        type: 'daily',
        taskDate: today,
      },
    });

    const matchingTasks = tasks.filter(task => cache.get(task.templateCode) === triggerEvent);
    if (matchingTasks.length === 0) return;

    let hasNewDailyCompletion = false;
    await Promise.all(matchingTasks.map(async (task) => {
      const newValue = Math.min(task.currentValue + count, task.targetValue);
      const justCompleted = newValue >= task.targetValue;

      await prisma.userDailyTask.update({
        where: { id: task.id },
        data: {
          currentValue: newValue,
          isCompleted: justCompleted,
          completedAt: justCompleted ? new Date() : task.completedAt,
        },
      });

      if (justCompleted) {
        hasNewDailyCompletion = true;
      }
    }));

    if (hasNewDailyCompletion) {
      await checkAllDailyCompleted(userId, today);
    }
  } catch (error) {
    logger.warn('updateTaskProgress failed:', error);
  }
}

/**
 * 领取单任务 XP 奖励
 */
export async function claimTaskReward(userId: string, taskId: string) {
  const task = await prisma.userDailyTask.findFirst({
    where: { id: taskId, userId },
  });

  if (!task) {
    return { success: false, error: 'task_not_found' };
  }
  if (!task.isCompleted) {
    return { success: false, error: 'task_not_completed' };
  }
  if (task.isClaimed) {
    return { success: false, error: 'already_claimed' };
  }

  await prisma.userDailyTask.update({
    where: { id: taskId },
    data: { isClaimed: true, claimedAt: new Date() },
  });

  const xpResult = await addXP(userId, task.xpReward);

  return {
    success: true,
    xpGained: task.xpReward,
    levelUp: xpResult.levelUp,
    newLevel: xpResult.newLevel,
    totalXp: xpResult.totalXp,
  };
}

/**
 * 领取每日全部完成额外奖励（连续完成天数递增）
 */
export async function claimDailyBonus(userId: string) {
  const today = getTodayCN();

  const dailyTasks = await prisma.userDailyTask.findMany({
    where: { userId, type: 'daily', taskDate: today },
  });

  if (dailyTasks.length === 0) {
    return { success: false, error: 'no_daily_tasks' };
  }
  if (!dailyTasks.every(t => t.isCompleted)) {
    return { success: false, error: 'not_all_completed' };
  }

  const existing = await prisma.userDailyTaskBonus.findUnique({
    where: { userId_taskDate: { userId, taskDate: today } },
  });
  if (existing) {
    return { success: false, error: 'already_claimed' };
  }

  // 动态计算奖励
  const bonusXp = await calculateBonusXp(userId, today);

  await prisma.userDailyTaskBonus.create({
    data: { userId, taskDate: today, xpAwarded: bonusXp },
  });

  const xpResult = await addXP(userId, bonusXp);

  return {
    success: true,
    xpGained: bonusXp,
    levelUp: xpResult.levelUp,
    newLevel: xpResult.newLevel,
    totalXp: xpResult.totalXp,
  };
}

// ==================== 槽位制任务生成 ====================

/**
 * 按槽位制生成 3 个每日任务（词汇+听说+读写）
 * 每个槽位从对应分类的模板池中加权随机选 1 个
 * 引导探索：用户从未使用的功能权重 ×3
 */
async function generateDailyTasks(userId: string, taskDate: string) {
  // 并行获取用户等级和统计数据
  const [levelData, userStats] = await Promise.all([
    prisma.userLevel.findUnique({ where: { userId } }),
    prisma.userStats.findUnique({ where: { userId } }),
  ]);
  const userLevel = levelData?.level ?? 1;

  // 获取所有符合等级的活跃每日模板
  const allTemplates = await prisma.taskTemplate.findMany({
    where: {
      type: 'daily',
      isActive: true,
      minLevel: { lte: userLevel },
      maxLevel: { gte: userLevel },
    },
  });

  if (allTemplates.length === 0) {
    logger.warn(`No daily task templates for level=${userLevel}`);
    return [];
  }

  // 按 triggerEvent 构建分类映射
  const templatesByTrigger = new Map<string, typeof allTemplates>();
  for (const tmpl of allTemplates) {
    const trigger = (tmpl.condition as any)?.triggerEvent;
    if (!trigger) continue;
    const list = templatesByTrigger.get(trigger) ?? [];
    list.push(tmpl);
    templatesByTrigger.set(trigger, list);
  }

  // 为每个槽位选择 1 个模板
  const selected: typeof allTemplates = [];
  const slots = Object.entries(SLOT_TRIGGER_EVENTS);

  for (const [_slotName, triggerEvents] of slots) {
    // 收集该槽位的所有候选模板
    const candidates: typeof allTemplates = [];
    for (const trigger of triggerEvents) {
      const templates = templatesByTrigger.get(trigger);
      if (templates) candidates.push(...templates);
    }

    if (candidates.length === 0) continue;

    // 引导探索：调整权重
    const adjusted = candidates.map(tmpl => {
      const trigger = (tmpl.condition as any)?.triggerEvent;
      const statsField = TRIGGER_TO_STATS_FIELD[trigger];
      let weight = tmpl.weight;

      if (statsField && userStats) {
        const statValue = (userStats as any)[statsField] ?? 0;
        if (statValue === 0) {
          weight *= EXPLORE_WEIGHT_MULTIPLIER;
        }
      }

      return { ...tmpl, weight };
    });

    // 加权随机选 1 个
    const pick = weightedSample(adjusted, 1);
    if (pick.length > 0) selected.push(pick[0]);
  }

  // 批量创建任务实例
  const created = [];
  for (const tmpl of selected) {
    const condition = tmpl.condition as any;
    const targetValue = condition?.target ?? 1;

    try {
      const task = await prisma.userDailyTask.create({
        data: {
          userId,
          templateCode: tmpl.code,
          taskDate,
          type: 'daily',
          nameZh: tmpl.nameZh,
          nameEn: tmpl.nameEn,
          icon: tmpl.icon,
          targetValue,
          xpReward: tmpl.xpReward,
        },
      });
      created.push(task);
    } catch (error: any) {
      if (error.code === 'P2002') {
        const existing = await prisma.userDailyTask.findFirst({
          where: { userId, templateCode: tmpl.code, taskDate },
        });
        if (existing) created.push(existing);
      } else {
        logger.error('generateDailyTasks create failed:', error);
      }
    }
  }

  return created;
}

// ==================== Bonus 连续加成 ====================

/**
 * 计算今日 bonus XP（基于连续完成天数）
 * 公式：min(30 + (streak - 1) * 5, 70)
 * streak = 1 表示今天是第 1 天（或尚未有记录）
 */
async function calculateBonusXp(userId: string, today: string): Promise<number> {
  // 查询近 8 天的 bonus 记录（足够算 7 天连续）
  const startDate = getNDaysAgoCN(8);

  const bonusRecords = await prisma.userDailyTaskBonus.findMany({
    where: {
      userId,
      taskDate: { gte: startDate, lt: today },
    },
    orderBy: { taskDate: 'desc' },
  });

  // 从昨天往前数连续天数
  let streak = 0;
  const yesterday = getYesterdayCN();
  let checkDate = yesterday;

  for (const record of bonusRecords) {
    if (record.taskDate === checkDate) {
      streak++;
      checkDate = prevDateCN(checkDate);
    } else {
      break;
    }
  }

  // streak=0 表示昨天没完成，今天算第 1 天
  // streak=1 表示昨天完成了，今天是连续第 2 天
  const consecutiveDays = streak + 1;
  return Math.min(
    DAILY_BONUS_BASE_XP + (consecutiveDays - 1) * DAILY_BONUS_INCREMENT,
    DAILY_BONUS_MAX_XP,
  );
}

// ==================== 工具函数 ====================

/** 加权随机抽样（不重复） */
function weightedSample<T extends { weight: number; code: string }>(items: T[], count: number): T[] {
  const n = Math.min(count, items.length);
  const result: T[] = [];
  const used = new Set<string>();

  let totalWeight = items.reduce((sum, item) => sum + item.weight, 0);

  for (let i = 0; i < n; i++) {
    let rand = Math.random() * totalWeight;
    for (const item of items) {
      if (used.has(item.code)) continue;
      rand -= item.weight;
      if (rand <= 0) {
        result.push(item);
        used.add(item.code);
        totalWeight -= item.weight;
        break;
      }
    }
  }

  return result;
}

// ==================== 模板 triggerEvent 缓存 ====================

let templateTriggerCache: Map<string, string> | null = null;
let cacheLoadingPromise: Promise<void> | null = null;

async function ensureTriggerCache(): Promise<Map<string, string>> {
  if (templateTriggerCache) return templateTriggerCache;

  if (!cacheLoadingPromise) {
    cacheLoadingPromise = (async () => {
      const templates = await prisma.taskTemplate.findMany({
        where: { isActive: true },
        select: { code: true, condition: true },
      });
      const map = new Map<string, string>();
      for (const tmpl of templates) {
        const cond = tmpl.condition as any;
        if (cond?.triggerEvent) {
          map.set(tmpl.code, cond.triggerEvent);
        }
      }
      templateTriggerCache = map;
    })();
  }
  await cacheLoadingPromise;
  return templateTriggerCache!;
}

/** 检查当天所有每日任务是否全部完成 → 触发成就事件 */
async function checkAllDailyCompleted(userId: string, today: string): Promise<void> {
  const dailyTasks = await prisma.userDailyTask.findMany({
    where: { userId, type: 'daily', taskDate: today },
  });

  if (dailyTasks.length > 0 && dailyTasks.every(t => t.isCompleted)) {
    emitAchievementEvent(userId, 'daily_tasks_all_done');
  }
}
