import React, { useState } from 'react';
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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { useAuth } from '@/stores/AuthStore';
import { useI18n } from '@/context/I18nProvider';
import { useCustomAlert } from '@/hooks/useCustomAlert';
import Icon, { IconNames } from '@/components/Icon';

type SetPasswordScreenRouteProp = RouteProp<{ SetPassword: { isFirstTimeSetup: boolean } }, 'SetPassword'>;

export default function SetPasswordScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const navigation = useNavigation();
  const route = useRoute<SetPasswordScreenRouteProp>();
  const { setPassword, changePassword } = useAuth();
  const { toast, AlertComponent } = useCustomAlert();
  const styles = createStyles(theme);

  const isFirstTimeSetup = route.params?.isFirstTimeSetup ?? true;

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 提交密码
  const handleSubmit = async () => {
    if (isSubmitting) return;

    // 验证
    if (!isFirstTimeSetup && !currentPassword.trim()) {
      setError(t('accountSecurity.setPassword.errors.currentPasswordRequired'));
      return;
    }

    if (!newPassword.trim() || newPassword.length < 6) {
      setError(t('accountSecurity.setPassword.errors.passwordTooShort'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('accountSecurity.setPassword.errors.passwordMismatch'));
      return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      if (isFirstTimeSetup) {
        await setPassword(newPassword);
        toast('', t('accountSecurity.setPassword.setSuccess'), 'success');
      } else {
        await changePassword(currentPassword, newPassword);
        toast('', t('accountSecurity.setPassword.changeSuccess'), 'success');
      }
      navigation.goBack();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('accountSecurity.setPassword.errors.setFailed');
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* 导航栏 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Icon name={IconNames.left} size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isFirstTimeSetup
            ? t('accountSecurity.setPassword.setTitle')
            : t('accountSecurity.setPassword.changeTitle')}
        </Text>
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
              <Icon name="lock" size={48} color={theme.colors.primary} />
            </View>
            <Text style={styles.description}>
              {isFirstTimeSetup
                ? t('accountSecurity.setPassword.setDescription')
                : t('accountSecurity.setPassword.changeDescription')}
            </Text>
          </View>

          {/* 当前密码输入（仅修改密码时显示） */}
          {!isFirstTimeSetup && (
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder={t('accountSecurity.setPassword.currentPasswordPlaceholder')}
                placeholderTextColor={theme.colors.text.disabled}
                secureTextEntry={!showCurrentPassword}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                <Icon
                  name={showCurrentPassword ? 'visibility' : 'visibility-off'}
                  size={20}
                  color={theme.colors.text.secondary}
                />
              </TouchableOpacity>
            </View>
          )}

          {/* 新密码输入 */}
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder={t('accountSecurity.setPassword.newPasswordPlaceholder')}
              placeholderTextColor={theme.colors.text.disabled}
              secureTextEntry={!showNewPassword}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowNewPassword(!showNewPassword)}
            >
              <Icon
                name={showNewPassword ? 'visibility' : 'visibility-off'}
                size={20}
                color={theme.colors.text.secondary}
              />
            </TouchableOpacity>
          </View>

          {/* 确认密码输入 */}
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder={t('accountSecurity.setPassword.confirmPasswordPlaceholder')}
              placeholderTextColor={theme.colors.text.disabled}
              secureTextEntry={!showConfirmPassword}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Icon
                name={showConfirmPassword ? 'visibility' : 'visibility-off'}
                size={20}
                color={theme.colors.text.secondary}
              />
            </TouchableOpacity>
          </View>

          {/* 错误提示 */}
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}

          {/* 确认按钮 */}
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={theme.colors.text.inverse} size="small" />
            ) : (
              <Text style={styles.submitButtonText}>{t('accountSecurity.setPassword.confirm')}</Text>
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
  },
  eyeButton: {
    padding: theme.spacing.xs,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.spacing.borderRadius.base,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: theme.colors.text.disabled,
  },
  submitButtonText: {
    color: theme.colors.text.inverse,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
