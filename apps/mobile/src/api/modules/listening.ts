import { Client } from '../client';
import { ENDPOINTS, buildQuery } from '../endpoints';

export interface ListeningSentence {
  en: string;
  zh: string;
}

export interface ListeningQuestion {
  question: string;
  questionZh: string;
  options: string[];
  answer: number;
}

export interface ListeningMaterialSummary {
  id: string;
  title: string;
  titleZh: string | null;
  level: string;
  category: string;
  totalWords: number;
  duration: number;
  createdAt: string;
}

export interface ListeningMaterialDetail extends ListeningMaterialSummary {
  sentences: ListeningSentence[];
  questions: ListeningQuestion[] | null;
}

export interface ListeningProgress {
  id: string;
  userId: string;
  materialId: string;
  mode: string;
  dictationScore: number | null;
  quizScore: number | null;
  listenCount: number;
  completedAt: string | null;
}

declare module '../client' {
  interface Client {
    getListeningMaterials(params?: { level?: string; category?: string }): Promise<{ success: boolean; data: ListeningMaterialSummary[] }>;
    getListeningMaterialDetail(id: string): Promise<{ success: boolean; data: ListeningMaterialDetail }>;
    getListeningProgress(): Promise<{ success: boolean; data: ListeningProgress[] }>;
    updateListeningProgress(data: {
      materialId: string;
      mode: string;
      dictationScore?: number;
      quizScore?: number;
    }): Promise<{ success: boolean; data: ListeningProgress }>;
  }
}

Client.prototype.getListeningMaterials = async function(params) {
  return this.api.get(`${ENDPOINTS.LISTENING_MATERIALS}${buildQuery({ level: params?.level, category: params?.category })}`);
};

Client.prototype.getListeningMaterialDetail = async function(id: string) {
  return this.api.get(`${ENDPOINTS.LISTENING_MATERIALS}/${id}`);
};

Client.prototype.getListeningProgress = async function() {
  return this.api.get(ENDPOINTS.LISTENING_PROGRESS);
};

Client.prototype.updateListeningProgress = async function(data) {
  return this.api.post(ENDPOINTS.LISTENING_PROGRESS, data);
};
