import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import Icon, { IconNames } from '@/components/Icon';
import AvatarPreview from '@/components/AvatarPreview';
import { useAuth } from '@/stores/AuthStore';
import { useFollowList, TabType } from './useFollowList';
import type { FollowUser, FollowStatus } from '@/types/follow';

type ParamList = {
  FollowList: {
    userId?: string;
    initialTab?: TabType;
    nickname?: string;
    followingCount?: number;
    followerCount?: number;
  };
};

export default function FollowListScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<ParamList, 'FollowList'>>();
  const { theme } = useTheme();
  const { t } = useI18n();
  const { user: currentUser } = useAuth();
  const styles = createStyles(theme);

  const { userId, initialTab, nickname, followingCount = 0, followerCount = 0 } = route.params || {};

  const {
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
  } = useFollowList(userId, initialTab);

  const displayName = nickname || t('userProfile.anonymous');

  // activeTab 变化时加载数据（含首次挂载）
  useEffect(() => {
    loadData(1);
  }, [loadData]);

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
      {/* 自己 → 箭头，他人 → 关注按钮 */}
      {item.userId === currentUser?.id ? (
        <Icon name={IconNames.right} size={20} color={theme.colors.text.tertiary} />
      ) : (
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
      )}
    </TouchableOpacity>
  );

  const emptyKey =
    activeTab === 'following' ? 'follow.emptyFollowing'
      : activeTab === 'followers' ? 'follow.emptyFollowers'
        : 'follow.emptyMutual';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header — 显示用户昵称 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name={IconNames.left} size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{displayName}</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Tab 栏 — 关注 N / 粉丝 N / 互关 */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'following' && styles.tabItemActive]}
          onPress={() => switchTab('following')}
        >
          <Text style={[styles.tabText, activeTab === 'following' && styles.tabTextActive]}>
            {t('follow.following')} {followingCount}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'followers' && styles.tabItemActive]}
          onPress={() => switchTab('followers')}
        >
          <Text style={[styles.tabText, activeTab === 'followers' && styles.tabTextActive]}>
            {t('follow.followers')} {followerCount}
          </Text>
        </TouchableOpacity>
        {isOwnList && (
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'mutual' && styles.tabItemActive]}
            onPress={() => switchTab('mutual')}
          >
            <Text style={[styles.tabText, activeTab === 'mutual' && styles.tabTextActive]}>
              {t('follow.mutual')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 列表 */}
      {loading && items.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item.userId}
          renderItem={renderItem}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.3}
          contentContainerStyle={items.length === 0 ? styles.emptyContainer : undefined}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Icon name="people-outline" size={48} color={theme.colors.text.tertiary} />
              <Text style={styles.emptyText}>{t(emptyKey)}</Text>
            </View>
          }
          ListFooterComponent={
            hasMore && items.length > 0 ? (
              <ActivityIndicator style={{ paddingVertical: 16 }} color={theme.colors.primary} />
            ) : null
          }
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  headerRight: {
    width: 40,
  },
  // Tab — 文字下划线样式
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border.light,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.spacing.sm + 2,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: theme.colors.text.primary,
  },
  tabText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.tertiary,
  },
  tabTextActive: {
    color: theme.colors.text.primary,
    fontWeight: theme.typography.fontWeight.bold,
  },
  // 列表
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  // 空状态
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyWrap: {
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  emptyText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
  },
});
