import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import Icon, { IconNames } from '@/components/Icon';
import AvatarPreview from '@/components/AvatarPreview';
import { useUserProfile } from './useUserProfile';
import type { FollowStatus } from '@/types/follow';

type ParamList = { UserProfile: { userId: string } };

export default function UserProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<ParamList, 'UserProfile'>>();
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme);
  const { userId } = route.params;

  const {
    profile,
    loading,
    isOwnProfile,
    followStatus,
    followLoading,
    toggleFollow,
  } = useUserProfile(userId);

  if (loading && !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name={IconNames.left} size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('userProfile.title')}</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) return null;

  const { user, stats, showcase, social } = profile;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name={IconNames.left} size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('userProfile.title')}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 用户信息区域 — GitHub 风格水平布局 */}
        <View style={styles.userSection}>
          <AvatarPreview
            uri={user.avatar}
            fallbackText={user.nickname || '?'}
            size={80}
          />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user.nickname || t('userProfile.anonymous')}</Text>
            {user.bio ? (
              <Text style={styles.userBio} numberOfLines={2}>{user.bio}</Text>
            ) : null}
            <View style={styles.socialInline}>
              <TouchableOpacity
                onPress={() => navigation.push('FollowList', { userId, initialTab: 'following', nickname: user.nickname, followingCount: social.followingCount, followerCount: social.followerCount })}
              >
                <Text style={styles.socialText}>
                  <Text style={styles.socialCount}>{social.followingCount}</Text>
                  {' '}{t('follow.following')}
                </Text>
              </TouchableOpacity>
              <Text style={styles.socialDot}> · </Text>
              <TouchableOpacity
                onPress={() => navigation.push('FollowList', { userId, initialTab: 'followers', nickname: user.nickname, followingCount: social.followingCount, followerCount: social.followerCount })}
              >
                <Text style={styles.socialText}>
                  <Text style={styles.socialCount}>{social.followerCount}</Text>
                  {' '}{t('follow.followers')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 操作按钮 — 描边风格 */}
        <View style={styles.actionRow}>
          {isOwnProfile ? (
            <TouchableOpacity
              style={styles.outlineButton}
              onPress={() => navigation.navigate('ProfileEdit')}
            >
              <Icon name="edit" size={16} color={theme.colors.primary} />
              <Text style={styles.outlineButtonText}>{t('userProfile.editProfile')}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.outlineButton,
                followStatus === 'following' || followStatus === 'mutual'
                  ? styles.outlineButtonInactive
                  : null,
              ]}
              onPress={toggleFollow}
              disabled={followLoading}
            >
              {followLoading ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <>
                  <Icon
                    name={getFollowIcon(followStatus)}
                    size={16}
                    color={followStatus === 'following' || followStatus === 'mutual'
                      ? theme.colors.text.secondary : theme.colors.primary}
                  />
                  <Text style={[
                    styles.outlineButtonText,
                    followStatus === 'following' || followStatus === 'mutual'
                      ? styles.outlineButtonTextInactive : null,
                  ]}>
                    {getFollowLabel(followStatus, t)}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* 学习统计卡片 */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>{t('userProfile.statsTitle')}</Text>
          <LinearGradient
            colors={theme.colors.gradient.primarySoft}
            style={styles.statsCard}
          >
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.totalLearned}</Text>
                <Text style={styles.statLabel}>{t('userProfile.stats.learned')}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.totalMastered}</Text>
                <Text style={styles.statLabel}>{t('userProfile.stats.mastered')}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.streakDays}</Text>
                <Text style={styles.statLabel}>{t('userProfile.stats.streak')}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>Lv.{stats.level}</Text>
                <Text style={styles.statLabel}>{stats.xp} XP</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* 成就展柜 */}
        {showcase.length > 0 && (
          <View style={styles.showcaseSection}>
            <Text style={styles.sectionTitle}>{t('userProfile.showcase')}</Text>
            <View style={styles.showcaseGrid}>
              {showcase.map((item) => (
                <View key={item.slotIndex} style={styles.showcaseItem}>
                  <View style={[styles.showcaseIcon, { backgroundColor: getRarityColor(item.rarity) + '20' }]}>
                    <Icon name={item.icon as any} size={24} color={getRarityColor(item.rarity)} />
                  </View>
                  <Text style={styles.showcaseName} numberOfLines={1}>
                    {item.name?.['zh-CN'] || item.achievementId}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ==================== 工具函数 ====================

function getFollowIcon(status: FollowStatus): string {
  switch (status) {
    case 'mutual': return 'people';
    case 'following': return 'check';
    case 'followed_by': return 'person-add';
    default: return 'person-add';
  }
}

function getFollowLabel(status: FollowStatus, t: (key: string) => string): string {
  switch (status) {
    case 'mutual': return t('follow.mutualButton');
    case 'following': return t('follow.unfollowButton');
    case 'followed_by': return t('follow.followBackButton');
    default: return t('follow.followButton');
  }
}

function getRarityColor(rarity: string): string {
  switch (rarity) {
    case 'legendary': return '#FF6B00';
    case 'epic': return '#A855F7';
    case 'rare': return '#3B82F6';
    default: return '#6B7280';
  }
}

// ==================== 样式 ====================

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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // 用户信息 — GitHub 风格水平布局
  userSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  userInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  userName: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  userBio: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xxs,
  },
  socialInline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  socialCount: {
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  socialText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  socialDot: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  // 操作按钮 — 描边风格
  actionRow: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs + 2,
    borderRadius: theme.spacing.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    gap: theme.spacing.xs,
  },
  outlineButtonText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.primary,
  },
  outlineButtonInactive: {
    borderColor: theme.colors.border.medium,
  },
  outlineButtonTextInactive: {
    color: theme.colors.text.secondary,
  },
  // 学习统计
  statsSection: {
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  statsCard: {
    borderRadius: theme.spacing.borderRadius.md,
    padding: theme.spacing.lg,
    ...theme.spacing.shadows.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
  },
  statLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xxs,
  },
  // 展柜
  showcaseSection: {
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
  },
  showcaseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  showcaseItem: {
    alignItems: 'center',
    width: (theme.screen.width - theme.spacing.lg * 2 - theme.spacing.sm * 4) / 5,
  },
  showcaseIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.spacing.borderRadius.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  showcaseName: {
    fontSize: theme.typography.fontSize.xxs,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xxs,
    textAlign: 'center',
  },
});
