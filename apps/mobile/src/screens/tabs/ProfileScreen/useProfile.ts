import { useState, useCallback, useEffect } from 'react';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import { useAuth } from '@/stores/AuthStore';
import { useUserStore } from '@/stores';
import { useQuotaStore } from '@/stores';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import { getReminderSettings, setReminderSettings, ReminderSettings } from '@/services/NotificationService';
import { IconNames } from '@/components/Icon';
import { apiClient } from '@/api';

interface SocialStats {
  following: number;
  followers: number;
  friends: number;
}

// 设置项分组定义
export const SETTINGS_GROUPS = [
  {
    titleKey: 'profile.groupTools',
    items: [
      { icon: 'translate', title: 'profile.translation', subtitle: 'profile.translationDesc', action: 'translation' },
    ],
  },
  {
    titleKey: 'profile.groupSettings',
    items: [
      { icon: IconNames.person, title: 'profile.personalInfo', subtitle: 'profile.personalInfoDesc', action: 'profile' },
      { icon: 'security', title: 'profile.accountSecurity', subtitle: 'profile.accountSecurityDesc', action: 'security' },
      { icon: IconNames.settings, title: 'profile.appSettings', subtitle: 'profile.appSettingsDesc', action: 'settings' },
      { icon: 'help', title: 'profile.helpFeedback', subtitle: 'profile.helpFeedbackDesc', action: 'help' },
    ],
  },
] as const;

export function useProfile() {
  // 三件套
  const { theme } = useTheme();
  const { t } = useI18n();
  const navigation = useNavigation<any>();

  const { user, logout } = useAuth();
  const translationGate = useFeatureGate('textTranslation');

  const overviewStats = useUserStore((state) => state.overviewStats);
  const refresh = useUserStore((state) => state.refresh);

  // 社交数据
  const [socialStats, setSocialStats] = useState<SocialStats>({ following: 0, followers: 0, friends: 0 });

  // 提醒设置
  const [reminderSettings, setLocalReminderSettings] = useState<ReminderSettings>({
    enabled: false, hour: 20, minute: 0,
  });

  useEffect(() => {
    getReminderSettings().then(setLocalReminderSettings);
  }, []);

  // 页面获得焦点时刷新配额和统计
  useFocusEffect(
    useCallback(() => {
      useQuotaStore.getState().refreshQuotaSilently();
      refresh();
      // 加载社交数据
      if (user?.id) {
        apiClient.getUserPublicProfile(user.id).then(res => {
          if (res.success) {
            const { social } = res.data;
            setSocialStats({
              following: social.followingCount,
              followers: social.followerCount,
              friends: 0,
            });
          }
        }).catch(() => {});
      }
    }, [refresh, user?.id])
  );

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.warn('Logout failed:', error);
    }
  };

  const handleSettingPress = (action: string) => {
    switch (action) {
      case 'profile':
        navigation.navigate('ProfileEdit' as never);
        break;
      case 'settings':
        navigation.navigate('AppSettings' as never);
        break;
      case 'security':
        navigation.navigate('AccountSecurity' as never);
        break;
      case 'stats':
        navigation.navigate('StudyStats' as never);
        break;
      case 'help':
        navigation.navigate('HelpFeedback' as never);
        break;
      case 'achievement':
        navigation.navigate('Achievement' as never);
        break;
      case 'invite':
        navigation.navigate('Invite' as never);
        break;
      case 'findUsers':
        navigation.navigate('UserSearch' as never);
        break;
      case 'usageDetail':
        navigation.navigate('UsageDetail' as never);
        break;
      case 'translation':
        if (!translationGate.guard()) return;
        navigation.navigate('Translation' as never);
        break;
      default:
        break;
    }
  };

  const handleReminderToggle = async (enabled: boolean) => {
    const newSettings = { ...reminderSettings, enabled };
    setLocalReminderSettings(newSettings);
    await setReminderSettings(newSettings);
  };

  const navigateToFollowList = (initialTab: string) => {
    navigation.navigate('FollowList', {
      initialTab,
      nickname: user?.nickname,
      followingCount: socialStats.following,
      followerCount: socialStats.followers,
    });
  };

  const planType = useQuotaStore((s) => s.quota?.planType) || 'free';

  return {
    // 三件套
    theme,
    t,

    // 用户数据
    user,
    planType,
    overviewStats,
    socialStats,

    // 提醒设置
    reminderSettings,
    handleReminderToggle,

    // 操作方法
    handleLogout,
    handleSettingPress,
    navigateToFollowList,

    // 权限
    translationLocked: translationGate.locked,
  };
}
