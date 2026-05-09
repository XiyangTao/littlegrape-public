import { getDatabase, runSerialWrite } from './DatabaseManager';

// ==================== 类型定义 ====================

export interface PhonemeProgressRow {
  id: string;
  userId: string;
  phonemeSymbol: string;
  practiceCount: number;
  totalWordCount: number;
  avgScore: number;
  bestScore: number;
  lastScore: number;
  masteryLevel: 'none' | 'beginner' | 'intermediate' | 'advanced' | 'mastered';
  listenCorrectCount: number;
  listenTotalCount: number;
  lastPracticedAt: number | null;
  updatedAt: number;
}

// ==================== 行转换 ====================

/** SQLite 原始行类型（snake_case 字段，值由 op-sqlite 返回） */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RawRow = Record<string, any>;

function rowToPhonemeProgress(row: RawRow): PhonemeProgressRow {
  return {
    id: row.id,
    userId: row.user_id,
    phonemeSymbol: row.phoneme_symbol,
    practiceCount: row.practice_count ?? 0,
    totalWordCount: row.total_word_count ?? 0,
    avgScore: row.avg_score ?? 0,
    bestScore: row.best_score ?? 0,
    lastScore: row.last_score ?? 0,
    masteryLevel: row.mastery_level ?? 'none',
    listenCorrectCount: row.listen_correct_count ?? 0,
    listenTotalCount: row.listen_total_count ?? 0,
    lastPracticedAt: row.last_practiced_at ?? null,
    updatedAt: row.updated_at,
  };
}

// ==================== 查询操作 ====================

/**
 * 获取所有音素的进度（用于首页展示）
 */
export async function getAllPhonemeProgress(
  userId: string
): Promise<Map<string, PhonemeProgressRow>> {
  const db = await getDatabase();
  const result = await db.execute(
    'SELECT * FROM phoneme_progress WHERE user_id = ?',
    [userId]
  );

  const map = new Map<string, PhonemeProgressRow>();
  for (const row of result.rows as RawRow[]) {
    const progress = rowToPhonemeProgress(row);
    map.set(progress.phonemeSymbol, progress);
  }
  return map;
}

/**
 * 获取指定音素的进度
 */
export async function getPhonemeProgress(
  userId: string,
  phonemeSymbol: string
): Promise<PhonemeProgressRow | null> {
  const db = await getDatabase();
  const result = await db.execute(
    'SELECT * FROM phoneme_progress WHERE user_id = ? AND phoneme_symbol = ?',
    [userId, phonemeSymbol]
  );

  const row = result.rows[0] as RawRow | undefined;
  if (!row) return null;
  return rowToPhonemeProgress(row);
}

// ==================== 写入操作 ====================

/**
 * 计算 mastery_level
 * 综合分 = 跟读分 × 0.7 + 听辨准确率 × 100 × 0.3（无听辨数据时使用纯跟读分）
 */
function calculateMasteryLevel(
  practiceCount: number,
  avgScore: number,
  listenCorrectCount: number = 0,
  listenTotalCount: number = 0,
): PhonemeProgressRow['masteryLevel'] {
  let compositeScore = avgScore;
  if (listenTotalCount > 0) {
    const listenAccuracy = (listenCorrectCount / listenTotalCount) * 100;
    compositeScore = avgScore * 0.7 + listenAccuracy * 0.3;
  }
  if (practiceCount >= 5 && compositeScore >= 90) return 'mastered';
  if (practiceCount >= 3 && compositeScore >= 80) return 'advanced';
  if (practiceCount >= 2 && compositeScore >= 80) return 'intermediate';
  if (practiceCount >= 1 && compositeScore >= 80) return 'beginner';
  if (practiceCount >= 1) return 'none';
  return 'none';
}

/**
 * 保存练习 session 结果
 * @param userId 用户 ID
 * @param phonemeSymbol IPA 音素符号
 * @param wordResults 各单词的评估结果（跟读题）
 * @param listenResults 听辨题统计（可选）
 */
