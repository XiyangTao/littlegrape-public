/**
 * AI 自适应学习路径服务
 * 基于规则引擎的个性化学习推荐
 */

import { prisma } from '@/config/database';
import { getTodayCN, getNDaysAgoCN } from '@/utils/dateUtils';

// ==================== 学习阶段定义 ====================

type LearningPhase = 'beginner' | 'elementary' | 'intermediate' | 'upper_intermediate' | 'advanced';

interface PhaseConfig {
  phase: LearningPhase;
  minVocab: number;
  maxVocab: number;
  dailyNewWords: number;
  dailyReview: number;
  focusAreas: string[];
}

const PHASE_CONFIGS: PhaseConfig[] = [
  { phase: 'beginner', minVocab: 0, maxVocab: 500, dailyNewWords: 5, dailyReview: 10, focusAreas: ['basic_vocabulary', 'pronunciation'] },
  { phase: 'elementary', minVocab: 500, maxVocab: 2000, dailyNewWords: 10, dailyReview: 15, focusAreas: ['daily_vocabulary', 'listening', 'conversation'] },
  { phase: 'intermediate', minVocab: 2000, maxVocab: 5000, dailyNewWords: 15, dailyReview: 20, focusAreas: ['academic_vocabulary', 'reading', 'listening'] },
  { phase: 'upper_intermediate', minVocab: 5000, maxVocab: 8000, dailyNewWords: 15, dailyReview: 25, focusAreas: ['advanced_vocabulary', 'reading', 'story'] },
  { phase: 'advanced', minVocab: 8000, maxVocab: 99999, dailyNewWords: 20, dailyReview: 30, focusAreas: ['specialized_vocabulary', 'conversation', 'reading'] },
];

// ==================== 推荐动作类型 ====================

interface Recommendation {
  type: 'word_learn' | 'word_review' | 'conversation' | 'reading' | 'listening' | 'pronunciation' | 'story' | 'diary' | 'vocabulary_test';
  priority: number; // 1-10, 越高越优先
  reason: string;
  reasonZh: string;
  targetRoute: string;
  meta?: Record<string, any>;
}

interface LearningPathResult {
  phase: LearningPhase;
  phaseProgress: number; // 0-100，当前阶段进度百分比
  level: number;
  xp: number;
  totalLearned: number;
  totalMastered: number;
  streakDays: number;
  estimatedVocabulary: number | null;
  todayStats: { learned: number; reviewed: number; mastered: number };
  dailyGoals: { newWords: number; review: number };
  recommendations: Recommendation[];
  weeklyActivity: number[]; // 最近7天每天学习的单词数
}

// ==================== 核心函数 ====================

