import { Client } from '../client';
import { ENDPOINTS, buildQuery } from '../endpoints';

export interface ExamSection {
  type: 'vocabulary' | 'cloze' | 'reading_choice';
  name: string;
  nameZh: string;
  count: number;
}

export interface ExamType {
  id: string;
  name: string;
  nameZh: string;
  tag: string;
  description: string;
  descriptionZh: string;
  questionCount: number;
  timeLimit: number;
  sections: ExamSection[];
}

export interface ExamQuestion {
  id: string;
  section: string;
  type: 'vocabulary' | 'cloze';
  question: string;
  options: string[];
  answer: number;
  wordId?: string;
  explanation?: string;
}

export interface GeneratedExam {
  examType: ExamType;
  questions: ExamQuestion[];
  totalQuestions: number;
  timeLimit: number;
}

export interface ExamRecord {
  id: string;
  examTypeId: string;
  score: number;
  totalQuestions: number;
  correctCount: number;
  duration: number;
  createdAt: string;
}

declare module '../client' {
  interface Client {
    getExamTypes(): Promise<{ success: boolean; data: { types: ExamType[]; stats: Record<string, { attempts: number; bestScore: number; lastScore: number }> } }>;
    generateExam(type: string): Promise<{ success: boolean; data: GeneratedExam }>;
    submitExamResult(body: { examTypeId: string; score: number; totalQuestions: number; correctCount: number; duration: number; answers: Record<string, number> }): Promise<{ success: boolean; data: ExamRecord }>;
    getExamRecords(type?: string): Promise<{ success: boolean; data: ExamRecord[] }>;
  }
}

Client.prototype.getExamTypes = async function() {
  return this.api.get(ENDPOINTS.EXAM_TYPES);
};

Client.prototype.generateExam = async function(type: string) {
  return this.api.get(`${ENDPOINTS.EXAM_GENERATE}${buildQuery({ type })}`);
};

Client.prototype.submitExamResult = async function(body) {
  return this.api.post(ENDPOINTS.EXAM_SUBMIT, body);
};

Client.prototype.getExamRecords = async function(type?: string) {
  return this.api.get(`${ENDPOINTS.EXAM_RECORDS}${buildQuery({ type })}`);
};
