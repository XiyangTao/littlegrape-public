/**
 * 助手记忆服务
 * 从各数据表聚合用户画像快照，作为 AI system prompt 的数据源
 */

import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { getTodayCN, getNDaysAgoCN } from '@/utils/dateUtils';

// ==================== 类型定义 ====================

interface UserProfile {
  nickname: string;
  gender: string | null;
  birthday: string | null;
  bio: string | null;
  level: number;
  xp: number;
  estimatedVocabulary: number | null;
  vocabularyLevel: string | null;
}

interface LearningStats {
  totalLearned: number;
  totalMastered: number;
  totalReviewed: number;
  totalConversations: number;
  totalListening: number;
  totalReading: number;
  totalDiaries: number;
  streakDays: number;
  maxStreakDays: number;
  lastActiveDate: string | null;
}

interface DayProgress {
  date: string;
  learned: number;
  mastered: number;
  reviewed: number;
}

interface RecentProgress {
  todayLearned: number;
  todayMastered: number;
  todayReviewed: number;
  last7Days: DayProgress[];
  weakWords: string[];
  recentDiaryScore: number | null;
}

export interface AssistantMemoryData {
  userProfile: UserProfile;
  learningStats: LearningStats;
  recentProgress: RecentProgress;
  preferences: Record<string, any>;
  aiInsights: Record<string, any> | null;
}

// ==================== 缓存 ====================

const MEMORY_CACHE_TTL_MS = 10 * 60 * 1000; // 10 分钟

// ==================== 核心方法 ====================

/**
 * 获取或刷新用户记忆
 * 如果缓存未过期则直接返回，否则重新聚合
 */
export async function getOrRefreshMemory(userId: string): Promise<AssistantMemoryData> {
  try {
    const existing = await prisma.assistantMemory.findUnique({ where: { userId } });

    if (existing && existing.lastSnapshotAt && (Date.now() - existing.lastSnapshotAt.getTime()) < MEMORY_CACHE_TTL_MS) {
      return {
        userProfile: existing.userProfile as any,
        learningStats: existing.learningStats as any,
        recentProgress: existing.recentProgress as any,
        preferences: existing.preferences as any,
        aiInsights: existing.aiInsights as any,
      };
    }

    return await refreshMemory(userId);
  } catch (error) {
    logger.error('获取助手记忆失败:', error);
    return getDefaultMemory();
  }
}

/**
 * 强制刷新用户记忆
 */
export async function refreshMemory(userId: string): Promise<AssistantMemoryData> {
  const [userProfile, learningStats, recentProgress] = await Promise.all([
    buildUserProfile(userId),
    buildLearningStats(userId),
    buildRecentProgress(userId),
  ]);

  const data: AssistantMemoryData = {
    userProfile,
    learningStats,
    recentProgress,
    preferences: {},
    aiInsights: null,
  };

  // 从现有记忆中保留 preferences 和 aiInsights
  const existing = await prisma.assistantMemory.findUnique({ where: { userId } });
  if (existing) {
    data.preferences = (existing.preferences as any) || {};
    data.aiInsights = (existing.aiInsights as any) || null;
  }

  // Upsert 记忆快照
  await prisma.assistantMemory.upsert({
    where: { userId },
    create: {
      userId,
      userProfile: data.userProfile as any,
      learningStats: data.learningStats as any,
      recentProgress: data.recentProgress as any,
      preferences: data.preferences,
      aiInsights: data.aiInsights as any ?? undefined,
      lastSnapshotAt: new Date(),
    },
    update: {
      userProfile: data.userProfile as any,
      learningStats: data.learningStats as any,
      recentProgress: data.recentProgress as any,
      lastSnapshotAt: new Date(),
    },
  });

  return data;
}

/**
 * 更新 AI 洞察（对话中提取的用户特征）
 */
export async function updateAiInsights(userId: string, insights: Record<string, any>): Promise<void> {
  try {
    await prisma.assistantMemory.update({
      where: { userId },
      data: { aiInsights: insights },
    });
  } catch (error) {
    logger.error('更新 AI 洞察失败:', error);
  }
}

/**
 * 更新用户偏好（从对话中提取的）
 */
export async function updatePreferences(userId: string, newPrefs: Record<string, any>): Promise<void> {
  try {
    const existing = await prisma.assistantMemory.findUnique({ where: { userId } });
    const merged = { ...((existing?.preferences as any) || {}), ...newPrefs };
    await prisma.assistantMemory.update({
      where: { userId },
      data: { preferences: merged },
    });
  } catch (error) {
    logger.error('更新用户偏好失败:', error);
  }
}

// ==================== 数据聚合 ====================

async function buildUserProfile(userId: string): Promise<UserProfile> {
  const [user, level, vocabTest] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { nickname: true, gender: true, birthday: true, bio: true },
    }),
    prisma.userLevel.findUnique({ where: { userId } }),
    prisma.userVocabularyTest.findFirst({
      where: { userId },
      orderBy: { eventTime: 'desc' },
    }),
  ]);

  return {
    nickname: user?.nickname || '同学',
    gender: user?.gender || null,
    birthday: user?.birthday || null,
    bio: user?.bio || null,
    level: level?.level || 1,
    xp: level?.xp || 0,
    estimatedVocabulary: vocabTest?.estimatedVocabulary || null,
    vocabularyLevel: vocabTest?.level || null,
  };
}

async function buildLearningStats(userId: string): Promise<LearningStats> {
  const stats = await prisma.userStats.findUnique({ where: { userId } });

  return {
    totalLearned: stats?.totalLearned || 0,
    totalMastered: stats?.totalMastered || 0,
    totalReviewed: stats?.totalReviewed || 0,
    totalConversations: stats?.totalConversations || 0,
    totalListening: stats?.totalListening || 0,
    totalReading: stats?.totalReading || 0,
    totalDiaries: stats?.totalDiaries || 0,
    streakDays: stats?.streakDays || 0,
    maxStreakDays: stats?.maxStreakDays || 0,
    lastActiveDate: stats?.lastActiveDate || null,
  };
}

