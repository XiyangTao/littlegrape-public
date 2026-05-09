import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api';
import { useRefreshOnFocus } from './useRefreshOnFocus';
import { dailyTaskKeys } from './queryKeys';
import { apiQuery } from './queryUtils';
import type { DailyTasksResponse } from '@/api/modules/dailyTask';

/**
 * 每日任务列表（daily + weekly + dailyBonus）
 * 页面聚焦时后台静默刷新
 */
export function useDailyTasks() {
  const query = useQuery({
    queryKey: dailyTaskKeys.tasks(),
    queryFn: (): Promise<DailyTasksResponse> =>
      apiQuery(() => apiClient.getDailyTasks()),
    staleTime: 60_000, // 1 分钟
  });
  useRefreshOnFocus(query.refetch);
  return query;
}

/**
 * 领取单个任务奖励
 * isPending + variables 替代手动 claimingId state
 */
export function useClaimTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) =>
      apiQuery(() => apiClient.claimTaskReward(taskId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dailyTaskKeys.tasks() });
    },
  });
}

/**
 * 领取每日全勤奖励
 * isPending 替代手动 claimingBonus state
 */
export function useClaimDailyBonus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiQuery(() => apiClient.claimDailyBonus()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dailyTaskKeys.tasks() });
    },
  });
}
