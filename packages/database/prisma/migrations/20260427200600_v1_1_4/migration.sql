-- v1.1.4 schema 变更
-- 所有语句使用 IF EXISTS / IF NOT EXISTS 保证幂等（本地已通过 db push 部分应用）

-- AlterTable: Classics 章节进度增加句级精度
-- 本应在 d8d0ad2 commit 时生成 migration，当时只 db push 到本地
ALTER TABLE "user_book_chapter_progress"
  ADD COLUMN IF NOT EXISTS "lastParaIndex" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lastSentenceIndex" INTEGER NOT NULL DEFAULT 0;

-- DropTable: companion V1 路径下线
DROP TABLE IF EXISTS "user_companion_threads";
DROP TABLE IF EXISTS "user_companion_memories";
