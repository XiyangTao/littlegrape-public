import { useState, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { apiClient } from '@/api';
import { useI18n } from '@/context/I18nProvider';
import { RARITY_COLORS } from '@/constants/colors';
import { useFocusLoader } from '@/hooks/useDataLoader';
import type { UserLevelInfo, AchievementInfo } from '@/api/modules/achievement';

interface AchievementData {
  level: UserLevelInfo | null;
  achievements: AchievementInfo[];
}

export const CATEGORY_ORDER = ['learning', 'streak', 'practice', 'milestone'];

export const CATEGORY_LABELS: Record<string, Record<string, string>> = {
  learning: { 'zh-CN': '学习成就', en: 'Learning' },
  streak: { 'zh-CN': '坚持打卡', en: 'Streaks' },
  practice: { 'zh-CN': '练习成就', en: 'Practice' },
  milestone: { 'zh-CN': '里程碑', en: 'Milestones' },
};

export { RARITY_COLORS };

export const RARITY_LABELS: Record<string, Record<string, string>> = {
  common: { 'zh-CN': '普通', en: 'Common' },
  rare: { 'zh-CN': '稀有', en: 'Rare' },
  epic: { 'zh-CN': '史诗', en: 'Epic' },
  legendary: { 'zh-CN': '传说', en: 'Legendary' },
};

/** 将成就按 seriesCode 分组，同系列显示为一个阶梯卡片 */
export function groupBySeries(items: AchievementInfo[]) {
  const series = new Map<string, AchievementInfo[]>();
  const standalone: AchievementInfo[] = [];

  for (const item of items) {
    if (item.seriesCode) {
      const key = item.seriesCode;
      if (!series.has(key)) series.set(key, []);
      series.get(key)!.push(item);
    } else {
      standalone.push(item);
    }
  }

  // 排序每个系列的 tier
  for (const arr of series.values()) {
    arr.sort((a, b) => (a.tier ?? 1) - (b.tier ?? 1));
  }

  const groups: Array<{ type: 'series'; items: AchievementInfo[] } | { type: 'single'; item: AchievementInfo }> = [];

  // 按首个成就的原始顺序排列
  const seen = new Set<string>();
  for (const item of items) {
    if (item.seriesCode) {
      if (seen.has(item.seriesCode)) continue;
      seen.add(item.seriesCode);
      groups.push({ type: 'series', items: series.get(item.seriesCode)! });
    } else {
      groups.push({ type: 'single', item });
    }
  }

  return groups;
}

export type AchievementFilter = 'all' | 'permanent' | 'season' | 'limited';

export const FILTER_LABELS: Record<AchievementFilter, Record<string, string>> = {
  all: { 'zh-CN': '全部', en: 'All' },
  permanent: { 'zh-CN': '永久', en: 'Permanent' },
  season: { 'zh-CN': '赛季', en: 'Season' },
  limited: { 'zh-CN': '限时', en: 'Limited' },
};

export function useAchievement() {
  const navigation = useNavigation<any>();
  const { t, effectiveLanguage: locale } = useI18n();
  const lang = locale === 'zh-CN' ? 'zh-CN' : 'en';
  const [filter, setFilter] = useState<AchievementFilter>('all');

  const { data, isLoading, error, reload } = useFocusLoader<AchievementData>(async () => {
    const [levelRes, achievementsRes] = await Promise.all([
      apiClient.getUserLevel(),
      apiClient.getAchievements(),
    ]);
    return {
      level: levelRes.success ? levelRes.data : null,
      achievements: achievementsRes.success ? achievementsRes.data : [],
    };
  });

  const level = data?.level ?? null;
  const allAchievements = data?.achievements ?? [];

  // 计算可用的 Tab（只有存在对应数据才显示）
  const hasSeason = allAchievements.some(a => !!a.seasonCode);
  const hasLimited = allAchievements.some(a => a.isLimited && !a.seasonCode);
  const availableFilters: AchievementFilter[] = useMemo(() => {
    const filters: AchievementFilter[] = ['all'];
    if (hasSeason || hasLimited) filters.push('permanent');
    if (hasSeason) filters.push('season');
    if (hasLimited) filters.push('limited');
    return filters;
  }, [hasSeason, hasLimited]);

  // 过滤成就列表
  const achievements = useMemo(() => {
    switch (filter) {
      case 'permanent':
        return allAchievements.filter(a => !a.isLimited && !a.seasonCode);
      case 'season':
        return allAchievements.filter(a => !!a.seasonCode);
      case 'limited':
        return allAchievements.filter(a => a.isLimited && !a.seasonCode);
      default:
        return allAchievements;
    }
  }, [allAchievements, filter]);

  const unlockedCount = allAchievements.filter(a => a.unlocked).length;
  const totalCount = allAchievements.length;

  const goBack = () => navigation.goBack();

  return {
    t,
    lang,
    level,
    achievements,
    unlockedCount,
    totalCount,
    isLoading,
    error,
    reload,
    goBack,
    filter,
    setFilter,
    availableFilters,
  };
}
