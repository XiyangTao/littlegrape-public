import axios, { AxiosInstance } from 'axios';
import { config } from '@/config';
import { logger } from '@/utils/logger';

/**
 * AI Service 客户端
 * 封装对 ai-service 的所有调用
 */
class AIServiceClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.services.aiService.url,
      timeout: 60000, // AI服务可能需要更长的超时时间（自定义场景生成提示词较慢）
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // 请求拦截器
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('AI service request:', {
          method: config.method,
          url: config.url,
          params: config.params
        });
        return config;
      },
      (error) => {
        logger.error('AI service request error:', error);
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('AI service response:', {
          status: response.status,
          url: response.config.url
        });
        return response;
      },
      (error) => {
        logger.error('AI service response error:', {
          status: error.response?.status,
          url: error.config?.url,
          message: error.message
        });
        return Promise.reject(error);
      }
    );
  }

  /** 通用 POST 请求（用于新模块快速接入） */
  async post(path: string, data: Record<string, unknown>): Promise<any> {
    const response = await this.client.post(path, data);
    return response.data;
  }

  // ==================== Chat API (新接口) ====================

  /**
   * 获取预定义场景列表
   * @param category - 可选的场景分类筛选
   */
  async getScenarios(category?: string) {
    const response = await this.client.get('/chat/scenarios', {
      params: category ? { category } : undefined
    });
    return response.data;
  }

  /**
   * 预生成系统提示词
   * @param request - 预生成请求参数
   */
  async prepareSession(request: {
    predefined_scenario_id?: string;
    ai_role: string;
    scenario: string;
    difficulty_level: string;
    english_variant: string;
    conversation_style: string;
    enable_tips: boolean;
    voice_id?: string;
    voice_name?: string;
    voice_gender?: string;
    learned_words?: string[];
  }) {
    const response = await this.client.post('/chat/prepare', request);
    return response.data;
  }

  /**
   * 创建对话会话
   * @param request - 创建会话请求参数
   */
  async createSession(request: {
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
    voice_gender?: string;
    prepared_system_prompt: string;
  }) {
    const response = await this.client.post('/chat/sessions', request);
    return response.data;
  }

  /**
   * 发送聊天消息
   * @param sessionId - 会话ID
   * @param userId - 用户ID
   * @param request - 消息内容
   */
  async sendMessage(sessionId: string, userId: string, request: { message: string }) {
    const response = await this.client.post(
      `/chat/sessions/${sessionId}/messages`,
      request,
      { params: { user_id: userId } }
    );
    return response.data;
  }

  // ==================== Story Mode ====================

  /**
   * 创建剧情会话
   */
  async createStorySession(request: { user_id: string; episode_id: string; difficulty_level?: string; voice_id?: string; voice_name?: string }) {
    const response = await this.client.post('/chat/story/sessions', request);
    return response.data;
  }

  /**
   * 发送剧情消息
   */
  async sendStoryMessage(sessionId: string, userId: string, request: { message: string }) {
    const response = await this.client.post(
      `/chat/story/sessions/${sessionId}/messages`,
      request,
      { params: { user_id: userId } }
    );
    return response.data;
  }

  /**
   * 获取 episode 配置（剧情练习）
   */
  async getEpisodeConfig(episodeId: string) {
    const response = await this.client.get(`/story/episodes/${episodeId}`);
    return response.data;
  }

  /**
   * 对话题评估（剧情练习）
   */
  async evaluateStoryConversation(request: { goal: string; goal_description: string; expected_answer: string; user_answer: string; difficulty_level?: string }) {
    const response = await this.client.post('/story/evaluate', request);
    return response.data;
  }

  /**
   * 获取用户会话列表
   * @param userId - 用户ID
   * @param limit - 每页数量
   * @param offset - 偏移量
   */
  async getUserSessions(userId: string, limit?: number, offset?: number) {
    const response = await this.client.get('/chat/sessions', {
      params: { user_id: userId, limit, offset }
    });
    return response.data;
  }

  /**
   * 获取会话历史消息
   * @param sessionId - 会话ID
   * @param userId - 用户ID
   * @param limit - 每页数量
   * @param offset - 偏移量
   */
  async getChatHistory(sessionId: string, userId: string, limit?: number, offset?: number) {
    const response = await this.client.get(`/chat/sessions/${sessionId}/messages`, {
      params: { user_id: userId, limit, offset }
    });
    return response.data;
  }

  /**
   * 删除对话会话
   * @param sessionId - 会话ID
   * @param userId - 用户ID
   */
  async deleteSession(sessionId: string, userId: string): Promise<{ success: boolean; message: string }> {
    const response = await this.client.delete(`/chat/sessions/${sessionId}`, {
      params: { user_id: userId }
    });
    return response.data;
  }

  /**
   * 批量删除对话会话
   * @param sessionIds - 会话ID列表
   * @param userId - 用户ID
   */
  async batchDeleteSessions(sessionIds: string[], userId: string): Promise<{ success: boolean; deleted_count: number; message: string }> {
    const response = await this.client.delete('/chat/sessions/batch', {
      data: { session_ids: sessionIds, user_id: userId }
    });
    return response.data;
  }

  /**
   * 翻译英文文本
   * @param text - 要翻译的英文文本
   */
  async translate(text: string): Promise<{
    translation: string;
    notes: string;
    token_usage?: { input_tokens: number; output_tokens: number; total_tokens: number };
  }> {
    const response = await this.client.post('/chat/translate', { text });
    return response.data;
  }

  /**
   * 生成单词 AI 解说文稿
   * @param request - 单词信息
   */
  async generateWordExplanation(request: {
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
    token_usage?: { input_tokens: number; output_tokens: number; total_tokens: number };
  }> {
    const response = await this.client.post('/chat/word/explanation', request);
    return response.data;
  }

  // ==================== Assistant API ====================

  /**
   * 助手聊天
   * @param systemPrompt - 包含用户记忆的系统提示词
   * @param history - 最近对话历史
   * @param message - 用户消息
   */
  async assistantChat(
    systemPrompt: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    message: string
  ): Promise<{
    reply: string;
    token_usage?: { input_tokens: number; output_tokens: number; total_tokens: number };
  }> {
    const response = await this.client.post('/assistant/chat', {
      system_prompt: systemPrompt,
      history,
      message,
    });
    return response.data;
  }

  /**
   * 提取 AI 洞察（从对话中分析用户特征）
   * @param messages - 最近的对话消息
   */
  async extractAssistantInsights(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<Record<string, any> | null> {
    try {
      const response = await this.client.post('/assistant/extract-insights', { messages });
      return response.data?.insights || null;
    } catch (error) {
      logger.warn('提取 AI 洞察调用失败:', error);
      return null;
    }
  }

  // ==================== Companion Chat API ====================

  /** 初始化伙伴线程 */
  async companionInit(params: {
    session_id: string;
    user_id: string;
    character_id: string;
    core_memories?: Array<{ category?: string; key: string; value: string }>;
  }): Promise<{
    message_id: string;
    role: string;
    content: string;
    translation: string;
    timestamp: string;
    token_usage: { input_tokens: number; output_tokens: number; total_tokens: number };
  }> {
    const response = await this.client.post('/companion/init', params);
    return response.data;
  }

  /** 伙伴聊天 */
  async companionChat(params: {
    session_id: string;
    user_id: string;
    character_id: string;
    message: string;
    core_memories?: Array<{ category?: string; key: string; value: string }>;
    recent_summaries?: string[];
  }): Promise<{
    message_id: string;
    role: string;
    content: string;
    translation: string;
    tips: string;
    timestamp: string;
    response_time: number;
    token_usage: { input_tokens: number; output_tokens: number; total_tokens: number };
  }> {
    const response = await this.client.post('/companion/chat', params);
    return response.data;
  }

  /** 获取伙伴对话历史 */
  async companionHistory(params: {
    session_id: string;
    user_id: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    messages: Array<{ role: string; content: string; timestamp?: string }>;
    total: number;
    has_more: boolean;
  }> {
    const response = await this.client.post('/companion/history', params);
    return response.data;
  }

  /** 提取伙伴记忆 */
  async companionExtractMemory(params: {
    character_name: string;
    recent_messages: Array<{ role: string; content: string }>;
  }): Promise<{
    facts: Array<{ key: string; value: string }>;
    relationship_events: Array<{ key: string; value: string }>;
    english_notes: Array<{ key: string; value: string }>;
  }> {
    try {
      const response = await this.client.post('/companion/extract-memory', params);
      return response.data;
    } catch (error) {
      logger.warn('伙伴记忆提取失败:', error);
      return { facts: [], relationship_events: [], english_notes: [] };
    }
  }

  // ==================== Sentence Challenge API ====================

  /**
   * 评估用户造句
   * @param word - 目标单词
   * @param meaningCn - 中文释义
   * @param sentence - 用户造句
   */
  async evaluateSentence(word: string, meaningCn: string, sentence: string): Promise<{
    grammar_score: number;
    usage_score: number;
    natural_score: number;
    overall_score: number;
    feedback: string;
    improved_sentence: string;
  }> {
    const response = await this.client.post('/sentence/evaluate', {
      word,
      meaning_cn: meaningCn,
      sentence,
    });
    return response.data;
  }

  // ==================== Grammar API ====================

  /**
   * 生成语法点 AI 讲解
   * @param nameZh - 语法点中文名
   * @param nameEn - 语法点英文名
   * @param difficulty - 难度级别
   */
  async generateGrammarExplanation(
    nameZh: string,
    nameEn: string,
    difficulty: string,
  ): Promise<{
    explanation: string;
    examples: any[];
  }> {
    const response = await this.client.post('/grammar/explanation', {
      name_zh: nameZh,
      name_en: nameEn,
      difficulty,
    });
    return response.data;
  }

  /**
   * 生成语法练习题
   * @param nameZh - 语法点中文名
   * @param nameEn - 语法点英文名
   * @param difficulty - 难度级别
   * @param count - 题目数量
   */
  async generateGrammarPractice(
    nameZh: string,
    nameEn: string,
    difficulty: string,
    count: number = 10,
  ): Promise<{
    questions: Array<{
      type: 'choice' | 'fill_blank';
      question: string;
      options?: string[];
      answer: string;
      explanation: string;
    }>;
  }> {
    const response = await this.client.post('/grammar/practice', {
      name_zh: nameZh,
      name_en: nameEn,
      difficulty,
      count,
    });
    return response.data;
  }

  /**
   * 生成课程式练习题（8 种题型，按认知层级分组）
   */
  async generateGrammarLessonPractice(
    nameZh: string,
    nameEn: string,
    difficulty: string,
  ): Promise<{
    questions: Array<{
      type: string;
      cognitiveLevel: string;
      question: string;
      options?: string[];
      answer: string;
      answer2?: string;
      explanation: string;
      errorPart?: string;
      correctVersion?: string;
      sentence1?: string;
      sentence2?: string;
      tableData?: any;
      words?: string[];
      distractors?: string[];
      structureHint?: string;
      acceptableAnswers?: string[];
      smartTip?: { rule: string; wrong: string; correct: string; examples: string[] };
    }>;
  }> {
    const response = await this.client.post('/grammar/lesson-practice', {
      name_zh: nameZh,
      name_en: nameEn,
      difficulty,
    });
    return response.data;
  }

  // ==================== Exercise API ====================

  /**
   * 生成多邻国式练习题
   */
  async generateExercise(request: {
    exerciseType: string;
    topic?: string;
    difficulty?: string;
    count?: number;
  }): Promise<{
    questions: Array<Record<string, any>>;
  }> {
    const response = await this.client.post('/exercise/generate', {
      exercise_type: request.exerciseType,
      topic: request.topic || 'daily life',
      difficulty: request.difficulty || 'medium',
      count: request.count || 1,
    });
    return response.data;
  }

  /**
   * 解释练习题答案
   */
  async explainExercise(request: {
    question: Record<string, any>;
    isCorrect: boolean;
  }): Promise<{ explanation: string }> {
    const response = await this.client.post('/exercise/explain', {
      question: request.question,
      is_correct: request.isCorrect,
    });
    return response.data;
  }

  /**
   * 冒险场景对话
   */
  async adventureRespond(request: {
    scenarioTitle: string;
    character: string;
    objectives: string[];
    conversationHistory: Array<{ role: string; content: string }>;
  }): Promise<{
    response: string;
    completedObjectives: number[];
  }> {
    const response = await this.client.post('/exercise/adventure/respond', {
      scenario_title: request.scenarioTitle,
      character: request.character,
      objectives: request.objectives,
      conversation_history: request.conversationHistory,
    });
    return response.data;
  }

  // ==================== Reading API ====================

  /**
   * 仅质量筛选 + 难度评级（不改写）
   */
  async qualityCheckArticle(title: string, content: string): Promise<{
    qualified: boolean;
    level?: string;
    category?: string;
    rejectReason?: string;
  }> {
    const response = await this.client.post('/reading/quality-check', { title, content }, { timeout: 60000 });
    return response.data;
  }

  /**
   * AI 文章清洗：去除图片标注、作者信息等无关内容
   */
  async cleanArticle(title: string, content: string): Promise<{
    cleanedContent: string;
    changed: boolean;
  }> {
    const response = await this.client.post('/reading/clean', { title, content }, { timeout: 120000 });
    return response.data;
  }

  /**
   * 质量筛选 + 压缩文章到 300-400 词
   */
  async compressReadingArticle(
    title: string,
    content: string,
    skipQualityCheck: boolean = false,
  ): Promise<{
    qualified: boolean;
    compressed?: string;
    rejectReason?: string;
    level?: string;
    category?: string;
    originalWordCount: number;
    compressedWordCount: number;
  }> {
    const response = await this.client.post('/reading/compress', {
      title,
      content,
      skipQualityCheck,
    }, { timeout: 120000 });
    return response.data;
  }

  /**
   * 完整处理精读文章（v2 多步骤管道 + 多教师角色）
   */
  async processReadingArticle(
    title: string,
    content: string,
    level: string = 'intermediate',
    articleIndex: number = 0,
  ): Promise<{
    titleZh: string;
    summary: string;
    summaryZh: string;
    paragraphs: Array<{
      index: number;
      en: string;
      zh: string;
    }>;
    keyVocabulary: Array<{
      word: string;
      phonetic: string;
      pos: string;
      meaningCn: string;
      contextSentence: string;
      paragraphIndex: number;
    }>;
    quiz: Array<{
      id: string;
      type: string;
      question: string;
      questionZh: string;
      options: string[];
      answer: string;
      explanation: string;
    }>;
    explanationScript?: string;
    teacherId?: string;
    pipelineVersion: number;
  }> {
    const response = await this.client.post('/reading/process', {
      title,
      content,
      level,
      articleIndex,
    }, { timeout: 300000 }); // 多步骤管道需要更长时间（5分钟）
    return response.data;
  }

  /**
   * 讲解映射分析（AI 拆句 + 映射）
   */
  async analyzeExplanationMapping(
    explanationScript: string,
    paragraphs: Array<{ index: number; en: string }>,
    title: string = '',
  ): Promise<{
    englishSentences: string[][];
    chineseSentences: string[];
    explanationMapping: Array<{
      chineseSentence: string;
      englishSentence: string;
      paragraphIndex: number;
    }>;
  }> {
    const response = await this.client.post('/reading/explanation-mapping', {
      explanationScript,
      paragraphs,
      title,
    }, { timeout: 480000 });
    return response.data.data;
  }

  // ==================== Legacy API (旧接口，保留兼容) ====================

  /**
   * 创建对话会话 (旧接口)
   * @deprecated 使用 createSession 替代
   */
  async createConversation(request: {
    userId: string;
    scenario: string;
    difficulty: string;
    voice: string;
  }) {
    const response = await this.client.post('/api/conversations', request);
    return response.data;
  }

  /**
   * 获取对话历史 (旧接口)
   * @deprecated 使用 getChatHistory 替代
   */
  async getConversationHistory(conversationId: string) {
    const response = await this.client.get(`/api/conversations/${conversationId}`);
    return response.data;
  }

  /**
   * 获取用户的所有对话
   * @param userId - 用户ID
   */
  async getUserConversations(userId: string) {
    const response = await this.client.get('/api/conversations', {
      params: { userId }
    });
    return response.data;
  }

  /**
   * 结束对话
   * @param conversationId - 会话ID
   */
  async endConversation(conversationId: string) {
    const response = await this.client.post(`/api/conversations/${conversationId}/end`);
    return response.data;
  }
}

// 导出单例实例
export const aiServiceClient = new AIServiceClient();
