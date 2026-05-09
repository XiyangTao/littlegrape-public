/**
 * 剧情模式相关类型定义
 */

// 剧集状态（UI 展示用）
export type EpisodeStatus = 'completed' | 'current' | 'locked';

// 服务端进度状态 → UI 展示状态映射
export function mapServerStatusToUI(serverStatus: string): EpisodeStatus {
  if (serverStatus === 'completed') return 'completed';
  if (serverStatus === 'unlocked' || serverStatus === 'in_progress') return 'current';
  return 'locked';
}

// 评分等级
export type StoryGrade = 'S' | 'A' | 'B' | 'C' | 'D';

// ==================== 剧情练习 Episode 配置 ====================

// 学习点
export interface LearningPoint {
  id: string;
  english: string;
  chinese: string;
  category: 'expression' | 'vocabulary' | 'slang';
  audioUrl?: string;
}

// 发音评估逐词结果
export interface PronunciationWord {
  word: string;
  accuracyScore: number;
  errorType: string;
}

// Script 条目联合类型
export type ScriptItem = NarratorItem | DialogueItem | QuestionItem;

export interface NarratorItem {
  type: 'narrator';
  text: string;
  text_zh?: string;
  translation?: string; // text_zh 的别名，兼容旧数据
  audioUrl?: string;
}

export interface DialogueItem {
  type: 'dialogue';
  character: string;
  line: string;
  line_zh?: string;
  translation?: string; // line_zh 的别名，兼容旧数据
  audioUrl?: string;
  hideText?: boolean; // listening 题：先隐藏文字只播音频，答完后显示
  // 语音消息（用户回答时可能带语音）
  voiceUri?: string;
  voiceDuration?: number;
  // 发音评估逐词结果（pronunciation 题用）
  pronunciationWords?: PronunciationWord[];
}

// 4 种题型
export type QuestionItem =
  | ConversationQuestion
  | ChoiceQuestion
  | PronunciationQuestion
  | ListeningQuestion;

export interface ConversationQuestion {
  type: 'question';
  question_type: 'conversation';
  goal: string;
  goal_zh?: string;
  goal_description?: string; // deprecated, 用 goal 代替
  context?: string;
  context_zh?: string;
  hint: string;
  hint_zh?: string;
  expected_answer: string;
  expected_answer_zh?: string;
  learning_point_ids: string[];
}

export interface ChoiceQuestion {
  type: 'question';
  question_type: 'choice';
  prompt: string;
  prompt_zh?: string;
  options: { text: string; text_zh?: string; correct: boolean }[];
  explanation: string;
  explanation_zh?: string;
  learning_point_ids: string[];
}

export interface PronunciationQuestion {
  type: 'question';
  question_type: 'pronunciation';
  sentence: string;
  sentence_zh?: string;
  learning_point_ids: string[];
}

export interface ListeningQuestion {
  type: 'question';
  question_type: 'listening';
  audio_line: string;
  audio_character: string;
  prompt: string;
  prompt_zh?: string;
  options: { text: string; text_zh?: string; correct: boolean }[];
  learning_point_ids: string[];
}

// 评估反馈（显示在对话流中，非 script 原始条目）
export interface EvaluationItem {
  type: 'evaluation';
  questionType: string;
  score: number;
  feedback: string;
  corrections: { original: string; corrected: string; explanation: string }[];
  highlights: string[];
  correct?: boolean;
  correctAnswer?: string;
  words?: { word: string; accuracyScore: number }[];
  sentence?: string;
}

// 对话流中可能出现的所有条目类型
export type DisplayItem = ScriptItem | EvaluationItem;

// Episode 完整配置
export interface EpisodeConfig {
  episode_id: string;
  title: string;
  title_zh: string;
  title_audio_url?: string;
  learning_points: LearningPoint[];
  script: ScriptItem[];
  narrator_closing: string;
  next_episode_hook: string;
}

// 对话题评估结果
export interface ConversationEvaluation {
  achieved: boolean;
  feedback: string;
  score: number;
  corrections: { original: string; corrected: string; explanation: string }[];
  highlights: string[];
  summary: string;
}

// 答题记录
export interface AnswerRecord {
  scriptIndex: number;
  questionType: string;
  correct: boolean;
  score?: number;  // 对话题的 1-10 分
}
