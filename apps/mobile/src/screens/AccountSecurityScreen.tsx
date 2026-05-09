import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { useAuth } from '@/stores/AuthStore';
import { useI18n } from '@/context/I18nProvider';
import { useCustomAlert } from '@/hooks/useCustomAlert';
import Icon, { IconNames } from '@/components/Icon';
import { sendAuthRequest, isWechatInstalled } from 'expo-native-wechat';

export default function AccountSecurityScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const { user, bindWechat } = useAuth();
  const { t } = useI18n();
  const { toast, AlertComponent } = useCustomAlert();
  const styles = createStyles(theme);

  const [isBindingWechat, setIsBindingWechat] = useState(false);

  // 判断是首次设置还是修改密码 — 暂时不使用（登录密码 section 已注释）
  // const isFirstTimeSetup = !user?.hasPassword;

  // 处理绑定微信
  const handleBindWechat = async () => {
    if (user?.hasWechat || isBindingWechat) return;

    // 检查微信是否安装
    const installed = await isWechatInstalled();
    if (!installed) {
      toast('', t('accountSecurity.bindWechat.wechatNotInstalled'), 'error');
      return;
    }

    setIsBindingWechat(true);
    try {
      // 发起微信授权请求
      const response = await sendAuthRequest({ scope: 'snsapi_userinfo' });

      if (response.errorCode !== 0) {
        // 用户取消或拒绝授权
        if (response.errorCode === -2 || response.errorCode === -4) {
          return;
        }
        throw new Error(response.errorStr || t('accountSecurity.bindWechat.authFailed'));
      }

      const code = response.data?.code;
      if (!code) {
        throw new Error(t('accountSecurity.bindWechat.authFailed'));
      }

      // 调用绑定微信接口
      await bindWechat(code);
      toast('', t('accountSecurity.bindWechat.bindSuccess'), 'success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('accountSecurity.bindWechat.bindFailed');
      toast('', errorMessage, 'error');
    } finally {
      setIsBindingWechat(false);
    }
  };

  // 获取手机号显示文本
  const getPhoneDisplayText = () => {
    if (user?.phone) {
      return user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
    }
    return t('accountSecurity.bindPhone.unbound');
  };

  // 获取密码状态显示文本 — 暂时不使用（登录密码 section 已注释）
  // const getPasswordDisplayText = () => {
  //   return user?.hasPassword
  //     ? t('accountSecurity.setPassword.hasPassword')
  //     : t('accountSecurity.setPassword.noPassword');
  // };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* 导航栏 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Icon name={IconNames.left} size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('accountSecurity.title')}</Text>
        <View style={styles.headerButtonRight} />
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 账号绑定 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('accountSecurity.sections.bindAccount')}</Text>

          {/* 绑定手机号 */}
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => !user?.phone && navigation.navigate('BindPhone')}
            disabled={!!user?.phone}
            activeOpacity={user?.phone ? 1 : 0.7}
          >
            <View style={styles.settingLeft}>
              <Icon name="phone" size={24} color={theme.colors.primary} style={styles.settingIcon} />
              {user?.phone ? (
                <Text style={styles.boundText}>{getPhoneDisplayText()}</Text>
              ) : (
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>{t('accountSecurity.bindPhone.title')}</Text>
                  <Text style={styles.settingValue}>{t('accountSecurity.bindPhone.unbound')}</Text>
                </View>
              )}
            </View>
            {user?.phone ? (
              <View style={styles.statusBadge}>
                <Icon name="check-circle" size={16} color={theme.colors.success} />
                <Text style={styles.statusText}>{t('accountSecurity.bindPhone.boundStatus')}</Text>
              </View>
            ) : (
              <Icon name={IconNames.right} size={20} color={theme.colors.text.secondary} />
            )}
          </TouchableOpacity>

          {/* 绑定微信 */}
          <TouchableOpacity
            style={styles.settingItem}
            onPress={handleBindWechat}
            disabled={!!user?.hasWechat || isBindingWechat}
            activeOpacity={user?.hasWechat ? 1 : 0.7}
          >
            <View style={styles.settingLeft}>
              <Icon name="wechat" size={24} color="#07C160" style={styles.settingIcon} />
              {user?.hasWechat ? (
                <View style={styles.wechatBoundInfo}>
                  {user.wechatAvatar && (
                    <Image source={{ uri: user.wechatAvatar }} style={styles.wechatAvatar} />
                  )}
                  <Text style={styles.boundText}>
                    {user.wechatNickname || t('accountSecurity.bindWechat.bound')}
                  </Text>
                </View>
              ) : (
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>{t('accountSecurity.bindWechat.title')}</Text>
                  <Text style={styles.settingValue}>{t('accountSecurity.bindWechat.unbound')}</Text>
                </View>
              )}
            </View>
            {user?.hasWechat ? (
              <View style={styles.statusBadge}>
                <Icon name="check-circle" size={16} color={theme.colors.success} />
                <Text style={styles.statusText}>{t('accountSecurity.bindWechat.boundStatus')}</Text>
              </View>
            ) : isBindingWechat ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Icon name={IconNames.right} size={20} color={theme.colors.text.secondary} />
            )}
          </TouchableOpacity>
        </View>

        {/* 登录安全 — 暂时隐藏（产品决策：砍密码登录方式，统一走一键登录/微信/短信验证码）
            原代码保留以备将来需要恢复 */}
        {/* <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('accountSecurity.sections.loginSecurity')}</Text>

          <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate('SetPassword', { isFirstTimeSetup })}>
            <View style={styles.settingLeft}>
              <Icon name="lock" size={24} color={theme.colors.blue} style={styles.settingIcon} />
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>{t('accountSecurity.setPassword.title')}</Text>
                <Text style={styles.settingValue}>{getPasswordDisplayText()}</Text>
              </View>
            </View>
            {user?.hasPassword ? (
              <View style={styles.statusBadge}>
                <Icon name="check-circle" size={16} color={theme.colors.success} />
                <Text style={styles.statusText}>{t('accountSecurity.setPassword.setStatus')}</Text>
              </View>
            ) : (
              <Icon name={IconNames.right} size={20} color={theme.colors.text.secondary} />
            )}
          </TouchableOpacity>
        </View> */}
      </ScrollView>
      {AlertComponent}
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
    paddingHorizontal: theme.spacing.lg,
  },
  scrollContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerButtonRight: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  headerTitle: {
    flex: 1,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  section: {
    marginTop: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingItem: {
    backgroundColor: theme.colors.background.secondary,
    padding: theme.spacing.md,
    borderRadius: theme.spacing.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
    minHeight: 68,  // 统一最小高度，让单行(已绑定 boundText)和双行(未绑定 title+value)对齐
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: theme.spacing.md,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  settingValue: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.success + '15',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.spacing.borderRadius.sm,
  },
  statusText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.success,
    fontWeight: theme.typography.fontWeight.medium,
    marginLeft: 4,
  },
  boundText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
  },
  wechatBoundInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wechatAvatar: {
    width: 28,
    height: 28,
    borderRadius: theme.spacing.borderRadius.base,
    marginRight: 8,
  },
});
