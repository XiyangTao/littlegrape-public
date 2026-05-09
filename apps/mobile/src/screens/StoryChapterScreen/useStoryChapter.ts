import { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { Animated } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useI18n } from '@/context/I18nProvider';
import { useCharacters } from '@/stores/AppStore';
import { apiClient } from '@/api';
import { useRefreshOnFocus } from '@/hooks/queries/useRefreshOnFocus';
import { mapServerStatusToUI } from '@/types/storyMode';
import type { EpisodeStatus } from '@/types/storyMode';
import type { StoryLineSummary, StoryEpisodeSummary, StoryChapterSummary, EpisodeProgress } from '@/api/modules/story';

type StoryChapterRoute = RouteProp<{ StoryChapter: { characterId: string } }, 'StoryChapter'>;

export interface ChapterNode {
  episodeId: string;
  episodeNumber: number;
  title: string;
  titleZh: string;
  imageUrl: string | null;
  difficulty: number;
  status: EpisodeStatus;
  stars: number;
  grade?: string;
  isPublished: boolean;
}

export interface ChapterMeta {
  id: string;
  chapterNumber: number;
  title: string;
  titleZh: string;
  description: string;
  imageUrl: string;
  episodeFrom: number;
  episodeTo: number;
  completedCount: number;
  totalCount: number;
}

export function useStoryChapter() {
  const navigation = useNavigation<any>();
  const route = useRoute<StoryChapterRoute>();
  const { t, effectiveLanguage } = useI18n();
  const { getCharacterById } = useCharacters();

  const { characterId } = route.params;

  // 数据状态
  const [storyLine, setStoryLine] = useState<StoryLineSummary | null>(null);
  const [progressMap, setProgressMap] = useState<Record<string, EpisodeProgress> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeChapterNumber, setActiveChapterNumber] = useState(1);

  // 加载数据
  const loadData = useCallback(async () => {
    try {
      const [storiesRes, progressRes] = await Promise.all([
        apiClient.getStoryList(),
        apiClient.getStoryProgress(),
      ]);

      const line = storiesRes.find((s: StoryLineSummary) => s.characterId === characterId);
      setStoryLine(line || null);

      if (line && progressRes[line.id]) {
        const map: Record<string, EpisodeProgress> = {};
        for (const ep of progressRes[line.id]) {
          map[ep.episodeId] = ep;
        }
        setProgressMap(map);

        // 默认显示第一章
      } else {
        setProgressMap({});
      }
    } catch (e) {
      console.error('加载故事线数据失败:', e);
    } finally {
      setIsLoading(false);
    }
  }, [characterId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useRefreshOnFocus(loadData);

  const character = useMemo(
    () => getCharacterById(characterId),
    [characterId, getCharacterById],
  );

  // 构建所有剧集节点（含 stars）
  const allEpisodes: ChapterNode[] = useMemo(() => {
    if (!storyLine) return [];
    return storyLine.episodes.map((ep: StoryEpisodeSummary, index: number) => {
      const epProgress = progressMap?.[ep.episodeId];

      let status: EpisodeStatus = 'locked';
      if (epProgress) {
        status = mapServerStatusToUI(epProgress.status);
      } else if (index === 0) {
        status = 'current';
      }

      return {
        episodeId: ep.episodeId,
        episodeNumber: ep.episodeNumber,
        title: ep.title,
        titleZh: ep.titleZh,
        imageUrl: ep.imageUrl,
        isPublished: ep.isPublished,
        difficulty: Math.min(5, Math.ceil(ep.episodeNumber / 12)),
        status,
        stars: epProgress?.stars || 0,
        grade: epProgress?.grade || undefined,
      };
    });
  }, [storyLine, progressMap]);

  // 章节元数据（含完成统计）
  const chapterMetas: ChapterMeta[] = useMemo(() => {
    if (!storyLine?.chapters?.length) return [];
    return storyLine.chapters.map((ch: StoryChapterSummary) => {
      const chapterEpisodes = allEpisodes.filter(
        ep => ep.episodeNumber >= ch.episodeFrom && ep.episodeNumber <= ch.episodeTo,
      );
      return {
        ...ch,
        completedCount: chapterEpisodes.filter(ep => ep.status === 'completed').length,
        totalCount: chapterEpisodes.length,
      };
    });
  }, [storyLine, allEpisodes]);

  // 当前章节的剧集
  const chapters: ChapterNode[] = useMemo(() => {
    if (!chapterMetas.length) return allEpisodes;
    const activeMeta = chapterMetas.find(c => c.chapterNumber === activeChapterNumber);
    if (!activeMeta) return allEpisodes;
    return allEpisodes.filter(
      ep => ep.episodeNumber >= activeMeta.episodeFrom && ep.episodeNumber <= activeMeta.episodeTo,
    );
  }, [allEpisodes, chapterMetas, activeChapterNumber]);

  const completedCount = useMemo(
    () => allEpisodes.filter(c => c.status === 'completed').length,
    [allEpisodes],
  );

  // 获取章节封面（优先用章节自己的封面，没有则用该章第一集的封面图）
  const getChapterCover = useCallback((ch: ChapterMeta): string | null => {
    if (ch.imageUrl) return ch.imageUrl;
    const firstEp = allEpisodes.find(
      ep => ep.episodeNumber >= ch.episodeFrom && ep.episodeNumber <= ch.episodeTo,
    );
    return firstEp?.imageUrl || null;
  }, [allEpisodes]);

  // 脉冲动画
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  // 处理函数
  const handleBack = () => navigation.goBack();

  const handleEpisodePress = (chapter: ChapterNode) => {
    if (!chapter.isPublished) return;
    navigation.navigate('StoryDetail', {
      characterId,
      episodeId: chapter.episodeId,
      title: chapter.title,
      titleZh: chapter.titleZh,
      episodeNumber: chapter.episodeNumber,
      imageUrl: chapter.imageUrl,
    });
  };

  const handleChapterChange = (chapterNumber: number) => {
    setActiveChapterNumber(chapterNumber);
  };

  return {
    t,
    effectiveLanguage,
    characterId,
    storyLine,
    character,
    chapters,
    chapterMetas,
    activeChapterNumber,
    completedCount,
    isLoading,
    pulseAnim,
    handleBack,
    handleEpisodePress,
    handleChapterChange,
    getChapterCover,
  };
}
