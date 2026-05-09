/**
 * 关卡系统服务层
 * 封装关卡相关的业务逻辑和数据访问
 */

// DB 操作 re-export
export {
  generateLevelsForTag,
  getLevelsForTag,
  getLevelByIndex,
  getLevelCountForTag,
  getUserLevelProgressForTag,
  getUserLevelProgress,
  getCurrentLevelIndex,
  saveUserLevelProgress,
  getTotalStarsForTag,
  getWordsByIds,
} from '@/db/word';

// 类型 re-export
export type { WordLevel, UserLevelProgress } from '@/db/word';
export type { LevelResult } from '@/types/level';

// ==================== 业务逻辑 ====================

/**
 * 根据阶段二+三综合正确率计算星级
 * 3星：≥90%
 * 2星：≥70%
 * 1星：完成即可
 * 0星：全跳过（无做题）
 */
export function calcStars(quizCorrect: number, quizTotal: number): number {
  if (quizTotal === 0) return 0;
  const rate = quizCorrect / quizTotal;
  if (rate >= 0.9) return 3;
  if (rate >= 0.7) return 2;
  return 1;
}

/**
 * 根据 LevelResult 计算 XP 奖励
 * 基础：每词 +3，阶段二答对 +1/题，阶段三答对 +2/题
 * 连击奖励：分级制 ×3→+5, ×5→+10, ×8→+15
 * 重刷：固定 +5
 */
export function calcXP(result: import('@/types/level').LevelResult, isFirstClear: boolean): number {
  if (!isFirstClear) return 5;
  if (result.learnedCount === 0) return 0; // 全跳过

  const wordBase = result.learnedCount * 3;
  const stage2Bonus = result.stage2Correct * 1;
  const stage3Bonus = result.stage3Correct * 2;

  // 连击奖励：分级制
  let comboBonus = 0;
  if (result.comboMax >= 8) comboBonus = 15;
  else if (result.comboMax >= 5) comboBonus = 10;
  else if (result.comboMax >= 3) comboBonus = 5;

  return wordBase + stage2Bonus + stage3Bonus + comboBonus;
}

/**
 * Boss 关 XP（倍率 ×2）
 */
export function calcBossXP(result: import('@/types/level').LevelResult, isFirstClear: boolean): number {
  if (!isFirstClear) return 10;
  return calcXP(result, isFirstClear) * 2;
}
