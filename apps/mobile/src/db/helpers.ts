// ============ 会话模块的 camelCase 类型 ============

// 消息类型（camelCase）
export interface DBMessage {
  id: string;
  sessionId: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: string;
  tips?: string | null;
  score?: number | null;
  // 语音消息相关
  voiceUri?: string | null;
  voiceDuration?: number | null;
  // 翻译相关
  translation?: string | null;
}

// 会话类型（camelCase）
export interface DBSession {
  sessionId: string;
  userId: string;
  scenario: string;
  aiRole: string;
  difficultyLevel: string;
  englishVariant: string;
  conversationStyle: string;
  enableTips: number; // SQLite 用 0/1 表示布尔值
  voiceId?: string | null;
  voiceName?: string | null;
  predefinedScenarioId?: string | null;
  createdAt: string;
  updatedAt: string;
}

// 会话摘要（用于列表展示）
export interface SessionSummary {
  sessionId: string;
  scenario: string;
  aiRole: string;
  difficultyLevel: string;
  englishVariant: string;
  conversationStyle: string;
  enableTips: boolean;
  voiceId: string | null;
  voiceName: string | null;
  predefinedScenarioId: string | null;
  lastMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============ SQLite 行类型（snake_case） ============

/** SQLite messages 表行 */
export interface MessageRow {
  id: string;
  session_id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: string;
  tips?: string | null;
  score?: number | null;
  voice_uri?: string | null;
  voice_duration?: number | null;
  translation?: string | null;
}

/** SQLite sessions 表行 */
export interface SessionRow {
  session_id: string;
  user_id: string;
  scenario: string;
  ai_role: string;
  difficulty_level: string;
  english_variant: string;
  conversation_style: string;
  enable_tips: number;
  voice_id?: string | null;
  voice_name?: string | null;
  predefined_scenario_id?: string | null;
  created_at: string;
  updated_at: string;
}

// ============ 行映射函数 ============

export function rowToMessage(row: MessageRow): DBMessage {
  return {
    id: row.id,
    sessionId: row.session_id,
    text: row.text,
    sender: row.sender,
    timestamp: row.timestamp,
    tips: row.tips,
    score: row.score,
    voiceUri: row.voice_uri,
    voiceDuration: row.voice_duration,
    translation: row.translation,
  };
}

export function rowToSession(row: SessionRow): DBSession {
  return {
    sessionId: row.session_id,
    userId: row.user_id,
    scenario: row.scenario,
    aiRole: row.ai_role,
    difficultyLevel: row.difficulty_level,
    englishVariant: row.english_variant,
    conversationStyle: row.conversation_style,
    enableTips: row.enable_tips,
    voiceId: row.voice_id,
    voiceName: row.voice_name,
    predefinedScenarioId: row.predefined_scenario_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToSessionSummary(row: SessionRow & { last_message: string | null }): SessionSummary {
  return {
    sessionId: row.session_id,
    scenario: row.scenario,
    aiRole: row.ai_role,
    difficultyLevel: row.difficulty_level,
    englishVariant: row.english_variant,
    conversationStyle: row.conversation_style,
    enableTips: row.enable_tips === 1,
    voiceId: row.voice_id || null,
    voiceName: row.voice_name || null,
    predefinedScenarioId: row.predefined_scenario_id || null,
    lastMessage: row.last_message || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
