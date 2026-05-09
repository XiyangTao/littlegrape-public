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
import { usePermissionGuideStore } from '@/stores/PermissionGuideStore';
import Icon from '@/components/Icon';
import type { PermissionType } from '@/hooks/usePermission';

const PERMISSION_CONFIG: Record<PermissionType, { icon: string; titleKey: string; messageKey: string }> = {
  camera: {
    icon: 'photo-camera',
    titleKey: 'permissionRationale.cameraTitle',
    messageKey: 'permissionRationale.cameraMessage',
  },
  mediaLibrary: {
    icon: 'photo-library',
    titleKey: 'permissionRationale.storageTitle',
    messageKey: 'permissionRationale.storageMessage',
  },
  microphone: {
    icon: 'mic',
    titleKey: 'permissionRationale.micTitle',
    messageKey: 'permissionRationale.micMessage',
  },
};

export function PermissionGuideModal() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const { visible, permissionType, confirm, cancel } = usePermissionGuideStore();
  const styles = createStyles(theme);

  const scaleValue = React.useRef(new Animated.Value(0)).current;
  const fadeValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
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
    } else {
      scaleValue.setValue(0);
      fadeValue.setValue(0);
    }
  }, [visible]);

  if (!visible || !permissionType) return null;

  const config = PERMISSION_CONFIG[permissionType];

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.overlay, { opacity: fadeValue }]}>
        <Animated.View style={[styles.container, { transform: [{ scale: scaleValue }], opacity: fadeValue }]}>
          {/* 图标 */}
          <View style={styles.iconCircle}>
            <Icon name={config.icon} size={32} color={theme.colors.primary} />
          </View>

          {/* 标题 */}
          <Text style={styles.title}>{t(config.titleKey)}</Text>

          {/* 说明 */}
          <Text style={styles.message}>{t(config.messageKey)}</Text>

          {/* 按钮 */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.cancelButton} onPress={cancel} activeOpacity={0.8}>
              <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmButton} onPress={confirm} activeOpacity={0.8}>
              <Text style={styles.confirmButtonText}>{t('permissionRationale.allow')}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
    },
    container: {
      backgroundColor: theme.colors.background.primary,
      borderRadius: theme.spacing.borderRadius.md,
      paddingHorizontal: 24,
      paddingTop: 28,
      paddingBottom: 20,
      width: '100%',
      alignItems: 'center',
      ...theme.spacing.shadows.sm,
    },
    iconCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.colors.background.secondary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    title: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
    },
    message: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: theme.spacing.lg,
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: 12,
      width: '100%',
    },
    cancelButton: {
      flex: 1,
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.spacing.borderRadius.base,
      paddingVertical: 12,
      alignItems: 'center',
    },
    cancelButtonText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.text.secondary,
    },
    confirmButton: {
      flex: 1,
      backgroundColor: theme.colors.primary,
      borderRadius: theme.spacing.borderRadius.base,
      paddingVertical: 12,
      alignItems: 'center',
    },
    confirmButtonText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.inverse,
    },
  });
