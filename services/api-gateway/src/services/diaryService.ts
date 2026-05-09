/**
 * 口语日记服务
 * 管理每日话题、录音保存、AI 纠错分析
 */

import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { getTodayCN } from '@/utils/dateUtils';

// ==================== 每日话题库 ====================

const DAILY_TOPICS = [
  { en: 'What did you have for breakfast today? Describe it in detail.', zh: '你今天早餐吃了什么？详细描述一下。' },
  { en: 'Describe your favorite place in your city and why you like it.', zh: '描述你在城市中最喜欢的地方以及为什么喜欢它。' },
  { en: 'What would you do if you had a whole day off with no plans?', zh: '如果你有一整天的假期没有计划，你会做什么？' },
  { en: 'Tell me about a movie or book you enjoyed recently.', zh: '告诉我你最近喜欢的一部电影或一本书。' },
  { en: 'What is your dream vacation destination and why?', zh: '你梦想的度假目的地是哪里，为什么？' },
  { en: 'Describe your daily routine from morning to night.', zh: '描述你从早到晚的日常生活。' },
  { en: 'What skill would you most like to learn and why?', zh: '你最想学习什么技能，为什么？' },
  { en: 'If you could meet any famous person, who would it be?', zh: '如果你能见到任何名人，你想见谁？' },
  { en: 'What is your happiest childhood memory?', zh: '你最快乐的童年回忆是什么？' },
  { en: 'How do you usually spend your weekends?', zh: '你通常怎么度过周末？' },
  { en: 'Describe the weather today and how it affects your mood.', zh: '描述今天的天气以及它如何影响你的心情。' },
  { en: 'What advice would you give to your younger self?', zh: '你会给年轻时的自己什么建议？' },
  { en: 'Tell me about a challenge you overcame recently.', zh: '告诉我你最近克服的一个挑战。' },
  { en: 'What technology could you not live without?', zh: '你离不开什么科技产品？' },
  { en: 'Describe your ideal home. What would it look like?', zh: '描述你理想中的家。它会是什么样子？' },
  { en: 'If you could travel back in time, what period would you visit?', zh: '如果你能穿越时空，你会去哪个时期？' },
  { en: 'What is something you are grateful for today?', zh: '今天你感激什么？' },
  { en: 'Describe a person who has influenced your life.', zh: '描述一个影响了你人生的人。' },
  { en: 'What is your favorite season and why?', zh: '你最喜欢什么季节，为什么？' },
  { en: 'If you could have any superpower, what would you choose?', zh: '如果你能拥有任何超能力，你会选择什么？' },
  { en: 'What do you usually eat for dinner? Describe your favorite dish.', zh: '你晚餐通常吃什么？描述你最喜欢的菜。' },
  { en: 'Tell me about your best friend and how you met.', zh: '告诉我你最好的朋友以及你们是怎么认识的。' },
  { en: 'What goals do you have for this year?', zh: '你今年有什么目标？' },
  { en: 'Describe a memorable trip you have taken.', zh: '描述一次难忘的旅行。' },
  { en: 'What is your opinion on social media?', zh: '你对社交媒体有什么看法？' },
  { en: 'If you could live in any country, where would you choose?', zh: '如果你能住在任何国家，你会选择哪里？' },
  { en: 'What hobby would you like to pick up?', zh: '你想培养什么爱好？' },
  { en: 'Describe your workspace or study area.', zh: '描述你的工作区域或学习区域。' },
  { en: 'What makes you laugh the most?', zh: '什么最让你开心？' },
  { en: 'Tell me about a tradition or holiday you enjoy.', zh: '告诉我你喜欢的一个传统或节日。' },
  { en: 'What did you learn new this week?', zh: '这周你学到了什么新东西？' },
];

// ==================== 核心功能 ====================

/** 获取今日话题（基于日期的确定性选择） */
export function getDailyTopic(date?: string) {
  const today = date || getTodayCN();
  // 用日期字符串生成一个确定性索引
  const hash = today.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const index = hash % DAILY_TOPICS.length;
  return {
    topic: DAILY_TOPICS[index].en,
    topicZh: DAILY_TOPICS[index].zh,
    date: today,
  };
}

/** 创建口语日记 */
export async function createDiary(params: {
  userId: string;
  topic: string;
  topicZh?: string;
  userText: string;
  aiCorrection?: string;
  aiSuggestion?: string;
  aiScore?: number;
  audioUrl?: string;
  duration?: number;
  eventDate: string;
}) {
  return prisma.userSpeakingDiary.create({
    data: params,
  });
}

/** 获取用户日记列表 */
export async function getUserDiaries(userId: string, limit: number = 30) {
  return prisma.userSpeakingDiary.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/** 获取用户某天的日记 */
export async function getDiaryByDate(userId: string, date: string) {
  return prisma.userSpeakingDiary.findFirst({
    where: { userId, eventDate: date },
    orderBy: { createdAt: 'desc' },
  });
}

/** AI 分析口语文本（调用 DeepSeek） */
export function buildAnalysisPrompt(userText: string, topic: string): string {
  return `You are an expert English speaking coach. The student was asked to speak about this topic: "${topic}"

The student said: "${userText}"

Please analyze their speaking and provide:
1. **Grammar Corrections**: List specific grammar mistakes and the corrected versions. If no mistakes, say "No grammar issues found."
2. **Expression Suggestions**: Suggest 2-3 more natural or advanced ways to express the same ideas.
3. **Score**: Rate their overall speaking from 1-10 (considering grammar, vocabulary, coherence, and relevance to the topic).

Respond in this exact JSON format:
{
  "correction": "Grammar corrections here (in English, with explanations in Chinese)",
  "suggestion": "Expression suggestions here (in English, with Chinese explanations)",
  "score": 7
}`;
}
