/**
 * 每日挑战赛 Service
 */
import { prisma } from '@/config/database';
import { getTodayCN, getNDaysAgoCN } from '@/utils/dateUtils';
import { addXP } from './achievementService';

// 题型分布
const QUESTION_TYPES = ['meaningChoice', 'wordChoice', 'listenChoice', 'sentenceFill'];
const TYPE_WEIGHTS = [0.4, 0.2, 0.2, 0.2]; // 40% 看词选义, 20% 看义选词, 20% 听音, 20% 例句

interface QuestionData {
  wordId: string;
  word: string;
  meaningCn: string;
  type: string;
  options: string[];
  correctIndex: number;
  sentence?: string; // for sentenceFill
}

/**
 * 获取今日挑战
 * 如果还没生成，则实时生成
 */
export async function getTodayChallenge() {
  const today = getTodayCN();

  let challenge = await prisma.dailyChallenge.findUnique({
    where: { date: today },
  });

  if (!challenge) {
    challenge = await generateDailyChallenge(today);
  }

  return challenge;
}

/**
 * 生成每日挑战题目
 * 从 words 表按 BNC level 分层抽 20 题
 */
export async function generateDailyChallenge(date: string) {
  // 分层抽样：easy(1-5) 5题, medium(6-10) 8题, hard(11-15) 5题, expert(16+) 2题
  const levels = [
    { min: 1, max: 5, count: 5 },
    { min: 6, max: 10, count: 8 },
    { min: 11, max: 15, count: 5 },
    { min: 16, max: 25, count: 2 },
  ];

  const questions: QuestionData[] = [];

  for (const level of levels) {
    // 查询该难度范围的单词
    const words = await prisma.$queryRaw<any[]>`
      SELECT id, word, "meaningCn"
      FROM words
      WHERE "bncCocaLevel" >= ${level.min}
        AND "bncCocaLevel" <= ${level.max}
        AND "isHeadword" = true
      ORDER BY RANDOM()
      LIMIT ${level.count}
    `;

    for (const w of words) {
      // 随机选择题型
      const rand = Math.random();
      let cumWeight = 0;
      let type = QUESTION_TYPES[0];
      for (let i = 0; i < QUESTION_TYPES.length; i++) {
        cumWeight += TYPE_WEIGHTS[i];
        if (rand < cumWeight) {
          type = QUESTION_TYPES[i];
          break;
        }
      }

      // 生成干扰项
      let options: string[] = [];
      let correctIndex = 0;

      if (type === 'meaningChoice' || type === 'listenChoice') {
        // 选中文释义
        const distractors = await prisma.$queryRaw<any[]>`
          SELECT "meaningCn" FROM words
          WHERE id != ${w.id} AND "meaningCn" IS NOT NULL AND "meaningCn" != ''
          ORDER BY RANDOM() LIMIT 3
        `;
        options = distractors.map((d: any) => d.meaningCn);
        correctIndex = Math.floor(Math.random() * 4);
        options.splice(correctIndex, 0, w.meaningCn);
      } else if (type === 'wordChoice' || type === 'sentenceFill') {
        // 选英文单词
        const distractors = await prisma.$queryRaw<any[]>`
          SELECT word FROM words
          WHERE id != ${w.id} AND word IS NOT NULL AND word != ''
          ORDER BY RANDOM() LIMIT 3
        `;
        options = distractors.map((d: any) => d.word);
        correctIndex = Math.floor(Math.random() * 4);
        options.splice(correctIndex, 0, w.word);
      }

      questions.push({
        wordId: w.id,
        word: w.word,
        meaningCn: w.meaningCn,
        type,
        options,
        correctIndex,
      });
    }
  }

  // 打乱题目顺序
  for (let i = questions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [questions[i], questions[j]] = [questions[j], questions[i]];
  }

  const challenge = await prisma.dailyChallenge.create({
    data: {
      date,
      questions: questions as any,
      totalQuestions: questions.length,
      timeLimit: 300, // 5 minutes
    },
  });

  return challenge;
}

