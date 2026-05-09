import { useState, useMemo, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useArticleList, useArticleMonths, useReadingProgress } from '@/hooks/queries/readingQueries';
import { useRefreshOnFocus } from '@/hooks/queries/useRefreshOnFocus';
import { getLocalDateString } from '@/utils/dateUtils';
import type { ArticleSummary, ReadingProgress } from '@/api/modules/reading';

interface ArticleWithProgress extends ArticleSummary {
  progress: ReadingProgress | null;
}

export interface MonthSection {
  title: string;
  year: number;
  month: number;
  data: ArticleWithProgress[];
}

export type MonthInfo = { month: string; count: number };

const LEVELS = ['', 'beginner', 'intermediate', 'advanced'] as const;
const CATEGORIES = ['', 'science', 'culture', 'travel', 'food', 'health', 'education', 'general'] as const;

function groupByMonth(articles: ArticleWithProgress[]): MonthSection[] {
  const map = new Map<string, MonthSection>();

  for (const article of articles) {
    // publishDate 是北京日期字符串；createdAt 是 ISO 时间戳，统一按北京时区取 YYYY-MM-DD
    const ymd = article.publishDate ?? getLocalDateString(new Date(article.createdAt).getTime());
    const [year, month] = ymd.split('-').map(Number);
    const key = `${year}-${month}`;

    if (!map.has(key)) {
      map.set(key, { title: key, year, month, data: [] });
    }
    map.get(key)!.data.push(article);
  }

  return Array.from(map.values());
}

function isToday(dateStr: string | null) {
  if (!dateStr) return false;
  return dateStr === getLocalDateString();
}

export function useReadingList() {
  const navigation = useNavigation<any>();

  // 筛选状态
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  // 可用月份列表（含文章数量）
  const monthsQuery = useArticleMonths();
  const monthsData: MonthInfo[] = monthsQuery.data || [];

  // 文章列表（无限滚动）
  const articlesQuery = useArticleList({
    level: selectedLevel || undefined,
    category: selectedCategory || undefined,
    yearMonth: selectedMonth || undefined,
  });

  // 用户进度
  const progressQuery = useReadingProgress();
  useRefreshOnFocus(progressQuery.refetch);

  // 合并进度 + 按月分组
  const sections = useMemo(() => {
    const allArticles = articlesQuery.data?.pages.flatMap(p => p.articles) || [];
    const progressList = progressQuery.data || [];

    const articlesWithProgress: ArticleWithProgress[] = allArticles.map(a => ({
      ...a,
      progress: progressList.find(p => p.articleId === a.id) || null,
    }));

    return groupByMonth(articlesWithProgress);
  }, [articlesQuery.data, progressQuery.data]);

  // 提取今日精选文章（今日发布且未完成的第一篇）
  const { featuredArticle, regularSections } = useMemo(() => {
    if (selectedLevel || selectedCategory || selectedMonth) {
      // 有筛选时不展示精选
      return { featuredArticle: null, regularSections: sections };
    }

    let featured: ArticleWithProgress | null = null;
    const remaining: MonthSection[] = [];

    for (const section of sections) {
      const filtered: ArticleWithProgress[] = [];
      for (const article of section.data) {
        if (!featured && isToday(article.publishDate) && article.progress?.status !== 'completed') {
          featured = article;
        } else {
          filtered.push(article);
        }
      }
      if (filtered.length > 0) {
        remaining.push({ ...section, data: filtered });
      }
    }

    return { featuredArticle: featured, regularSections: remaining };
  }, [sections, selectedLevel, selectedCategory, selectedMonth]);

  // 扁平化为 FlatList 数据（featured + section header + items）
  const flatData = useMemo(() => {
    const items: Array<
      | { type: 'featured'; article: ArticleWithProgress }
      | { type: 'header'; section: MonthSection }
      | { type: 'article'; article: ArticleWithProgress }
    > = [];

    if (featuredArticle) {
      items.push({ type: 'featured', article: featuredArticle });
    }

    for (const section of regularSections) {
      items.push({ type: 'header', section });
      for (const article of section.data) {
        items.push({ type: 'article', article });
      }
    }
    return items;
  }, [featuredArticle, regularSections]);

  const handleArticlePress = useCallback((article: ArticleSummary) => {
    navigation.navigate('IntensiveReading', { articleId: article.id });
  }, [navigation]);

  const loadMore = useCallback(() => {
    if (articlesQuery.hasNextPage && !articlesQuery.isFetchingNextPage) {
      articlesQuery.fetchNextPage();
    }
  }, [articlesQuery]);

  return {
    // 筛选
    selectedLevel,
    setSelectedLevel,
    selectedCategory,
    setSelectedCategory,
    selectedMonth,
    setSelectedMonth,
    levels: LEVELS,
    categories: CATEGORIES,
    monthsData,
    // 数据
    flatData,
    isLoading: articlesQuery.isLoading,
    isFetchingMore: articlesQuery.isFetchingNextPage,
    hasMore: articlesQuery.hasNextPage,
    loadMore,
    // 交互
    handleArticlePress,
  };
}
