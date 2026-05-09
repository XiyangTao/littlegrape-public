/**
 * QueryKey 工厂 — 集中管理所有 queryKey
 *
 * 层级设计：invalidateQueries({ queryKey: grammarKeys.all }) 可一次失效所有语法缓存
 */

import { getLocalDateString } from '@/utils/dateUtils';

export const grammarKeys = {
  all: ['grammar'] as const,
  categories: () => ['grammar', 'categories'] as const,
  categoryPoints: (code: string) => ['grammar', 'categoryPoints', code] as const,
  explanation: (pointCode: string) => ['grammar', 'explanation', pointCode] as const,
  practice: (pointCode: string) => ['grammar', 'practice', pointCode] as const,
  lesson: (pointCode: string) => ['grammar', 'lesson', pointCode] as const,
};

export const dailyTaskKeys = {
  all: ['dailyTask'] as const,
  tasks: () => ['dailyTask', 'tasks'] as const,
};

export const readingKeys = {
  all: ['reading'] as const,
  list: (params?: { level?: string; category?: string; yearMonth?: string }) =>
    ['reading', 'list', params] as const,
  months: () => ['reading', 'months'] as const,
  daily: () => ['reading', 'daily', getLocalDateString()] as const,
  progress: () => ['reading', 'progress'] as const,
  intensive: (articleId: string) => ['reading', 'intensive', articleId] as const,
};

export const classicsKeys = {
  all: ['classics'] as const,
  list: (level?: string, limit?: number) => ['classics', 'list', level || 'all', limit ?? 20] as const,
  detail: (slug: string) => ['classics', 'detail', slug] as const,
  chapter: (slug: string, chapterNumber: number) =>
    ['classics', 'chapter', slug, chapterNumber] as const,
  allProgress: () => ['classics', 'progress', 'all'] as const,
  recentReadings: () => ['classics', 'progress', 'recent'] as const,
  bookProgress: (slug: string) => ['classics', 'progress', 'book', slug] as const,
};
