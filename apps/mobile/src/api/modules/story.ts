import { Client } from '../client';
import { ENDPOINTS } from '../endpoints';
import type { EpisodeConfig, ConversationEvaluation } from '@/types/storyMode';

// ==================== 故事线 & 剧集 ====================

export interface StoryEpisodeSummary {
  episodeId: string;
  episodeNumber: number;
  title: string;
  titleZh: string;
  imageUrl: string | null;
  isPublished: boolean;
}

export interface StoryChapterSummary {
  id: string;
  chapterNumber: number;
  title: string;
  titleZh: string;
  description: string;
  imageUrl: string;
  episodeFrom: number;
  episodeTo: number;
}

export interface StoryLineSummary {
  id: string;
  characterId: string;
  title: string;
  description: string;
  imageUrl: string | null;
  emoji: string;
  themeColor: string;
  difficulty: string;
  unlockCondition: string | null;
  totalEpisodes: number;
  chapters: StoryChapterSummary[];
  episodes: StoryEpisodeSummary[];
}

export interface EpisodeProgress {
  episodeId: string;
  status: string; // unlocked | in_progress | completed
  stars: number;
  grade: string | null;
  completedAt: string | null;
}

export type StoryProgressMap = Record<string, EpisodeProgress[]>;

declare module '../client' {
  interface Client {
    /** 获取所有故事线（含剧集列表，不含 script） */
    getStoryList(): Promise<StoryLineSummary[]>;

    /** 获取用户剧情进度（按 storyLineId 分组） */
    getStoryProgress(): Promise<StoryProgressMap>;

    /** 更新剧集进度 */
    updateStoryProgress(data: {
      storyLineId?: string;
      episodeId: string;
      status?: string;
      stars?: number;
      grade?: string;
      answers?: any[];
    }): Promise<any>;

    /** 获取 episode 完整配置（剧本 + 学习点 + 题目） */
    getEpisodeConfig(episodeId: string): Promise<EpisodeConfig>;

    /** 对话题 AI 评估 */
    evaluateConversation(data: {
      goal: string;
      goal_description: string;
      expected_answer: string;
      user_answer: string;
      difficulty_level?: string;
    }): Promise<ConversationEvaluation>;
  }
}

Client.prototype.getStoryList = async function () {
  const res: any = await this.api.get(ENDPOINTS.STORY_LIST);
  return res.data;
};

Client.prototype.getStoryProgress = async function () {
  const res: any = await this.api.get(ENDPOINTS.STORY_PROGRESS);
  return res.data;
};

Client.prototype.updateStoryProgress = async function (data) {
  const res: any = await this.api.post(ENDPOINTS.STORY_PROGRESS, data);
  return res.data;
};

Client.prototype.getEpisodeConfig = async function (episodeId) {
  const res: any = await this.api.get(`${ENDPOINTS.STORY_EPISODES}/${episodeId}`);
  return res.data;
};

Client.prototype.evaluateConversation = async function (data) {
  const res: any = await this.api.post(ENDPOINTS.STORY_EVALUATE, data);
  return res.data;
};
