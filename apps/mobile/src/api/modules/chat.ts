import { Client } from '../client';
import { ENDPOINTS } from '../endpoints';
import type { Character } from '@/types/conversation';

declare module '../client' {
  interface Client {
    getCharacters(type?: string): Promise<{
      success: boolean;
      data: Character[];
    }>;
    getTTSVoices(variant?: 'american' | 'british'): Promise<{
      success: boolean;
      data: Array<{
        id: string;
        name: string;
        gender: 'male' | 'female';
        language: string;
        variant: 'american' | 'british';
        accent: string;
        avatar: string;
        sampleAudio: string;
        description: string;
        voiceEngineId: string;
      }>;
    }>;
    synthesizeSpeech(data: {
      text: string;
      voice: string;
      format?: 'mp3' | 'opus' | 'aac' | 'wav';
      phonemeIpa?: string;
    }): Promise<ArrayBuffer>;
    getUserSessions(userId: string, limit?: number, offset?: number): Promise<{
      sessions: Array<{
        session_id: string;
        user_id: string;
        scenario: string;
        ai_role: string;
        difficulty_level: string;
        english_variant: string;
        conversation_style: string;
        enable_tips: boolean;
        predefined_scenario_id: string | null;
        voice_id: string | null;
        voice_name: string | null;
        message_count: number;
        created_at: string | null;
        updated_at: string | null;
      }>;
      total: number;
      has_more: boolean;
    }>;
    getScenarios(category?: string): Promise<{
      scenarios: Array<{
        id: string;
        title: string;
        category: string;
        ai_role: string;
        scenario: string;
        description: string;
        image_url?: string;
      }>;
      total: number;
    }>;
    prepareChatSession(data: {
      predefined_scenario_id?: string;
      ai_role: string;
      scenario: string;
      difficulty_level: string;
      english_variant: string;
      conversation_style: string;
      enable_tips: boolean;
      voice_id?: string;
      voice_name?: string;
      voice_gender?: 'male' | 'female';
      learned_words?: string[];
    }): Promise<{
      success: boolean;
      system_prompt?: string;
      error?: string;
      error_type?: string;
    }>;
    createChatSession(data: {
      user_id: string;
      session_title?: string;
      predefined_scenario_id?: string;
      ai_role: string;
      scenario: string;
      difficulty_level: string;
      english_variant: string;
      conversation_style: string;
      enable_tips: boolean;
      voice_id?: string;
      voice_name?: string;
      voice_gender?: 'male' | 'female';
      prepared_system_prompt: string;
    }): Promise<{
      session_id: string;
      user_id: string;
      title: string;
      ai_role: string;
      scenario: string;
      difficulty_level: string;
      enable_tips: boolean;
      created_at: string;
      welcome_message: {
        message_id: string;
        role: 'assistant';
        content: string;
        tips: string | null;
        timestamp: string;
      };
    }>;
    sendChatMessage(sessionId: string, userId: string, message: string): Promise<{
      session_id: string;
      messages: Array<{
        message_id: string;
        role: 'user' | 'assistant';
        content: string;
        tips: string | null;
        score: number | null;
        timestamp: string;
      }>;
      response_time: number;
    }>;
    getChatHistory(sessionId: string, userId: string, limit?: number, offset?: number): Promise<{
      session_id: string;
      messages: Array<{
        message_id: string;
        role: 'user' | 'assistant';
        content: string;
        tips: string | null;
        score: number | null;
        timestamp: string;
      }>;
      total: number;
      has_more: boolean;
    }>;
    deleteChatSession(sessionId: string, userId: string): Promise<{
      success: boolean;
      message: string;
    }>;
    batchDeleteChatSessions(sessionIds: string[], userId: string): Promise<{
      success: boolean;
      deleted_count: number;
      message: string;
    }>;
    translateText(text: string): Promise<{
      translation: string;
      notes: string;
    }>;
    translateBidirectional(
      text: string,
      sourceLanguage: 'zh-CN' | 'en-US',
      targetLanguage: 'zh-CN' | 'en-US'
    ): Promise<{
      success: boolean;
      data?: {
        translatedText: string;
        sourceLanguage: string;
        targetLanguage: string;
      };
      error?: string;
    }>;
    generateWordExplanation(data: {
      word: string;
      phonetic?: string;
      meanings: Array<{ pos?: string; meaningCn?: string; meaningEn?: string }>;
      examples?: Array<{ en?: string; cn?: string }>;
      collocations?: string[];
      etymology?: {
        roots?: Array<{ root?: string; meaning?: string }>;
        affixes?: Array<{ affix?: string; type?: string; meaning?: string }>;
      };
    }): Promise<{
      success: boolean;
      explanation: string;
      error?: string;
    }>;
  }
}

