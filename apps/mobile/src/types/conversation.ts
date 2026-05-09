/**
 * 对话相关的类型定义
 */

// 自由对话场景 ID
export const FREE_CONVERSATION_SCENARIO_ID = 'free_conversation';

// CEFR难度等级
export type DifficultyLevel = 'starter' | 'elementary' | 'cet4' | 'cet6' | 'ielts7_tem8' | 'native';

// 英语变体
export type EnglishVariant = 'american' | 'british';

// 对话风格
export type ConversationStyle = 'formal' | 'casual' | 'slang';

// 对话模式
export type ConversationMode = 'free' | 'scenario';

// 场景类型
export type ScenarioType = 'custom' | 'predefined';

// 场景分类（5个主要类别）
export type ScenarioCategory =
  | 'travel'           // 旅游出行
  | 'dining_shopping'  // 餐饮购物
  | 'business'         // 商务职场
  | 'health'           // 医疗健康
  | 'social';          // 社交娱乐

// 场景分类信息
export interface ScenarioCategoryInfo {
  value: ScenarioCategory;
  label: string;
  icon: string;
  description: string;
}

// 难度等级信息
export interface DifficultyLevelInfo {
  value: DifficultyLevel;
  label: string;
  cefr: string;
  vocab: string;
  color: string;
  description: string;
}

// 英语变体信息
export interface EnglishVariantInfo {
  value: EnglishVariant;
  label: string;
  icon: string;
  description: string;
}

// 对话风格信息
export interface ConversationStyleInfo {
  value: ConversationStyle;
  label: string;
  icon: string;
  description: string;
  suitableFor: string;
}

// 角色类型
export type CharacterRole = 'conversation' | 'ai_assistant' | 'reading_teacher';

// 角色信息
export interface Character {
  id: string;
  name: string;
  roles: CharacterRole[];
  gender: 'male' | 'female';
  age: number | null;
  language: string;
  variant: 'american' | 'british' | 'multilingual';
  accent: string;
  personality: string;
  appearance: string;
  speakingStyle: string;
  catchphrase: string;
  avatar: string;
  voiceEngineId: string;
  description: string;
  sortOrder: number;
  teacherRole?: string;
  teacherStyle?: string;
  greetingAudio?: string;
}

// TTS声音配置
export interface VoiceOption {
  id: string;
  name: string;
  gender: 'male' | 'female';
  language: string; // 语言代码，如 en-US, en-GB
  variant: EnglishVariant;
  accent: string;
  avatar: string; // 头像URL
  sampleAudio: string; // 示例音频URL
  description: string; // 声音描述
  voiceEngineId: string; // TTS引擎使用的实际Voice ID
}

// i18n 文本结构
export interface I18nText {
  'zh-CN': string;
  en: string;
}

// 预定义场景
export interface PredefinedScenario {
  id: string;
  title: I18nText;
  category: ScenarioCategory;
  ai_role: string;
  scenario: string;
  description: I18nText;
  imageUrl?: string;
}

// 对话配置
export interface ConversationConfig {
  // 基本设置
  mode: ConversationMode;
  difficulty: DifficultyLevel;
  englishVariant: EnglishVariant;
  conversationStyle: ConversationStyle;

  // 功能开关
  enableTips: boolean;

  // 声音设置
  voiceId: string;
  voiceName?: string;
  voiceGender?: 'male' | 'female';

  // 场景设置
  scenarioType?: ScenarioType;
  selectedScenario?: PredefinedScenario;
  customRole?: string;
  customScenario?: string;
}

// 创建会话请求
export interface CreateSessionRequest {
  user_id: string;
  session_title?: string;
  predefined_scenario_id?: string;
  ai_role: string;
  scenario: string;
  difficulty_level: DifficultyLevel;
  english_variant: EnglishVariant;
  conversation_style: ConversationStyle;
  enable_tips: boolean;
  voice_id: string;
  voice_name?: string;
}

// 会话响应
export interface SessionResponse {
  session_id: string;
  user_id: string;
  title: string;
  ai_role: string;
  scenario: string;
  difficulty_level: string;
  english_variant: string;
  conversation_style: string;
  enable_tips: boolean;
  created_at: string;
  welcome_message: ChatMessage;
}

// 聊天消息（API 返回格式）
export interface ChatMessage {
  message_id: string;
  role: 'user' | 'assistant';
  content: string;
  tips?: string;
  score?: number; // 用户英语评分 (1-10)
  timestamp: string;
}

// ============ 聊天界面相关类型 ============

// 翻译数据（结构化）
export interface TranslationData {
  translation: string;  // 中文翻译
  notes: string;        // 知识点说明
}

// 本地消息（UI 使用）
export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  tips?: string;
  score?: number;
  // 语音消息相关
  voiceUri?: string;
  voiceDuration?: number;
  showTranscript?: boolean;
  // 翻译相关
  translation?: string;           // 兼容旧格式（拼接字符串）
  translationData?: TranslationData;  // 结构化翻译数据
  // 乐观更新标识（用于并发发送时精确匹配 API 响应）
  _requestId?: string;
}

// 历史消息（导航参数，timestamp 为字符串便于序列化）
export interface HistoryMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: string;
  tips?: string;
  score?: number;
  voiceUri?: string;
  voiceDuration?: number;
  translation?: string;
}

// 会话信息（从历史恢复时使用）
export interface SessionInfo {
  sessionId: string;
  scenario: string;
  aiRole: string;
  difficultyLevel: string;
  englishVariant: string;
  conversationStyle: string;
  enableTips: boolean;
  voiceId?: string | null;
  voiceName?: string | null;
  predefinedScenarioId?: string | null;
}

// 本地对话
export interface Conversation {
  id: string;
  title: string;
  topic?: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  isActive?: boolean;
}

// 分数等级类型
export type ScoreLevelKey = 'excellent' | 'good' | 'fine' | 'needsWork' | 'keepTrying';
