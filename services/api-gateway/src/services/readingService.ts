/**
 * 精读服务
 * 管理精读文章、用户阅读进度
 */

import { prisma } from '@/config/database';
import { Prisma } from '@prisma/client';
import { SOURCE_DISPLAY_MAP } from '@/services/rssService';

// ==================== 分类默认配图 ====================
// 每个分类 50 张通用图片，文章无图时按 ID 确定性选取一张
const FALLBACK_CATEGORIES = ['science', 'culture', 'travel', 'food', 'health', 'education', 'general'] as const;
const CATEGORY_FALLBACK_IMAGES: Record<string, string[]> = Object.fromEntries(
  FALLBACK_CATEGORIES.map(cat => [
    cat,
    Array.from({ length: 50 }, (_, i) =>
      `https://cdn.coderhythm.cn/littlegrape/images/readingcover/${cat}_${String(i + 1).padStart(2, '0')}.jpg`
    ),
  ])
);

function getFallbackImage(articleId: string, category: string, publishDate?: string | null): string | null {
  const images = CATEGORY_FALLBACK_IMAGES[category] || CATEGORY_FALLBACK_IMAGES.general;
  if (!images || images.length === 0) return null;
  // 用 publishDate + articleId 生成 hash，同一天的文章选不同的图
  const seed = (publishDate || '') + articleId;
  const hash = seed.split('').reduce((h, c) => ((h << 5) + h + c.charCodeAt(0)) >>> 0, 5381);
  return images[hash % images.length];
}

// ==================== 核心功能 ====================

