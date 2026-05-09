import { Client } from '../client';
import { ENDPOINTS } from '../endpoints';

// ==================== 数据类型 ====================

export interface AnnieCharacterMapping {
  voa_original: string;
  app_character_id: string;
  reason: string;
}

export interface AnnieLearningObjective {
  id: string;
  english: string;
  chinese: string;
}

export interface AnnieKeyExpression {
  id: string;
  english: string;
  chinese: string;
}

// script 条目 — 三种类型混合
export type AnnieScriptItem =
  | AnnieNarrationItem
  | AnnieDialogueItem
  | AnnieQuestionItem;

export interface AnnieNarrationItem {
  type: 'narration';
  character: string;       // 一般固定为 'annie' (中文老师)
  lang: string;            // 'zh'
  text: string;
}

export interface AnnieDialogueItem {
  type: 'dialogue';
  character: string;       // 角色 ID, 如 'annie' / 'alex' / 'emma'
  line: string;            // 英文台词
  line_zh: string;         // 中文翻译
}

export type AnnieQuestionItem =
  | AnnieChoiceQuestion
  | AnnieListeningQuestion
  | AnnieConversationQuestion
  | AnniePronunciationQuestion;

export interface AnnieQuestionOption {
  text: string;
  text_zh: string;
  correct: boolean;
}

export interface AnnieChoiceQuestion {
  type: 'question';
  question_type: 'choice';
  prompt: string;
  prompt_zh: string;
  options: AnnieQuestionOption[];
  explanation?: string;
  explanation_zh?: string;
  key_expression_ids: string[];
}

export interface AnnieListeningQuestion {
  type: 'question';
  question_type: 'listening';
  audio_line: string;
  audio_line_zh: string;
  prompt: string;
  prompt_zh: string;
  options: AnnieQuestionOption[];
  explanation_zh?: string;
  key_expression_ids: string[];
}

export interface AnnieConversationQuestion {
  type: 'question';
  question_type: 'conversation';
  context: string;
  context_zh: string;
  goal: string;
  goal_zh: string;
  hint: string;
  hint_zh: string;
  expected_answer: string;
  expected_answer_zh: string;
  key_expression_ids: string[];
}

export interface AnniePronunciationQuestion {
  type: 'question';
  question_type: 'pronunciation';
  sentence: string;
  sentence_zh: string;
  key_expression_ids: string[];
}

// ==================== 进度数据 ====================

export interface AnnieStagePronunciation {
  keId: string;
  score: number;        // 0-100
  attempts: number;
  lastTriedAt: string;
}
export interface AnnieStageChoice {
  index: number;
  correct: boolean;
  selectedOption: number;
}
export interface AnnieStageListening {
  index: number;
  correct: boolean;
  selectedOption: number;
}
export interface AnnieStageConversation {
  index: number;
  achieved: boolean;
  qualityScore: number; // 1-10
  feedback?: string;
}

export interface AnnieStages {
  stage3Pronunciation?: AnnieStagePronunciation[];
  stage4Choice?: AnnieStageChoice[];
  stage5Listening?: AnnieStageListening[];
  stage6Conversation?: AnnieStageConversation[];
}

export interface AnnieProgressUpdatePayload {
  stage3Pronunciation?: AnnieStagePronunciation[];
  stage4Choice?: AnnieStageChoice[];
  stage5Listening?: AnnieStageListening[];
  stage6Conversation?: AnnieStageConversation[];
  markComplete?: boolean;
}

// ==================== Lesson summary / detail ====================

export interface AnnieLessonSummary {
  course: string;
  lessonNumber: number;
  titleEn: string;
  titleZh: string;
  summaryZh: string;
  imageUrl: string | null;
  completedAt: string | null;
  totalScore: number;
  attempts: number;
}

export interface AnnieLessonDetail extends AnnieLessonSummary {
  characterMapping: AnnieCharacterMapping[];
  learningObjectives: AnnieLearningObjective[];
  keyExpressions: AnnieKeyExpression[];
  script: AnnieScriptItem[];
  voaArticleId: string | null;
  voaUrl: string | null;
  stages: AnnieStages | null;
}

// ==================== Client 扩展 ====================

declare module '../client' {
  interface Client {
    /** 课程列表 + 当前用户进度 */
    getAnnieLessons(course?: string): Promise<AnnieLessonSummary[]>;

    /** 单课详情 + 当前用户进度 */
    getAnnieLesson(course: string, lessonNumber: number): Promise<AnnieLessonDetail>;

    /** 增量更新单课进度 */
    updateAnnieProgress(
      course: string,
      lessonNumber: number,
      payload: AnnieProgressUpdatePayload,
    ): Promise<{ stages: AnnieStages; completedAt: string | null; totalScore: number; attempts: number }>;
  }
}

Client.prototype.getAnnieLessons = async function (course = 'l1') {
  const res: any = await this.api.get(ENDPOINTS.ANNIE_LESSONS, { params: { course } });
  return res.data;
};

Client.prototype.getAnnieLesson = async function (course, lessonNumber) {
  const res: any = await this.api.get(`${ENDPOINTS.ANNIE_LESSONS}/${course}/${lessonNumber}`);
  return res.data;
};

Client.prototype.updateAnnieProgress = async function (course, lessonNumber, payload) {
  const res: any = await this.api.post(
    `${ENDPOINTS.ANNIE_LESSONS}/${course}/${lessonNumber}/progress`,
    payload,
  );
  return res.data;
};
