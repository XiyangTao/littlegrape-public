// API endpoints
export const ENDPOINTS = {
  HEALTH: '/health',
  SPEECH_ASR: '/api/asr/recognize',
  // 认证相关
  AUTH_REGISTER_EMAIL: '/api/auth/register/email',
  AUTH_LOGIN_PASSWORD: '/api/auth/login/password',
  AUTH_TOKEN_REFRESH: '/api/auth/token/refresh',
  AUTH_TOKEN_VERIFY: '/api/auth/token/verify',
  // 邮箱验证码相关
  AUTH_EMAIL_SEND_CODE: '/api/auth/email/send-code',
  AUTH_EMAIL_VERIFY_CODE: '/api/auth/email/verify-code',
  // 手机号相关
  AUTH_PHONE_SEND_CODE: '/api/auth/phone/send-code',
  AUTH_LOGIN_PHONE: '/api/auth/login/phone',

  // 微信登录
  AUTH_LOGIN_WECHAT: '/api/auth/login/wechat',

  // 一键登录（运营商网关）
  AUTH_LOGIN_CARRIER: '/api/auth/login/carrier',

  // 密码重置相关
  AUTH_PASSWORD_RESET_REQUEST: '/api/auth/password-reset/request',
  AUTH_PASSWORD_RESET_VERIFY: '/api/auth/password-reset/verify',
  AUTH_PASSWORD_RESET_COMPLETE: '/api/auth/password-reset/complete',

  // 多语言数据相关
  GREETING_DAILY: '/api/greeting/daily',

  // 文件上传相关
  UPLOAD_SINGLE: '/api/upload/single',

  // 用户相关
  USER_PROFILE: '/api/user/profile',
  USER_BIND_PHONE: '/api/user/bindPhone',
  USER_BIND_PHONE_SEND_CODE: '/api/user/bindPhone/sendCode',
  USER_BIND_WECHAT: '/api/user/bindWechat',
  USER_SET_PASSWORD: '/api/user/setPassword',
  USER_CHANGE_PASSWORD: '/api/user/changePassword',

  // 角色相关
  CHARACTERS: '/api/characters',

  // TTS相关
  TTS_VOICES: '/api/tts/voices',
  TTS_SYNTHESIZE: '/api/tts/synthesize',

  // Chat相关
  CHAT_SCENARIOS: '/api/chat/scenarios',
  CHAT_PREPARE: '/api/chat/prepare',
  CHAT_SESSIONS: '/api/chat/sessions',
  CHAT_WORD_EXPLANATION: '/api/chat/word/explanation',
  CHAT_TRANSLATE: '/api/chat/translate',

  // 剧情模式
  STORY_SESSIONS: '/api/chat/story/sessions',
  TTS_TRANSLATE: '/api/tts/translate',

  // 发音评估相关
  PRONUNCIATION_ASSESS: '/api/pronunciation/assess',
  PRONUNCIATION_HEALTH: '/api/pronunciation/health',

  // 单词相关
  WORDS_LEARN: '/api/words/learn',
  WORDS_DETAIL: '/api/words/detail',
  WORDS_DETAILS_BATCH: '/api/words/details/batch',
  WORDS_TAGS: '/api/words/tags/list',
  WORDS_TODAY: '/api/words/today',
  WORDS_PROGRESS_LEARNED: '/api/words/progress/learned',
  WORDS_PROGRESS_MASTERED: '/api/words/progress/mastered',
  WORDS_DOWNLOAD: '/api/words/download',
  // 收藏
  WORDS_FAVORITES: '/api/words/favorites',
  WORDS_FAVORITES_COUNT: '/api/words/favorites/count',
  WORDS_FAVORITES_CHECK: '/api/words/favorites/check',
  // 造句挑战
  WORDS_SENTENCE_CHALLENGE: '/api/words/sentence-challenge',
  // 生词本
  WORDS_DIFFICULT: '/api/words/difficult',
  WORDS_DIFFICULT_COUNT: '/api/words/difficult/count',
  WORDS_DIFFICULT_WRONG: '/api/words/difficult/wrong',
  WORDS_DIFFICULT_CORRECT: '/api/words/difficult/correct',
  WORDS_DIFFICULT_REMOVE: '/api/words/difficult',  // DELETE /api/words/difficult/:wordId
  WORDS_DIFFICULT_CLEAR: '/api/words/difficult/all',

  // 统计相关
  STATS_SYNC: '/api/stats/sync',
  STATS_PUSH: '/api/stats/push',
  STATS_EVENTS: '/api/stats/events',
  DAILY_STATS_SYNC: '/api/stats/daily-stats/sync',
  TODAY_EVENTS_SYNC: '/api/stats/today-events/sync',
  VOCABULARY_TESTS_SYNC: '/api/stats/vocabulary-tests/sync',
  VOCABULARY_TESTS_PUSH: '/api/stats/vocabulary-tests/push',

  // 学习进度同步
  WORD_PROGRESS_SYNC: '/api/words/progress/sync',

  // 收藏同步
  FAVORITES_SYNC: '/api/words/favorites/sync',

  // 生词本同步
  DIFFICULT_SYNC: '/api/words/difficult/sync',

  // 反馈相关
  FEEDBACK: '/api/feedback',

  // 配额相关
  QUOTA: '/api/quota',
  QUOTA_CHECK: '/api/quota/check',

  // 用量统计
  USAGE: '/api/usage',
  USAGE_HISTORY: '/api/usage/history',

  // 精读相关
  READING_ARTICLES: '/api/reading/articles',
  READING_PROGRESS: '/api/reading/progress',
  READING_DAILY: '/api/reading/daily',

  // 名著精读
  CLASSICS_BOOKS: '/api/classics/books',
  CLASSICS_PROGRESS_ALL: '/api/classics/progress',
  CLASSICS_PROGRESS_RECENT: '/api/classics/progress/recent',

  // 点词查义（公共字典 + AI 兜底，不计用户配额）
  WORDS_LOOKUP: '/api/words/lookup',

  // 口语日记相关
  DIARY_TOPIC: '/api/diary/topic',
  DIARY_CREATE: '/api/diary',
  DIARY_LIST: '/api/diary/list',
  DIARY_ANALYZE: '/api/diary/analyze',

  // 剧情相关
  STORY_LIST: '/api/story/list',
  STORY_PROGRESS: '/api/story/progress',
  STORY_DETAIL: '/api/story',
  STORY_EPISODES: '/api/story/episodes',
  STORY_EVALUATE: '/api/story/evaluate',

  // 学习路径
  LEARNING_PATH: '/api/learning-path',

  // 社区
  COMMUNITY_POSTS: '/api/community/posts',

  // 考试专题
  EXAM_TYPES: '/api/exam/types',
  EXAM_GENERATE: '/api/exam/generate',
  EXAM_SUBMIT: '/api/exam/submit',
  EXAM_RECORDS: '/api/exam/records',

  // 排行榜相关
  LEADERBOARD: '/api/leaderboard',
  LEADERBOARD_RANK: '/api/leaderboard/rank',

  // 邀请相关
  INVITATION_CODE: '/api/invitation/code',
  INVITATION_APPLY: '/api/invitation/apply',
  INVITATION_LIST: '/api/invitation/list',
  INVITATION_STATS: '/api/invitation/stats',

  // 成就相关
  ACHIEVEMENT_LEVEL: '/api/achievement/level',
  ACHIEVEMENT_LIST: '/api/achievement/list',
  ACHIEVEMENT_XP: '/api/achievement/xp',
  ACHIEVEMENT_CHECK: '/api/achievement/check',
  ACHIEVEMENT_NOTIFICATIONS: '/api/achievement/notifications',
  ACHIEVEMENT_NOTIFICATIONS_READ: '/api/achievement/notifications/read',
  ACHIEVEMENT_DAILY_BONUS: '/api/achievement/daily-bonus',
  ACHIEVEMENT_SHOWCASE: '/api/achievement/showcase',
  ACHIEVEMENT_LEADERBOARD: '/api/achievement/leaderboard',

  // 听力相关
  LISTENING_MATERIALS: '/api/listening/materials',
  LISTENING_PROGRESS: '/api/listening/progress',

  // 订单相关
  ORDER_PLANS: '/api/order/plans',
  ORDER_PRICE: '/api/order/price',
  ORDER_CREATE: '/api/order/create',
  ORDER_LIST: '/api/order/list',
  ORDER_DETAIL: '/api/order',

  // AI 学习助手相关
  ASSISTANT_CHAT: '/api/assistant/chat',
  ASSISTANT_MESSAGES: '/api/assistant/messages',
  ASSISTANT_PUSHES: '/api/assistant/pushes',
  ASSISTANT_PUSHES_READ: '/api/assistant/pushes/read',
  ASSISTANT_MEMORY: '/api/assistant/memory',

  // 每日挑战
  DAILY_CHALLENGE_TODAY: '/api/daily-challenge/today',
  DAILY_CHALLENGE_SUBMIT: '/api/daily-challenge/submit',
  DAILY_CHALLENGE_LEADERBOARD: '/api/daily-challenge/leaderboard',
  DAILY_CHALLENGE_MY_STATS: '/api/daily-challenge/my-stats',

  // 语法相关
  GRAMMAR_CATEGORIES: '/api/grammar/categories',
  GRAMMAR_POINTS: '/api/grammar/points',
  GRAMMAR_SUBMIT: '/api/grammar/practice/submit',
  GRAMMAR_LESSON_SUBMIT: '/api/grammar/lesson/submit',
  GRAMMAR_PROGRESS: '/api/grammar/progress',

  // 单词练习题
  WORDS_PRACTICES_BATCH: '/api/words/practices/batch',

  // 练习题
  EXERCISE_GENERATE: '/api/exercise/generate',
  EXERCISE_EXPLAIN: '/api/exercise/explain',

  // 音素数据
  PHONEMES: '/api/phonemes',
  PHONEME_PROGRESS_SYNC: '/api/phonemes/progress/sync',
  PHONEME_PROGRESS_PUSH: '/api/phonemes/progress/push',
  PHONEME_PRACTICE_DONE: '/api/phonemes/practice-done',

  // 每日任务
  TASKS_DAILY: '/api/tasks/daily',
  TASKS_CLAIM: '/api/tasks',          // POST /api/tasks/:taskId/claim
  TASKS_DAILY_BONUS: '/api/tasks/daily-bonus',

  // 关注相关
  FOLLOW: '/api/follow',
  FOLLOW_FOLLOWING: '/api/follow/following',
  FOLLOW_FOLLOWERS: '/api/follow/followers',
  FOLLOW_MUTUAL: '/api/follow/mutual',
  FOLLOW_SEARCH: '/api/follow/search',

  // 版本检查
  VERSION_CHECK: '/api/version/check',

  // 伙伴对话
  COMPANION_MEM0_THREADS: '/api/companion-mem0/threads',
} as const;

/**
 * 构建 URL 查询参数字符串
 * 自动过滤 undefined / null 值，返回 '?key=value&...' 或空字符串
 */
export function buildQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      qs.set(key, String(value));
    }
  });
  const str = qs.toString();
  return str ? `?${str}` : '';
}
