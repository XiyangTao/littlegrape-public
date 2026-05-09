import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api';
import { apiQuery } from './queryUtils';
import { classicsKeys } from './queryKeys';
import { useRefreshOnFocus } from './useRefreshOnFocus';
import type {
  BookListPage,
  BookDetail,
  ChapterContent,
  BookLevel,
  BookProgress,
  BookProgressSummary,
  RecentBook,
} from '@/api/modules/classics';

/**
 * 名著书架（游标分页）
 * - ClassicsHome 只读 data.pages[0].books（不触发 fetchNextPage）
 * - ClassicsBookshelf 扁平化 pages + 滚到底 fetchNextPage
 */
export function useClassicsBooks(level?: BookLevel, limit = 20) {
  const query = useInfiniteQuery<BookListPage>({
    queryKey: classicsKeys.list(level, limit),
    queryFn: ({ pageParam }) =>
      apiQuery(() =>
        apiClient.getClassicsBooks({
          level,
          cursor: pageParam as string | undefined,
          limit,
        }),
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 10 * 60 * 1000,
  });
  useRefreshOnFocus(query.refetch);
  return query;
}

/** 书详情 + 章节目录 */
export function useClassicsBook(slug: string | undefined) {
  return useQuery<BookDetail>({
    queryKey: classicsKeys.detail(slug!),
    queryFn: () => apiQuery(() => apiClient.getClassicsBook(slug!)),
    enabled: !!slug,
    staleTime: 30 * 60 * 1000,
  });
}

/** 章节正文 */
export function useClassicsChapter(slug: string | undefined, chapterNumber: number | undefined) {
  return useQuery<ChapterContent>({
    queryKey: classicsKeys.chapter(slug!, chapterNumber!),
    queryFn: () => apiQuery(() => apiClient.getClassicsChapter(slug!, chapterNumber!)),
    enabled: !!slug && !!chapterNumber,
    staleTime: 60 * 60 * 1000,
  });
}

/** 所有书进度摘要（书架批量展示用） */
export function useAllBookProgress() {
  const query = useQuery<{ progress: BookProgressSummary[] }>({
    queryKey: classicsKeys.allProgress(),
    queryFn: () => apiQuery(() => apiClient.getClassicsAllProgress()),
    staleTime: 5 * 60 * 1000,
  });
  useRefreshOnFocus(query.refetch);
  return query;
}

/** 最近在读（续读 Hero 用） */
export function useRecentReadings(limit = 10) {
  const query = useQuery<{ books: RecentBook[] }>({
    queryKey: classicsKeys.recentReadings(),
    queryFn: () => apiQuery(() => apiClient.getClassicsRecentReadings(limit)),
    staleTime: 5 * 60 * 1000,
  });
  useRefreshOnFocus(query.refetch);
  return query;
}

/** 某本书进度 */
export function useBookProgress(slug: string | undefined) {
  return useQuery<BookProgress | null>({
    queryKey: classicsKeys.bookProgress(slug!),
    queryFn: () => apiQuery(() => apiClient.getClassicsBookProgress(slug!)),
    enabled: !!slug,
    staleTime: 2 * 60 * 1000,
  });
}

/** 上报阅读进度 */
export function useUpdateBookProgress(slug: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      chapterNumber: number;
      paraIndex: number;
      sentenceIndex?: number;
      addedSeconds?: number;
      chapterCompleted?: boolean;
    }) => apiQuery(() => apiClient.updateClassicsBookProgress(slug!, body)),
    onError: () => {},
    onSuccess: (data) => {
      if (!slug) return;
      qc.setQueryData(classicsKeys.bookProgress(slug), data);
      qc.invalidateQueries({ queryKey: classicsKeys.recentReadings() });
      qc.invalidateQueries({ queryKey: classicsKeys.allProgress() });
    },
  });
}
