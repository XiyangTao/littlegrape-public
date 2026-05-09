import { Client } from '../client';
import { ENDPOINTS, buildQuery } from '../endpoints';

export type BookLevel = 'beginner' | 'intermediate' | 'advanced';

export interface BookSummary {
  id: string;
  slug: string;
  title: string;
  titleZh: string | null;
  author: string;
  authorZh: string | null;
  level: BookLevel;
  cefr: string | null;
  wordCount: number;
  chapterCount: number;
  estMinutes: number;
  coverUrl: string | null;
  publishedYear: number | null;
  sortOrder: number;
  /** 是否免费阅读（Free 用户也可访问全章节） */
  isFree: boolean;
}

export interface ChapterSummary {
  chapterNumber: number;
  title: string;
  titleZh: string | null;
  ordinal: string | null;
  wordCount: number;
  estMinutes: number;
}

export interface BookDetail extends BookSummary {
  description: string | null;
  readingEase: number | null;
  chapters: ChapterSummary[];
}

export interface ChapterParagraph {
  index: number;
  text: string;
  translationZh: string | null;
  englishSentences?: string[] | null;
  sentenceTranslations?: string[] | null;
}

export interface ChapterContent {
  bookSlug: string;
  bookTitle: string;
  bookTitleZh: string | null;
  chapterNumber: number;
  title: string;
  titleZh: string | null;
  ordinal: string | null;
  wordCount: number;
  paragraphs: ChapterParagraph[];
  prevChapter: number | null;
  nextChapter: number | null;
}

export interface BookListPage {
  books: BookSummary[];
  nextCursor: string | null;
}

export interface BookProgressSummary {
  slug: string;
  status: 'reading' | 'completed';
  progressPercent: number;
  lastChapter: number;
}

export interface ChapterProgressEntry {
  maxParaIndex: number;       // 历史最深段（百分比用，永不倒退）
  lastParaIndex: number;       // 上次离开段（恢复用）
  lastSentenceIndex: number;   // 上次离开句（段内序号，句级精确恢复）
  completed: boolean;
  readSeconds: number;
}

export interface BookProgress {
  slug: string;
  bookId: string;
  status: 'reading' | 'completed';
  /** 最后一次打开的章（决定"继续阅读"按钮） */
  lastChapter: number;
  lastParaIndex: number;
  /** 派生：已完成章数 / 总章数（0.0-1.0） */
  progressPercent: number;
  readSeconds: number;
  lastReadAt: string;
  completedAt: string | null;
  /** 每章独立状态，跳章不互相污染 */
  chapters: Record<number, ChapterProgressEntry>;
}

export interface RecentBook extends Omit<BookProgress, 'chapters'> {
  title: string;
  titleZh: string | null;
  author: string;
  authorZh: string | null;
  coverUrl: string | null;
  chapterCount: number;
  lastChapterTitle: string;
  lastChapterTitleZh: string | null;
  isFree: boolean;
}

declare module '../client' {
  interface Client {
    getClassicsBooks(params?: { level?: BookLevel; cursor?: string; limit?: number }): Promise<{ success: boolean; data: BookListPage }>;
    getClassicsBook(slug: string): Promise<{ success: boolean; data: BookDetail }>;
    getClassicsChapter(slug: string, chapterNumber: number): Promise<{ success: boolean; data: ChapterContent }>;
    getClassicsAllProgress(): Promise<{ success: boolean; data: { progress: BookProgressSummary[] } }>;
    getClassicsRecentReadings(limit?: number): Promise<{ success: boolean; data: { books: RecentBook[] } }>;
    getClassicsBookProgress(slug: string): Promise<{ success: boolean; data: BookProgress | null }>;
    updateClassicsBookProgress(slug: string, body: {
      chapterNumber: number;
      paraIndex: number;
      sentenceIndex?: number;
      addedSeconds?: number;
      chapterCompleted?: boolean;
    }): Promise<{ success: boolean; data: BookProgress }>;
  }
}

Client.prototype.getClassicsBooks = async function (params) {
  return this.api.get(
    `${ENDPOINTS.CLASSICS_BOOKS}${buildQuery({
      level: params?.level,
      cursor: params?.cursor,
      limit: params?.limit,
    })}`,
  );
};

Client.prototype.getClassicsBook = async function (slug: string) {
  return this.api.get(`${ENDPOINTS.CLASSICS_BOOKS}/${slug}`);
};

Client.prototype.getClassicsChapter = async function (slug: string, chapterNumber: number) {
  return this.api.get(`${ENDPOINTS.CLASSICS_BOOKS}/${slug}/chapters/${chapterNumber}`);
};

Client.prototype.getClassicsAllProgress = async function () {
  return this.api.get(ENDPOINTS.CLASSICS_PROGRESS_ALL);
};

Client.prototype.getClassicsRecentReadings = async function (limit = 10) {
  return this.api.get(`${ENDPOINTS.CLASSICS_PROGRESS_RECENT}${buildQuery({ limit })}`);
};

Client.prototype.getClassicsBookProgress = async function (slug: string) {
  return this.api.get(`${ENDPOINTS.CLASSICS_BOOKS}/${slug}/progress`);
};

Client.prototype.updateClassicsBookProgress = async function (slug: string, body) {
  // 阅读进度上报失败静默处理：网络错误 + 5xx 都不弹 toast，避免打断阅读
  return this.api.put(`${ENDPOINTS.CLASSICS_BOOKS}/${slug}/progress`, body, {
    metadata: { skipErrorToast: true },
  } as any);
};
