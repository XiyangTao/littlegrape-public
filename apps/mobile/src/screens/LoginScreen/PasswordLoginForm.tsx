import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  StatusBar,
} from 'react-native';
import { Theme } from '@/theme';
import Icon from '@/components/Icon';
import UserAgreement from '@/components/UserAgreement';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createStyles } from './styles';

interface PasswordLoginFormProps {
  theme: Theme;
  identifier: string;
  password: string;
  agreed: boolean;
  isLoading: boolean;
  isWechatLoading: boolean;
  onIdentifierChange: (text: string) => void;
  onPasswordChange: (text: string) => void;
  onLogin: () => void;
  onWechatLogin: () => void;
  onForgotPassword: () => void;
  onToggleMethod: () => void;
  onToggleAgreed: () => void;
  onViewUserAgreement: () => void;
  onViewPrivacyPolicy: () => void;
  t: (key: string) => string;
}

export default function PasswordLoginForm({
  theme,
  identifier,
  password,
  agreed,
  isLoading,
  isWechatLoading,
  onIdentifierChange,
  onPasswordChange,
  onLogin,
  onWechatLogin,
  onForgotPassword,
  onToggleMethod,
  onToggleAgreed,
  onViewUserAgreement,
  onViewPrivacyPolicy,
  t,
}: PasswordLoginFormProps) {
  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background.primary} />

      {/* 顶部Logo区域 */}
      <View style={styles.topSection}>
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Image
              source={require('../../../assets/icon.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <View style={styles.titleSection}>
            <Text style={styles.loginTitle}>
              {t('auth.login.methods.password')}
            </Text>
            <Text style={styles.loginSubtitle}>
              {t('auth.login.loginSubtitle')}
            </Text>
          </View>
        </View>
      </View>

      {/* 主要内容区域 */}
      <View style={styles.mainContent}>
        <View style={styles.formSection}>
          {/* 账号输入 */}
          <View style={styles.accountInputWrapper}>
            <Icon
              name="person"
              size={20}
              color={theme.colors.text.secondary}
            />
            <TextInput
              style={styles.accountInput}
              value={identifier}
              onChangeText={onIdentifierChange}
              placeholder={t('auth.login.phoneOrNickname')}
              placeholderTextColor={theme.colors.text.disabled}
              keyboardType="default"
              maxLength={50}
              autoFocus={false}
            />
          </View>

          {/* 密码输入区域 */}
          <View style={styles.inputSection}>
            <View style={styles.passwordInputWrapper}>
              <TextInput
                style={styles.passwordInput}
                value={password}
                onChangeText={onPasswordChange}
                placeholder={t('auth.login.passwordPlaceholder')}
                placeholderTextColor={theme.colors.text.disabled}
                secureTextEntry={true}
                keyboardType="default"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="none"
                passwordRules=""
                autoComplete="off"
              />
            </View>

            {/* 切换登录方式和忘记密码 */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.switchMethodLink}
                onPress={onToggleMethod}
              >
                <Text style={styles.switchMethodLinkText}>
                  {t('auth.login.methods.switchToCode')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.forgotPasswordLink} onPress={onForgotPassword}>
                <Text style={styles.forgotPasswordText}>{t('auth.login.forgotPassword')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 用户协议 */}
          <UserAgreement
            agreed={agreed}
            onToggle={onToggleAgreed}
            onViewPrivacyPolicy={onViewPrivacyPolicy}
            onViewUserAgreement={onViewUserAgreement}
          />

          {/* 登录按钮 */}
          <TouchableOpacity
            style={[
              styles.loginButton,
              isLoading && styles.loginButtonDisabled
            ]}
            onPress={onLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={theme.colors.text.inverse} size="small" />
                <Text style={styles.loadingText}>{t('auth.login.logging')}</Text>
              </View>
            ) : (
              <>
                <Text style={styles.loginButtonText}>{t('auth.login.signInButton')}</Text>
                <Icon name="arrow-forward" size={20} color={theme.colors.text.inverse} />
              </>
            )}
          </TouchableOpacity>

          {/* 分割线 */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('auth.login.orContinueWith')}</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* 微信登录按钮 */}
          <TouchableOpacity
            style={[
              styles.wechatButton,
              isWechatLoading && styles.wechatButtonDisabled
            ]}
            onPress={onWechatLogin}
            disabled={isWechatLoading}
          >
            {isWechatLoading ? (
              <ActivityIndicator color={theme.colors.social.wechat} size="small" />
            ) : (
              <>
                <MaterialCommunityIcons
                  name="wechat"
                  size={24}
                  color={theme.colors.social.wechat}
                  style={styles.wechatIcon}
                />
                <Text style={styles.wechatButtonText}>{t('auth.login.signInWithWechat')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
