import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import Icon from '@/components/Icon';
import AvatarPreview from '@/components/AvatarPreview';
import { apiClient } from '@/api';
import type { FollowUser, FollowStatus } from '@/types/follow';

export default function UserSearchScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme);

  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [followLoadingId, setFollowLoadingId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  // 自动聚焦
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  // 防抖搜索
  const search = useCallback((text: string) => {
    setKeyword(text);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!text.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await apiClient.searchUsers(text.trim());
        if (res.success) {
          setResults(res.data.items);
          setHasSearched(true);
        }
      } catch (err) {
        console.error('[UserSearch] 搜索失败:', err);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  const toggleFollow = useCallback(async (userId: string, currentStatus: FollowStatus) => {
    if (followLoadingId) return;
    setFollowLoadingId(userId);

    try {
      const isFollowing = currentStatus === 'following' || currentStatus === 'mutual';
      if (isFollowing) {
        await apiClient.unfollowUser(userId);
      } else {
        await apiClient.followUser(userId);
      }
      // 更新本地状态
      setResults(prev => prev.map(item => {
        if (item.userId !== userId) return item;
        const newStatus: FollowStatus = isFollowing
          ? (currentStatus === 'mutual' ? 'followed_by' : 'none')
          : (currentStatus === 'followed_by' ? 'mutual' : 'following');
        return { ...item, followStatus: newStatus };
      }));
    } catch (err) {
      console.error('[UserSearch] 关注操作失败:', err);
    } finally {
      setFollowLoadingId(null);
    }
  }, [followLoadingId]);

  const renderItem = ({ item }: { item: FollowUser }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => navigation.navigate('UserProfile', { userId: item.userId })}
    >
      <AvatarPreview
        uri={item.avatar}
        fallbackText={item.nickname || '?'}
        size={48}
        previewable={false}
      />
      <View style={styles.userInfo}>
        <Text style={styles.userName} numberOfLines={1}>{item.nickname || t('userProfile.anonymous')}</Text>
        {item.bio ? (
          <Text style={styles.userBio} numberOfLines={1}>{item.bio}</Text>
        ) : null}
      </View>
      <TouchableOpacity
        style={[
          styles.followBtn,
          item.followStatus === 'following' || item.followStatus === 'mutual'
            ? styles.followBtnActive : null,
        ]}
        onPress={() => toggleFollow(item.userId, item.followStatus)}
        disabled={followLoadingId === item.userId}
      >
        {followLoadingId === item.userId ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : (
          <Text style={[
            styles.followBtnText,
            item.followStatus === 'following' || item.followStatus === 'mutual'
              ? styles.followBtnTextActive : null,
          ]}>
            {getFollowBtnLabel(item.followStatus, t)}
          </Text>
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 搜索栏 */}
      <View style={styles.searchBar}>
        <View style={styles.searchInputWrap}>
          <Icon name="search" size={20} color={theme.colors.text.tertiary} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder={t('follow.searchPlaceholder')}
            placeholderTextColor={theme.colors.text.tertiary}
            value={keyword}
            onChangeText={search}
            returnKeyType="search"
          />
          {keyword ? (
            <TouchableOpacity onPress={() => search('')}>
              <Icon name="close" size={18} color={theme.colors.text.tertiary} />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>{t('common.cancel')}</Text>
        </TouchableOpacity>
      </View>

      {/* 搜索结果 */}
      {loading && results.length === 0 ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : hasSearched && results.length === 0 ? (
        <View style={styles.centerWrap}>
          <Icon name="search-off" size={48} color={theme.colors.text.tertiary} />
          <Text style={styles.emptyText}>{t('follow.emptySearch')}</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={item => item.userId}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </SafeAreaView>
  );
}

function getFollowBtnLabel(status: FollowStatus, t: (key: string) => string): string {
  switch (status) {
    case 'mutual': return t('follow.mutualButton');
    case 'following': return t('follow.unfollowButton');
    case 'followed_by': return t('follow.followBackButton');
    default: return t('follow.followButton');
  }
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.spacing.borderRadius.base,
    paddingHorizontal: theme.spacing.md,
    height: 40,
    gap: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.primary,
    padding: 0,
  },
  cancelBtn: {
    paddingVertical: theme.spacing.sm,
  },
  cancelText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary,
  },
  centerWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  emptyText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  userInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
    marginRight: theme.spacing.sm,
  },
  userName: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
  },
  userBio: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  followBtn: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs + 2,
    borderRadius: theme.spacing.borderRadius.full,
    backgroundColor: theme.colors.primary,
    minWidth: 64,
    alignItems: 'center',
  },
  followBtnActive: {
    backgroundColor: theme.colors.background.secondary,
    borderWidth: 1,
    borderColor: theme.colors.border.medium,
  },
  followBtnText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.inverse,
  },
  followBtnTextActive: {
    color: theme.colors.text.secondary,
  },
});
