import { Client } from '../client';
import { ENDPOINTS } from '../endpoints';

// 结构化语法讲解类型
export interface GrammarUsage {
  title: string;
  description?: string;
  exampleEn: string;
  exampleCn: string;
}

export interface GrammarExample {
  en: string;
  cn: string;
  highlight?: string;
}

export interface GrammarCommonError {
  wrong: string;
  correct: string;
  explanation: string;
}

export interface GrammarSections {
  definition: string;
  structure: string;
  usages: GrammarUsage[];
  examples: GrammarExample[];
  commonErrors: GrammarCommonError[];
  tips: string[];
}

export interface StructuredExplanation {
  audioSummary: string;
  sections: GrammarSections;
}

export interface GrammarExplanationData {
  id: string;
  code: string;
  nameZh: string;
  nameEn: string;
  difficulty: string;
  explanation: StructuredExplanation | string;
  audioSummary?: string | null;
  audioUrl?: string | null;
  examples: any[];
}

export interface GrammarCategoryData {
  id: string;
  code: string;
  nameZh: string;
  nameEn: string;
  icon: string;
  color: string;
  level: number;
  pointCount: number;
  learnedCount: number;
}

export type GrammarPointStatus = 'not_started' | 'learning' | 'practiced' | 'mastered';

export interface GrammarPointData {
  id: string;
  code: string;
  nameZh: string;
  nameEn: string;
  difficulty: string;
  status: GrammarPointStatus;
  practiceScore: number | null;
  starRating: number | null;
  bestStarRating: number | null;
}

export interface GrammarCategoryPointsData {
  category: {
    code: string;
    nameZh: string;
    nameEn: string;
    icon: string;
    color: string;
  };
  points: GrammarPointData[];
}

export interface GrammarPracticeQuestion {
  id: string;
  type: 'choice' | 'fill_blank';
  question: string;
  options?: string[];
  answer: string;
  explanation: string;
}

// 课程式练习题型
export type LessonQuestionType =
  | 'choice' | 'fill_blank'
  | 'error_judgment' | 'error_correction'
  | 'dual_blank' | 'table_fill'
  | 'sentence_reorder' | 'word_assembly';

export type CognitiveLevel = 'recognition' | 'understanding' | 'production';

export interface SmartTip {
  rule: string;
  wrong: string;
  correct: string;
  examples: string[];
}

export interface TableBlank {
  row: number;
  col: number;
  answer: string;
  options: string[];
}

export interface TableData {
  headers: string[];
  rows: (string | '___')[][];
  blanks: TableBlank[];
}

export interface LessonQuestion {
  id?: string;
  type: LessonQuestionType;
  cognitiveLevel: CognitiveLevel;
  question: string;
  options?: string[];
  answer: string;
  answer2?: string;
  explanation: string;
  smartTip?: SmartTip;
  errorPart?: string;
  correctVersion?: string;
  sentence1?: string;
  sentence2?: string;
  tableData?: TableData;
  words?: string[];
  distractors?: string[];
  chineseTranslation?: string;
  structureHint?: string;
  acceptableAnswers?: string[];
}

export interface GrammarLessonData {
  point: {
    id: string;
    code: string;
    nameZh: string;
    nameEn: string;
    difficulty: string;
  };
  explanation: StructuredExplanation | string | null;
  questions: LessonQuestion[];
}

declare module '../client' {
  interface Client {
    getGrammarCategories(): Promise<{
      success: boolean; data: GrammarCategoryData[];
    }>;
    getGrammarCategoryPoints(categoryCode: string): Promise<{
      success: boolean; data: GrammarCategoryPointsData;
    }>;
    getGrammarExplanation(pointCode: string): Promise<{
      success: boolean; data: GrammarExplanationData;
    }>;
    getGrammarPractice(pointCode: string, count?: number): Promise<{
      success: boolean; data: GrammarPracticeQuestion[];
    }>;
    submitGrammarPractice(pointId: string, result: {
      score: number;
      totalCount: number;
      correctCount: number;
    }): Promise<{ success: boolean }>;
    getGrammarLesson(pointCode: string): Promise<{
      success: boolean; data: GrammarLessonData;
    }>;
    submitGrammarLesson(pointId: string, result: {
      score: number;
      totalCount: number;
      correctCount: number;
      starRating: number;
      phaseResults?: { phase: string; correctRate: number }[];
    }): Promise<{ success: boolean }>;
  }
}

Client.prototype.getGrammarCategories = async function() {
  return this.api.get(ENDPOINTS.GRAMMAR_CATEGORIES);
};

Client.prototype.getGrammarCategoryPoints = async function(categoryCode: string) {
  return this.api.get(`${ENDPOINTS.GRAMMAR_CATEGORIES}/${categoryCode}/points`);
};

Client.prototype.getGrammarExplanation = async function(pointCode: string) {
  return this.api.get(`${ENDPOINTS.GRAMMAR_POINTS}/${pointCode}/explanation`);
};

Client.prototype.getGrammarPractice = async function(pointCode: string, count = 10) {
  return this.api.post(`${ENDPOINTS.GRAMMAR_POINTS}/${pointCode}/practice`, { count });
};

Client.prototype.submitGrammarPractice = async function(pointId: string, result) {
  return this.api.post(ENDPOINTS.GRAMMAR_SUBMIT, { pointId, ...result });
};

Client.prototype.getGrammarLesson = async function(pointCode: string) {
  return this.api.post(`${ENDPOINTS.GRAMMAR_POINTS}/${pointCode}/lesson`);
};

Client.prototype.submitGrammarLesson = async function(pointId: string, result) {
  return this.api.post(ENDPOINTS.GRAMMAR_LESSON_SUBMIT, { pointId, ...result });
};