// 获取角色列表
Client.prototype.getCharacters = async function(type?: string): Promise<{
  success: boolean;
  data: Character[];
}> {
  return this.api.get(ENDPOINTS.CHARACTERS, {
    params: type ? { type } : undefined
  });
};

// 获取TTS声音列表
Client.prototype.getTTSVoices = async function(variant?: 'american' | 'british'): Promise<{
  success: boolean;
  data: Array<{
    id: string;
    name: string;
    gender: 'male' | 'female';
    language: string;
    variant: 'american' | 'british';
    accent: string;
    avatar: string;
    sampleAudio: string;
    description: string;
    voiceEngineId: string;
  }>;
}> {
  return this.api.get(ENDPOINTS.TTS_VOICES, {
    params: variant ? { variant } : undefined
  });
};

// TTS 语音合成（返回 ArrayBuffer 音频数据）
Client.prototype.synthesizeSpeech = async function(data: {
  text: string;
  voice: string;
  format?: 'mp3' | 'opus' | 'aac' | 'wav';
  phonemeIpa?: string;
}): Promise<ArrayBuffer> {
  return this.api.post(ENDPOINTS.TTS_SYNTHESIZE, data, {
    responseType: 'arraybuffer',
  });
};

// 获取用户会话列表
Client.prototype.getUserSessions = async function(userId: string, limit?: number, offset?: number): Promise<{
  sessions: Array<{
    session_id: string;
    user_id: string;
    scenario: string;
    ai_role: string;
    difficulty_level: string;
    english_variant: string;
    conversation_style: string;
    enable_tips: boolean;
    predefined_scenario_id: string | null;
    voice_id: string | null;
    voice_name: string | null;
    message_count: number;
    created_at: string | null;
    updated_at: string | null;
  }>;
  total: number;
  has_more: boolean;
}> {
  return this.api.get(ENDPOINTS.CHAT_SESSIONS, {
    params: { user_id: userId, limit, offset }
  });
};

// 获取预定义场景列表
Client.prototype.getScenarios = async function(category?: string): Promise<{
  scenarios: Array<{
    id: string;
    title: string;
    category: string;
    ai_role: string;
    scenario: string;
    description: string;
    image_url?: string;
  }>;
  total: number;
}> {
  return this.api.get(ENDPOINTS.CHAT_SCENARIOS, {
    params: category ? { category } : undefined
  });
};

// 预生成系统提示词（第一步，可能较慢）
Client.prototype.prepareChatSession = async function(data: {
  predefined_scenario_id?: string;
  ai_role: string;
  scenario: string;
  difficulty_level: string;
  english_variant: string;
  conversation_style: string;
  enable_tips: boolean;
  voice_id?: string;
  voice_name?: string;
  voice_gender?: 'male' | 'female';
  learned_words?: string[];
}): Promise<{
  success: boolean;
  system_prompt?: string;
  error?: string;
  error_type?: string;
}> {
  return this.api.post(ENDPOINTS.CHAT_PREPARE, data);
};

