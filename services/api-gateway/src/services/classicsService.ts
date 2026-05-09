/**
 * 名著精读 — Prisma 查询
 */

import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { FREE_CLASSICS_SLUGS } from '@/services/featureAccessService';

export interface BookSummary {
  id: string;
  slug: string;
  title: string;
  titleZh: string | null;
  author: string;
  authorZh: string | null;
  level: string;
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

export interface ChapterContent {
  bookSlug: string;
  bookTitle: string;
  bookTitleZh: string | null;
  chapterNumber: number;
  title: string;
  titleZh: string | null;
  ordinal: string | null;
  wordCount: number;
  paragraphs: Array<{
    index: number;
    text: string;
    translationZh: string | null;
    englishSentences: string[] | null;
    sentenceTranslations: string[] | null;
  }>;
  prevChapter: number | null;
  nextChapter: number | null;
}

export interface BookListPage {
  books: BookSummary[];
  nextCursor: string | null;
}

/** 书架分页（按 sortOrder ASC，cursor 为上一页末尾 book.id） */
export async function listBooks(params: {
  level?: string;
  cursor?: string;
  limit?: number;
}): Promise<BookListPage> {
  const limit = Math.min(Math.max(params.limit ?? 20, 1), 50);
  const rows = await prisma.book.findMany({
    where: params.level ? { isPublished: true, level: params.level } : { isPublished: true },
    orderBy: { sortOrder: 'asc' },
    take: limit + 1,
    skip: params.cursor ? 1 : 0,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    select: {
      id: true,
      slug: true,
      title: true,
      titleZh: true,
      author: true,
      authorZh: true,
      level: true,
      cefr: true,
      wordCount: true,
      chapterCount: true,
      estMinutes: true,
      coverUrl: true,
      publishedYear: true,
      sortOrder: true,
    },
  });
  const hasMore = rows.length > limit;
  const slice = hasMore ? rows.slice(0, limit) : rows;
  const books: BookSummary[] = slice.map((b) => ({ ...b, isFree: FREE_CLASSICS_SLUGS.has(b.slug) }));
  const nextCursor = hasMore ? books[books.length - 1].id : null;
  return { books, nextCursor };
}

/** 书详情 + 章节目录 */
export async function getBookDetail(slug: string): Promise<BookDetail | null> {
  const book = await prisma.book.findUnique({
    where: { slug },
    include: {
      chapters: {
        orderBy: { chapterNumber: 'asc' },
        select: {
          chapterNumber: true,
          title: true,
          titleZh: true,
          ordinal: true,
          wordCount: true,
          estMinutes: true,
        },
      },
    },
  });
  if (!book || !book.isPublished) return null;

  return {
    id: book.id,
    slug: book.slug,
    title: book.title,
    titleZh: book.titleZh,
    author: book.author,
    authorZh: book.authorZh,
    level: book.level,
    cefr: book.cefr,
    wordCount: book.wordCount,
    chapterCount: book.chapterCount,
    estMinutes: book.estMinutes,
    coverUrl: book.coverUrl,
    publishedYear: book.publishedYear,
    sortOrder: book.sortOrder,
    isFree: FREE_CLASSICS_SLUGS.has(book.slug),
    description: book.description,
    readingEase: book.readingEase,
    chapters: book.chapters,
  };
}

// ==================== 阅读进度 ====================

export interface BookProgressSummary {
  slug: string;
  status: 'reading' | 'completed';
  progressPercent: number;
  lastChapter: number;
}

export interface ChapterProgressEntry {
  maxParaIndex: number;       // 历史最深段（百分比用）
  lastParaIndex: number;       // 上次离开段（恢复用）
  lastSentenceIndex: number;   // 上次离开句（句级精确恢复）
  completed: boolean;
  readSeconds: number;
}

export interface BookProgress {
  slug: string;
  bookId: string;
  status: string;
  /** 最后打开的章（决定"继续阅读"按钮） */
  lastChapter: number;
  /** 最后打开章内的段落位置 */
  lastParaIndex: number;
  /** 派生：已完成章数 / 总章数 */
  progressPercent: number;
  readSeconds: number;
  lastReadAt: string;
  completedAt: string | null;
  /** 章节级进度 map（key = chapterNumber） */
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

/** 用户所有书进度摘要（书架用，一次查询返回全部） */
export async function getAllBookProgress(userId: string): Promise<BookProgressSummary[]> {
  const rows = await prisma.userBookProgress.findMany({
    where: { userId },
    select: {
      status: true,
      progressPercent: true,
      lastChapter: true,
      book: { select: { slug: true } },
    },
  });
  return rows
    .filter((r) => r.book)
    .map((r) => ({
      slug: r.book.slug,
      status: r.status as 'reading' | 'completed',
      progressPercent: r.progressPercent,
      lastChapter: r.lastChapter,
    }));
}

/**
 * 基于单词数派生全书阅读百分比
 *   已完成章：整章 wordCount 全计入
 *   未完成章：wordCount × (maxParaIndex / 该章总段落数)
 */
async function computeBookPercent(
  userId: string,
  bookId: string,
  totalWordCount: number,
): Promise<number> {
  if (totalWordCount <= 0) return 0;

  type Row = { maxParaIndex: number; completed: boolean; wordCount: number; paraCount: bigint };
  // GROUP BY 必须加 bc.id 让每章独立成行；否则同 (maxParaIndex, completed, wordCount)
  // 三元组的多章会被合并成一行，导致 LEFT JOIN COUNT 累加段数但 wordCount 只取一次，
  // wordsRead 算错（短篇集如 Aesop's Fables、O. Henry 上误差 N 倍级）
  const rows = await prisma.$queryRaw<Row[]>`
    SELECT
      cp."maxParaIndex",
      cp.completed,
      bc."wordCount",
      COUNT(bp.id) AS "paraCount"
    FROM user_book_chapter_progress cp
    JOIN book_chapters bc
      ON bc."bookId" = cp."bookId" AND bc."chapterNumber" = cp."chapterNumber"
    LEFT JOIN book_paragraphs bp ON bp."chapterId" = bc.id
    WHERE cp."userId" = ${userId} AND cp."bookId" = ${bookId}
    GROUP BY bc.id, cp."maxParaIndex", cp.completed, bc."wordCount"
  `;

  const wordsRead = rows.reduce((sum, row) => {
    const paraCount = Number(row.paraCount);
    const fraction = row.completed
      ? 1
      : paraCount > 0 ? Math.min(1, row.maxParaIndex / paraCount) : 0;
    return sum + fraction * row.wordCount;
  }, 0);

  return Math.min(1, wordsRead / totalWordCount);
}

/** 获取用户最近在读的 N 本（续读 Hero / 首页横滑） */
export async function getRecentReadings(userId: string, limit = 10): Promise<RecentBook[]> {
  const rows = await prisma.userBookProgress.findMany({
    where: { userId, status: 'reading' },
    orderBy: { lastReadAt: 'desc' },
    take: Math.min(Math.max(limit, 1), 20),
    include: {
      book: {
        select: {
          id: true,
          slug: true,
          title: true,
          titleZh: true,
          author: true,
          authorZh: true,
          coverUrl: true,
          chapterCount: true,
        },
      },
    },
  });

  // 批量取最后一次打开章的标题（避免 N+1）
  const chapters = rows.length
    ? await prisma.bookChapter.findMany({
        where: {
          OR: rows.map((r) => ({ bookId: r.bookId, chapterNumber: r.lastChapter })),
        },
        select: { bookId: true, chapterNumber: true, title: true, titleZh: true },
      })
    : [];
  const chapterMap = new Map(chapters.map((c) => [`${c.bookId}:${c.chapterNumber}`, c]));

  return rows
    .filter((r) => r.book)
    .map((r) => {
      const chapter = chapterMap.get(`${r.bookId}:${r.lastChapter}`);
      return {
        slug: r.book.slug,
        bookId: r.bookId,
        title: r.book.title,
        titleZh: r.book.titleZh,
        author: r.book.author,
        authorZh: r.book.authorZh,
        coverUrl: r.book.coverUrl,
        chapterCount: r.book.chapterCount,
        status: r.status,
        lastChapter: r.lastChapter,
        lastChapterTitle: chapter?.title ?? `Chapter ${r.lastChapter}`,
        lastChapterTitleZh: chapter?.titleZh ?? null,
        lastParaIndex: r.lastParaIndex,
        progressPercent: r.progressPercent,
        readSeconds: r.readSeconds,
        lastReadAt: r.lastReadAt.toISOString(),
        completedAt: r.completedAt?.toISOString() ?? null,
        isFree: FREE_CLASSICS_SLUGS.has(r.book.slug),
      };
    });
}

/** 获取某本书的进度（含每章状态 map，未开始返回 null） */
export async function getBookProgress(
  userId: string,
  slug: string,
): Promise<BookProgress | null> {
  const book = await prisma.book.findUnique({ where: { slug }, select: { id: true } });
  if (!book) return null;
  const [p, chapterRows] = await Promise.all([
    prisma.userBookProgress.findUnique({
      where: { userId_bookId: { userId, bookId: book.id } },
    }),
    prisma.userBookChapterProgress.findMany({
      where: { userId, bookId: book.id },
      select: {
        chapterNumber: true,
        maxParaIndex: true,
        lastParaIndex: true,
        lastSentenceIndex: true,
        completed: true,
        readSeconds: true,
      },
    }),
  ]);
  if (!p) return null;

  const chapters: Record<number, ChapterProgressEntry> = {};
  for (const c of chapterRows) {
    chapters[c.chapterNumber] = {
      maxParaIndex: c.maxParaIndex,
      lastParaIndex: c.lastParaIndex,
      lastSentenceIndex: c.lastSentenceIndex,
      completed: c.completed,
      readSeconds: c.readSeconds,
    };
  }

  return {
    slug,
    bookId: p.bookId,
    status: p.status,
    lastChapter: p.lastChapter,
    lastParaIndex: p.lastParaIndex,
    progressPercent: p.progressPercent,
    readSeconds: p.readSeconds,
    lastReadAt: p.lastReadAt.toISOString(),
    completedAt: p.completedAt?.toISOString() ?? null,
    chapters,
  };
}

/**
 * 上报进度（每 15 秒或离开触发）
 * - 先更新章节级进度（maxParaIndex 只增不减，completed 不可降级）
 * - 派生全书百分比（已完成章 / 总章）
 * - 更新头表 lastChapter/lastParaIndex 为**本次**章段（允许跳章，不清除其他章状态）
 */
export async function upsertBookProgress(
  userId: string,
  slug: string,
  data: {
    chapterNumber: number;
    paraIndex: number;
    sentenceIndex?: number; // 段内句序号（句级精确恢复用）
    addedSeconds?: number;
    chapterCompleted?: boolean;
  },
): Promise<BookProgress | null> {
  const book = await prisma.book.findUnique({
    where: { slug },
    select: { id: true, chapterCount: true, wordCount: true },
  });
  if (!book) return null;
  if (data.chapterNumber < 1 || data.chapterNumber > book.chapterCount) return null;

  const addedSeconds = Math.max(0, Math.min(data.addedSeconds ?? 0, 3600)); // 单次最多 1h 防刷
  const now = new Date();
  const sentenceIndex = Math.max(0, Math.floor(Number(data.sentenceIndex) || 0));

  // 1) 章节级进度 upsert
  //    maxParaIndex 取 max（不倒退，用于已读百分比）
  //    lastParaIndex / lastSentenceIndex 直接覆盖（用于恢复阅读位置）
  const existingChapter = await prisma.userBookChapterProgress.findUnique({
    where: {
      userId_bookId_chapterNumber: {
        userId,
        bookId: book.id,
        chapterNumber: data.chapterNumber,
      },
    },
    select: { maxParaIndex: true, completed: true },
  });
  const nextMaxPara = Math.max(existingChapter?.maxParaIndex ?? 0, data.paraIndex);
  const nextCompleted = existingChapter?.completed || Boolean(data.chapterCompleted);

  await prisma.userBookChapterProgress.upsert({
    where: {
      userId_bookId_chapterNumber: {
        userId,
        bookId: book.id,
        chapterNumber: data.chapterNumber,
      },
    },
    create: {
      userId,
      bookId: book.id,
      chapterNumber: data.chapterNumber,
      maxParaIndex: nextMaxPara,
      lastParaIndex: data.paraIndex,
      lastSentenceIndex: sentenceIndex,
      completed: nextCompleted,
      readSeconds: addedSeconds,
      lastReadAt: now,
      completedAt: nextCompleted ? now : null,
    },
    update: {
      maxParaIndex: nextMaxPara,
      lastParaIndex: data.paraIndex,
      lastSentenceIndex: sentenceIndex,
      completed: nextCompleted,
      readSeconds: { increment: addedSeconds },
      lastReadAt: now,
      ...(nextCompleted && !existingChapter?.completed ? { completedAt: now } : {}),
    },
  });

  // 2) 派生全书百分比
  const percent = await computeBookPercent(userId, book.id, book.wordCount);
  const bookCompleted = percent >= 1;

  // 3) 头表 upsert（lastChapter 反映本次打开的章，即使是跳章）
  const result = await prisma.userBookProgress.upsert({
    where: { userId_bookId: { userId, bookId: book.id } },
    create: {
      userId,
      bookId: book.id,
      status: bookCompleted ? 'completed' : 'reading',
      lastChapter: data.chapterNumber,
      lastParaIndex: data.paraIndex,
      progressPercent: percent,
      readSeconds: addedSeconds,
      lastReadAt: now,
      completedAt: bookCompleted ? now : null,
    },
    update: {
      lastChapter: data.chapterNumber,
      lastParaIndex: data.paraIndex,
      progressPercent: percent,
      readSeconds: { increment: addedSeconds },
      lastReadAt: now,
      ...(bookCompleted
        ? { status: 'completed', completedAt: now }
        : { status: 'reading' }),
    },
  });

  // 4) 返回前再查一次章节 map（反映刚写入的数据）
  const chapterRows = await prisma.userBookChapterProgress.findMany({
    where: { userId, bookId: book.id },
    select: {
      chapterNumber: true,
      maxParaIndex: true,
      lastParaIndex: true,
      lastSentenceIndex: true,
      completed: true,
      readSeconds: true,
    },
  });
  const chapters: Record<number, ChapterProgressEntry> = {};
  for (const c of chapterRows) {
    chapters[c.chapterNumber] = {
      maxParaIndex: c.maxParaIndex,
      lastParaIndex: c.lastParaIndex,
      lastSentenceIndex: c.lastSentenceIndex,
      completed: c.completed,
      readSeconds: c.readSeconds,
    };
  }

  return {
    slug,
    bookId: result.bookId,
    status: result.status,
    lastChapter: result.lastChapter,
    lastParaIndex: result.lastParaIndex,
    progressPercent: result.progressPercent,
    readSeconds: result.readSeconds,
    lastReadAt: result.lastReadAt.toISOString(),
    completedAt: result.completedAt?.toISOString() ?? null,
    chapters,
  };
}

/** 查询单个 BookSentence（含原文/讲解文本 + 两种音频缓存），供句级 TTS WS 使用 */
export async function getSentenceForAudio(
  slug: string,
  chapterNumber: number,
  paraIndex: number,
  sentenceIndex: number,
): Promise<{
  id: string;
  text: string;
  audioUrl: string | null;
  explainCn: string | null;
  explainAudioUrl: string | null;
} | null> {
  const book = await prisma.book.findUnique({ where: { slug }, select: { id: true } });
  if (!book) return null;
  const chapter = await prisma.bookChapter.findUnique({
    where: { bookId_chapterNumber: { bookId: book.id, chapterNumber } },
    select: { id: true },
  });
  if (!chapter) return null;
  const paragraph = await prisma.bookParagraph.findUnique({
    where: { chapterId_paraIndex: { chapterId: chapter.id, paraIndex } },
    select: { id: true },
  });
  if (!paragraph) return null;
  return prisma.bookSentence.findUnique({
    where: { paragraphId_orderIndex: { paragraphId: paragraph.id, orderIndex: sentenceIndex } },
    select: { id: true, text: true, audioUrl: true, explainCn: true, explainAudioUrl: true },
  });
}

/** 回填 BookSentence 原文朗读音频 URL（首次合成后调用） */
export async function updateSentenceAudio(
  sentenceId: string,
  audioUrl: string,
): Promise<void> {
  await prisma.bookSentence.update({
    where: { id: sentenceId },
    data: { audioUrl },
  });
}

/** 回填 BookSentence 讲解音频 URL（首次合成后调用） */
export async function updateSentenceExplainAudio(
  sentenceId: string,
  explainAudioUrl: string,
): Promise<void> {
  await prisma.bookSentence.update({
    where: { id: sentenceId },
    data: { explainAudioUrl },
  });
}

/** 章节正文（段落列表） */
export async function getChapterContent(
  slug: string,
  chapterNumber: number,
): Promise<ChapterContent | null> {
  const book = await prisma.book.findUnique({
    where: { slug },
    select: { id: true, slug: true, title: true, titleZh: true, chapterCount: true, isPublished: true },
  });
  if (!book || !book.isPublished) return null;

  const chapter = await prisma.bookChapter.findUnique({
    where: { bookId_chapterNumber: { bookId: book.id, chapterNumber } },
    include: {
      paragraphs: {
        orderBy: { paraIndex: 'asc' },
        select: { paraIndex: true, rawText: true, translationZh: true, englishSentences: true, sentenceTranslations: true },
      },
    },
  });
  if (!chapter) return null;

  return {
    bookSlug: book.slug,
    bookTitle: book.title,
    bookTitleZh: book.titleZh,
    chapterNumber: chapter.chapterNumber,
    title: chapter.title,
    titleZh: chapter.titleZh,
    ordinal: chapter.ordinal,
    wordCount: chapter.wordCount,
    paragraphs: chapter.paragraphs.map((p) => ({
      index: p.paraIndex,
      text: p.rawText,
      translationZh: p.translationZh,
      englishSentences: p.englishSentences as string[] | null,
      sentenceTranslations: p.sentenceTranslations as string[] | null,
    })),
    prevChapter: chapter.chapterNumber > 1 ? chapter.chapterNumber - 1 : null,
    nextChapter: chapter.chapterNumber < book.chapterCount ? chapter.chapterNumber + 1 : null,
  };
}


