import { useState, useCallback } from 'react';
import { apiClient } from '@/api';
import { useAuth } from '@/stores/AuthStore';
import type { FollowUser } from '@/types/follow';

export type TabType = 'following' | 'followers' | 'mutual';

export function useFollowList(userId?: string, initialTab: TabType = 'following') {
  const { user: currentUser } = useAuth();
  const targetUserId = userId || currentUser?.id || '';
  const isOwnList = !userId || userId === currentUser?.id;

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [items, setItems] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [followLoadingId, setFollowLoadingId] = useState<string | null>(null);

  const loadData = useCallback(async (pageNum: number = 1, isRefresh: boolean = false) => {
    if (!targetUserId) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      let res;
      switch (activeTab) {
        case 'following':
          res = await apiClient.getFollowingList(pageNum, targetUserId);
          break;
        case 'followers':
          res = await apiClient.getFollowerList(pageNum, targetUserId);
          break;
        case 'mutual':
          res = await apiClient.getMutualList(pageNum);
          break;
      }

      if (res.success) {
        if (pageNum === 1) {
          setItems(res.data.items);
        } else {
          setItems(prev => [...prev, ...res.data.items]);
        }
        setHasMore(res.data.hasMore);
        setPage(pageNum);
      }
    } catch (err) {
      console.error('[FollowList] 加载失败:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, targetUserId]);

  const onRefresh = useCallback(() => {
    loadData(1, true);
  }, [loadData]);

  const onLoadMore = useCallback(() => {
    if (!hasMore || loading) return;
    loadData(page + 1);
  }, [hasMore, loading, page, loadData]);

  const switchTab = useCallback((tab: TabType) => {
    setActiveTab(tab);
    setItems([]);
    setPage(1);
    setHasMore(true);
  }, []);

  // 关注/取关操作
  const toggleFollow = useCallback(async (targetId: string, currentStatus: string) => {
    if (followLoadingId) return;
    setFollowLoadingId(targetId);

    try {
      const isFollowing = currentStatus === 'following' || currentStatus === 'mutual';
      if (isFollowing) {
        await apiClient.unfollowUser(targetId);
      } else {
        await apiClient.followUser(targetId);
      }
      // 刷新当前列表
      await loadData(1);
    } catch (err) {
      console.error('[FollowList] 关注操作失败:', err);
    } finally {
      setFollowLoadingId(null);
    }
  }, [followLoadingId, loadData]);

  return {
    activeTab,
    items,
    loading,
    refreshing,
    hasMore,
    isOwnList,
    followLoadingId,
    switchTab,
    onRefresh,
    onLoadMore,
    loadData,
    toggleFollow,
  };
}
