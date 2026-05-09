import { getDatabase, runSerialWrite } from '../DatabaseManager';
import { generateShortId } from '@/utils/idGenerator';
import type { VocabularyTestWord, VocabularyTestRecord } from './types';
import { rowToVocabTestRecord, rowToVocabTestWord } from './helpers';

/** 每用户最大保留的词汇量测试记录数 */
const MAX_VOCABULARY_TESTS_PER_USER = 500;

/**
 * 获取指定层级的一个随机单词（用于 CAT 自适应测试）
 *
 * @param level BNC/COCA 词频层级 1-25
 * @param excludeIds 要排除的单词ID列表
 * @returns 随机单词，如果没有可用单词则返回 null
 */
export async function getWordForVocabularyTest(
  level: number,
  excludeIds: string[] = []
): Promise<VocabularyTestWord | null> {
  const db = await getDatabase();

  // 构建排除条件
  let excludeClause = '';
  const params: (string | number | null)[] = [level];

  if (excludeIds.length > 0) {
    const placeholders = excludeIds.map(() => '?').join(',');
    excludeClause = `AND id NOT IN (${placeholders})`;
    params.push(...excludeIds);
  }

  const result = await db.execute(`
    SELECT id, word, meaning_cn, pos, phonetic_us, bnc_coca_level
    FROM words
    WHERE bnc_coca_level = ?
    AND is_headword = 1
    AND meaning_cn IS NOT NULL AND meaning_cn != ''
    ${excludeClause}
    ORDER BY RANDOM()
    LIMIT 1
  `, params);

  if (result.rows.length === 0) {
    return null;
  }

  return rowToVocabTestWord(result.rows[0] as any);
}

/**
 * 按 BNC/COCA 级别随机抽样词族代表词
 * 用于词汇量测试的分层抽样
 *
 * @param level BNC/COCA 词族级别 1-25
 * @param count 抽样数量
 * @param excludeIds 要排除的单词ID列表
 * @returns 随机抽样的单词列表
 */
export async function getWordsByBncCocaLevel(
  level: number,
  count: number,
  excludeIds: string[] = []
): Promise<VocabularyTestWord[]> {
  const db = await getDatabase();

  // 构建排除条件
  let excludeClause = '';
  const params: (string | number | null)[] = [level];

  if (excludeIds.length > 0) {
    const placeholders = excludeIds.map(() => '?').join(',');
    excludeClause = `AND id NOT IN (${placeholders})`;
    params.push(...excludeIds);
  }

  params.push(count);

  const result = await db.execute(`
    SELECT id, word, meaning_cn, pos, phonetic_us, bnc_coca_level
    FROM words
    WHERE bnc_coca_level = ?
    AND is_headword = 1
    AND meaning_cn IS NOT NULL AND meaning_cn != ''
    ${excludeClause}
    ORDER BY RANDOM()
    LIMIT ?
  `, params);

  return (result.rows as any[]).map(rowToVocabTestWord);
}

/**
 * 获取指定 BNC/COCA 级别的词族代表词数量
 *
 * @param level BNC/COCA 词族级别 1-25
 * @returns 该级别的词族代表词数量
 */
export async function getHeadwordCountByLevel(level: number): Promise<number> {
  const db = await getDatabase();

  const result = await db.execute(`
    SELECT COUNT(*) as count
    FROM words
    WHERE bnc_coca_level = ?
    AND is_headword = 1
    AND meaning_cn IS NOT NULL AND meaning_cn != ''
  `, [level]);

  const row = result.rows[0] as { count: number } | undefined;
  return Number(row?.count ?? 0);
}

/**
 * 获取同层级的干扰释义（用于词汇量测试的4选1选项生成）
 * 优先从相同词频层级、相同词性选取，不够时从相邻层级补充
 *
 * @param level 目标词频层级 (BNC/COCA 1-25)
 * @param excludeWordIds 要排除的单词ID列表
 * @param targetPos 目标词性（可选，用于匹配词性）
 * @param correctMeaning 正确答案的释义（用于排除相似释义）
 * @param count 需要的干扰项数量
 * @returns 干扰释义数组
 */
