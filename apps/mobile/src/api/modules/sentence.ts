/**
 * AI 造句挑战 API
 */
import { Client } from '../client';
import { ENDPOINTS } from '../endpoints';

export interface SentenceEvalRequest {
  word: string;
  wordId: string;
  meaningCn: string;
  sentence: string;
}

export interface SentenceEvalResponse {
  grammarScore: number;
  usageScore: number;
  naturalScore: number;
  overallScore: number;
  feedback: string;
  improvedSentence: string;
}

declare module '../client' {
  interface Client {
    evaluateSentence(data: SentenceEvalRequest): Promise<SentenceEvalResponse>;
  }
}

/**
 * 提交造句获取 AI 评估
 */
Client.prototype.evaluateSentence = async function(data: SentenceEvalRequest): Promise<SentenceEvalResponse> {
  return this.api.post(ENDPOINTS.WORDS_SENTENCE_CHALLENGE, data);
};