export async function savePhonemeSessionResult(
  userId: string,
  phonemeSymbol: string,
  wordResults: {
    word: string;
    accuracyScore: number;
    phonemeAccuracyScore: number | null;
    allPhonemes: { phoneme: string; accuracyScore: number }[] | null;
  }[],
  listenResults?: { totalCount: number; correctCount: number }
): Promise<void> {
  return runSerialWrite(async () => {
    const db = await getDatabase();
    const now = Date.now();

    // 1. 计算本次 session 跟读平均分
    const sessionAvg = wordResults.length > 0
      ? wordResults.reduce((sum, wr) => sum + wr.accuracyScore, 0) / wordResults.length
      : 0;

    // 2. UPSERT phoneme_progress
    const progressId = `pp_${phonemeSymbol}_${userId}`;
    const existing = await db.execute(
      'SELECT * FROM phoneme_progress WHERE id = ?',
      [progressId]
    );
    const row = existing.rows[0] as RawRow | undefined;

    const hasSpeak = wordResults.length > 0;

    if (row) {
      // 更新：跟读分仅在有跟读结果时更新
      const newPracticeCount = row.practice_count + (hasSpeak ? 1 : 0);
      const newTotalWordCount = row.total_word_count + wordResults.length;
      const newAvgScore = hasSpeak && newPracticeCount > 0
        ? (row.avg_score * row.practice_count + sessionAvg) / newPracticeCount
        : row.avg_score;
      const newBestScore = hasSpeak ? Math.max(row.best_score, sessionAvg) : row.best_score;
      const newLastScore = hasSpeak ? sessionAvg : row.last_score;
      const newListenCorrect = row.listen_correct_count + (listenResults?.correctCount ?? 0);
      const newListenTotal = row.listen_total_count + (listenResults?.totalCount ?? 0);
      const effectivePracticeCount = Math.max(newPracticeCount, 1);
      const newMastery = calculateMasteryLevel(effectivePracticeCount, newAvgScore, newListenCorrect, newListenTotal);

      await db.execute(
        `UPDATE phoneme_progress SET
          practice_count = ?, total_word_count = ?, avg_score = ?, best_score = ?,
          last_score = ?, mastery_level = ?, listen_correct_count = ?, listen_total_count = ?,
          last_practiced_at = ?, updated_at = ?, synced_at = NULL
         WHERE id = ?`,
        [newPracticeCount, newTotalWordCount, newAvgScore, newBestScore, newLastScore, newMastery, newListenCorrect, newListenTotal, now, now, progressId]
      );
    } else {
      // 新建
      const listenCorrect = listenResults?.correctCount ?? 0;
      const listenTotal = listenResults?.totalCount ?? 0;
      const initialPracticeCount = hasSpeak ? 1 : 0;
      const mastery = calculateMasteryLevel(Math.max(initialPracticeCount, listenTotal > 0 ? 1 : 0), sessionAvg, listenCorrect, listenTotal);
      await db.execute(
        `INSERT INTO phoneme_progress (id, user_id, phoneme_symbol, practice_count, total_word_count, avg_score, best_score, last_score, mastery_level, listen_correct_count, listen_total_count, last_practiced_at, updated_at, synced_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
        [progressId, userId, phonemeSymbol, initialPracticeCount, wordResults.length, sessionAvg, sessionAvg, sessionAvg, mastery, listenCorrect, listenTotal, now, now]
      );
    }
  });
}

// ==================== 同步辅助函数 ====================

/**
 * 获取未同步的音素进度（synced_at IS NULL）
 */
export async function getUnsyncedPhonemeProgress(
  userId: string
): Promise<PhonemeProgressRow[]> {
  const db = await getDatabase();
  const result = await db.execute(
    'SELECT * FROM phoneme_progress WHERE user_id = ? AND synced_at IS NULL',
    [userId]
  );
  return (result.rows as RawRow[]).map(rowToPhonemeProgress);
}

/**
 * 标记音素进度为已同步（synced_at = updated_at）
 */
export async function markPhonemeProgressSynced(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  return runSerialWrite(async () => {
    const db = await getDatabase();
    const placeholders = ids.map(() => '?').join(',');
    await db.execute(
      `UPDATE phoneme_progress SET synced_at = updated_at WHERE id IN (${placeholders})`,
      ids
    );
  });
}

/**
 * 从服务端数据写入/更新本地音素进度
 * 仅当服务端 updatedAt > 本地 updatedAt 时覆盖
 * 返回实际插入/更新的条数
 */
export async function upsertPhonemeProgressFromServer(
  userId: string,
  serverProgress: Array<{
    phonemeSymbol: string;
    practiceCount: number;
    totalWordCount: number;
    avgScore: number;
    bestScore: number;
    lastScore: number;
    masteryLevel: string;
    listenCorrectCount: number;
    listenTotalCount: number;
    lastPracticedAt: number | null;
    updatedAt: number;
  }>
): Promise<number> {
  if (serverProgress.length === 0) return 0;

  let count = 0;
  await runSerialWrite(async () => {
    const db = await getDatabase();
    for (const p of serverProgress) {
      const progressId = `pp_${p.phonemeSymbol}_${userId}`;
      const existing = await db.execute(
        'SELECT updated_at FROM phoneme_progress WHERE id = ?',
        [progressId]
      );
      const row = existing.rows[0] as RawRow | undefined;

      if (row && row.updated_at >= p.updatedAt) {
        // 本地数据更新，跳过
        continue;
      }

      if (row) {
        await db.execute(
          `UPDATE phoneme_progress SET
            practice_count = ?, total_word_count = ?, avg_score = ?, best_score = ?,
            last_score = ?, mastery_level = ?, listen_correct_count = ?, listen_total_count = ?,
            last_practiced_at = ?, updated_at = ?, synced_at = ?
           WHERE id = ?`,
          [p.practiceCount, p.totalWordCount, p.avgScore, p.bestScore,
           p.lastScore, p.masteryLevel, p.listenCorrectCount, p.listenTotalCount,
           p.lastPracticedAt, p.updatedAt, p.updatedAt, progressId]
        );
      } else {
        await db.execute(
          `INSERT INTO phoneme_progress (id, user_id, phoneme_symbol, practice_count, total_word_count, avg_score, best_score, last_score, mastery_level, listen_correct_count, listen_total_count, last_practiced_at, updated_at, synced_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [progressId, userId, p.phonemeSymbol, p.practiceCount, p.totalWordCount,
           p.avgScore, p.bestScore, p.lastScore, p.masteryLevel,
           p.listenCorrectCount, p.listenTotalCount, p.lastPracticedAt,
           p.updatedAt, p.updatedAt]
        );
      }
      count++;
    }
  });
  return count;
}
