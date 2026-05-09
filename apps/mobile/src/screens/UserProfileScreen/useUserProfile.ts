import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { apiClient } from '@/api';
import { useAuth } from '@/stores/AuthStore';
import type { UserProfileData, FollowStatus } from '@/types/follow';

export function useUserProfile(userId: string) {
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);

  const isOwnProfile = currentUser?.id === userId;

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.getUserPublicProfile(userId);
      if (res.success) {
        setProfile(res.data);
      }
    } catch (err) {
      console.error('[UserProfile] 加载失败:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  // 关注/取关
  const toggleFollow = useCallback(async () => {
    if (!profile || isOwnProfile || followLoading) return;

    const isFollowing = profile.social.isFollowing;
    setFollowLoading(true);

    try {
      if (isFollowing) {
        await apiClient.unfollowUser(userId);
      } else {
        await apiClient.followUser(userId);
      }
      // 刷新数据
      await loadProfile();
    } catch (err) {
      console.error('[UserProfile] 关注操作失败:', err);
    } finally {
      setFollowLoading(false);
    }
  }, [profile, isOwnProfile, followLoading, userId, loadProfile]);

  // 关注按钮文案和状态
  const followStatus: FollowStatus = profile?.social
    ? (profile.social.isMutual ? 'mutual'
      : profile.social.isFollowing ? 'following'
        : profile.social.isFollowedBy ? 'followed_by'
          : 'none')
    : 'none';

  return {
    profile,
    loading,
    isOwnProfile,
    followStatus,
    followLoading,
    toggleFollow,
    refresh: loadProfile,
  };
}
