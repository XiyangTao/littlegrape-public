import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api';
import { tryGetSession } from '@/session/registry';
import { useRefreshOnFocus } from './useRefreshOnFocus';
import { grammarKeys } from './queryKeys';
import { apiQuery } from './queryUtils';
import type { GrammarCategoryData, GrammarPointData, GrammarExplanationData, GrammarLessonData } from '@/api/modules/grammar';

/**
 * 语法分类列表（含每个分类的掌握数）
 * 页面聚焦时后台静默刷新
 */
export function useGrammarCategories() {
  const query = useQuery({
    queryKey: grammarKeys.categories(),
    queryFn: (): Promise<GrammarCategoryData[]> =>
      apiQuery(() => apiClient.getGrammarCategories()),
  });
  useRefreshOnFocus(query.refetch);
  return query;
}

/**
 * 分类下语法点列表（含每个点的学习状态和分数）
 * 仅在 categoryCode 有值时启用（展开分类时）
 */
export function useGrammarCategoryPoints(categoryCode: string | null) {
  return useQuery({
    queryKey: grammarKeys.categoryPoints(categoryCode ?? ''),
    queryFn: async (): Promise<GrammarPointData[]> => {
      const data = await apiQuery(() => apiClient.getGrammarCategoryPoints(categoryCode!));
      return data.points;
    },
    enabled: !!categoryCode,
  });
}

/**
 * 单个语法点的 AI 讲解
 * AI 生成内容不频繁变化，缓存价值高：staleTime 10min, gcTime 30min
 */
export function useGrammarExplanation(pointCode: string) {
  return useQuery({
    queryKey: grammarKeys.explanation(pointCode),
    queryFn: (): Promise<GrammarExplanationData> =>
      apiQuery(() => apiClient.getGrammarExplanation(pointCode)),
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
  });
}

/**
 * 课程式练习数据（Quick Rule + 分阶段题目）
 * AI 生成后缓存，高复用价值
 */
export function useGrammarLesson(pointCode: string) {
  return useQuery({
    queryKey: grammarKeys.lesson(pointCode),
    queryFn: (): Promise<GrammarLessonData> =>
      apiQuery(() => apiClient.getGrammarLesson(pointCode)),
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
  });
}

/**
 * 提交练习/阅读讲解后，失效所有语法相关缓存
 * 使用 grammarKeys.all 前缀一次性失效
 *
 * 防御式：通过 tryGetSession 拿当前 session 的 queryClient；
 * 无 session 时静默 noop（已登出则缓存自然失效）
 */
export function invalidateGrammarCache() {
  tryGetSession()?.queryClient.invalidateQueries({ queryKey: grammarKeys.all });
}