/** 获取文章列表（支持筛选+游标分页，只返回 publishDate <= 今天的文章） */
export async function getArticleList(params?: {
  level?: string;
  category?: string;
  yearMonth?: string;
  cursor?: string;
  limit?: number;
}) {
  const limit = params?.limit || 20;
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
  const where: Prisma.ReadingArticleWhereInput = {
    isPublished: true,
    pipelineStatus: 'ready',
    publishDate: { lte: today },
  };
  if (params?.level) where.level = params.level;
  if (params?.category) where.category = params.category;
  if (params?.yearMonth) {
    where.publishDate = { startsWith: params.yearMonth, lte: today };
  }

  const articles = await prisma.readingArticle.findMany({
    where,
    select: {
      id: true,
      title: true,
      titleZh: true,
      level: true,
      category: true,
      wordCount: true,
      imageUrl: true,
      source: true,
      publishDate: true,
      contentCompressed: true,
      createdAt: true,
    },
    orderBy: [{ publishDate: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    ...(params?.cursor ? { skip: 1, cursor: { id: params.cursor } } : {}),
  });

  const hasMore = articles.length > limit;
  const items = hasMore ? articles.slice(0, limit) : articles;

  const result = items.map(a => ({
    id: a.id,
    title: a.title,
    titleZh: a.titleZh,
    level: a.level,
    category: a.category,
    wordCount: a.contentCompressed
      ? (a.contentCompressed as string).split(/\s+/).filter(Boolean).length
      : a.wordCount,
    imageUrl: a.imageUrl || getFallbackImage(a.id, a.category, a.publishDate),
    source: SOURCE_DISPLAY_MAP[a.source || ''] || a.source,
    publishDate: a.publishDate,
    createdAt: a.createdAt,
  }));

  return {
    articles: result,
    nextCursor: hasMore ? items[items.length - 1].id : null,
  };
}

/** 获取有文章的月份列表（只统计 publishDate <= 今天的文章） */
export async function getArticleMonths() {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
  const rows = await prisma.$queryRaw<Array<{ month: string; count: bigint }>>`
    SELECT LEFT("publishDate", 7) AS month, COUNT(*) AS count
    FROM reading_articles
    WHERE "isPublished" = true
      AND "pipelineStatus" = 'ready'
      AND "publishDate" IS NOT NULL
      AND "publishDate" <= ${today}
    GROUP BY LEFT("publishDate", 7)
    ORDER BY month DESC
  `;
  return rows.map(r => ({ month: r.month, count: Number(r.count) }));
}

/** 获取文章详情（只返回已发布文章，不暴露内部字段） */
export async function getArticleDetail(articleId: string) {
  return prisma.readingArticle.findUnique({
    where: { id: articleId, isPublished: true },
    select: {
      id: true,
      title: true,
      titleZh: true,
      level: true,
      category: true,
      wordCount: true,
      imageUrl: true,
      source: true,
      summary: true,
      summaryZh: true,
      publishDate: true,
      teacherId: true,
      pipelineVersion: true,
      audioUrl: true,
      explanationAudioUrl: true,
      createdAt: true,
    },
  });
}

/** 获取用户阅读进度 */
export async function getUserReadingProgress(userId: string) {
  return prisma.userReadingProgress.findMany({
    where: { userId },
  });
}

/** 更新阅读进度 */
export async function updateReadingProgress(
  userId: string,
  articleId: string,
  data: { status?: string; readTime?: number; quizScore?: number }
) {
  const updateData: Prisma.UserReadingProgressUpdateInput = {};
  if (data.status) updateData.status = data.status;
  if (data.readTime !== undefined) updateData.readTime = { increment: data.readTime };
  if (data.quizScore !== undefined) updateData.quizScore = data.quizScore;
  if (data.status === 'completed') updateData.completedAt = new Date();

  return prisma.userReadingProgress.upsert({
    where: {
      userId_articleId: { userId, articleId },
    },
    create: {
      userId,
      articleId,
      status: data.status || 'reading',
      readTime: data.readTime || 0,
      quizScore: data.quizScore,
    },
    update: updateData,
  });
}


// ==================== 精读扩展功能 ====================

/** 获取今日精读推荐（每个 level 最多一篇） */
export async function getDailyReading(userId: string) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
  const levels = ['beginner', 'intermediate', 'advanced'] as const;

  // 查今日所有已发布文章
  let articles = await prisma.readingArticle.findMany({
    where: { isPublished: true, pipelineStatus: 'ready', publishDate: today },
    orderBy: { createdAt: 'desc' },
  });

  // 没有今日文章时取最新的已发布文章（每个 level 一篇）
  if (articles.length === 0) {
    const latest = await Promise.all(
      levels.map(level =>
        prisma.readingArticle.findFirst({
          where: { isPublished: true, pipelineStatus: 'ready', level, publishDate: { lte: today } },
          orderBy: [{ publishDate: 'desc' }, { createdAt: 'desc' }],
        })
      )
    );
    articles = latest.filter((a): a is NonNullable<typeof a> => a !== null);
  }

  if (articles.length === 0) return null;

  // 每个 level 只保留一篇（今日可能同 level 有多篇）
  const seen = new Set<string>();
  const unique = articles.filter(a => {
    if (seen.has(a.level)) return false;
    seen.add(a.level);
    return true;
  });

  // 批量获取用户进度
  const progressList = await prisma.userReadingProgress.findMany({
    where: { userId, articleId: { in: unique.map(a => a.id) } },
  });
  const progressMap = new Map(progressList.map(p => [p.articleId, p]));

  return unique.map(article => {
    const progress = progressMap.get(article.id);
    const displayWordCount = article.contentCompressed
      ? article.contentCompressed.split(/\s+/).filter(Boolean).length
      : article.wordCount;

    return {
      article: {
        id: article.id,
        title: article.title,
        titleZh: article.titleZh,
        level: article.level,
        category: article.category,
        wordCount: displayWordCount,
        summary: article.summary,
        summaryZh: article.summaryZh,
        imageUrl: article.imageUrl || getFallbackImage(article.id, article.category, article.publishDate),
        source: SOURCE_DISPLAY_MAP[article.source || ''] || article.source,
        publishDate: article.publishDate,
      },
      progress: progress ? {
        status: progress.status,
        currentStep: progress.currentStep,
        currentParagraph: progress.currentParagraph,
        readTime: progress.readTime,
        quizScore: progress.quizScore,
      } : null,
    };
  });
}

/** 获取完整精读数据（含 paragraphs/keyVocabulary/quiz） */
export async function getIntensiveArticle(articleId: string) {
  const article = await prisma.readingArticle.findUnique({
    where: { id: articleId, isPublished: true, pipelineStatus: 'ready' },
  });

  if (!article) return null;

  const displayWordCount = article.contentCompressed
    ? article.contentCompressed.split(/\s+/).filter(Boolean).length
    : article.wordCount;

  return {
    id: article.id,
    title: article.title,
    titleZh: article.titleZh,
    contentZh: article.contentZh,
    level: article.level,
    category: article.category,
    wordCount: displayWordCount,
    imageUrl: article.imageUrl || getFallbackImage(article.id, article.category, article.publishDate),
    summary: article.summary,
    summaryZh: article.summaryZh,
    paragraphs: article.paragraphs,
    keyVocabulary: article.keyVocabulary,
    quiz: article.quiz,
    audioUrl: article.audioUrl,
    audioTimestamps: article.audioTimestamps,
    paragraphAudios: article.paragraphAudios,
    introZh: article.introZh,
    introAudioScript: article.introAudioScript,
    introAudioUrl: article.introAudioUrl,
    explanationScript: article.explanationScript,
    explanationAudioUrl: article.explanationAudioUrl,
    explanationMapping: article.explanationMapping,
    source: SOURCE_DISPLAY_MAP[article.source || ''] || article.source,
    publishDate: article.publishDate,
    teacherId: article.teacherId,
    pipelineVersion: article.pipelineVersion,
  };
}

/** 提交练习答案并批改 */
export async function submitQuiz(
  userId: string,
  articleId: string,
  answers: Array<{ questionId: string; answer: string }>
) {
  const article = await prisma.readingArticle.findUnique({
    where: { id: articleId },
    select: { quiz: true },
  });

  if (!article?.quiz) throw new Error('文章不存在或无练习题');
  if (answers.length === 0) throw new Error('答案不能为空');

  const quizQuestions = article.quiz as Array<{
    id: string;
    answer: string;
    explanation: string;
  }>;

  // 批改（trim + 大小写不敏感，兼容客户端传值差异）
  const results = answers.map(a => {
    const question = quizQuestions.find(q => q.id === a.questionId);
    const isCorrect = question
      ? question.answer.trim().toLowerCase() === a.answer.trim().toLowerCase()
      : false;
    return {
      questionId: a.questionId,
      answer: a.answer,
      isCorrect,
      correctAnswer: question?.answer || '',
      explanation: question?.explanation || '',
    };
  });

  const correctCount = results.filter(r => r.isCorrect).length;
  const total = quizQuestions.length;
  const score = Math.round((correctCount / total) * 100);

  // 更新进度
  await prisma.userReadingProgress.upsert({
    where: { userId_articleId: { userId, articleId } },
    create: {
      userId,
      articleId,
      quizScore: score,
      quizAnswers: results,
      currentStep: 4,
      status: 'completed',
      completedAt: new Date(),
    },
    update: {
      quizScore: score,
      quizAnswers: results,
      currentStep: 4,
      status: 'completed',
      completedAt: new Date(),
    },
  });

  return { score, correctCount, total, results };
}

/** 更新五步进度 */
export async function updateReadingStep(
  userId: string,
  articleId: string,
  step: number,
  paragraph?: number
) {
  const updateData: Prisma.UserReadingProgressUpdateInput = { currentStep: step };
  if (paragraph !== undefined) updateData.currentParagraph = paragraph;

  return prisma.userReadingProgress.upsert({
    where: { userId_articleId: { userId, articleId } },
    create: {
      userId,
      articleId,
      currentStep: step,
      currentParagraph: paragraph || 0,
    },
    update: updateData,
  });
}
