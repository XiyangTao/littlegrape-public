import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme } from '@/theme';
import UserAgreementScreen from '@/screens/UserAgreementScreen';
import PrivacyPolicyScreen from '@/screens/PrivacyPolicyScreen';
import { useCarrierLogin } from './useCarrierLogin';
import CarrierLoginForm from './CarrierLoginForm';
import { createStyles } from './styles';

export default function LoginScreen() {
  const theme = lightTheme;
  const styles = createStyles(theme);

  const {
    step,
    agreed,
    toggleAgreed,
    preLogin,
    isPreLoginLoading,
    preLoginFailed,
    retryPreLogin,
    isCarrierLoading,
    isWechatLoading,
    isWechatOverlayVisible,
    handleCarrierLogin,
    handleWechatLogin,
    handleViewUserAgreement,
    handleViewPrivacyPolicy,
    goBackToMain,
    AlertComponent,
    t,
  } = useCarrierLogin();

  // 流程：preLogin 进行中 / 成功后等 SDK 授权页拉起 → 全屏 loading 占位
  // 只有 preLogin 失败 / 用户从 SDK 授权页取消 → 才显示 fallback CarrierLoginForm
  // 注意：以前条件里有 `preLogin`（truthy 永远成立），导致从后台返回时死锁 — 已移除
  const isWaitingSdk =
    step === 'main' && !preLoginFailed && (isPreLoginLoading || isCarrierLoading);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {step === 'main' && isWaitingSdk && (
        <View style={styles.bootLoading}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      )}
      {step === 'main' && !isWaitingSdk && (
        <CarrierLoginForm
          theme={theme}
          agreed={agreed}
          preLogin={preLogin}
          isPreLoginLoading={isPreLoginLoading}
          preLoginFailed={preLoginFailed}
          isCarrierLoading={isCarrierLoading}
          isWechatLoading={isWechatLoading}
          onCarrierLogin={handleCarrierLogin}
          onWechatLogin={handleWechatLogin}
          onRetryPreLogin={retryPreLogin}
          onToggleAgreed={toggleAgreed}
          onViewUserAgreement={handleViewUserAgreement}
          onViewPrivacyPolicy={handleViewPrivacyPolicy}
          t={t}
        />
      )}
      {step === 'userAgreement' && (
        <UserAgreementScreen onBack={goBackToMain} />
      )}
      {step === 'privacyPolicy' && (
        <PrivacyPolicyScreen onBack={goBackToMain} />
      )}

      {AlertComponent}

      {isWechatOverlayVisible && (
        <View style={styles.wechatOverlay}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      )}
    </SafeAreaView>
  );
}
