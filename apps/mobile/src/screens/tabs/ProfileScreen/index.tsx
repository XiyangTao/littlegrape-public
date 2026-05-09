import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@react-native-vector-icons/material-icons';
import { useTheme } from '@/context/ThemeProvider';
import Icon, { IconNames } from '@/components/Icon';
import AvatarPreview from '@/components/AvatarPreview';
import { QuotaCard } from '@/components/QuotaCard';
import { PremiumBadge } from '@/components/PremiumBadge';
import { useProfile, SETTINGS_GROUPS } from './useProfile';
import { createStyles } from './styles';

export default function ProfileScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const profile = useProfile();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 用户信息区域 */}
      <View style={styles.userSection}>
        <View style={styles.avatarContainer}>
          <AvatarPreview
            uri={profile.user?.avatar}
            fallbackText={profile.user?.nickname || profile.user?.username || '?'}
            size={80}
          />
        </View>

        <View style={styles.userInfo}>
          <View style={styles.userNameRow}>
            <Text style={styles.userName}>
              {profile.user?.nickname || profile.user?.username || profile.t('profile.noNickname')}
            </Text>
            {profile.planType !== 'free' && (
              <View style={[
                styles.planBadge,
                profile.planType === 'max' && styles.planBadgeMax,
                profile.planType === 'pro' && styles.planBadgePro,
              ]}>
                <MaterialIcons
                  name={profile.planType === 'max' ? 'diamond' : profile.planType === 'pro' ? 'star' : 'verified'}
                  size={12}
                  color="#FFFFFF"
                />
                <Text style={styles.planBadgeText}>
                  {profile.planType === 'max' ? 'Max' : profile.planType === 'pro' ? 'Pro' : profile.t('plan.basic.name')}
                </Text>
              </View>
            )}
          </View>
          {profile.user?.bio && (
            <Text style={styles.userBio} numberOfLines={2}>{profile.user.bio}</Text>
          )}
          {!profile.user?.phone && (
            <Text style={styles.userEmail}>{profile.t('profile.noPhone')}</Text>
          )}
        </View>
      </View>

      {/* 用量配额卡片 */}
      <View style={styles.quotaSection}>
        <QuotaCard />
      </View>

      {/* 分组设置列表 */}
      {SETTINGS_GROUPS.map((group, groupIndex) => (
        <View key={groupIndex} style={styles.settingsGroup}>
          <Text style={styles.groupTitle}>{profile.t(group.titleKey)}</Text>
          {group.items.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.settingItem}
              onPress={() => profile.handleSettingPress(item.action)}
            >
              <View style={styles.settingLeft}>
                <View style={styles.settingIconContainer}>
                  <Icon name={item.icon} size={24} color={theme.colors.primary} />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>{profile.t(item.title)}</Text>
                  {item.subtitle ? (
                    <Text style={styles.settingSubtitle}>{profile.t(item.subtitle)}</Text>
                  ) : null}
                </View>
              </View>
              <View style={styles.settingRight}>
                {item.action === 'translation' && profile.translationLocked && (
                  <PremiumBadge size="xs" />
                )}
                <Icon name={IconNames.right} size={20} color={theme.colors.text.secondary} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ))}

      {/* 退出登录按钮 */}
      <View style={styles.logoutSection}>
        <TouchableOpacity style={styles.logoutButton} onPress={profile.handleLogout}>
          <Text style={styles.logoutText}>{profile.t('profile.logout')}</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}
