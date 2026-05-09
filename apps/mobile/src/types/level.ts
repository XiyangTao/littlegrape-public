/**
 * 关卡系统类型定义
 */

export type { WordLevel, UserLevelProgress } from '@/db/word/LevelDB';

// ==================== 闯关流程类型 ====================

/** 关卡综合结果（三段式） */
export interface LevelResult {
  learnedCount: number;       // 阶段一选择"学习"的词数
  skippedCount: number;       // 阶段一选择"跳过"的词数
  stage2Correct: number;      // 阶段二答对数
  stage2Total: number;
  stage3Correct: number;      // 阶段三答对数
  stage3Total: number;
  comboMax: number;
  wrongWordIds: string[];
}

// ==================== 路由参数 ====================

export interface LevelMapParams {
  tag: string;
}

export interface LevelLearnParams {
  tag: string;
  levelIndex: number;
}

export interface LevelSummaryParams {
  tag: string;
  levelIndex: number;
  result: LevelResult;
}
