import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import { useAuth } from '@/stores/AuthStore';
import { apiClient } from '@/api';
import type { CommunityPost } from '@/api/modules/community';

export type TabType = 'all' | 'share' | 'question' | 'note';
export const TAB_KEYS: TabType[] = ['all', 'share', 'question', 'note'];

export function useCommunity() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [composeText, setComposeText] = useState('');
  const [composeType, setComposeType] = useState<string>('share');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadPosts = async (pageNum: number = 1, refresh: boolean = false) => {
    try {
      if (refresh) setIsRefreshing(true); else setIsLoading(true);
      const type = activeTab === 'all' ? undefined : activeTab;
      const res = await apiClient.getCommunityPosts(pageNum, type);
      if (res.success) {
        if (refresh || pageNum === 1) {
          setPosts(res.data.posts);
        } else {
          setPosts(prev => [...prev, ...res.data.posts]);
        }
        setPage(pageNum);
        setHasMore(res.data.hasMore);
      }
    } catch (error) {
      console.error('loadPosts failed:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { loadPosts(1, true); }, [activeTab]));

  const handleLike = async (postId: string) => {
    try {
      const res = await apiClient.togglePostLike(postId);
      if (res.success) {
        setPosts(prev => prev.map(p => {
          if (p.id !== postId) return p;
          return { ...p, isLiked: res.data.liked, likeCount: res.data.liked ? p.likeCount + 1 : p.likeCount - 1 };
        }));
      }
    } catch (error) {
      console.error('toggleLike failed:', error);
    }
  };

  const handleSubmitPost = async () => {
    if (!composeText.trim() || composeText.trim().length < 5) {
      Alert.alert(t('community.minLength'));
      return;
    }
    try {
      setIsSubmitting(true);
      const res = await apiClient.createCommunityPost({ type: composeType, content: composeText.trim() });
      if (res.success) {
        setShowCompose(false);
        setComposeText('');
        loadPosts(1, true);
      }
    } catch (error) {
      Alert.alert(t('community.postFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePostPress = (post: CommunityPost) => navigation.navigate('CommunityDetail', { postId: post.id });
  const handleAuthorPress = (userId: string) => navigation.navigate('UserProfile', { userId });

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'share': return t('community.typeShare');
      case 'question': return t('community.typeQuestion');
      case 'note': return t('community.typeNote');
      default: return '';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'share': return theme.colors.primary;
      case 'question': return theme.colors.warning;
      case 'note': return theme.colors.success;
      default: return theme.colors.text.secondary;
    }
  };

  return {
    theme, t, posts, activeTab, page, hasMore, isLoading, isRefreshing,
    showCompose, composeText, composeType, isSubmitting,
    setActiveTab, setShowCompose, setComposeText, setComposeType,
    loadPosts, handleLike, handleSubmitPost, handlePostPress, handleAuthorPress,
    getTypeLabel, getTypeColor, navigation,
  };
}
