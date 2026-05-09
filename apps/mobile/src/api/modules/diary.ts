import { Client } from '../client';
import { ENDPOINTS, buildQuery } from '../endpoints';

export interface DailyTopic {
  topic: string;
  topicZh: string;
  date: string;
}

export interface DiaryEntry {
  id: string;
  userId: string;
  topic: string;
  topicZh: string | null;
  userText: string;
  aiCorrection: string | null;
  aiSuggestion: string | null;
  aiScore: number | null;
  audioUrl: string | null;
  duration: number | null;
  eventDate: string;
  createdAt: string;
}

declare module '../client' {
  interface Client {
    getDailyTopic(date?: string): Promise<{ success: boolean; data: DailyTopic }>;
    createDiary(data: {
      topic: string;
      topicZh?: string;
      userText: string;
      audioUrl?: string;
      duration?: number;
      eventDate: string;
    }): Promise<{ success: boolean; data: DiaryEntry }>;
    getDiaryList(): Promise<{ success: boolean; data: DiaryEntry[] }>;
    analyzeSpeaking(data: {
      userText: string;
      topic: string;
    }): Promise<{ success: boolean; data: { analysisPrompt: string } }>;
  }
}

Client.prototype.getDailyTopic = async function(date?: string) {
  return this.api.get(`${ENDPOINTS.DIARY_TOPIC}${buildQuery({ date })}`);
};

Client.prototype.createDiary = async function(data) {
  return this.api.post(ENDPOINTS.DIARY_CREATE, data);
};

Client.prototype.getDiaryList = async function() {
  return this.api.get(ENDPOINTS.DIARY_LIST);
};

Client.prototype.analyzeSpeaking = async function(data) {
  return this.api.post(ENDPOINTS.DIARY_ANALYZE, data);
};
