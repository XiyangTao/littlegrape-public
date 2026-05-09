/**
 * 练习历史数据库操作
 *
 * 记录练习题的答题历史，支持错题复习功能
 */

import { getDatabase, runSerialWrite } from './DatabaseManager';
import type { ExerciseType, ExerciseQuestion } from '@/api/modules/exercise';

// ==================== 类型定义 ====================

export interface ExerciseHistoryRow {
  id: number;
  exerciseType: ExerciseType;
  questionJson: string;
  isCorrect: boolean;
  answeredAt: number;
}

// ==================== 写操作 ====================

/**
 * 保存一条练习记录
 */
export async function saveExerciseRecord(
  exerciseType: ExerciseType,
  question: ExerciseQuestion,
  isCorrect: boolean
): Promise<void> {
  return runSerialWrite(async () => {
    const db = await getDatabase();
    const now = Date.now();
    const questionJson = JSON.stringify(question);

    await db.execute(
      `INSERT INTO exercise_history (exercise_type, question_json, is_correct, answered_at)
       VALUES (?, ?, ?, ?)`,
      [exerciseType, questionJson, isCorrect ? 1 : 0, now]
    );
  });
}

// ==================== 读操作 ====================

/**
 * 获取错题列表（去重：同一题只保留最近一次错误记录，且排除后来已答对的题）
 */
export async function getWrongQuestions(limit: number = 50): Promise<ExerciseQuestion[]> {
  const db = await getDatabase();

  // 取最近答错的记录，但排除之后已答对的同一题
  const result = await db.execute(
    `SELECT h1.question_json
     FROM exercise_history h1
     WHERE h1.is_correct = 0
       AND NOT EXISTS (
         SELECT 1 FROM exercise_history h2
         WHERE json_extract(h2.question_json, '$.id') = json_extract(h1.question_json, '$.id')
           AND h2.is_correct = 1
           AND h2.answered_at > h1.answered_at
       )
     GROUP BY json_extract(h1.question_json, '$.id')
     ORDER BY MAX(h1.answered_at) DESC
     LIMIT ?`,
    [limit]
  );

  const questions: ExerciseQuestion[] = [];
  for (const row of result.rows as any[]) {
    try {
      questions.push(JSON.parse(row.question_json));
    } catch {
      // 跳过解析失败的记录
    }
  }
  return questions;
}

/**
 * 获取错题数量
 */
export async function getWrongQuestionsCount(): Promise<number> {
  const db = await getDatabase();

  const result = await db.execute(
    `SELECT COUNT(DISTINCT json_extract(question_json, '$.id')) as count
     FROM exercise_history h1
     WHERE h1.is_correct = 0
       AND NOT EXISTS (
         SELECT 1 FROM exercise_history h2
         WHERE json_extract(h2.question_json, '$.id') = json_extract(h1.question_json, '$.id')
           AND h2.is_correct = 1
           AND h2.answered_at > h1.answered_at
       )`
  );

  return (result.rows[0] as any)?.count || 0;
}

/**
 * 清除所有练习历史
 */
export async function clearExerciseHistory(): Promise<void> {
  return runSerialWrite(async () => {
    const db = await getDatabase();
    await db.execute('DELETE FROM exercise_history');
  });
}
