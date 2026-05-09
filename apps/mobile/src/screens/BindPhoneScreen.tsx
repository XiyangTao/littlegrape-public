import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { useAuth } from '@/stores/AuthStore';
import { useI18n } from '@/context/I18nProvider';
import { useCustomAlert } from '@/hooks/useCustomAlert';
import Icon, { IconNames } from '@/components/Icon';

export default function BindPhoneScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const navigation = useNavigation();
  const { sendBindPhoneCode, bindPhone } = useAuth();
  const { toast, AlertComponent } = useCustomAlert();
  const styles = createStyles(theme);

  const [phone, setPhone] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [isBinding, setIsBinding] = useState(false);
  const [error, setError] = useState('');

  // 倒计时效果
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 验证手机号格式
  const validatePhone = (phoneNumber: string): boolean => {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phoneNumber);
  };

  // 发送验证码
  const handleSendCode = async () => {
    if (isSending || countdown > 0) return;

    if (!phone.trim()) {
      setError(t('auth.bindPhone.errors.phoneRequired'));
      return;
    }

    if (!validatePhone(phone)) {
      setError(t('auth.bindPhone.errors.phoneInvalid'));
      return;
    }

    setError('');
    setIsSending(true);
    try {
      await sendBindPhoneCode(phone);
      setCountdown(60);
      toast('', t('auth.login.messages.codeSent'), 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : t('auth.bindPhone.errors.sendCodeFailed');
      setError(message);
    } finally {
      setIsSending(false);
    }
  };

  // 绑定手机号
  const handleBind = async () => {
    if (isBinding) return;

    if (!phone.trim()) {
      setError(t('auth.bindPhone.errors.phoneRequired'));
      return;
    }

    if (!validatePhone(phone)) {
      setError(t('auth.bindPhone.errors.phoneInvalid'));
      return;
    }

    if (!verifyCode.trim() || verifyCode.length !== 6) {
      setError(t('auth.bindPhone.errors.codeInvalid'));
      return;
    }

    setError('');
    setIsBinding(true);
    try {
      await bindPhone(phone, verifyCode);
      toast('', t('accountSecurity.bindPhone.bindSuccess'), 'success');
      navigation.goBack();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('auth.bindPhone.errors.bindFailed');
      setError(message);
    } finally {
      setIsBinding(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* 导航栏 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Icon name={IconNames.left} size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('accountSecurity.bindPhone.title')}</Text>
        <View style={styles.headerButton} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 图标和说明 */}
          <View style={styles.iconContainer}>
            <View style={styles.iconWrapper}>
              <Icon name="phone" size={48} color={theme.colors.primary} />
            </View>
            <Text style={styles.description}>{t('auth.bindPhone.subtitle')}</Text>
          </View>

          {/* 手机号输入 */}
          <View style={styles.inputWrapper}>
            <Icon name="phone" size={20} color={theme.colors.text.secondary} />
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder={t('auth.bindPhone.phonePlaceholder')}
              placeholderTextColor={theme.colors.text.disabled}
              keyboardType="phone-pad"
              maxLength={11}
            />
          </View>

          {/* 验证码输入 */}
          <View style={styles.codeWrapper}>
            <TextInput
              style={styles.codeInput}
              value={verifyCode}
              onChangeText={setVerifyCode}
              placeholder={t('auth.bindPhone.codePlaceholder')}
              placeholderTextColor={theme.colors.text.disabled}
              keyboardType="numeric"
              maxLength={6}
            />
            <TouchableOpacity
              style={[
                styles.sendCodeButton,
                (countdown > 0 || isSending || !phone.trim()) && styles.sendCodeButtonDisabled
              ]}
              onPress={handleSendCode}
              disabled={countdown > 0 || isSending || !phone.trim()}
            >
              {isSending ? (
                <ActivityIndicator color={theme.colors.text.inverse} size="small" />
              ) : (
                <Text style={[
                  styles.sendCodeText,
                  (countdown > 0 || isSending || !phone.trim()) && styles.sendCodeTextDisabled
                ]}>
                  {countdown > 0 ? `${countdown}s` : t('auth.bindPhone.getCode')}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* 错误提示 */}
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}

          {/* 绑定按钮 */}
          <TouchableOpacity
            style={[styles.bindButton, isBinding && styles.bindButtonDisabled]}
            onPress={handleBind}
            disabled={isBinding}
          >
            {isBinding ? (
              <ActivityIndicator color={theme.colors.text.inverse} size="small" />
            ) : (
              <Text style={styles.bindButtonText}>{t('auth.bindPhone.bindButton')}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
      {AlertComponent}
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  keyboardView: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: theme.spacing.xl,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: theme.scale(32),
  },
  iconWrapper: {
    width: theme.scale(80),
    height: theme.scale(80),
    borderRadius: theme.scale(40),
    backgroundColor: theme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: theme.fontScale(22),
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.spacing.borderRadius.base,
    paddingHorizontal: 16,
    height: theme.scale(50),
    marginBottom: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text.primary,
    marginLeft: 12,
  },
  codeWrapper: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 12,
  },
  codeInput: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.spacing.borderRadius.base,
    paddingHorizontal: 16,
    fontSize: 16,
    color: theme.colors.text.primary,
    marginRight: 12,
    height: theme.scale(50),
  },
  sendCodeButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.spacing.borderRadius.base,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 100,
  },
  sendCodeButtonDisabled: {
    backgroundColor: theme.colors.text.disabled,
  },
  sendCodeText: {
    color: theme.colors.text.inverse,
    fontSize: 14,
    fontWeight: '600',
  },
  sendCodeTextDisabled: {
    color: theme.colors.text.inverse,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },
  bindButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.spacing.borderRadius.base,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  bindButtonDisabled: {
    backgroundColor: theme.colors.text.disabled,
  },
  bindButtonText: {
    color: theme.colors.text.inverse,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