// 创建对话会话（第二步，使用预生成的 system_prompt，快速）
Client.prototype.createChatSession = async function(data: {
  user_id: string;
  session_title?: string;
  predefined_scenario_id?: string;
  ai_role: string;
  scenario: string;
  difficulty_level: string;
  english_variant: string;
  conversation_style: string;
  enable_tips: boolean;
  voice_id?: string;
  voice_name?: string;
  voice_gender?: 'male' | 'female';
  prepared_system_prompt: string;
}): Promise<{
  session_id: string;
  user_id: string;
  title: string;
  ai_role: string;
  scenario: string;
  difficulty_level: string;
  enable_tips: boolean;
  created_at: string;
  welcome_message: {
    message_id: string;
    role: 'assistant';
    content: string;
    tips: string | null;
    timestamp: string;
  };
}> {
  return this.api.post(ENDPOINTS.CHAT_SESSIONS, data);
};

// 发送聊天消息
Client.prototype.sendChatMessage = async function(sessionId: string, userId: string, message: string): Promise<{
  session_id: string;
  messages: Array<{
    message_id: string;
    role: 'user' | 'assistant';
    content: string;
    tips: string | null;
    score: number | null;
    timestamp: string;
  }>;
  response_time: number;
}> {
  return this.api.post(`${ENDPOINTS.CHAT_SESSIONS}/${sessionId}/messages`,
    { message },
    { params: { user_id: userId } }
  );
};

// 获取会话历史消息
Client.prototype.getChatHistory = async function(sessionId: string, userId: string, limit?: number, offset?: number): Promise<{
  session_id: string;
  messages: Array<{
    message_id: string;
    role: 'user' | 'assistant';
    content: string;
    tips: string | null;
    score: number | null;
    timestamp: string;
  }>;
  total: number;
  has_more: boolean;
}> {
  return this.api.get(`${ENDPOINTS.CHAT_SESSIONS}/${sessionId}/messages`, {
    params: { user_id: userId, limit, offset }
  });
};

// 删除对话会话
Client.prototype.deleteChatSession = async function(sessionId: string, userId: string): Promise<{
  success: boolean;
  message: string;
}> {
  return this.api.delete(`${ENDPOINTS.CHAT_SESSIONS}/${sessionId}`, {
    params: { user_id: userId }
  });
};

// 批量删除对话会话
Client.prototype.batchDeleteChatSessions = async function(sessionIds: string[], userId: string): Promise<{
  success: boolean;
  deleted_count: number;
  message: string;
}> {
  return this.api.delete(`${ENDPOINTS.CHAT_SESSIONS}/batch`, {
    data: { session_ids: sessionIds, user_id: userId }
  });
};

// 翻译英文文本（Chat API，用于单词学习）
Client.prototype.translateText = async function(text: string): Promise<{
  translation: string;
  notes: string;
}> {
  return this.api.post(ENDPOINTS.CHAT_TRANSLATE, { text });
};

// 双向文本翻译（TTS API，用于实时翻译）
Client.prototype.translateBidirectional = async function(
  text: string,
  sourceLanguage: 'zh-CN' | 'en-US',
  targetLanguage: 'zh-CN' | 'en-US'
): Promise<{
  success: boolean;
  data?: {
    translatedText: string;
    sourceLanguage: string;
    targetLanguage: string;
  };
  error?: string;
}> {
  return this.api.post(ENDPOINTS.TTS_TRANSLATE, { text, sourceLanguage, targetLanguage });
};

// 生成单词 AI 解说文稿
Client.prototype.generateWordExplanation = async function(data: {
  word: string;
  phonetic?: string;
  meanings: Array<{ pos?: string; meaningCn?: string; meaningEn?: string }>;
  examples?: Array<{ en?: string; cn?: string }>;
  collocations?: string[];
  etymology?: {
    roots?: Array<{ root?: string; meaning?: string }>;
    affixes?: Array<{ affix?: string; type?: string; meaning?: string }>;
  };
}): Promise<{
  success: boolean;
  explanation: string;
  error?: string;
}> {
  return this.api.post(ENDPOINTS.CHAT_WORD_EXPLANATION, data);
};
