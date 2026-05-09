/**
 * 每日任务逻辑 Hook
 */
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Alert } from 'react-native';
import { apiClient } from '@/api';
import { useI18n } from '@/context/I18nProvider';
import type { DailyTask, DailyBonus } from '@/api/modules/dailyTask';

export function useDailyTask() {
  const { t } = useI18n();
  const [isLoading, setIsLoading] = useState(true);
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([]);
  const [weeklyTasks, setWeeklyTasks] = useState<DailyTask[]>([]);
  const [dailyBonus, setDailyBonus] = useState<DailyBonus | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimingBonus, setClaimingBonus] = useState(false);

  const loadTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.getDailyTasks();
      if (res.success && res.data) {
        setDailyTasks(res.data.daily);
        setWeeklyTasks(res.data.weekly);
        setDailyBonus(res.data.dailyBonus);
      }
    } catch (error) {
      console.warn('[DailyTask] Failed to load tasks:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTasks();
    }, [loadTasks])
  );

  const handleClaimTask = useCallback(async (taskId: string) => {
    if (claimingId) return;
    setClaimingId(taskId);
    try {
      const res = await apiClient.claimTaskReward(taskId);
      if (res.success && res.data?.success) {
        // 更新本地状态
        const updateFn = (tasks: DailyTask[]) =>
          tasks.map(task =>
            task.id === taskId ? { ...task, isClaimed: true } : task
          );
        setDailyTasks(updateFn);
        setWeeklyTasks(updateFn);

        const msg = t('dailyTask.claimSuccess', { xp: res.data.xpGained });
        if (res.data.levelUp) {
          Alert.alert('', `${msg}\n${t('dailyTask.levelUp', { level: res.data.newLevel })}`);
        }
      }
    } catch (error) {
      console.warn('[DailyTask] Failed to claim task:', error);
    } finally {
      setClaimingId(null);
    }
  }, [claimingId, t]);

  const handleClaimBonus = useCallback(async () => {
    if (claimingBonus || !dailyBonus?.allCompleted || dailyBonus?.isClaimed) return;
    setClaimingBonus(true);
    try {
      const res = await apiClient.claimDailyBonus();
      if (res.success && res.data?.success) {
        setDailyBonus(prev => prev ? { ...prev, isClaimed: true } : prev);

        const msg = t('dailyTask.claimSuccess', { xp: res.data.xpGained });
        if (res.data.levelUp) {
          Alert.alert('', `${msg}\n${t('dailyTask.levelUp', { level: res.data.newLevel })}`);
        }
      }
    } catch (error) {
      console.warn('[DailyTask] Failed to claim bonus:', error);
    } finally {
      setClaimingBonus(false);
    }
  }, [claimingBonus, dailyBonus, t]);

  return {
    isLoading,
    dailyTasks,
    weeklyTasks,
    dailyBonus,
    claimingId,
    claimingBonus,
    handleClaimTask,
    handleClaimBonus,
    refresh: loadTasks,
  };
}
