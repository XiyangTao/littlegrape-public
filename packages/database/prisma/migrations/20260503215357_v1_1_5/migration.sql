-- CreateTable
CREATE TABLE "annie_lessons" (
    "id" TEXT NOT NULL,
    "course" TEXT NOT NULL,
    "lessonNumber" INTEGER NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleZh" TEXT NOT NULL DEFAULT '',
    "summaryZh" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT,
    "characterMapping" JSONB,
    "learningObjectives" JSONB,
    "keyExpressions" JSONB,
    "script" JSONB,
    "voaArticleId" TEXT,
    "voaUrl" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "annie_lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_annie_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "course" TEXT NOT NULL,
    "lessonNumber" INTEGER NOT NULL,
    "stages" JSONB,
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_annie_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "annie_lessons_course_lessonNumber_idx" ON "annie_lessons"("course", "lessonNumber");

-- CreateIndex
CREATE UNIQUE INDEX "annie_lessons_course_lessonNumber_key" ON "annie_lessons"("course", "lessonNumber");

-- CreateIndex
CREATE INDEX "user_annie_progress_userId_idx" ON "user_annie_progress"("userId");

-- CreateIndex
CREATE INDEX "user_annie_progress_userId_course_idx" ON "user_annie_progress"("userId", "course");

-- CreateIndex
CREATE UNIQUE INDEX "user_annie_progress_userId_course_lessonNumber_key" ON "user_annie_progress"("userId", "course", "lessonNumber");

