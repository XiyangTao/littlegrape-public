/**
 * 情景学习模式类型定义
 */

// ============ 故事线 ============
export interface ScenarioArc {
  id: string;                    // "mia_school"
  title: string;                 // "Mia's School Life"
  titleZh: string;               // "Mia 的校园生活"
  description: string;
  descriptionZh: string;
  characterId: string;           // 主角 "mia"
  coverImage: string;            // 故事线封面
  chapters: string[];            // chapter id 列表，控制顺序
}

// ============ 章节 ============
export interface ScenarioChapter {
  id: string;                    // "mia_school_ch1"
  arcId: string;                 // 所属故事线
  chapterNumber: number;         // 章节序号
  title: string;                 // "First Day at Oakbridge"
  titleZh: string;               // "Oakbridge 的第一天"
  description: string;
  descriptionZh: string;
  coverImage: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedMinutes: number;
  scenes: ScenarioScene[];
  summary: ChapterSummary;
}

// ============ 场景 ============
export interface ScenarioScene {
  id: string;
  title: string;
  titleZh: string;
  backgroundImage?: string;
  steps: ScenarioStep[];
}

// ============ 步骤（核心联合类型） ============
export type ScenarioStep =
  | NarrationStep
  | DialogueStep
  | IllustrationStep
  | ChoiceStep
  | ReadAloudStep
  | ConversationStep
  | ListeningStep;

export type ScenarioStepType =
  | 'narration'
  | 'dialogue'
  | 'illustration'
  | 'choice'
  | 'read_aloud'
  | 'conversation'
  | 'listening';

// --- 旁白 ---
export interface NarrationStep {
  type: 'narration';
  id: string;
  text: string;
  translation: string;
}

// --- 角色对话 ---
export interface DialogueStep {
  type: 'dialogue';
  id: string;
  characterId: string;
  text: string;
  translation: string;
}

// --- 插图 ---
export interface IllustrationStep {
  type: 'illustration';
  id: string;
  image: string;
  caption?: string;
  captionTranslation?: string;
}

// --- 选择题 ---
export interface ChoiceStep {
  type: 'choice';
  id: string;
  prompt: string;
  promptTranslation: string;
  options: ChoiceOption[];
  correctOptionId: string;
  feedback: {
    correct: string;
    correctTranslation: string;
    incorrect: string;
    incorrectTranslation: string;
  };
}

export interface ChoiceOption {
  id: string;
  text: string;
  translation: string;
}

// --- 跟读 ---
export interface ReadAloudStep {
  type: 'read_aloud';
  id: string;
  characterId?: string;
  text: string;
  translation: string;
}

// --- 自由对话 ---
export interface ConversationStep {
  type: 'conversation';
  id: string;
  characterId: string;
  goal: string;
  goalZh: string;
  hints: string[];
  hintsTranslation: string[];
  maxAttempts: number;
  evaluationPrompt: string;
}

// --- 听力判断 ---
export interface ListeningStep {
  type: 'listening';
  id: string;
  characterId: string;
  audioText: string;
  audioTranslation: string;
  question: string;
  questionTranslation: string;
  options: ChoiceOption[];
  correctOptionId: string;
}

// ============ 章节总结 ============
export interface ChapterSummary {
  keyPhrases: KeyPhrase[];
  scoreDimensions: ('comprehension' | 'expression' | 'pronunciation')[];
}

export interface KeyPhrase {
  phrase: string;
  translation: string;
  example: string;
  exampleTranslation: string;
}

// ============ 用户进度 ============
export type ScenarioChapterStatus = 'locked' | 'available' | 'in_progress' | 'completed';

export interface ScenarioProgress {
  chapterId: string;
  status: ScenarioChapterStatus;
  currentSceneIndex: number;
  currentStepIndex: number;
  score?: ChapterScore;
  completedAt?: string;
}

export interface ChapterScore {
  comprehension: number;     // 0-100
  expression: number;        // 0-100
  pronunciation: number;     // 0-100
  overall: number;           // 0-100
  stars: 1 | 2 | 3;
}

// ============ 播放状态 ============
export interface StepResult {
  stepId: string;
  type: ScenarioStepType;
  correct?: boolean;          // 选择题/听力题
  score?: number;             // 跟读/对话题 0-100
  selectedOptionId?: string;  // 选择题
  userInput?: string;         // 对话题
}