export async function getDistractorMeanings(
  level: number,
  excludeWordIds: string[],
  targetPos?: string,
  correctMeaning?: string,
  count: number = 3
): Promise<string[]> {
  const db = await getDatabase();
  const results: string[] = [];

  // 构建排除条件
  const excludePlaceholders = excludeWordIds.map(() => '?').join(',');
  const excludeClause = excludeWordIds.length > 0
    ? `AND id NOT IN (${excludePlaceholders})`
    : '';

  // 尝试从同层级和相邻层级获取干扰项
  // 优先同层级，然后上下层级交替
  const levelsToTry = [level];
  for (let offset = 1; offset <= 10; offset++) {
    if (level + offset <= 25) levelsToTry.push(level + offset);
    if (level - offset >= 1) levelsToTry.push(level - offset);
  }

  // 第一轮：尝试匹配词性
  if (targetPos) {
    for (const tryLevel of levelsToTry) {
      if (results.length >= count) break;

      const remaining = count - results.length;
      const params: (string | number | null)[] = [tryLevel, targetPos, ...excludeWordIds];

      // 排除已选的释义
      let resultExcludeClause = '';
      if (results.length > 0) {
        const resultPlaceholders = results.map(() => '?').join(',');
        resultExcludeClause = `AND meaning_cn NOT IN (${resultPlaceholders})`;
        params.push(...results);
      }

      // 排除与正确答案相似的释义
      let correctExcludeClause = '';
      if (correctMeaning) {
        correctExcludeClause = `AND meaning_cn != ?`;
        params.push(correctMeaning);
      }

      params.push(remaining);

      const queryResult = await db.execute(`
        SELECT meaning_cn
        FROM words
        WHERE bnc_coca_level = ?
        AND pos = ?
        AND meaning_cn IS NOT NULL AND meaning_cn != ''
        ${excludeClause}
        ${resultExcludeClause}
        ${correctExcludeClause}
        ORDER BY RANDOM()
        LIMIT ?
      `, params);

      for (const row of queryResult.rows as any[]) {
        if (results.length < count && !results.includes(row.meaning_cn)) {
          results.push(row.meaning_cn);
        }
      }
    }
  }

  // 第二轮：不限词性，补充不足的干扰项
  for (const tryLevel of levelsToTry) {
    if (results.length >= count) break;

    const remaining = count - results.length;
    const params: (string | number | null)[] = [tryLevel, ...excludeWordIds];

    // 排除已选的释义
    let resultExcludeClause = '';
    if (results.length > 0) {
      const resultPlaceholders = results.map(() => '?').join(',');
      resultExcludeClause = `AND meaning_cn NOT IN (${resultPlaceholders})`;
      params.push(...results);
    }

    // 排除与正确答案相似的释义
    let correctExcludeClause = '';
    if (correctMeaning) {
      correctExcludeClause = `AND meaning_cn != ?`;
      params.push(correctMeaning);
    }

    params.push(remaining);

    const queryResult = await db.execute(`
      SELECT meaning_cn
      FROM words
      WHERE bnc_coca_level = ?
      AND meaning_cn IS NOT NULL AND meaning_cn != ''
      ${excludeClause}
      ${resultExcludeClause}
      ${correctExcludeClause}
      ORDER BY RANDOM()
      LIMIT ?
    `, params);

    for (const row of queryResult.rows as any[]) {
      if (results.length < count && !results.includes(row.meaning_cn)) {
        results.push(row.meaning_cn);
      }
    }
  }

  return results;
}

// ==================== 词汇量测试结果操作 ====================

/**
 * 获取用户的最新词汇量测试结果
 */
export async function getVocabularyTestResult(userId: string): Promise<VocabularyTestRecord | null> {
  const db = await getDatabase();
  const result = await db.execute(
    'SELECT * FROM vocabulary_test_results WHERE user_id = ? ORDER BY event_time DESC LIMIT 1',
    [userId]
  );

  const row = result.rows[0] as any;
  if (!row) return null;

  return rowToVocabTestRecord(row);
}

/**
 * 保存词汇量测试结果
 */
