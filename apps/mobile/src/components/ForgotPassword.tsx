import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useTheme } from '@/context/ThemeProvider';
import { useCustomAlert } from '@/hooks/useCustomAlert';
import { useI18n } from '@/context/I18nProvider';
import { useAuth } from '@/stores/AuthStore';
import Icon from '@/components/Icon';

interface ForgotPasswordProps {
  phone: string;
  onBack: () => void;
  onSuccess: () => void;
}

export default function ForgotPassword({ phone, onBack, onSuccess }: ForgotPasswordProps) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const { toast, AlertComponent } = useCustomAlert();
  const { requestPasswordReset, verifyPasswordResetCode, completePasswordReset } = useAuth();

  const [step, setStep] = useState<'verify' | 'reset'>('verify');
  const [verifyCode, setVerifyCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');

  const [countdown, setCountdown] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Countdown timer effect
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Phone number validation
  const validatePhone = (phoneNumber: string): boolean => {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phoneNumber);
  };

  // Send verification code
  const sendVerificationCode = useCallback(async () => {
    if (!validatePhone(phone)) {
      toast('', t('auth.login.validation.phoneInvalid'), 'error');
      return;
    }

    if (isSending || countdown > 0) return;

    setIsSending(true);
    try {
      await requestPasswordReset(phone);
      setCountdown(60);
      toast('', t('auth.login.messages.codeSent'), 'info');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : t('auth.resetPassword.errors.sendCodeFailed');
      toast('', errorMessage, 'error');
    } finally {
      setIsSending(false);
    }
  }, [phone, isSending, countdown, t, toast, requestPasswordReset]);

  // Automatically send code once on mount
  useEffect(() => {
    if (step === 'verify') {
      sendVerificationCode();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Verify phone number
  const handleVerify = async () => {
    if (!verifyCode.trim() || verifyCode.length !== 6) {
      toast('', t('auth.resetPassword.verifyCodeInvalid'), 'error');
      return;
    }

    setIsLoading(true);
    try {
      const token = await verifyPasswordResetCode(phone, verifyCode);
      setResetToken(token);
      setStep('reset');
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : t('auth.resetPassword.errors.verificationFailed');
      toast('', errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset password
  const handleResetPassword = async () => {
    if (!newPassword.trim()) {
      toast('', t('auth.resetPassword.newPasswordRequired'), 'error');
      return;
    }
    if (newPassword.length < 6) {
      toast('', t('auth.login.validation.passwordMinLength', { length: 6 }), 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast('', t('auth.resetPassword.passwordsDoNotMatch'), 'error');
      return;
    }

    setIsLoading(true);
    try {
      await completePasswordReset(resetToken, newPassword);
      toast('', t('auth.resetPassword.successMessage'), 'success');
      setTimeout(onSuccess, 1000);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : t('auth.resetPassword.errors.resetFailed');
      toast('', errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 24,
    },
    header: {
      marginBottom: 32,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text.primary,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      color: theme.colors.text.secondary,
      lineHeight: 20,
    },
    phoneDisplay: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.primary,
    },
    inputContainer: {
      marginBottom: 24,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.border.light,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 16,
      fontSize: 16,
      color: theme.colors.text.primary,
      backgroundColor: theme.colors.background.primary,
      marginBottom: 16,
    },
    codeActions: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: -8,
      marginBottom: 16,
    },
    resendButton: {
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    resendText: {
      fontSize: 14,
      color: theme.colors.primary,
      fontWeight: '500',
    },
    resendDisabled: {
      color: theme.colors.text.disabled,
    },
    submitButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      marginBottom: 16,
    },
    submitButtonDisabled: {
      backgroundColor: theme.colors.text.disabled,
    },
    submitButtonText: {
      color: theme.colors.text.inverse,
      fontSize: 16,
      fontWeight: '600',
    },
    backButton: {
      alignItems: 'center',
      paddingVertical: 12,
    },
    backButtonText: {
      color: theme.colors.text.secondary,
      fontSize: 14,
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      marginLeft: 8,
      color: theme.colors.text.inverse,
      fontSize: 16,
      fontWeight: '600',
    },
    passwordInputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.background.primary,
      borderWidth: 1,
      borderColor: theme.colors.border.light,
      borderRadius: 12,
      paddingHorizontal: 16,
      height: 48,
      marginBottom: 16,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    passwordInput: {
      flex: 1,
      fontSize: 16,
      color: theme.colors.text.primary,
      fontWeight: '500',
    },
    eyeButton: {
      padding: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

  if (step === 'verify') {
    return (
      <View style={styles.container}>
        {AlertComponent}
        <View style={styles.header}>
          <Text style={styles.title}>{t('auth.resetPassword.title')}</Text>
          <Text style={styles.subtitle}>
            {t('auth.resetPassword.subtitle')} <Text style={styles.phoneDisplay}>{phone}</Text>
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={verifyCode}
            onChangeText={setVerifyCode}
            placeholder={t('auth.resetPassword.verifyCodePlaceholder')}
            placeholderTextColor={theme.colors.text.disabled}
            keyboardType="numeric"
            maxLength={6}
            autoFocus
          />

          <View style={styles.codeActions}>
            <TouchableOpacity
              style={styles.resendButton}
              onPress={sendVerificationCode}
              disabled={countdown > 0 || isSending}
            >
              <Text
                style={[styles.resendText, (countdown > 0 || isSending) && styles.resendDisabled]}
              >
                {isSending
                  ? t('auth.resetPassword.sending')
                  : countdown > 0
                  ? t('auth.resetPassword.resendCountdown', { countdown })
                  : t('auth.resetPassword.resend')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.submitButton,
            (!verifyCode.trim() || isLoading) && styles.submitButtonDisabled,
          ]}
          onPress={handleVerify}
          disabled={!verifyCode.trim() || isLoading}
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={theme.colors.text.inverse} size="small" />
              <Text style={styles.loadingText}>{t('auth.resetPassword.verifying')}</Text>
            </View>
          ) : (
            <Text style={styles.submitButtonText}>{t('auth.resetPassword.nextStep')}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>{t('auth.resetPassword.backToLogin')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {AlertComponent}
      <View style={styles.header}>
        <Text style={styles.title}>{t('auth.resetPassword.setNewPasswordTitle')}</Text>
        <Text style={styles.subtitle}>
          {t('auth.resetPassword.setNewPasswordSubtitle', { phone })}
        </Text>
      </View>

      <View style={styles.inputContainer}>
        <View style={styles.passwordInputWrapper}>
          <TextInput
            key={showNewPassword ? 'new-visible' : 'new-hidden'}
            style={styles.passwordInput}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder={t('auth.resetPassword.newPasswordPlaceholder')}
            placeholderTextColor={theme.colors.text.disabled}
            secureTextEntry={!showNewPassword}
            keyboardType="ascii-capable"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="none"
            autoFocus
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowNewPassword(!showNewPassword)}
          >
            <Icon
              name={showNewPassword ? 'visibility' : 'visibility-off'}
              size={20}
              color={theme.colors.text.disabled}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.passwordInputWrapper}>
          <TextInput
            key={showConfirmPassword ? 'confirm-visible' : 'confirm-hidden'}
            style={styles.passwordInput}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder={t('auth.resetPassword.confirmPasswordPlaceholder')}
            placeholderTextColor={theme.colors.text.disabled}
            secureTextEntry={!showConfirmPassword}
            keyboardType="ascii-capable"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="none"
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            <Icon
              name={showConfirmPassword ? 'visibility' : 'visibility-off'}
              size={20}
              color={theme.colors.text.disabled}
            />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.submitButton,
          (!newPassword.trim() || !confirmPassword.trim() || isLoading) &&
            styles.submitButtonDisabled,
        ]}
        onPress={handleResetPassword}
        disabled={!newPassword.trim() || !confirmPassword.trim() || isLoading}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={theme.colors.text.inverse} size="small" />
            <Text style={styles.loadingText}>{t('auth.resetPassword.resetting')}</Text>
          </View>
        ) : (
          <Text style={styles.submitButtonText}>{t('auth.resetPassword.complete')}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>{t('auth.resetPassword.backToLogin')}</Text>
      </TouchableOpacity>
    </View>
  );
}