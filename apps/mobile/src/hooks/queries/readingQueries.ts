import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api';
import { apiQuery } from './queryUtils';
import { readingKeys } from './queryKeys';
import { useRefreshOnFocus } from './useRefreshOnFocus';

import type { DailyReadingData, IntensiveArticle, QuizResult, ArticleListResponse, ReadingProgress } from '@/api/modules/reading';

/** 文章列表（无限滚动） */
export function useArticleList(params?: { level?: string; category?: string; yearMonth?: string }) {
  return useInfiniteQuery<ArticleListResponse>({
    queryKey: readingKeys.list(params),
    queryFn: ({ pageParam }) =>
      apiQuery(() => apiClient.getArticles({ ...params, cursor: pageParam as string | undefined })),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

/** 有文章的月份列表 */
export function useArticleMonths() {
  const query = useQuery<Array<{ month: string; count: number }>>({
    queryKey: readingKeys.months(),
    queryFn: () => apiQuery(() => apiClient.getArticleMonths()),
    staleTime: 30 * 60 * 1000,
  });
  useRefreshOnFocus(query.refetch);
  return query;
}

/** 用户阅读进度 */
export function useReadingProgress() {
  const query = useQuery<ReadingProgress[]>({
    queryKey: readingKeys.progress(),
    queryFn: () => apiQuery(() => apiClient.getReadingProgress()),
  });
  useRefreshOnFocus(query.refetch);
  return query;
}

/** 今日精读推荐（每个 level 一篇） */
export function useDailyReading() {
  const query = useQuery<DailyReadingData[] | null>({
    queryKey: readingKeys.daily(),
    queryFn: () => apiQuery(() => apiClient.getDailyReading()),
    staleTime: 5 * 60 * 1000,
  });
  useRefreshOnFocus(query.refetch);
  return query;
}

/** 完整精读数据 */
export function useIntensiveArticle(articleId: string | undefined) {
  const query = useQuery<IntensiveArticle>({
    queryKey: readingKeys.intensive(articleId!),
    queryFn: () => apiQuery(() => apiClient.getIntensiveArticle(articleId!)),
    enabled: !!articleId,
    staleTime: 10 * 60 * 1000,
  });
  useRefreshOnFocus(query.refetch);
  return query;
}

/** 提交练习答案 */
export function useSubmitReadingQuiz() {
  const queryClient = useQueryClient();

  return useMutation<QuizResult, Error, { articleId: string; answers: Array<{ questionId: string; answer: string }> }>({
    mutationFn: ({ articleId, answers }) =>
      apiQuery(() => apiClient.submitReadingQuiz(articleId, answers)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: readingKeys.all });
    },
  });
}

/** 更新精读步骤 */
export function useUpdateReadingStep() {
  return useMutation<any, Error, { articleId: string; step: number; paragraph?: number }>({
    mutationFn: ({ articleId, step, paragraph }) =>
      apiQuery(() => apiClient.updateReadingStep(articleId, step, paragraph)),
  });
}
