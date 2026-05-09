/**
 * 关卡系统 DB 操作模块
 * 管理关卡定义、用户关卡进度
 */

import { getDatabase, runSerialWrite } from '../DatabaseManager';
import { safeJsonParse } from '@/utils/safeJsonParse';
import { rowToLocalWord, rowToLocalProgress } from './helpers';
import { getWordProgressBatch } from './WordProgressDB';
import { ensureWordDetails, getFullWords } from './WordDetailCacheDB';
import type { LearnWordWithProgress } from './types';
import { getTodayStartTimestamp } from '@/utils/dateUtils';

// ==================== 类型定义 ====================

export interface WordLevel {
  id: string;
  tag: string;
  levelIndex: number;
  chapterIndex: number;
  isBoss: boolean;
  wordIds: string[];
}

export interface UserLevelProgress {
  id: string;
  userId: string;
  tag: string;
  levelIndex: number;
  stars: number;
  flashCorrect: number;
  flashTotal: number;
  challengeCorrect: number;
  challengeTotal: number;
  comboMax: number;
  score: number;
  xpEarned: number;
  weakWordIds: string[];
  completedAt: number | null;
  updatedAt: number;
}

// ==================== 常量 ====================

const WORDS_PER_LEVEL = 10;
const LEVELS_PER_BOSS = 5;
const LEVELS_PER_CHAPTER = 10;

// ==================== 关卡生成 ====================

/**
 * 为指定词库生成关卡（幂等：已有则跳过）
 * 算法：按 bnc_coca_level 升序排列词库所有 headword，每 10 个为一关
 * 每 5 关的最后一关标记为 Boss 关
 * @returns 生成的关卡总数
 */
