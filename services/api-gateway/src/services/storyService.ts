/**
 * 剧情服务
 * 管理剧情练习模式的故事线、剧集、用户进度
 */

import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';

// ==================== 故事线 & 剧集 ====================

/** 获取所有故事线（含各自的剧集列表，不含 script 内容） */
export async function getStoryLines() {
  const lines = await prisma.storyLine.findMany({
    where: { isActive: true },
    include: {
      chapters: {
        select: {
          id: true,
          chapterNumber: true,
          title: true,
          titleZh: true,
          description: true,
          imageUrl: true,
          episodeFrom: true,
          episodeTo: true,
        },
        orderBy: { chapterNumber: 'asc' },
      },
      episodes: {
        select: {
          episodeId: true,
          episodeNumber: true,
          title: true,
          titleZh: true,
          imageUrl: true,
          isPublished: true,
        },
        orderBy: { episodeNumber: 'asc' },
      },
    },
    orderBy: { sortOrder: 'asc' },
  });

  return lines.map(line => ({
    id: line.id,
    characterId: line.characterId,
    title: line.title,
    description: line.description,
    imageUrl: line.imageUrl,
    emoji: line.emoji,
    themeColor: line.themeColor,
    difficulty: line.difficulty,
    unlockCondition: line.unlockCondition,
    totalEpisodes: line.episodes.length,
    chapters: line.chapters,
    episodes: line.episodes,
  }));
}

/** 获取单个故事线详情 */
export async function getStoryLine(storyLineId: string) {
  return prisma.storyLine.findFirst({
    where: { id: storyLineId, isActive: true },
    include: {
      chapters: {
        select: {
          id: true,
          chapterNumber: true,
          title: true,
          titleZh: true,
          description: true,
          imageUrl: true,
          episodeFrom: true,
          episodeTo: true,
        },
        orderBy: { chapterNumber: 'asc' },
      },
      episodes: {
        select: {
          episodeId: true,
          episodeNumber: true,
          title: true,
          titleZh: true,
          imageUrl: true,
          isPublished: true,
        },
        orderBy: { episodeNumber: 'asc' },
      },
    },
  });
}

/** 获取 Episode 完整配置（剧本 + 学习点 + 题目） */
export async function getEpisodeConfig(episodeId: string) {
  const episode = await prisma.storyEpisode.findFirst({
    where: { episodeId, isPublished: true },
  });

  if (!episode) return null;

  return {
    episode_id: episode.episodeId,
    title: episode.title,
    title_zh: episode.titleZh,
    title_audio_url: episode.titleAudioUrl || '',
    learning_points: episode.learningPoints as any[] ?? [],
    script: episode.script as any[] ?? [],
    narrator_closing: episode.narratorClosing ?? '',
    next_episode_hook: episode.nextEpisodeHook ?? '',
  };
}

/** 根据 episodeId 查 storyLineId */
export async function getStoryLineIdByEpisodeId(episodeId: string): Promise<string | null> {
  const episode = await prisma.storyEpisode.findFirst({
    where: { episodeId },
    select: { storyLineId: true },
  });
  return episode?.storyLineId ?? null;
}

// ==================== 用户进度 ====================

/** 获取用户剧情进度 */
export async function getUserStoryProgress(userId: string) {
  const progress = await prisma.userStoryProgress.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  });

  // 按 storyLineId 分组
  const progressMap: Record<string, Array<{
    episodeId: string;
    status: string;
    stars: number;
    grade: string | null;
    completedAt: Date | null;
  }>> = {};

  for (const p of progress) {
    if (!progressMap[p.storyLineId]) {
      progressMap[p.storyLineId] = [];
    }
    progressMap[p.storyLineId].push({
      episodeId: p.episodeId,
      status: p.status,
      stars: p.stars,
      grade: p.grade,
      completedAt: p.completedAt,
    });
  }

  return progressMap;
}

/** 更新剧集进度 */
export async function updateEpisodeProgress(
  userId: string,
  storyLineId: string,
  episodeId: string,
  data: { status?: string; stars?: number; grade?: string; answers?: any[] }
) {
  const updateData: any = {};
  if (data.status) updateData.status = data.status;
  if (data.stars !== undefined) updateData.stars = data.stars;
  if (data.grade) updateData.grade = data.grade;
  if (data.answers) updateData.answers = data.answers;
  if (data.status === 'completed') updateData.completedAt = new Date();

  const result = await prisma.userStoryProgress.upsert({
    where: {
      userId_storyLineId_episodeId: { userId, storyLineId, episodeId },
    },
    create: {
      userId,
      storyLineId,
      episodeId,
      ...updateData,
    },
    update: updateData,
  });

  // 完成当前集后，自动解锁下一集
  if (data.status === 'completed') {
    const currentEpisode = await prisma.storyEpisode.findFirst({
      where: { episodeId },
      select: { storyLineId: true, episodeNumber: true },
    });

    if (currentEpisode) {
      const nextEpisode = await prisma.storyEpisode.findFirst({
        where: {
          storyLineId: currentEpisode.storyLineId,
          episodeNumber: currentEpisode.episodeNumber + 1,
        },
        select: { episodeId: true },
      });

      if (nextEpisode) {
        await prisma.userStoryProgress.upsert({
          where: {
            userId_storyLineId_episodeId: {
              userId,
              storyLineId,
              episodeId: nextEpisode.episodeId,
            },
          },
          create: {
            userId,
            storyLineId,
            episodeId: nextEpisode.episodeId,
            status: 'unlocked',
          },
          update: {}, // 不覆盖已有进度
        });
      }
    }
  }

  return result;
}
