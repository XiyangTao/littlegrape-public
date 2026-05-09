/**
 * 安妮老师的英语课服务（VOA Let's Learn English 改编）
 *
 * 单课闯关式 micro-lesson:
 *   关 1 课程目标 / 关 2 听对话 / 关 3 跟读 / 关 4 选择题 / 关 5 听力题 / 关 6 口语题 / 关 7 结业
 *   关 3-6 (跟读 + 答题) 全部完成 = 完成一课
 */

import { prisma } from '@/config/database';

// ==================== 类型 ====================

export interface AnnieLessonSummary {
  course: string;
  lessonNumber: number;
  titleEn: string;
  titleZh: string;
  summaryZh: string;
  imageUrl: string | null;
  // 用户视角附加字段
  completedAt: string | null;
  totalScore: number;
  attempts: number;
}

export interface AnnieLessonDetail extends AnnieLessonSummary {
  characterMapping: unknown;
  learningObjectives: unknown;
  keyExpressions: unknown;
  script: unknown;
  voaArticleId: string | null;
  voaUrl: string | null;
  // 当前用户的进度（无登录或无进度时为 null）
  stages: unknown | null;
}

// 关卡数据 — stages JSON 字段子结构（前端按需写入即可）
export interface StagePronunciationItem {
  keId: string;
  score: number;       // 0-100
  attempts: number;
  lastTriedAt: string;
}
export interface StageChoiceItem {
  index: number;
  correct: boolean;
  selectedOption: number;
}
export interface StageListeningItem {
  index: number;
  correct: boolean;
  selectedOption: number;
}
export interface StageConversationItem {
  index: number;
  achieved: boolean;
  qualityScore: number;  // 1-10
  feedback?: string;
}

export interface ProgressUpdatePayload {
  // 任一字段都是"覆盖式"写入 stages 子键
  stage3Pronunciation?: StagePronunciationItem[];
  stage4Choice?: StageChoiceItem[];
  stage5Listening?: StageListeningItem[];
  stage6Conversation?: StageConversationItem[];
  // markComplete=true 时若关 3-6 数据齐全, 设 completedAt
  markComplete?: boolean;
}

// ==================== 列表 ====================

/**
 * 获取课程列表 + 当前用户进度.
 * userId 缺省时返回所有 isPublished 课程, 进度字段全为默认值.
 */
export async function listLessons(course: string, userId?: string): Promise<AnnieLessonSummary[]> {
  const lessons = await prisma.annieLesson.findMany({
    where: { course, isPublished: true },
    orderBy: { lessonNumber: 'asc' },
    select: {
      course: true,
      lessonNumber: true,
      titleEn: true,
      titleZh: true,
      summaryZh: true,
      imageUrl: true,
    },
  });

  // 拉用户进度并 merge
  const progressMap = new Map<number, { completedAt: Date | null; totalScore: number; attempts: number }>();
  if (userId) {
    const progressRows = await prisma.userAnnieProgress.findMany({
      where: { userId, course },
      select: { lessonNumber: true, completedAt: true, totalScore: true, attempts: true },
    });
    for (const p of progressRows) {
      progressMap.set(p.lessonNumber, p);
    }
  }

  return lessons.map(l => {
    const p = progressMap.get(l.lessonNumber);
    return {
      ...l,
      completedAt: p?.completedAt ? p.completedAt.toISOString() : null,
      totalScore: p?.totalScore ?? 0,
      attempts: p?.attempts ?? 0,
    };
  });
}

// ==================== 单课详情 ====================

export async function getLesson(
  course: string,
  lessonNumber: number,
  userId?: string,
): Promise<AnnieLessonDetail | null> {
  const lesson = await prisma.annieLesson.findUnique({
    where: { course_lessonNumber: { course, lessonNumber } },
  });
  if (!lesson || !lesson.isPublished) return null;

  let progress: { stages: unknown; completedAt: Date | null; totalScore: number; attempts: number } | null = null;
  if (userId) {
    const p = await prisma.userAnnieProgress.findUnique({
      where: { userId_course_lessonNumber: { userId, course, lessonNumber } },
    });
    if (p) {
      progress = {
        stages: p.stages,
        completedAt: p.completedAt,
        totalScore: p.totalScore,
        attempts: p.attempts,
      };
    }
  }

  return {
    course: lesson.course,
    lessonNumber: lesson.lessonNumber,
    titleEn: lesson.titleEn,
    titleZh: lesson.titleZh,
    summaryZh: lesson.summaryZh,
    imageUrl: lesson.imageUrl,
    characterMapping: lesson.characterMapping,
    learningObjectives: lesson.learningObjectives,
    keyExpressions: lesson.keyExpressions,
    script: lesson.script,
    voaArticleId: lesson.voaArticleId,
    voaUrl: lesson.voaUrl,
    completedAt: progress?.completedAt ? progress.completedAt.toISOString() : null,
    totalScore: progress?.totalScore ?? 0,
    attempts: progress?.attempts ?? 0,
    stages: progress?.stages ?? null,
  };
}

