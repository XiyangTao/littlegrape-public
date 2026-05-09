/**
 * 词根图鉴逻辑 Hook
 */
import { useState, useCallback, useEffect } from 'react';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useAuth } from '@/stores/AuthStore';
import {
  buildRootIndex,
  getAllRoots,
  searchRoots,
  getUserRootProgressList,
} from '@/db/word';
import type { RootEntry, UserRootProgress } from '@/db/word';

type FilterMode = 'all' | 'lit' | 'unlit';
type RootMapRouteParams = { RootMap: { tag?: string } };

export function useRootMap() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootMapRouteParams, 'RootMap'>>();
  const tag = route.params?.tag;
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [roots, setRoots] = useState<RootEntry[]>([]);
  const [progressMap, setProgressMap] = useState<Map<string, UserRootProgress>>(new Map());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [totalRoots, setTotalRoots] = useState(0);
  const [litCount, setLitCount] = useState(0);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setIsLoading(true);
      // Build index if not exists（APP 启动时已后台构建，这里确保兜底）
      await buildRootIndex(tag);

      // Load all roots
      const allRoots = searchQuery
        ? await searchRoots(searchQuery, tag)
        : await getAllRoots(tag);

      // Load user progress
      const progressList = await getUserRootProgressList(user.id);
      const pMap = new Map<string, UserRootProgress>();
      let lit = 0;
      for (const p of progressList) {
        pMap.set(p.rootId, p);
        if (p.isLit) lit++;
      }

      setRoots(allRoots);
      setProgressMap(pMap);
      setTotalRoots(allRoots.length);
      setLitCount(lit);
    } catch (error) {
      console.error('[RootMap] 加载失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, searchQuery, tag]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter roots
  const filteredRoots = roots.filter(root => {
    if (filterMode === 'all') return true;
    const progress = progressMap.get(root.id);
    if (filterMode === 'lit') return progress?.isLit === true;
    return !progress?.isLit;
  });

  const handleRootPress = useCallback((root: RootEntry) => {
    navigation.navigate('RootDetail', { rootId: root.id });
  }, [navigation]);

  return {
    isLoading,
    roots: filteredRoots,
    progressMap,
    searchQuery,
    setSearchQuery,
    filterMode,
    setFilterMode,
    totalRoots,
    litCount,
    handleRootPress,
    navigation,
  };
}
