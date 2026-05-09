/**
 * 业务数据颜色常量
 *
 * 集中管理所有用于数据展示的颜色值。
 * 注意：UI 框架色（背景/文字/边框等）请使用 theme.colors.*
 */

// ============================================================================
// 难度级别
// ============================================================================

/** 三级难度色（故事/阅读/听力列表通用） */
export const DIFFICULTY_COLORS: Record<string, string> = {
  elementary: '#4CAF50',
  beginner: '#4CAF50',
  cet4: '#FF9800',
  intermediate: '#FF9800',
  cet6: '#F44336',
  advanced: '#F44336',
};

/** 语法难度色（基础/进阶/高级） */
export const GRAMMAR_DIFFICULTY_COLORS: Record<string, string> = {
  basic: '#10B981',
  intermediate: '#3B82F6',
  advanced: '#F59E0B',
};

/** CEFR 等级色 */
export const CEFR_LEVEL_COLORS: Record<string, string> = {
  A1: '#10b981',
  A2: '#3b82f6',
  B1: '#8b5cf6',
  B2: '#ec4899',
  C1: '#f59e0b',
  C2: '#ef4444',
};

// ============================================================================
// 语法分类
// ============================================================================

/** 语法等级色（5 级） */
export const GRAMMAR_LEVEL_COLORS: Record<number, { primary: string; gradient: [string, string] }> = {
  1: { primary: '#10B981', gradient: ['#10B981', '#059669'] },
  2: { primary: '#3B82F6', gradient: ['#3B82F6', '#2563EB'] },
  3: { primary: '#8B5CF6', gradient: ['#8B5CF6', '#7C3AED'] },
  4: { primary: '#F59E0B', gradient: ['#F59E0B', '#D97706'] },
  5: { primary: '#EF4444', gradient: ['#EF4444', '#DC2626'] },
};

/** 语法状态色 */
export const GRAMMAR_STATUS_COLORS: Record<string, string> = {
  practiced: '#F59E0B',
  mastered: '#10B981',
};

// ============================================================================
// 奖牌 & 星级
// ============================================================================

/** 金银铜奖牌色 */
export const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'] as const;

/** 星星/灯泡金色 */
export const STAR_GOLD = '#FFD700';

// ============================================================================
// 考试类型
// ============================================================================

/** 考试类型色 */
export const EXAM_TYPE_COLORS: Record<string, string> = {
  cet4: '#F59E0B',
  cet6: '#EC4899',
  kaoyan: '#EF4444',
  ielts: '#84CC16',
  toefl: '#F97316',
  tem4: '#06B6D4',
  tem8: '#6366F1',
};

// ============================================================================
// 彩带动画
// ============================================================================

/** 关卡完成彩带色 */
export const LEVEL_CONFETTI_COLORS: string[] = [
  '#FF6B6B', '#4ECDC4', '#FFD93D', '#6C5CE7', '#FF85A1', '#54A0FF',
];

/** 音素练习彩带色 */
export const PHONEME_CONFETTI_COLORS: string[] = [
  '#7C5CFC', '#F59E0B', '#10B981', '#60A5FA',
];

// ============================================================================
// 成就稀有度
// ============================================================================

/** 成就稀有度强调色 */
export const RARITY_COLORS: Record<string, string> = {
  common: '#10B981',
  rare: '#3B82F6',
  epic: '#8B5CF6',
  legendary: '#F59E0B',
};

/** 成就稀有度粒子色 */
export const RARITY_PARTICLE_COLORS: Record<string, string[]> = {
  legendary: ['#F59E0B', '#FBBF24', '#FDE68A', '#FFD700'],
  epic: ['#8B5CF6', '#A78BFA', '#C4B5FD'],
  rare: ['#3B82F6', '#60A5FA', '#93C5FD'],
};