// ==================== 进度更新 ====================

interface ExistingStages {
  stage3Pronunciation?: StagePronunciationItem[];
  stage4Choice?: StageChoiceItem[];
  stage5Listening?: StageListeningItem[];
  stage6Conversation?: StageConversationItem[];
}

/**
 * 更新单课进度(增量覆盖). 任意子关卡完成即可调用,
 * markComplete=true 时若关 3-6 数据全部齐全则设 completedAt + attempts++.
 */
export async function updateProgress(
  userId: string,
  course: string,
  lessonNumber: number,
  payload: ProgressUpdatePayload,
): Promise<{ stages: ExistingStages; completedAt: string | null; totalScore: number; attempts: number }> {
  const existing = await prisma.userAnnieProgress.findUnique({
    where: { userId_course_lessonNumber: { userId, course, lessonNumber } },
  });

  const existingStages: ExistingStages = (existing?.stages as ExistingStages) ?? {};

  const newStages: ExistingStages = {
    ...existingStages,
    ...(payload.stage3Pronunciation !== undefined && { stage3Pronunciation: payload.stage3Pronunciation }),
    ...(payload.stage4Choice !== undefined && { stage4Choice: payload.stage4Choice }),
    ...(payload.stage5Listening !== undefined && { stage5Listening: payload.stage5Listening }),
    ...(payload.stage6Conversation !== undefined && { stage6Conversation: payload.stage6Conversation }),
  };

  const totalScore = computeTotalScore(newStages);

  // 完成判定: 关 3-6 全部有数据 (跟读至少 1 句、3 道选择、1 道听力、2 道口语)
  const isComplete = !!(
    newStages.stage3Pronunciation?.length &&
    newStages.stage4Choice && newStages.stage4Choice.length >= 3 &&
    newStages.stage5Listening && newStages.stage5Listening.length >= 1 &&
    newStages.stage6Conversation && newStages.stage6Conversation.length >= 2
  );

  // 仅在 markComplete 且条件满足、且之前未完成时才设 completedAt + attempts++
  const shouldMarkNewCompletion = !!(payload.markComplete && isComplete && !existing?.completedAt);
  const completedAt = shouldMarkNewCompletion ? new Date() : (existing?.completedAt ?? null);
  const attempts = shouldMarkNewCompletion ? (existing?.attempts ?? 0) + 1 : (existing?.attempts ?? 0);

  const saved = await prisma.userAnnieProgress.upsert({
    where: { userId_course_lessonNumber: { userId, course, lessonNumber } },
    create: {
      userId,
      course,
      lessonNumber,
      stages: newStages as object,
      totalScore,
      attempts,
      completedAt,
    },
    update: {
      stages: newStages as object,
      totalScore,
      attempts,
      completedAt,
    },
  });

  return {
    stages: saved.stages as ExistingStages,
    completedAt: saved.completedAt ? saved.completedAt.toISOString() : null,
    totalScore: saved.totalScore,
    attempts: saved.attempts,
  };
}

// ==================== 计分 ====================

/**
 * totalScore = 跟读平均分 * 0.4 + 选择题正确率 * 0.2 + 听力正确率 * 0.1 + 口语 quality 平均 * 10 * 0.3
 * 满分 100. 仅做卡片展示用.
 */
function computeTotalScore(stages: ExistingStages): number {
  const pronAvg = avg((stages.stage3Pronunciation ?? []).map(p => p.score));
  const choiceRate = rate((stages.stage4Choice ?? []).map(c => c.correct));
  const listenRate = rate((stages.stage5Listening ?? []).map(l => l.correct));
  const convAvg = avg((stages.stage6Conversation ?? []).map(c => c.qualityScore * 10));
  return Math.round(pronAvg * 0.4 + choiceRate * 100 * 0.2 + listenRate * 100 * 0.1 + convAvg * 0.3);
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function rate(arr: boolean[]): number {
  if (arr.length === 0) return 0;
  return arr.filter(Boolean).length / arr.length;
}
