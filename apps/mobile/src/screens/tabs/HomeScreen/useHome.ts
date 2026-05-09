import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/stores/AuthStore';
import { useI18n } from '@/context/I18nProvider';
import { useUserStore, useCharacters } from '@/stores';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import { useDailyGreeting } from '@/hooks/useServerData';
import { useDailyTasks, useClaimTask, useClaimDailyBonus, useDailyReading } from '@/hooks/queries';
import { apiClient } from '@/api';
import type { StoryLineSummary, StoryProgressMap } from '@/api/modules/story';

import type { DailyTask } from '@/api/modules/dailyTask';

// ==================== 导航映射 ====================

const TASK_ROUTE_MAP: Record<string, string> = {
  complete_conversation: 'ConversationList',
  complete_listening: 'ListeningList',
  complete_diary: 'SpeakingDiary',
  complete_reading: 'IntensiveReading',
  complete_sentence: 'SentenceChallenge',
  complete_daily_challenge: 'DailyChallenge',
};

const TASK_PREFIX_ROUTE_MAP: Record<string, string> = {
  learn_: 'Learn',
  review_: 'Practice',
  master_: 'Learn',
};

function getTaskRoute(templateCode: string): string {
  if (TASK_ROUTE_MAP[templateCode]) return TASK_ROUTE_MAP[templateCode];
  for (const [prefix, route] of Object.entries(TASK_PREFIX_ROUTE_MAP)) {
    if (templateCode.startsWith(prefix)) return route;
  }
  return 'DailyTask';
}

// ==================== Hook ====================

export function useHome() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { t, effectiveLanguage } = useI18n();
  const { greetings, loading: greetingLoading } = useDailyGreeting();

  // 中英文交替显示
  const [showChinese, setShowChinese] = useState(effectiveLanguage === 'zh-CN');
  const greetingOpacity = useRef(new Animated.Value(1)).current;

  const greetingText = greetings
    ? (showChinese ? greetings.zhCN : greetings.enUS)
    : null;

  useEffect(() => {
    if (!greetings) return;
    const interval = setInterval(() => {
      Animated.timing(greetingOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        setShowChinese(prev => !prev);
        Animated.timing(greetingOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
      });
    }, 8000);
    return () => {
      clearInterval(interval);
      greetingOpacity.stopAnimation();
    };
  }, [greetings, greetingOpacity]);

  const overviewStats = useUserStore((s) => s.overviewStats);
  const refresh = useUserStore((s) => s.refresh);

  useFocusEffect(
    useCallback(() => { refresh(); }, [refresh])
  );

  // ==================== 每日任务（React Query） ====================

  const { data: taskData } = useDailyTasks();
  const claimTask = useClaimTask();
  const claimBonus = useClaimDailyBonus();

  const dailyTasks = taskData?.daily ?? [];
  const dailyBonus = taskData?.dailyBonus ?? null;

  // 任务完成计数
  const completedCount = dailyTasks.filter(t => t.isCompleted).length;
  const totalCount = dailyTasks.length;

  // 从 mutation 状态派生，兼容现有 UI
  const claimingId = claimTask.isPending ? (claimTask.variables as string) : null;
  const claimingBonus = claimBonus.isPending;

  const handleClaimTask = useCallback(async (taskId: string) => {
    if (claimTask.isPending) return;
    try {
      const result = await claimTask.mutateAsync(taskId);
      if (result.success && result.levelUp) {
        Alert.alert('', t('dailyTask.levelUp', { level: result.newLevel }));
      }
    } catch {
      // mutation 内部已处理错误
    }
  }, [claimTask.mutateAsync, claimTask.isPending, t]);

  const handleClaimBonus = useCallback(async () => {
    if (claimBonus.isPending || !dailyBonus?.allCompleted || dailyBonus?.isClaimed) return;
    try {
      const result = await claimBonus.mutateAsync();
      if (result.success && result.levelUp) {
        Alert.alert('', t('dailyTask.levelUp', { level: result.newLevel }));
      }
    } catch {
      // mutation 内部已处理错误
    }
  }, [claimBonus.mutateAsync, claimBonus.isPending, dailyBonus, t]);

  // 任务导航
  const navigateToTask = useCallback((task: DailyTask) => {
    const route = getTaskRoute(task.templateCode);
    navigation.navigate(route);
  }, [navigation]);

  // 获取任务显示名称
  const getTaskName = useCallback((task: DailyTask) => {
    return effectiveLanguage === 'zh-CN' ? task.nameZh : task.nameEn;
  }, [effectiveLanguage]);

  // ==================== 今日精读 ====================
  const { data: dailyReading } = useDailyReading();

  // ==================== 互动故事 ====================
  const { getCharacterById } = useCharacters();
  const [storyLines, setStoryLines] = useState<StoryLineSummary[]>([]);
  const [storyProgress, setStoryProgress] = useState<StoryProgressMap>({});

  const loadStoryData = useCallback(async () => {
    try {
      const [lines, progress] = await Promise.all([
        apiClient.getStoryList(),
        apiClient.getStoryProgress().catch(() => ({} as StoryProgressMap)),
      ]);
      setStoryLines(lines);
      setStoryProgress(progress);
    } catch {
      // 静默降级
    }
  }, []);

  useFocusEffect(useCallback(() => { loadStoryData(); }, [loadStoryData]));

  // 为每条故事线计算进度摘要（含当前章节信息）
  const storyLinesWithProgress = storyLines.map(line => {
    const progressList = storyProgress[line.id] || [];
    const completedCount = progressList.filter(p => p.status === 'completed').length;
    const publishedCount = line.episodes.filter(e => e.isPublished).length;

    // 找到当前进行到的章节
    let currentChapterTitle = '';
    let currentChapterTitleZh = '';
    if (line.chapters?.length) {
      const inProgressOrCompleted = progressList
        .filter(p => p.status === 'in_progress' || p.status === 'completed')
        .map(p => {
          const ep = line.episodes.find(e => e.episodeId === p.episodeId);
          return ep ? ep.episodeNumber : 0;
        })
        .filter(n => n > 0);
      const maxEpNum = inProgressOrCompleted.length > 0 ? Math.max(...inProgressOrCompleted) : 1;
      const currentChapter = line.chapters.find(
        c => maxEpNum >= c.episodeFrom && maxEpNum <= c.episodeTo,
      ) || line.chapters[0];
      if (currentChapter) {
        currentChapterTitle = currentChapter.title;
        currentChapterTitleZh = currentChapter.titleZh;
      }
    }

    const character = getCharacterById(line.characterId);
    return { ...line, completedCount, publishedCount, currentChapterTitle, currentChapterTitleZh, characterAvatar: character?.avatar || null, characterName: character?.name || '' };
  });

  const storyGate = useFeatureGate('story');

  const handleStoryLinePress = useCallback((line: StoryLineSummary) => {
    if (!storyGate.guard()) return;
    navigation.navigate('StoryChapter', { characterId: line.characterId });
  }, [navigation, storyGate]);

  return {
    navigation,
    user,
    t,
    greetingText,
    greetingLoading,
    greetingOpacity,
    overviewStats,
    // 任务系统
    dailyTasks,
    dailyBonus,
    completedCount,
    totalCount,
    claimingId,
    claimingBonus,
    handleClaimTask,
    handleClaimBonus,
    navigateToTask,
    getTaskName,
    // 今日精读
    dailyReading,
    effectiveLanguage,
    // 互动故事
    storyLinesWithProgress,
    handleStoryLinePress,
    storyLocked: storyGate.locked,
  };
}