async function buildRecentProgress(userId: string): Promise<RecentProgress> {
  const today = getTodayCN();
  const sevenDaysAgo = getNDaysAgoCN(7);

  const [dailyStats, weakWords, recentDiary] = await Promise.all([
    // 近 7 天每日统计
    prisma.userDailyStats.findMany({
      where: { userId, eventDate: { gte: sevenDaysAgo, lte: today } },
      orderBy: { eventDate: 'asc' },
    }),
    // 薄弱单词 TOP 10（错 3 次以上）
    prisma.userDifficultWord.findMany({
      where: { userId, wrongCount: { gte: 3 } },
      include: { word: { select: { word: true } } },
      orderBy: { wrongCount: 'desc' },
      take: 10,
    }),
    // 最近口语日记评分
    prisma.userSpeakingDiary.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { aiScore: true },
    }),
  ]);

  const todayStats = dailyStats.find(s => s.eventDate === today);

  return {
    todayLearned: todayStats?.learnedCount || 0,
    todayMastered: todayStats?.masteredCount || 0,
    todayReviewed: todayStats?.reviewedCount || 0,
    last7Days: dailyStats.map(s => ({
      date: s.eventDate,
      learned: s.learnedCount,
      mastered: s.masteredCount,
      reviewed: s.reviewedCount,
    })),
    weakWords: weakWords.map(w => w.word.word),
    recentDiaryScore: recentDiary?.aiScore || null,
  };
}

// ==================== System Prompt ====================

/**
 * 构建 AI 助手的 system prompt
 */
export function buildSystemPrompt(memory: AssistantMemoryData): string {
  const { userProfile: p, learningStats: s, recentProgress: r, aiInsights } = memory;

  const sections: string[] = [];

  // 角色设定
  sections.push(`你是小葡萄学习助手，一个温暖、专业、有趣的英语学习伙伴。`);

  // 用户画像
  const profileLines: string[] = [];
  profileLines.push(`- 昵称: ${p.nickname}`);
  if (p.gender && p.gender !== 'private') profileLines.push(`- 性别: ${p.gender === 'male' ? '男' : '女'}`);
  if (p.birthday) profileLines.push(`- 生日: ${p.birthday}`);
  if (p.bio) profileLines.push(`- 个人签名: ${p.bio}`);
  profileLines.push(`- 等级: Lv.${p.level} (${p.xp} XP)`);
  if (p.estimatedVocabulary) profileLines.push(`- 词汇量: 约 ${p.estimatedVocabulary} 词 (${p.vocabularyLevel})`);
  sections.push(`## 用户画像\n${profileLines.join('\n')}`);

  // 学习数据
  const statsLines: string[] = [];
  statsLines.push(`- 累计学习: ${s.totalLearned} 词, 掌握 ${s.totalMastered} 词`);
  statsLines.push(`- 连续打卡: ${s.streakDays} 天 (最长 ${s.maxStreakDays} 天)`);
  statsLines.push(`- 今日进度: 学习 ${r.todayLearned} 词, 掌握 ${r.todayMastered} 词, 复习 ${r.todayReviewed} 词`);
  if (s.totalConversations > 0) statsLines.push(`- AI 对话: ${s.totalConversations} 次`);
  if (s.totalDiaries > 0) statsLines.push(`- 口语日记: ${s.totalDiaries} 篇${r.recentDiaryScore ? ` (最近评分 ${r.recentDiaryScore}/10)` : ''}`);

  // 近 7 天趋势
  if (r.last7Days.length > 0) {
    const trend = r.last7Days.map(d => `${d.date.slice(5)}:${d.learned}`).join(', ');
    statsLines.push(`- 近 7 天学习趋势: ${trend}`);
  }

  if (r.weakWords.length > 0) {
    statsLines.push(`- 薄弱单词: ${r.weakWords.join(', ')}`);
  }
  sections.push(`## 学习数据\n${statsLines.join('\n')}`);

  // AI 洞察
  if (aiInsights && Object.keys(aiInsights).length > 0) {
    sections.push(`## AI 洞察\n${JSON.stringify(aiInsights, null, 2)}`);
  }

  // 交互原则
  sections.push(`## 交互原则
1. 用中文交流，英语内容用英文
2. 回复简洁有温度，每次不超过 3 段
3. 基于上面的学习数据给出具体、可执行的建议
4. 适时鼓励，不空泛夸奖，引用具体数据
5. 记住用户提到的个人信息，后续对话中自然引用
6. 生日和节日时主动送上祝福
7. 发现学习异常（如连续下滑、长期未学）时温和提醒`);

  return sections.join('\n\n');
}

// ==================== 辅助方法 ====================

function getDefaultMemory(): AssistantMemoryData {
  return {
    userProfile: {
      nickname: '同学',
      gender: null,
      birthday: null,
      bio: null,
      level: 1,
      xp: 0,
      estimatedVocabulary: null,
      vocabularyLevel: null,
    },
    learningStats: {
      totalLearned: 0,
      totalMastered: 0,
      totalReviewed: 0,
      totalConversations: 0,
      totalListening: 0,
      totalReading: 0,
      totalDiaries: 0,
      streakDays: 0,
      maxStreakDays: 0,
      lastActiveDate: null,
    },
    recentProgress: {
      todayLearned: 0,
      todayMastered: 0,
      todayReviewed: 0,
      last7Days: [],
      weakWords: [],
      recentDiaryScore: null,
    },
    preferences: {},
    aiInsights: null,
  };
}
