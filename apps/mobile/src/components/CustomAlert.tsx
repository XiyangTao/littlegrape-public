import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
} from 'react-native';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import Icon from '@/components/Icon';

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'error' | 'warning';
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  showCancel?: boolean;
  autoClose?: boolean;
  autoCloseDelay?: number;
  toastStyle?: boolean;
}

export function CustomAlert({
  visible,
  title,
  message,
  type = 'info',
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  showCancel = false,
  autoClose = false,
  autoCloseDelay = 1000,
  toastStyle = false,
}: CustomAlertProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme);

  // 使用 i18n 的默认值
  const finalConfirmText = confirmText ?? t('common.confirm');
  const finalCancelText = cancelText ?? t('common.cancel');

  const scaleValue = React.useRef(new Animated.Value(0)).current;
  const fadeValue = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(toastStyle ? 50 : 0)).current;

  React.useEffect(() => {
    if (visible) {
      if (toastStyle) {
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(fadeValue, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        Animated.parallel([
          Animated.spring(scaleValue, {
            toValue: 1,
            useNativeDriver: true,
            tension: 150,
            friction: 6,
          }),
          Animated.timing(fadeValue, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }

      // 自动关闭功能
      if (autoClose) {
        const timer = setTimeout(() => {
          handleAutoClose();
        }, autoCloseDelay);

        return () => clearTimeout(timer);
      }
    } else {
      if (toastStyle) {
        translateY.setValue(50);
        fadeValue.setValue(0);
      } else {
        scaleValue.setValue(0);
        fadeValue.setValue(0);
      }
    }
  }, [visible, scaleValue, fadeValue, translateY, autoClose, autoCloseDelay, toastStyle]);

  const getIconConfig = () => {
    switch (type) {
      case 'success':
        return { name: 'check-circle', color: theme.colors.success };
      case 'error':
        return { name: 'error', color: theme.colors.error };
      default:
        return { name: 'info', color: theme.colors.primary };
    }
  };

  const iconConfig = getIconConfig();

  const handleAutoClose = () => {
    if (toastStyle) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 50,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeValue, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onConfirm?.();
      });
    } else {
      Animated.timing(fadeValue, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        onConfirm?.();
      });
    }
  };

  const handleConfirm = () => {
    Animated.parallel([
      Animated.timing(scaleValue, {
        toValue: 0.8,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeValue, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onConfirm?.();
    });
  };

  const handleCancel = () => {
    if (onCancel) {
      Animated.parallel([
        Animated.timing(scaleValue, {
          toValue: 0.8,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(fadeValue, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onCancel();
      });
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[toastStyle ? styles.toastOverlay : styles.overlay, { opacity: fadeValue }]}>
        <Animated.View
          style={[
            toastStyle ? styles.toastContainer : styles.alertContainer,
            {
              transform: toastStyle ? [{ translateY }] : [{ scale: scaleValue }],
              opacity: fadeValue,
            },
          ]}
        >
          <View style={styles.messageContainer}>
            <Icon name={iconConfig.name} size={18} color={iconConfig.color} />
            <Text style={styles.message}>{message}</Text>
          </View>

          {/* 按钮区域 - 只有在非自动关闭且需要按钮时才显示 */}
          {!autoClose && (
            <View style={styles.buttonContainer}>
              {showCancel && onCancel && (
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={handleCancel}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelButtonText}>{finalCancelText}</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.confirmButton,
                  { backgroundColor: iconConfig.color },
                  !showCancel && styles.singleButton
                ]}
                onPress={handleConfirm}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmButtonText}>{finalConfirmText}</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  toastOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 100,
    paddingHorizontal: 16,
  },
  alertContainer: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.spacing.borderRadius.base,
    paddingHorizontal: 20,
    paddingVertical: 16,
    minWidth: 120,
    maxWidth: theme.screen.width - 80,
    alignSelf: 'center',
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  toastContainer: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.spacing.borderRadius.base,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 120,
    maxWidth: theme.screen.width - 32,
    alignSelf: 'center',
    ...theme.spacing.shadows.md,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    fontSize: 15,
    color: theme.colors.text.primary,
    lineHeight: 22,
    marginLeft: 10,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    justifyContent: 'center',
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    minWidth: 60,
  },
  cancelButton: {
    backgroundColor: theme.colors.background.secondary,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.secondary,
  },
  confirmButton: {
  },
  singleButton: {
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.inverse,
  },
});
