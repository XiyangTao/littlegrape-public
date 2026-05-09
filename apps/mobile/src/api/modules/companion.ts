import { Client } from '../client';
import { ENDPOINTS } from '../endpoints';

const THREADS_ENDPOINT = ENDPOINTS.COMPANION_MEM0_THREADS;

// ==================== 类型定义 ====================

export interface CompanionThreadInfo {
  id: string;
  characterId: string;
  messageCount: number;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  difficulty: string;
}

export interface CompanionWelcomeMessage {
  messageId: string;
  role: string;
  content: string;
  translation: string;
  timestamp: string;
}

export interface InitThreadResult {
  thread: {
    id: string;
    characterId: string;
    agnoSessionId: string;
    messageCount: number;
  };
  welcomeMessage: CompanionWelcomeMessage | null;
}

export interface CompanionChatResult {
  messageId: string;
  content: string;
  translation: string;
  tips: string;
  timestamp: string;
  responseTime: number;
}

export interface CompanionHistoryMessage {
  role: string;
  content: string;
  timestamp?: string;
}

export interface CompanionHistoryResult {
  messages: CompanionHistoryMessage[];
  total: number;
  hasMore: boolean;
}

// ==================== Client 扩展 ====================

declare module '../client' {
  interface Client {
    getCompanionThreads(): Promise<{ success: boolean; data: CompanionThreadInfo[] }>;
    initCompanionThread(characterId: string): Promise<{ success: boolean; data: InitThreadResult }>;
    sendCompanionMessage(characterId: string, message: string): Promise<{ success: boolean; data: CompanionChatResult }>;
    getCompanionHistory(characterId: string, limit?: number, offset?: number): Promise<{ success: boolean; data: CompanionHistoryResult }>;
    clearCompanionHistory(characterId: string): Promise<{ success: boolean }>;
  }
}

Client.prototype.getCompanionThreads = async function () {
  return this.api.get(THREADS_ENDPOINT);
};

Client.prototype.initCompanionThread = async function (characterId: string) {
  return this.api.post(THREADS_ENDPOINT, { characterId });
};

Client.prototype.sendCompanionMessage = async function (characterId: string, message: string) {
  return this.api.post(`${THREADS_ENDPOINT}/${characterId}/messages`, { message });
};

Client.prototype.getCompanionHistory = async function (characterId: string, limit = 50, offset = 0) {
  return this.api.get(`${THREADS_ENDPOINT}/${characterId}/messages?limit=${limit}&offset=${offset}`);
};

Client.prototype.clearCompanionHistory = async function (characterId: string) {
  return this.api.delete(`${THREADS_ENDPOINT}/${characterId}`);
};
