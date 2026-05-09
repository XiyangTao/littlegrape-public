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

interface PhoneLoginFormProps {
  theme: Theme;
  phone: string;
  verifyCode: string;
  agreed: boolean;
  countdown: number;
  isLoading: boolean;
  isSending: boolean;
  isWechatLoading: boolean;
  onPhoneChange: (text: string) => void;
  onVerifyCodeChange: (text: string) => void;
  onSendCode: () => void;
  onLogin: () => void;
  onWechatLogin: () => void;
  onToggleMethod: () => void;
  onToggleAgreed: () => void;
  onViewUserAgreement: () => void;
  onViewPrivacyPolicy: () => void;
  t: (key: string) => string;
}

export default function PhoneLoginForm({
  theme,
  phone,
  verifyCode,
  agreed,
  countdown,
  isLoading,
  isSending,
  isWechatLoading,
  onPhoneChange,
  onVerifyCodeChange,
  onSendCode,
  onLogin,
  onWechatLogin,
  onToggleMethod,
  onToggleAgreed,
  onViewUserAgreement,
  onViewPrivacyPolicy,
  t,
}: PhoneLoginFormProps) {
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
              {t('auth.login.methods.verificationCode')}
            </Text>
            <Text style={styles.loginSubtitle}>
              {t('auth.login.agreement.autoRegister')}
            </Text>
          </View>
        </View>
      </View>

      {/* 主要内容区域 */}
      <View style={styles.mainContent}>
        <View style={styles.formSection}>
          {/* 手机号输入 */}
          <View style={styles.accountInputWrapper}>
            <Icon
              name="phone"
              size={20}
              color={theme.colors.text.secondary}
            />
            <TextInput
              style={styles.accountInput}
              value={phone}
              onChangeText={onPhoneChange}
              placeholder={t('auth.login.phonePlaceholder')}
              placeholderTextColor={theme.colors.text.disabled}
              keyboardType="phone-pad"
              maxLength={11}
              autoFocus={false}
            />
          </View>

          {/* 验证码输入区域 */}
          <View style={styles.inputSection}>
            <View style={styles.codeInputWrapper}>
              <TextInput
                style={styles.codeInput}
                value={verifyCode}
                onChangeText={onVerifyCodeChange}
                placeholder={t('auth.login.verificationCodePlaceholder')}
                placeholderTextColor={theme.colors.text.disabled}
                keyboardType="numeric"
                maxLength={6}
              />
              <TouchableOpacity
                style={[
                  styles.sendCodeButton,
                  (countdown > 0 || isSending || !phone.trim()) && styles.sendCodeButtonDisabled
                ]}
                onPress={onSendCode}
                disabled={countdown > 0 || isSending || !phone.trim()}
              >
                <Text style={[
                  styles.sendCodeText,
                  (countdown > 0 || isSending || !phone.trim()) && styles.sendCodeTextDisabled
                ]}>
                  {isSending ? t('auth.login.sending') : countdown > 0 ? `${countdown}s` : t('auth.login.getCode')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* 切换登录方式 */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.switchMethodLink}
                onPress={onToggleMethod}
              >
                <Text style={styles.switchMethodLinkText}>
                  {t('auth.login.methods.switchToPassword')}
                </Text>
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
