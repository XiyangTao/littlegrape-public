import { useState, useCallback } from 'react';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import { useAuth } from '@/stores/AuthStore';
import { apiClient } from '@/api';
import type { LeaderboardEntry } from '@/api/modules/leaderboard';

export type TabType = 'learned' | 'mastered' | 'streak' | 'xp';
export type PeriodType = 'week' | 'month' | 'all';

export const TAB_CONFIG: { key: TabType; icon: string; labelKey: string }[] = [
  { key: 'learned', icon: 'school', labelKey: 'leaderboard.learned' },
  { key: 'mastered', icon: 'verified', labelKey: 'leaderboard.mastered' },
  { key: 'streak', icon: 'local-fire-department', labelKey: 'leaderboard.streak' },
  { key: 'xp', icon: 'diamond', labelKey: 'leaderboard.xp' },
];

export const PERIOD_CONFIG: { key: PeriodType; labelKey: string }[] = [
  { key: 'week', labelKey: 'leaderboard.week' },
  { key: 'month', labelKey: 'leaderboard.month' },
  { key: 'all', labelKey: 'leaderboard.allTime' },
];

export function useLeaderboard() {
  // 三件套
  const { theme } = useTheme();
  const { t } = useI18n();
  const navigation = useNavigation<any>();

  const { user } = useAuth();

  // 筛选状态
  const [activeTab, setActiveTab] = useState<TabType>('learned');
  const [period, setPeriod] = useState<PeriodType>('week');
  const [scope, setScope] = useState<'all' | 'following'>('all');

  // 数据状态
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [activeTab, period, scope])
  );

  const loadData = async () => {
    try {
      setIsLoading(true);
      const scopeParam = scope === 'following' ? 'following' : undefined;
      const [leaderboardRes, rankRes] = await Promise.all([
        apiClient.getLeaderboard(activeTab, period, scopeParam),
        apiClient.getMyRank(activeTab, period),
      ]);
      if (leaderboardRes.success) setEntries(leaderboardRes.data);
      if (rankRes.success) setMyRank(rankRes.data.rank);
    } catch (error) {
      console.error('加载排行榜失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getValueLabel = (type: TabType): string => {
    switch (type) {
      case 'learned': return t('leaderboard.words');
      case 'mastered': return t('leaderboard.words');
      case 'streak': return t('leaderboard.days');
      case 'xp': return 'XP';
    }
  };

  const goBack = () => {
    navigation.goBack();
  };

  const navigateToUserProfile = (userId: string) => {
    navigation.navigate('UserProfile', { userId });
  };

  return {
    // 三件套
    theme,
    t,

    // 用户
    user,

    // 筛选状态
    activeTab,
    setActiveTab,
    period,
    setPeriod,
    scope,
    setScope,

    // 数据状态
    entries,
    myRank,
    isLoading,

    // 操作方法
    getValueLabel,
    goBack,
    navigateToUserProfile,
  };
}