export async function generateLevelsForTag(tag: string): Promise<number> {
  const db = await getDatabase();

  // 检查是否已生成
  const existingResult = await db.execute(
    'SELECT COUNT(*) as cnt FROM word_levels WHERE tag = ?',
    [tag]
  );
  const existingCount = Number((existingResult.rows[0] as any)?.cnt || 0);
  if (existingCount > 0) {
    return existingCount;
  }

  // 获取该词库所有 headword，按难度排序
  const wordsResult = await db.execute(`
    SELECT w.id FROM words w
    INNER JOIN word_tags wt ON w.id = wt.word_id
    WHERE wt.tag = ? AND w.is_headword = 1
    ORDER BY w.bnc_coca_level ASC, w.word ASC
  `, [tag]);

  const wordIds = (wordsResult.rows as any[]).map(r => r.id);
  if (wordIds.length === 0) return 0;

  let generatedCount = 0;

  await runSerialWrite(async () => {
    const db = await getDatabase();
    // 分批生成关卡
    let levelIndex = 0;

    for (let i = 0; i < wordIds.length; i += WORDS_PER_LEVEL) {
      const chunk = wordIds.slice(i, i + WORDS_PER_LEVEL);
      if (chunk.length < 3) break; // 不足 3 词跳过

      const chapterIndex = Math.floor(levelIndex / LEVELS_PER_CHAPTER);
      const isBoss = (levelIndex + 1) % LEVELS_PER_BOSS === 0 ? 1 : 0;
      const levelId = `level_${tag}_${levelIndex}`;

      await db.execute(`
        INSERT OR IGNORE INTO word_levels (id, tag, level_index, chapter_index, is_boss, word_ids)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [levelId, tag, levelIndex, chapterIndex, isBoss, JSON.stringify(chunk)]);

      levelIndex++;
      generatedCount++;
    }
  });

  if (__DEV__) console.log(`[LevelDB] Generated ${generatedCount} levels for tag "${tag}"`);
  return generatedCount;
}

// ==================== 关卡查询 ====================

/**
 * 获取词库的所有关卡列表
 */
export async function getLevelsForTag(tag: string): Promise<WordLevel[]> {
  const db = await getDatabase();
  const result = await db.execute(
    'SELECT * FROM word_levels WHERE tag = ? ORDER BY level_index ASC',
    [tag]
  );
  return (result.rows as any[]).map(rowToWordLevel);
}

/**
 * 获取单个关卡
 */
export async function getLevelByIndex(tag: string, levelIndex: number): Promise<WordLevel | null> {
  const db = await getDatabase();
  const result = await db.execute(
    'SELECT * FROM word_levels WHERE tag = ? AND level_index = ?',
    [tag, levelIndex]
  );
  const row = result.rows[0] as any | undefined;
  return row ? rowToWordLevel(row) : null;
}

/**
 * 获取词库的关卡总数
 */
export async function getLevelCountForTag(tag: string): Promise<number> {
  const db = await getDatabase();
  const result = await db.execute(
    'SELECT COUNT(*) as cnt FROM word_levels WHERE tag = ?',
    [tag]
  );
  return Number((result.rows[0] as any)?.cnt || 0);
}

// ==================== 用户进度 ====================

/**
 * 获取用户在某词库的所有关卡进度
 */
export async function getUserLevelProgressForTag(
  userId: string,
  tag: string
): Promise<UserLevelProgress[]> {
  const db = await getDatabase();
  const result = await db.execute(
    'SELECT * FROM user_level_progress WHERE user_id = ? AND tag = ? ORDER BY level_index ASC',
    [userId, tag]
  );
  return (result.rows as any[]).map(rowToProgress);
}

/**
 * 获取用户单个关卡进度
 */
export async function getUserLevelProgress(
  userId: string,
  tag: string,
  levelIndex: number
): Promise<UserLevelProgress | null> {
  const db = await getDatabase();
  const result = await db.execute(
    'SELECT * FROM user_level_progress WHERE user_id = ? AND tag = ? AND level_index = ?',
    [userId, tag, levelIndex]
  );
  const row = result.rows[0] as any | undefined;
  return row ? rowToProgress(row) : null;
}

/**
 * 获取当前应该进入的关卡编号（最高已完成关卡 + 1）
 */
export async function getCurrentLevelIndex(userId: string, tag: string): Promise<number> {
  const db = await getDatabase();
  const result = await db.execute(
    'SELECT MAX(level_index) as max_level FROM user_level_progress WHERE user_id = ? AND tag = ? AND stars >= 1',
    [userId, tag]
  );
  const maxCompleted = (result.rows[0] as any)?.max_level;
  if (maxCompleted === null || maxCompleted === undefined) return 0;
  return Number(maxCompleted) + 1;
}

/**
 * 保存关卡结果（Upsert：星级取最大值，首次完成记录时间）
 */
export async function saveUserLevelProgress(
  progress: Omit<UserLevelProgress, 'id'>
): Promise<void> {
  const id = `ulp_${progress.userId}_${progress.tag}_${progress.levelIndex}`;

  return runSerialWrite(async () => {
    const db = await getDatabase();
    await db.execute(`
      INSERT INTO user_level_progress
        (id, user_id, tag, level_index, stars, flash_correct, flash_total,
         challenge_correct, challenge_total, combo_max, score, xp_earned,
         weak_word_ids, completed_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, tag, level_index) DO UPDATE SET
        stars = MAX(excluded.stars, user_level_progress.stars),
        flash_correct = excluded.flash_correct,
        flash_total = excluded.flash_total,
        challenge_correct = excluded.challenge_correct,
        challenge_total = excluded.challenge_total,
        combo_max = MAX(excluded.combo_max, user_level_progress.combo_max),
        score = MAX(excluded.score, user_level_progress.score),
        xp_earned = user_level_progress.xp_earned + CASE
          WHEN excluded.stars > user_level_progress.stars THEN excluded.xp_earned
          ELSE 5
        END,
        weak_word_ids = excluded.weak_word_ids,
        completed_at = COALESCE(user_level_progress.completed_at, excluded.completed_at),
        updated_at = excluded.updated_at
    `, [
      id,
      progress.userId,
      progress.tag,
      progress.levelIndex,
      progress.stars,
      progress.flashCorrect,
      progress.flashTotal,
      progress.challengeCorrect,
      progress.challengeTotal,
      progress.comboMax,
      progress.score,
      progress.xpEarned,
      JSON.stringify(progress.weakWordIds),
      progress.completedAt,
      progress.updatedAt,
    ]);
  });
}

/**
 * 获取用户在某词库的总星数
 */
export async function getTotalStarsForTag(userId: string, tag: string): Promise<number> {
  const db = await getDatabase();
  const result = await db.execute(
    'SELECT COALESCE(SUM(stars), 0) as total FROM user_level_progress WHERE user_id = ? AND tag = ?',
    [userId, tag]
  );
  return Number((result.rows[0] as any)?.total || 0);
}

/**
 * 获取用户今日完成的关卡数（所有词库合计）
 */
export async function getTodayCompletedLevels(userId: string): Promise<number> {
  const db = await getDatabase();
  const todayTimestamp = getTodayStartTimestamp();

  const result = await db.execute(
    'SELECT COUNT(*) as cnt FROM user_level_progress WHERE user_id = ? AND completed_at >= ?',
    [userId, todayTimestamp]
  );
  return Number((result.rows[0] as any)?.cnt || 0);
}

// ==================== Boss 关卡 ====================

/**
 * 获取 Boss 关覆盖的前 5 关所有单词 ID（合并去重）
 */
export async function getBossLevelWordIds(tag: string, bossLevelIndex: number): Promise<string[]> {
  const db = await getDatabase();
  const startIndex = Math.max(0, bossLevelIndex - 4);

  const result = await db.execute(`
    SELECT word_ids FROM word_levels
    WHERE tag = ? AND level_index >= ? AND level_index <= ?
    ORDER BY level_index
  `, [tag, startIndex, bossLevelIndex]);

  const allWordIds: string[] = [];
  const seen = new Set<string>();

  for (const row of result.rows as any[]) {
    const ids = JSON.parse(row.word_ids || '[]');
    for (const id of ids) {
      if (!seen.has(id)) {
        seen.add(id);
        allWordIds.push(id);
      }
    }
  }

  return allWordIds;
}

// ==================== 单词加载 ====================

/**
 * 按 ID 列表加载单词及其学习进度（保持传入顺序）
 * 通过 ensureWordDetails 预加载详情缓存，再用 LEFT JOIN 获取完整数据
 */
export async function getWordsByIds(
  wordIds: string[],
  userId: string
): Promise<LearnWordWithProgress[]> {
  if (wordIds.length === 0) return [];

  // 预加载详情缓存
  await ensureWordDetails(wordIds);

  // 获取完整单词数据（words LEFT JOIN 缓存）
  const words = await getFullWords(wordIds);

  // 加载进度
  const progressMap = await getWordProgressBatch(userId, wordIds);

  // 按 wordIds 顺序重排
  const wordMap = new Map<string, any>();
  for (const w of words) {
    wordMap.set(w.id, w);
  }

  return wordIds
    .filter(id => wordMap.has(id))
    .map(id => {
      const word = wordMap.get(id)!;
      const progress = progressMap.get(id) || null;
      return { ...word, progress } as LearnWordWithProgress;
    });
}

// ==================== 工具函数 ====================

function rowToWordLevel(row: any): WordLevel {
  return {
    id: row.id,
    tag: row.tag,
    levelIndex: row.level_index,
    chapterIndex: row.chapter_index,
    isBoss: Boolean(row.is_boss),
    wordIds: safeJsonParse(row.word_ids, []),
  };
}

function rowToProgress(row: any): UserLevelProgress {
  return {
    id: row.id,
    userId: row.user_id,
    tag: row.tag,
    levelIndex: row.level_index,
    stars: row.stars,
    flashCorrect: row.flash_correct,
    flashTotal: row.flash_total,
    challengeCorrect: row.challenge_correct,
    challengeTotal: row.challenge_total,
    comboMax: row.combo_max,
    score: row.score,
    xpEarned: row.xp_earned,
    weakWordIds: safeJsonParse(row.weak_word_ids, []),
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
  };
}
