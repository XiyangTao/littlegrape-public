-- CreateTable
CREATE TABLE "moderation_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "contentType" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "hitLabels" TEXT,
    "hitWords" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'aliyun',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "books" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleZh" TEXT,
    "author" TEXT NOT NULL,
    "authorZh" TEXT,
    "level" TEXT NOT NULL,
    "lexile" INTEGER,
    "cefr" TEXT,
    "readingEase" DOUBLE PRECISION,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "chapterCount" INTEGER NOT NULL DEFAULT 0,
    "estMinutes" INTEGER NOT NULL DEFAULT 0,
    "coverUrl" TEXT,
    "description" TEXT,
    "publishedYear" INTEGER,
    "source" TEXT NOT NULL DEFAULT 'standard_ebooks',
    "sourceUrl" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_chapters" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "chapterNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "titleZh" TEXT,
    "ordinal" TEXT,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "estMinutes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_paragraphs" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "paraIndex" INTEGER NOT NULL,
    "rawText" TEXT NOT NULL,
    "translationZh" TEXT,
    "englishSentences" JSONB,
    "sentenceTranslations" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "book_paragraphs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_sentences" (
    "id" TEXT NOT NULL,
    "paragraphId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "audioUrl" TEXT,
    "explainCn" TEXT,
    "explainAudioUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_sentences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_book_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'reading',
    "lastChapter" INTEGER NOT NULL DEFAULT 1,
    "lastParaIndex" INTEGER NOT NULL DEFAULT 0,
    "progressPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "readSeconds" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_book_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "word_lookup_cache" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "lemma" TEXT,
    "phonetic" TEXT,
    "partOfSpeech" TEXT,
    "meaning" TEXT NOT NULL,
    "meanings" JSONB,
    "notes" TEXT,
    "audioUrlUs" TEXT,
    "audioUrlUk" TEXT,
    "source" TEXT NOT NULL DEFAULT 'ai',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "word_lookup_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_book_chapter_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "chapterNumber" INTEGER NOT NULL,
    "maxParaIndex" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "readSeconds" INTEGER NOT NULL DEFAULT 0,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_book_chapter_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "moderation_logs_userId_createdAt_idx" ON "moderation_logs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "moderation_logs_result_createdAt_idx" ON "moderation_logs"("result", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "books_slug_key" ON "books"("slug");

-- CreateIndex
CREATE INDEX "books_level_isPublished_idx" ON "books"("level", "isPublished");

-- CreateIndex
CREATE INDEX "books_sortOrder_idx" ON "books"("sortOrder");

-- CreateIndex
CREATE INDEX "book_chapters_bookId_idx" ON "book_chapters"("bookId");

-- CreateIndex
CREATE UNIQUE INDEX "book_chapters_bookId_chapterNumber_key" ON "book_chapters"("bookId", "chapterNumber");

-- CreateIndex
CREATE INDEX "book_paragraphs_chapterId_idx" ON "book_paragraphs"("chapterId");

-- CreateIndex
CREATE UNIQUE INDEX "book_paragraphs_chapterId_paraIndex_key" ON "book_paragraphs"("chapterId", "paraIndex");

-- CreateIndex
CREATE INDEX "book_sentences_paragraphId_idx" ON "book_sentences"("paragraphId");

-- CreateIndex
CREATE UNIQUE INDEX "book_sentences_paragraphId_orderIndex_key" ON "book_sentences"("paragraphId", "orderIndex");

-- CreateIndex
CREATE INDEX "user_book_progress_userId_idx" ON "user_book_progress"("userId");

-- CreateIndex
CREATE INDEX "user_book_progress_userId_lastReadAt_idx" ON "user_book_progress"("userId", "lastReadAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_book_progress_userId_bookId_key" ON "user_book_progress"("userId", "bookId");

-- CreateIndex
CREATE UNIQUE INDEX "word_lookup_cache_text_key" ON "word_lookup_cache"("text");

-- CreateIndex
CREATE INDEX "word_lookup_cache_lemma_idx" ON "word_lookup_cache"("lemma");

-- CreateIndex
CREATE INDEX "user_book_chapter_progress_userId_bookId_idx" ON "user_book_chapter_progress"("userId", "bookId");

-- CreateIndex
CREATE UNIQUE INDEX "user_book_chapter_progress_userId_bookId_chapterNumber_key" ON "user_book_chapter_progress"("userId", "bookId", "chapterNumber");

-- AddForeignKey
ALTER TABLE "book_chapters" ADD CONSTRAINT "book_chapters_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_paragraphs" ADD CONSTRAINT "book_paragraphs_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "book_chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_sentences" ADD CONSTRAINT "book_sentences_paragraphId_fkey" FOREIGN KEY ("paragraphId") REFERENCES "book_paragraphs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_book_progress" ADD CONSTRAINT "user_book_progress_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ======================================================================
-- Raw SQL: 同一用户只能有一条 status='active' 订阅（DB 层防重复）
-- Prisma schema 不支持 partial unique index（WHERE 条件），故此处手写。
-- 配套代码：quotaService.upgradeUserPlan 已调整为"先 superseded 旧 → 再 insert 新"
-- ======================================================================
CREATE UNIQUE INDEX IF NOT EXISTS "user_subscriptions_active_unique"
ON "user_subscriptions" ("userId")
WHERE status = 'active';