export async function getLearningPath(userId: string): Promise<LearningPathResult> {
  // 并行查询所有需要的数据
  const [
    userLevel,
    latestVocabTest,
    wordStats,
    todayStats,
    recentDailyStats,
    achievementCount,
    readingCount,
    listeningCount,
    storyCount,
    diaryCount,
  ] = await Promise.all([
    // 1. 用户等级
    prisma.userLevel.findUnique({ where: { userId } }),
    // 2. 最新词汇测试
    prisma.userVocabularyTest.findFirst({
      where: { userId },
      orderBy: { eventTime: 'desc' },
    }),
    // 3. 单词学习统计
    prisma.userWordProgress.groupBy({
      by: ['status'],
      where: { userId },
      _count: true,
    }),
    // 4. 今日统计
    getTodayStats(userId),
    // 5. 最近7天统计
    getRecentDailyStats(userId, 7),
    // 6. 成就数量
    prisma.userAchievement.count({ where: { userId } }),
    // 7. 精读进度数
    prisma.userReadingProgress.count({ where: { userId, status: 'completed' } }),
    // 8. 听力进度数
    prisma.userListeningProgress.count({ where: { userId } }),
    // 9. 剧情进度数
    prisma.userStoryProgress.count({ where: { userId, status: 'completed' } }),
    // 10. 口语日记数
    prisma.userSpeakingDiary.count({ where: { userId } }),
  ]);

  // 计算总学习/掌握数
  const totalLearned = wordStats.reduce((sum, s) => sum + s._count, 0);
  const totalMastered = wordStats.find(s => s.status === 'mastered')?._count ?? 0;

  // 预估词汇量：优先用测试结果，否则用学习数据估算
  const estimatedVocabulary = latestVocabTest?.estimatedVocabulary ?? Math.round(totalLearned * 0.7);

  // 确定学习阶段
  const phase = determinePhase(estimatedVocabulary);
  const phaseConfig = PHASE_CONFIGS.find(p => p.phase === phase)!;
  const phaseProgress = calculatePhaseProgress(estimatedVocabulary, phaseConfig);

  // 计算连续天数
  const streakDays = calculateStreakDays(recentDailyStats);

  // 最近7天活动量
  const weeklyActivity = recentDailyStats.map(d => d.learnedCount + d.reviewedCount);

  // 生成推荐
  const recommendations = generateRecommendations({
    phase,
    phaseConfig,
    todayStats,
    totalLearned,
    totalMastered,
    estimatedVocabulary,
    readingCount,
    listeningCount,
    storyCount,
    diaryCount,
    latestVocabTest,
    streakDays,
  });

  return {
    phase,
    phaseProgress,
    level: userLevel?.level ?? 1,
    xp: userLevel?.xp ?? 0,
    totalLearned,
    totalMastered,
    streakDays,
    estimatedVocabulary: latestVocabTest?.estimatedVocabulary ?? null,
    todayStats,
    dailyGoals: {
      newWords: phaseConfig.dailyNewWords,
      review: phaseConfig.dailyReview,
    },
    recommendations,
    weeklyActivity,
  };
}

// ==================== 辅助函数 ====================

function determinePhase(estimatedVocabulary: number): LearningPhase {
  for (const config of PHASE_CONFIGS) {
    if (estimatedVocabulary >= config.minVocab && estimatedVocabulary < config.maxVocab) {
      return config.phase;
    }
  }
  return 'advanced';
}

function calculatePhaseProgress(vocab: number, config: PhaseConfig): number {
  const range = config.maxVocab - config.minVocab;
  const progress = ((vocab - config.minVocab) / range) * 100;
  return Math.min(Math.max(Math.round(progress), 0), 100);
}

async function getTodayStats(userId: string) {
  const today = getTodayCN();
  const stats = await prisma.userDailyStats.findUnique({
    where: { userId_eventDate: { userId, eventDate: today } },
  });
  return {
    learned: stats?.learnedCount ?? 0,
    reviewed: stats?.reviewedCount ?? 0,
    mastered: stats?.masteredCount ?? 0,
  };
}

async function getRecentDailyStats(userId: string, days: number) {
  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    dates.push(getNDaysAgoCN(i));
  }

  const stats = await prisma.userDailyStats.findMany({
    where: { userId, eventDate: { in: dates } },
  });

  return dates.map(date => {
    const s = stats.find(st => st.eventDate === date);
    return {
      date,
      learnedCount: s?.learnedCount ?? 0,
      masteredCount: s?.masteredCount ?? 0,
      reviewedCount: s?.reviewedCount ?? 0,
    };
  });
}

function calculateStreakDays(recentStats: { date: string; learnedCount: number; reviewedCount: number }[]): number {
  let streak = 0;
  // 从昨天开始往前数（今天还没结束）
  for (let i = recentStats.length - 2; i >= 0; i--) {
    if (recentStats[i].learnedCount + recentStats[i].reviewedCount > 0) {
      streak++;
    } else {
      break;
    }
  }
  // 如果今天也有学习，加 1
  const today = recentStats[recentStats.length - 1];
  if (today && (today.learnedCount + today.reviewedCount > 0)) {
    streak++;
  }
  return streak;
}

interface RecommendationContext {
  phase: LearningPhase;
  phaseConfig: PhaseConfig;
  todayStats: { learned: number; reviewed: number; mastered: number };
  totalLearned: number;
  totalMastered: number;
  estimatedVocabulary: number;
  readingCount: number;
  listeningCount: number;
  storyCount: number;
  diaryCount: number;
  latestVocabTest: any;
  streakDays: number;
}

