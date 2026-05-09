// ==================== 单词相关统一类型定义 ====================
// 此文件是单词类型的唯一来源（Single Source of Truth）

// ==================== 基础数据类型 ====================

// 单词义项
export interface WordMeaning {
  id: string;
  pos: string;
  meaningCn: string;
  meaningEn: string | null;
  exampleEn: string | null;
  exampleCn: string | null;
  orderIndex: number;
  register?: string | null;  // 语域标注（中文），如：俚语、口语、正式、过时、贬义、术语等
}

// 单词例句
export interface WordExample {
  id: string;
  en: string;
  cn: string;
  audioUrl: string | null;
  orderIndex: number;
}

// 词根词缀
export interface WordEtymology {
  id: string;
  root: string | null;
  rootMeaning: string | null;
  prefix: string | null;
  prefixMeaning: string | null;
  suffix: string | null;
  suffixMeaning: string | null;
  analysis: string | null;
}

// 搭配
export interface WordCollocation {
  id: string;
  pattern: string;
  examples: string[];
  meaningCn: string;
}

// 变形词
export interface WordInflection {
  id: string;
  inflection: string;
  type: string;
}

// ==================== 本地存储类型 ====================

// 本地单词数据（SQLite 行格式，复杂字段为 JSON 字符串）
export interface LocalWord {
  id: string;
  word: string;
  phoneticUs: string | null;
  phoneticUk: string | null;
  audioUrlUs: string | null;
  audioUrlUk: string | null;
  audioAiExplanationUrl: string | null; // AI 讲解音频 URL
  pos: string | null;
  meaningCn: string;
  meaningEn: string | null;
  level: number | null;
  frequency: number | null;
  // JSON 字符串存储复杂数据
  meanings: string;      // WordMeaning[]
  examples: string;      // WordExample[]
  etymology: string | null; // WordEtymology
  collocations: string;  // WordCollocation[]
  inflections: string;   // WordInflection[]
  tags: string;          // string[]
  syncedAt: number;
}

// 单词状态过滤器类型
export type WordStatusFilter = 'all' | 'new' | 'learning' | 'mastered';

// 本地学习进度
export interface LocalProgress {
  id: string;
  wordId: string;
  userId: string;
  status: 'new' | 'learned' | 'mastered';
  learnedAt: number | null;
  masteredAt: number | null;
  syncedAt: number | null;      // 同步到服务器的时间
  updatedAt: number;
  isSkipped: number;            // 是否为跳过（0=正常学习, 1=用户标记已掌握跳过）
}

// 收藏
export interface LocalFavorite {
  id: string;
  wordId: string;
  userId: string;
  createdAt: number;
  syncedAt: number | null;
}

// 生词本
export interface LocalDifficultWord {
  id: string;
  wordId: string;
  userId: string;
  wrongCount: number;
  correctCount: number;
  lastWrongAt: number;
  createdAt: number;
  syncedAt: number | null;
}

// 学习单词（带进度）
export interface LearnWordWithProgress extends LocalWord {
  progress: LocalProgress | null;
}

// 学习单词选取选项
export interface SelectWordsOptions {
  /** 用户ID */
  userId: string;
  /** 词库标签（可选，不传则从所有词库选取） */
  tags?: string[];
  /** 总共需要的单词数量 */
  totalCount: number;
  /** BNC 等级最小值（用户当前水平下限） */
  bncLevelMin?: number;
  /** BNC 等级最大值（用户当前水平上限） */
  bncLevelMax?: number;
}

// 词汇量测试用的单词数据
export interface VocabularyTestWord {
  id: string;
  word: string;
  meaningCn: string;
  pos?: string; // 词性
  phoneticUs?: string; // 美式音标
  level: number; // BNC/COCA 词族级别 1-25
}

// 词汇量测试记录类型
export interface VocabularyTestRecord {
  id: string;
  userId: string;
  estimatedVocabulary: number;
  totalQuestions: number;
  correctCount: number;
  duration: number;
  level: string;
  levelDescription: string;
  confidenceLower: number;
  confidenceUpper: number;
  eventTime: number;
  syncStatus: 'pending' | 'synced' | 'failed';
  syncedAt: number | null;
}

// ==================== 解析后的类型 ====================

// parseLocalWord 返回的解析结果
export interface ParsedWord {
  word: LocalWord;
  meanings: WordMeaning[];
  examples: WordExample[];
  etymology: WordEtymology | null;
  collocations: WordCollocation[];
  inflections: WordInflection[];
  tags: string[];
}

// ==================== API 层类型 ====================

// API 返回的单词数据（用于网络传输，与 LocalWord 的区别：复杂字段已展开）
export interface WordData {
  id: string;
  word: string;
  phoneticUs: string | null;
  phoneticUk: string | null;
  pos: string | null;
  meaningCn: string;
  meaningEn: string | null;
  meanings: Array<{
    pos: string;
    meaningCn: string;
    meaningEn: string | null;
    exampleEn: string | null;
    exampleCn: string | null;
    register?: string | null;
  }>;
  etymology: {
    root: string | null;
    rootMeaning: string | null;
    prefix: string | null;
    prefixMeaning: string | null;
    suffix: string | null;
    suffixMeaning: string | null;
    analysis: string | null;
  } | null;
  collocations: Array<{
    pattern: string;
    examples: string[];
    meaningCn: string | null;
  }>;
  inflections: Array<{
    inflection: string;
    type: string;
  }>;
  tags: string[];
}

// 单词标签（API 层）
export interface WordTag {
  tag: string;
  count: number;
}