export async function saveVocabularyTestResult(
  userId: string,
  result: import('@/services/VocabularyTestService').VocabularyTestResult
): Promise<VocabularyTestRecord> {
  const { VOCABULARY_LEVELS } = await import('@/services/VocabularyTestService');

  // 找到对应的等级信息
  const levelInfo = VOCABULARY_LEVELS.find(
    (l: any) => result.estimatedVocabulary >= l.min && result.estimatedVocabulary < l.max
  ) || VOCABULARY_LEVELS[0];

  const now = Date.now();
  const uniqueKey = `${userId}_vocab_test`;
  const id = generateShortId(uniqueKey, now);

  const record: VocabularyTestRecord = {
    id,
    userId,
    estimatedVocabulary: result.estimatedVocabulary,
    totalQuestions: result.totalQuestions,
    correctCount: result.totalCorrect,
    duration: Math.round(result.testDuration / 1000), // 毫秒转秒
    level: result.vocabularyLevel,
    levelDescription: levelInfo.description,
    confidenceLower: result.confidenceInterval.lower,
    confidenceUpper: result.confidenceInterval.upper,
    eventTime: now,
    syncStatus: 'pending',
    syncedAt: null,
  };

  return runSerialWrite(async () => {
    const db = await getDatabase();
    await db.execute(`
      INSERT INTO vocabulary_test_results (
        id, user_id, estimated_vocabulary, total_questions, correct_count, duration,
        level, level_description, confidence_lower, confidence_upper,
        event_time, sync_status, synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      record.id,
      record.userId,
      record.estimatedVocabulary,
      record.totalQuestions,
      record.correctCount,
      record.duration,
      record.level,
      record.levelDescription,
      record.confidenceLower,
      record.confidenceUpper,
      record.eventTime,
      record.syncStatus,
      record.syncedAt,
    ]);

    return record;
  });
}

/**
 * 删除用户的词汇量测试结果
 */
export async function deleteVocabularyTestResult(userId: string): Promise<void> {
  return runSerialWrite(async () => {
    const db = await getDatabase();
    await db.execute('DELETE FROM vocabulary_test_results WHERE user_id = ?', [userId]);
  });
}

// ==================== 词汇量测试同步操作 ====================

/**
 * 获取未同步的词汇量测试记录
 */
export async function getUnsyncedVocabularyTests(userId: string): Promise<VocabularyTestRecord[]> {
  const db = await getDatabase();
  const result = await db.execute(
    `SELECT * FROM vocabulary_test_results
     WHERE user_id = ? AND sync_status = 'pending'
     ORDER BY event_time ASC`,
    [userId]
  );

  return (result.rows as any[]).map(rowToVocabTestRecord);
}

/**
 * 标记词汇量测试记录为已同步
 */
export async function markVocabularyTestsSynced(ids: string[]): Promise<void> {
  if (ids.length === 0) return;

  return runSerialWrite(async () => {
    const db = await getDatabase();
    const now = Date.now();
    const placeholders = ids.map(() => '?').join(',');

    await db.execute(
      `UPDATE vocabulary_test_results
       SET sync_status = 'synced', synced_at = ?
       WHERE id IN (${placeholders})`,
      [now, ...ids]
    );
  });
}

/**
 * 获取词汇量测试最近同步时间
 */
export async function getVocabularyTestLastSyncTime(userId: string): Promise<number | null> {
  const db = await getDatabase();

  const result = await db.execute(
    `SELECT MAX(synced_at) as last_sync
     FROM vocabulary_test_results
     WHERE user_id = ? AND synced_at IS NOT NULL`,
    [userId]
  );

  return (result.rows[0] as any)?.last_sync || null;
}

/**
 * 从服务端插入词汇量测试记录（INSERT OR IGNORE）
 */
export async function insertVocabularyTestsFromServer(
  userId: string,
  tests: Array<{
    id: string;
    estimatedVocabulary: number;
    totalQuestions: number;
    correctCount: number;
    duration: number;
    level: string;
    levelDescription: string;
    confidenceLower: number;
    confidenceUpper: number;
    eventTime: number;
  }>
): Promise<number> {
  if (tests.length === 0) return 0;

  return runSerialWrite(async () => {
    const db = await getDatabase();
    let insertedCount = 0;
    const now = Date.now();

    for (const test of tests) {
      const result = await db.execute(
        `INSERT OR IGNORE INTO vocabulary_test_results (
          id, user_id, estimated_vocabulary, total_questions, correct_count, duration,
          level, level_description, confidence_lower, confidence_upper,
          event_time, sync_status, synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
        [
          test.id,
          userId,
          test.estimatedVocabulary,
          test.totalQuestions,
          test.correctCount,
          test.duration,
          test.level,
          test.levelDescription,
          test.confidenceLower,
          test.confidenceUpper,
          test.eventTime,
          now,
        ]
      );
      if (result.rowsAffected > 0) {
        insertedCount++;
      }
    }

    // 清理超出限制的旧记录
    const countResult = await db.execute(
      'SELECT COUNT(*) as count FROM vocabulary_test_results WHERE user_id = ?',
      [userId]
    );
    const totalCount = (countResult.rows[0] as any)?.count || 0;

    if (totalCount > MAX_VOCABULARY_TESTS_PER_USER) {
      const toDelete = totalCount - MAX_VOCABULARY_TESTS_PER_USER;
      await db.execute(
        `DELETE FROM vocabulary_test_results
         WHERE user_id = ? AND id IN (
           SELECT id FROM vocabulary_test_results
           WHERE user_id = ?
           ORDER BY event_time ASC
           LIMIT ?
         )`,
        [userId, userId, toDelete]
      );
    }

    return insertedCount;
  });
}