/**
 * 提交挑战结果
 */
export async function submitChallengeResult(
  userId: string,
  date: string,
  score: number,
  correctCount: number,
  totalQuestions: number,
  maxCombo: number,
  duration: number
) {
  // Upsert - 每天只能提交一次
  const result = await prisma.dailyChallengeResult.upsert({
    where: {
      userId_date: { userId, date },
    },
    create: {
      userId,
      date,
      score,
      correctCount,
      totalQuestions,
      maxCombo,
      duration,
    },
    update: {
      // 只有分数更高才更新
      score: { set: score },
      correctCount: { set: correctCount },
      maxCombo: { set: maxCombo },
      duration: { set: duration },
    },
  });

  // 条件奖励
  const accuracy = correctCount / totalQuestions;
  if (accuracy >= 1.0) {
    // 正确率 100%：额外 +20 XP
    try { await addXP(userId, 20); } catch {}
  } else if (accuracy >= 0.8) {
    // 正确率 ≥ 80%：额外 +10 XP
    try { await addXP(userId, 10); } catch {}
  }

  // 第1名额外奖励
  const rank = await getUserRank(userId, date);
  if (rank === 1) {
    try { await addXP(userId, 30); } catch {}
  }

  return result;
}

/**
 * 获取排行榜
 */
export async function getLeaderboard(date: string, limit: number = 50) {
  const results = await prisma.dailyChallengeResult.findMany({
    where: { date },
    orderBy: [{ score: 'desc' }, { duration: 'asc' }],
    take: limit,
  });

  // 加载用户信息
  const userIds = results.map(r => r.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, nickname: true, avatar: true },
  });
  const userMap = new Map(users.map(u => [u.id, u]));

  return results.map((r, index) => ({
    rank: index + 1,
    userId: r.userId,
    nickname: userMap.get(r.userId)?.nickname || '未知用户',
    avatar: userMap.get(r.userId)?.avatar || null,
    score: r.score,
    correctCount: r.correctCount,
    maxCombo: r.maxCombo,
    duration: r.duration,
  }));
}

/**
 * 获取用户历史统计
 */
export async function getUserStats(userId: string) {
  const results = await prisma.dailyChallengeResult.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
  });

  if (results.length === 0) {
    return {
      totalDays: 0,
      avgScore: 0,
      bestScore: 0,
      currentStreak: 0,
    };
  }

  const totalDays = results.length;
  const avgScore = Math.round(results.reduce((sum, r) => sum + r.score, 0) / totalDays);
  const bestScore = Math.max(...results.map(r => r.score));

  // 计算连续参与天数（从昨天开始往前数，今天有记录则+1）
  let streak = 0;
  const today = getTodayCN();
  let checkIdx = 0;

  // 如果最近一条是今天，先跳过（今天还没结束）
  if (results.length > 0 && results[0].date === today) {
    checkIdx = 1;
  }

  // 从昨天开始往前数连续天数
  for (let i = checkIdx; i < results.length; i++) {
    const expected = getNDaysAgoCN(i - checkIdx + 1);
    if (results[i].date === expected) {
      streak++;
    } else {
      break;
    }
  }

  // 今天有参加则 +1
  if (results.length > 0 && results[0].date === today) {
    streak++;
  }

  return { totalDays, avgScore, bestScore, currentStreak: streak };
}

/**
 * 获取用户在某天的排名
 */
export async function getUserRank(userId: string, date: string): Promise<number | null> {
  const userResult = await prisma.dailyChallengeResult.findUnique({
    where: { userId_date: { userId, date } },
  });

  if (!userResult) return null;

  const higherCount = await prisma.dailyChallengeResult.count({
    where: {
      date,
      OR: [
        { score: { gt: userResult.score } },
        { score: userResult.score, duration: { lt: userResult.duration } },
      ],
    },
  });

  return higherCount + 1;
}
