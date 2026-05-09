import { useState, useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  GRAMMAR_CATEGORIES,
  GRAMMAR_LEVELS,
  totalGrammarPoints,
  grammarPointsByDifficulty,
  DIFFICULTY_LABELS,
  DIFFICULTY_COLORS,
  type GrammarCategory,
  type GrammarPoint,
  type GrammarLevel,
} from '@/data/grammarPoints';
import { useGrammarCategories, useGrammarCategoryPoints } from '@/hooks/queries';
import type { GrammarPointStatus } from '@/api/modules/grammar';

export function useGrammarHome() {
  const navigation = useNavigation<any>();
  const [expandedUnit, setExpandedUnit] = useState<string | null>(null);

  // React Query：单元列表（含掌握数），页面聚焦时后台静默刷新
  const { data: apiCategories } = useGrammarCategories();

  // React Query：展开单元时自动请求该单元下的语法点状态
  const { data: unitPoints } = useGrammarCategoryPoints(expandedUnit);

  // 构建进度映射：unitCode → learnedCount
  const progressMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (apiCategories) {
      for (const cat of apiCategories) {
        map[cat.code] = cat.learnedCount;
      }
    }
    return map;
  }, [apiCategories]);

  // 总已掌握数
  const learnedCount = useMemo(() => {
    if (!apiCategories) return 0;
    return apiCategories.reduce((sum, cat) => sum + cat.learnedCount, 0);
  }, [apiCategories]);

  // 按等级汇总进度
  const levelProgress = useMemo(() => {
    const map: Record<number, { learned: number; total: number }> = {};
    for (const level of GRAMMAR_LEVELS) {
      const total = level.units.reduce((sum, u) => sum + u.points.length, 0);
      const learned = level.units.reduce((sum, u) => sum + (progressMap[u.code] || 0), 0);
      map[level.level] = { learned, total };
    }
    return map;
  }, [progressMap]);

  // 推荐当前应学的单元（第一个未完成的单元）
  const currentUnitCode = useMemo(() => {
    for (const unit of GRAMMAR_CATEGORIES) {
      const learned = progressMap[unit.code] || 0;
      if (learned < unit.points.length) return unit.code;
    }
    return null;
  }, [progressMap]);

  // 构建 pointStatusMap
  const pointStatusMap = useMemo(() => {
    const map: Record<string, { status: GrammarPointStatus; practiceScore: number | null; starRating: number | null }> = {};
    if (unitPoints) {
      for (const p of unitPoints) {
        map[p.code] = { status: p.status, practiceScore: p.practiceScore, starRating: p.starRating ?? null };
      }
    }
    return map;
  }, [unitPoints]);

  const toggleUnit = useCallback((code: string) => {
    setExpandedUnit(prev => prev === code ? null : code);
  }, []);

  const handlePointPress = useCallback((point: GrammarPoint, category: GrammarCategory) => {
    const status = pointStatusMap[point.code]?.status;
    const isFirstTime = !status || status === 'not_started' || status === 'learning';
    navigation.navigate('GrammarLesson', {
      pointCode: point.code,
      categoryCode: category.code,
      isFirstTime,
    });
  }, [navigation, pointStatusMap]);

  return {
    // 数据
    levels: GRAMMAR_LEVELS,
    categories: GRAMMAR_CATEGORIES,
    totalPoints: totalGrammarPoints,
    learnedCount,
    progressMap,
    levelProgress,
    currentUnitCode,
    pointStatusMap,
    pointsByDifficulty: grammarPointsByDifficulty,

    // 交互
    expandedUnit,
    toggleUnit,
    handlePointPress,
  };
}
