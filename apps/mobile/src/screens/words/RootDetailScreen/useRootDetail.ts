/**
 * 词根详情逻辑 Hook
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useAuth } from '@/stores/AuthStore';
import { getRootById, getRootWords, updateUserRootProgress } from '@/db/word';
import type { RootEntry, RootWordItem } from '@/db/word';
import { apiClient } from '@/api';

type RootDetailRouteParams = {
  RootDetail: { rootId: string };
};

export function useRootDetail() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootDetailRouteParams, 'RootDetail'>>();
  const { user } = useAuth();
  const { rootId } = route.params;

  const [isLoading, setIsLoading] = useState(true);
  const [root, setRoot] = useState<RootEntry | null>(null);
  const [words, setWords] = useState<RootWordItem[]>([]);
  const [learnedCount, setLearnedCount] = useState(0);
  const [justLit, setJustLit] = useState(false);
  const prevIsLitRef = useRef<boolean | null>(null);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setIsLoading(true);
      const rootData = await getRootById(rootId);
      setRoot(rootData);

      if (rootData) {
        const wordList = await getRootWords(rootId, user.id);
        setWords(wordList);
        setLearnedCount(wordList.filter(w => w.status === 'learned' || w.status === 'mastered').length);

        // Update progress
        const progress = await updateUserRootProgress(user.id, rootId);
        // 检测是否"刚刚点亮"：之前未点亮，现在点亮了
        if (progress?.isLit && prevIsLitRef.current === false) {
          setJustLit(true);
        }
        prevIsLitRef.current = progress?.isLit ?? false;
        // 词根点亮时上报 XP
        if (progress?.isLit) {
          try { apiClient.addXP('root_lit'); } catch {}
        }
      }
    } catch (error) {
      console.error('[RootDetail] 加载失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, rootId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const unlearnedWordIds = words.filter(w => w.status === 'new').map(w => w.id);

  const handleLearnUnlearned = useCallback(() => {
    if (unlearnedWordIds.length === 0) return;
    // Navigate to LevelLearn with custom word IDs
    navigation.navigate('LevelLearn', {
      tag: `root:${root?.root}`,
      levelIndex: 0,
      wordIds: unlearnedWordIds.slice(0, 10),
    });
  }, [navigation, unlearnedWordIds, root]);

  return {
    isLoading,
    root,
    words,
    learnedCount,
    unlearnedCount: unlearnedWordIds.length,
    justLit,
    setJustLit,
    handleLearnUnlearned,
    navigation,
  };
}
