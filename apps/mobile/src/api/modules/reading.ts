import { Client } from '../client';
import { ENDPOINTS, buildQuery } from '../endpoints';

export interface ArticleSummary {
  id: string;
  title: string;
  titleZh: string | null;
  level: string;
  category: string;
  wordCount: number;
  imageUrl: string | null;
  source: string | null;
  publishDate: string | null;
  createdAt: string;
}

export interface ArticleListResponse {
  articles: ArticleSummary[];
  nextCursor: string | null;
}

export interface ArticleDetail extends ArticleSummary {
  content: string;
  contentZh: string | null;
}

export interface ReadingProgress {
  id: string;
  userId: string;
  articleId: string;
  status: string;
  readTime: number;
  quizScore: number | null;
  completedAt: string | null;
  currentStep: number;
  currentParagraph: number;
  quizAnswers: QuizAnswer[] | null;
}

// ==================== 精读类型 ====================

export interface ArticleParagraph {
  index: number;
  en: string;
  zh: string;
}

export interface KeyWord {
  word: string;
  wordId?: string;
  phonetic: string;
  pos: string;
  meaningCn: string;
  contextSentence: string;
  paragraphIndex: number;
  audioUrl?: string;
}

export interface QuizQuestion {
  id: string;
  type: 'detail' | 'main_idea' | 'inference' | 'vocabulary';
  question: string;
  questionZh: string;
  options: string[];
  answer: string;
  explanation: string;
}

export interface QuizAnswer {
  questionId: string;
  answer: string;
  isCorrect: boolean;
}

export interface AudioTimestampItem {
  paragraphIndex: number;
  sentence: string;
  startMs: number;
  endMs: number;
}

export interface ExplanationMappingItem {
  sentence: string;          // 中文讲解句
  englishSentence: string;   // 对应的英文原句，空字符串表示不对应原文
  paragraphIndex: number;    // 对应原文段落索引，-1 表示不对应原文
  startMs: number;           // 在讲解音频中的起始时间（毫秒）
  endMs: number;             // 结束时间（毫秒）
}

export interface IntensiveArticle {
  id: string;
  title: string;
  titleZh: string | null;
  contentZh: string | null;
  level: string;
  category: string;
  wordCount: number;
  imageUrl: string | null;
  summary: string | null;
  summaryZh: string | null;
  paragraphs: ArticleParagraph[] | null;
  keyVocabulary: KeyWord[] | null;
  quiz: QuizQuestion[] | null;
  audioUrl: string | null;
  audioTimestamps: AudioTimestampItem[] | null;
  paragraphAudios: string[] | null;
  introZh: string | null;
  introAudioScript: string | null;
  introAudioUrl: string | null;
  explanationScript: string | null;
  explanationAudioUrl: string | null;
  explanationMapping: ExplanationMappingItem[] | null;
  source: string | null;
  publishDate: string | null;
  teacherId: string | null;
  pipelineVersion: number | null;
}

export interface DailyReadingData {
  article: {
    id: string;
    title: string;
    titleZh: string | null;
    level: string;
    category: string;
    wordCount: number;
    summary: string | null;
    summaryZh: string | null;
    imageUrl: string | null;
    source: string | null;
    publishDate: string | null;
  };
  progress: {
    status: string;
    currentStep: number;
    currentParagraph: number;
    readTime: number;
    quizScore: number | null;
  } | null;
}

export interface QuizResult {
  score: number;
  correctCount: number;
  total: number;
  results: Array<{
    questionId: string;
    answer: string;
    isCorrect: boolean;
    correctAnswer: string;
    explanation: string;
  }>;
}

declare module '../client' {
  interface Client {
    getArticles(params?: { level?: string; category?: string; yearMonth?: string; cursor?: string; limit?: number }): Promise<{ success: boolean; data: ArticleListResponse }>;
    getArticleMonths(): Promise<{ success: boolean; data: Array<{ month: string; count: number }> }>;
    getArticleDetail(id: string): Promise<{ success: boolean; data: ArticleDetail }>;
    getReadingProgress(): Promise<{ success: boolean; data: ReadingProgress[] }>;
    updateReadingProgress(data: {
      articleId: string;
      status?: string;
      readTime?: number;
      quizScore?: number;
    }): Promise<{ success: boolean; data: ReadingProgress }>;
    getDailyReading(): Promise<{ success: boolean; data: DailyReadingData[] | null }>;
    getIntensiveArticle(id: string): Promise<{ success: boolean; data: IntensiveArticle }>;
    submitReadingQuiz(articleId: string, answers: Array<{ questionId: string; answer: string }>): Promise<{ success: boolean; data: QuizResult }>;
    updateReadingStep(articleId: string, step: number, paragraph?: number): Promise<{ success: boolean; data: any }>;
  }
}

Client.prototype.getArticles = async function(params) {
  return this.api.get(`${ENDPOINTS.READING_ARTICLES}${buildQuery({ level: params?.level, category: params?.category, yearMonth: params?.yearMonth, cursor: params?.cursor, limit: params?.limit })}`);
};

Client.prototype.getArticleMonths = async function() {
  return this.api.get(`${ENDPOINTS.READING_ARTICLES}/months`);
};

Client.prototype.getArticleDetail = async function(id: string) {
  return this.api.get(`${ENDPOINTS.READING_ARTICLES}/${id}`);
};

Client.prototype.getReadingProgress = async function() {
  return this.api.get(ENDPOINTS.READING_PROGRESS);
};

Client.prototype.updateReadingProgress = async function(data) {
  return this.api.post(ENDPOINTS.READING_PROGRESS, data, {
    metadata: { skipNetworkErrorToast: true },
  } as any);
};

Client.prototype.getDailyReading = async function() {
  return this.api.get(ENDPOINTS.READING_DAILY);
};

Client.prototype.getIntensiveArticle = async function(id: string) {
  return this.api.get(`${ENDPOINTS.READING_ARTICLES}/${id}/intensive`);
};

Client.prototype.submitReadingQuiz = async function(articleId: string, answers) {
  return this.api.post(`${ENDPOINTS.READING_ARTICLES}/${articleId}/quiz`, { answers });
};

Client.prototype.updateReadingStep = async function(articleId: string, step: number, paragraph?: number) {
  return this.api.post(`${ENDPOINTS.READING_ARTICLES}/${articleId}/step`, { step, paragraph });
};
