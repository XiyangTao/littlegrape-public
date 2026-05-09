/**
 * 关卡地图逻辑 Hook
 * 加载关卡列表、用户进度、当前关卡
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useAuth } from '@/stores/AuthStore';
import {
  generateLevelsForTag,
  getLevelsForTag,
  getUserLevelProgressForTag,
  getCurrentLevelIndex,
  getTotalStarsForTag,
  type WordLevel,
  type UserLevelProgress,
} from '@/db/word/LevelDB';
import { getLibraryColor } from '@/constants/libraryConfig';

// ==================== 类型定义 ====================

type LevelMapRouteParams = {
  LevelMap: {
    tag: string;
  };
};

export interface LevelNode {
  level: WordLevel;
  progress: UserLevelProgress | null;
  status: 'completed' | 'current' | 'locked';
}

// ==================== Hook ====================

export function useLevelMap() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<LevelMapRouteParams, 'LevelMap'>>();

  const { tag } = route.params;

  const [isLoading, setIsLoading] = useState(true);
  const [levels, setLevels] = useState<WordLevel[]>([]);
  const [progressMap, setProgressMap] = useState<Map<number, UserLevelProgress>>(new Map());
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [totalStars, setTotalStars] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);

  const libraryColor = getLibraryColor(tag);

  // ==================== 加载数据 ====================

  const loadData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);

      // 确保关卡已生成
      await generateLevelsForTag(tag);

      // 并行加载
      const [levelsData, progressData, currentIdx, stars] = await Promise.all([
        getLevelsForTag(tag),
        getUserLevelProgressForTag(user.id, tag),
        getCurrentLevelIndex(user.id, tag),
        getTotalStarsForTag(user.id, tag),
      ]);

      setLevels(levelsData);

      // 构建进度 Map
      const pMap = new Map<number, UserLevelProgress>();
      let completed = 0;
      for (const p of progressData) {
        pMap.set(p.levelIndex, p);
        if (p.stars >= 1) completed++;
      }
      setProgressMap(pMap);
      setCompletedCount(completed);
      setCurrentLevelIndex(currentIdx);
      setTotalStars(stars);
    } catch (error) {
      console.error('[LevelMap] 加载数据失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, tag]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 页面获取焦点时刷新
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation, loadData]);

  // ==================== 构建节点列表 ====================

  const levelNodes: LevelNode[] = levels.map((level) => {
    const progress = progressMap.get(level.levelIndex) || null;
    let status: 'completed' | 'current' | 'locked';

    if (progress && progress.stars >= 1) {
      status = 'completed';
    } else if (level.levelIndex === currentLevelIndex) {
      status = 'current';
    } else if (level.levelIndex < currentLevelIndex) {
      // 之前的关卡即使没通过也可以点
      status = 'current';
    } else {
      status = 'locked';
    }

    // Boss 关额外检查：如果前一关是 Boss 且不到 2 星，本关锁定
    if (status !== 'locked' && level.levelIndex > 0) {
      const prevLevelIndex = level.levelIndex - 1;
      const prevLevel = levels.find(l => l.levelIndex === prevLevelIndex);
      if (prevLevel && prevLevel.isBoss) {
        const prevProgress = progressMap.get(prevLevelIndex);
        if (!prevProgress || prevProgress.stars < 2) {
          status = 'locked';
        }
      }
    }

    return { level, progress, status };
  });

  // 按章节分组（每 10 关一章）
  const chapters: { chapterIndex: number; nodes: LevelNode[] }[] = [];
  for (const node of levelNodes) {
    const cIdx = node.level.chapterIndex;
    let chapter = chapters.find(c => c.chapterIndex === cIdx);
    if (!chapter) {
      chapter = { chapterIndex: cIdx, nodes: [] };
      chapters.push(chapter);
    }
    chapter.nodes.push(node);
  }

  // ==================== 操作 ====================

  const handleLevelPress = useCallback((node: LevelNode) => {
    if (node.status === 'locked') return;
    navigation.navigate('LevelLearn', { tag, levelIndex: node.level.levelIndex });
  }, [navigation, tag]);

  const handleContinue = useCallback(() => {
    navigation.navigate('LevelLearn', { tag, levelIndex: currentLevelIndex });
  }, [navigation, tag, currentLevelIndex]);

  return {
    // 状态
    isLoading,
    tag,
    levels,
    levelNodes,
    chapters,
    currentLevelIndex,
    totalStars,
    completedCount,
    libraryColor,

    // 操作
    handleLevelPress,
    handleContinue,

    // 导航
    navigation,
  };
}
