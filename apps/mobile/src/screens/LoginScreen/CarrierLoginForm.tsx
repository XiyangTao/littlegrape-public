import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Theme } from '@/theme';
import type { PreLoginResult } from '@/services/CarrierLoginService';
import { getCarrierDisplayName } from '@/services/CarrierLoginService';
import { createCarrierStyles } from './styles';

interface CarrierLoginFormProps {
  theme: Theme;
  agreed: boolean;
  preLogin: PreLoginResult | null;
  isPreLoginLoading: boolean;
  preLoginFailed: boolean;
  isCarrierLoading: boolean;
  isWechatLoading: boolean;
  onCarrierLogin: () => void;
  onWechatLogin: () => void;
  onRetryPreLogin: () => void;
  onToggleAgreed: () => void;
  onViewUserAgreement: () => void;
  onViewPrivacyPolicy: () => void;
  t: (key: string, opts?: any) => string;
}

export default function CarrierLoginForm(props: CarrierLoginFormProps) {
  const {
    theme,
    agreed,
    preLogin,
    isPreLoginLoading,
    preLoginFailed,
    isCarrierLoading,
    isWechatLoading,
    onCarrierLogin,
    onWechatLogin,
    onRetryPreLogin,
    onToggleAgreed,
    onViewUserAgreement,
    onViewPrivacyPolicy,
    t,
  } = props;
  const styles = createCarrierStyles(theme);

  // 一键登录可用条件：preLogin 成功 && 用户没在 loading
  const canCarrierLogin = !!preLogin && !isPreLoginLoading && !isCarrierLoading;

  // 是否进入降级态：preLogin 失败 → 微信变主按钮
  const isFallbackMode = preLoginFailed && !isPreLoginLoading;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background.primary} />

      {/* 顶部 logo + 品牌区 */}
      <View style={styles.brandSection}>
        <View style={styles.logoWrap}>
          <Image
            source={require('../../../assets/icon.png')}
            style={styles.logoImage}
            resizeMode="cover"
          />
        </View>
        <Text style={styles.title}>{t('auth.login.carrier.title')}</Text>
        <Text style={styles.subtitle}>{t('auth.login.carrier.subtitle')}</Text>
      </View>

      {/* 中间号码展示区（三态：loading / success / fallback） */}
      <View style={styles.phoneSection}>
        {isPreLoginLoading ? (
          <View style={styles.phoneLoadingWrap}>
            <ActivityIndicator color={theme.colors.primary} size="small" />
            <Text style={styles.phoneLoadingText}>
              {t('auth.login.carrier.preLoginPending')}
            </Text>
          </View>
        ) : isFallbackMode ? (
          <View style={styles.fallbackWrap}>
            <View style={styles.fallbackIconWrap}>
              <MaterialCommunityIcons
                name="signal-off"
                size={28}
                color={theme.colors.text.tertiary}
              />
            </View>
            <Text style={styles.fallbackTitle}>
              {t('auth.login.carrier.fallbackTitle')}
            </Text>
            <Text style={styles.fallbackHint}>
              {t('auth.login.carrier.fallbackHint')}
            </Text>
          </View>
        ) : preLogin ? (
          preLogin.maskedPhone ? (
            <>
              <Text style={styles.maskedPhone}>{formatMaskedPhone(preLogin.maskedPhone)}</Text>
              <Text style={styles.providedBy}>
                {t('auth.login.carrier.providedBy', {
                  carrier: getCarrierDisplayName(preLogin.carrier),
                })}
              </Text>
            </>
          ) : (
            // Android: SDK 不返回掩码号，用友好替代展示
            <>
              <Text style={styles.androidReadyTitle}>已识别您的本机号码</Text>
              <Text style={styles.providedBy}>
                {t('auth.login.carrier.providedBy', {
                  carrier: getCarrierDisplayName(preLogin.carrier),
                })}
              </Text>
            </>
          )
        ) : null}
      </View>

      {/* 主操作按钮区 */}
      <View style={styles.actionsSection}>
        {/* 主按钮：一键登录 / 重试一键登录 */}
        {!isFallbackMode ? (
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={!canCarrierLogin}
            onPress={onCarrierLogin}
          >
            <LinearGradient
              colors={
                canCarrierLogin
                  ? theme.colors.gradient.primary
                  : ['#D4D4D4', '#D4D4D4']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryButton}
            >
              {isCarrierLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {t('auth.login.carrier.oneClickLogin')}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          // 降级态：微信变主按钮
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={isWechatLoading}
            onPress={onWechatLogin}
          >
            <LinearGradient
              colors={theme.colors.gradient.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryButton}
            >
              {isWechatLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <View style={styles.primaryButtonContent}>
                  <MaterialCommunityIcons
                    name="wechat"
                    size={20}
                    color="#FFF"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.primaryButtonText}>
                    {t('auth.login.carrier.wechatLogin')}
                  </Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* 次按钮：微信 / 重试 */}
        {!isFallbackMode ? (
          <TouchableOpacity
            style={[styles.secondaryButton, isWechatLoading && styles.buttonDisabled]}
            activeOpacity={0.7}
            disabled={isWechatLoading}
            onPress={onWechatLogin}
          >
            {isWechatLoading ? (
              <ActivityIndicator color={theme.colors.social.wechat} size="small" />
            ) : (
              <View style={styles.primaryButtonContent}>
                <MaterialCommunityIcons
                  name="wechat"
                  size={20}
                  color={theme.colors.social.wechat}
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.secondaryButtonText}>
                  {t('auth.login.carrier.wechatLogin')}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.tertiaryButton}
            activeOpacity={0.6}
            onPress={onRetryPreLogin}
          >
            <Text style={styles.tertiaryButtonText}>
              {t('auth.login.carrier.retryPreLogin')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 协议区（默认未勾选 — 合规强制） */}
      <View style={styles.agreementSection}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onToggleAgreed}
          style={styles.checkbox}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <View
            style={[
              styles.checkboxBox,
              agreed && styles.checkboxBoxChecked,
            ]}
          >
            {agreed && (
              <MaterialCommunityIcons name="check" size={14} color="#FFF" />
            )}
          </View>
        </TouchableOpacity>
        <Text style={styles.agreementText}>
          {t('auth.login.carrier.agreementPrefix')}
          <Text style={styles.agreementLink} onPress={onViewUserAgreement}>
            《{t('auth.login.agreement.userAgreement')}》
          </Text>
          {t('auth.login.carrier.agreementSeparator')}
          <Text style={styles.agreementLink} onPress={onViewPrivacyPolicy}>
            《{t('auth.login.agreement.privacyPolicy')}》
          </Text>
          {preLogin && !isFallbackMode ? (
            <>
              {t('auth.login.carrier.agreementAnd')}
              <Text
                style={styles.agreementLink}
                onPress={() => Linking.openURL(preLogin.protocolUrl)}
              >
                《{preLogin.protocolName}》
              </Text>
            </>
          ) : null}
        </Text>
      </View>
    </View>
  );
}

/** 138****8888 → 138 **** 8888（增加可读性） */
function formatMaskedPhone(masked: string): string {
  if (masked.length !== 11) return masked;
  return `${masked.slice(0, 3)} ${masked.slice(3, 7)} ${masked.slice(7)}`;
}