function generateRecommendations(ctx: RecommendationContext): Recommendation[] {
  const recs: Recommendation[] = [];

  // 1. 复习推荐（服务端复习系统已移除，由客户端本地管理）

  // 2. 今日新词目标未完成
  const newWordsRemaining = ctx.phaseConfig.dailyNewWords - ctx.todayStats.learned;
  if (newWordsRemaining > 0) {
    recs.push({
      type: 'word_learn',
      priority: 9,
      reason: `Learn ${newWordsRemaining} more words today`,
      reasonZh: `今日还需学习 ${newWordsRemaining} 个新词`,
      targetRoute: 'WordLearn',
      meta: { remaining: newWordsRemaining, goal: ctx.phaseConfig.dailyNewWords },
    });
  }

  // 3. 如果没做过词汇测试，推荐测试
  if (!ctx.latestVocabTest) {
    recs.push({
      type: 'vocabulary_test',
      priority: 8,
      reason: 'Take a vocabulary test to get personalized recommendations',
      reasonZh: '做一次词汇量测试，获取更精准的学习推荐',
      targetRoute: 'VocabularyTest',
    });
  }

  // 4. 发音练习（初学者优先级更高）
  if (ctx.phase === 'beginner' || ctx.phase === 'elementary') {
    recs.push({
      type: 'pronunciation',
      priority: 7,
      reason: 'Practice pronunciation to build a solid foundation',
      reasonZh: '练习发音，打好基础',
      targetRoute: 'PhonemePractice',
    });
  }

  // 5. 对话练习（中级以上）
  if (ctx.phase !== 'beginner') {
    recs.push({
      type: 'conversation',
      priority: ctx.phase === 'intermediate' ? 7 : 6,
      reason: 'Practice speaking with AI to improve fluency',
      reasonZh: '与 AI 对话，提升口语流畅度',
      targetRoute: 'ConversationList',
    });
  }

  // 6. 精读推荐
  if (ctx.phase !== 'beginner') {
    recs.push({
      type: 'reading',
      priority: ctx.readingCount === 0 ? 7 : 5,
      reason: ctx.readingCount === 0 ? 'Try reading your first article' : 'Continue reading to expand vocabulary',
      reasonZh: ctx.readingCount === 0 ? '尝试阅读第一篇文章' : '继续阅读，扩展词汇量',
      targetRoute: 'ReadingList',
    });
  }

  // 7. 听力训练
  if (ctx.phase !== 'beginner') {
    recs.push({
      type: 'listening',
      priority: ctx.listeningCount === 0 ? 6 : 4,
      reason: ctx.listeningCount === 0 ? 'Start your first listening exercise' : 'Practice listening comprehension',
      reasonZh: ctx.listeningCount === 0 ? '开始第一次听力练习' : '继续听力训练',
      targetRoute: 'ListeningList',
    });
  }

  // 8. 剧情模式（有趣的学习方式）
  recs.push({
    type: 'story',
    priority: ctx.storyCount === 0 ? 5 : 3,
    reason: ctx.storyCount === 0 ? 'Try story mode for immersive learning' : 'Continue your story adventure',
    reasonZh: ctx.storyCount === 0 ? '试试剧情模式，沉浸式学习' : '继续你的剧情冒险',
    targetRoute: 'StoryList',
  });

  // 9. 口语日记
  if (ctx.phase !== 'beginner') {
    recs.push({
      type: 'diary',
      priority: ctx.diaryCount === 0 ? 5 : 3,
      reason: ctx.diaryCount === 0 ? 'Write your first speaking diary' : 'Practice daily expression',
      reasonZh: ctx.diaryCount === 0 ? '写你的第一篇口语日记' : '每日表达练习',
      targetRoute: 'SpeakingDiary',
    });
  }

  // 按优先级排序
  recs.sort((a, b) => b.priority - a.priority);

  // 最多返回6条
  return recs.slice(0, 6);
}
