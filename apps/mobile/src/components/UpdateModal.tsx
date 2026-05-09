import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Linking,
} from 'react-native';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import { useVersionStore } from '@/stores/VersionStore';
import Icon from '@/components/Icon';

export function UpdateModal() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme);

  const showUpdateModal = useVersionStore((s) => s.showUpdateModal);
  const updateType = useVersionStore((s) => s.updateType);
  const latestVersion = useVersionStore((s) => s.latestVersion);
  const releaseNotes = useVersionStore((s) => s.releaseNotes);
  const dismissUpdateModal = useVersionStore((s) => s.dismissUpdateModal);
  const getDownloadUrl = useVersionStore((s) => s.getDownloadUrl);

  const isForced = updateType === 'forced';

  const scaleValue = React.useRef(new Animated.Value(0)).current;
  const fadeValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (showUpdateModal) {
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
  }, [showUpdateModal]);

  const handleDismiss = () => {
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
      dismissUpdateModal();
    });
  };

  const handleUpdate = () => {
    const url = getDownloadUrl();
    if (url) {
      Linking.openURL(url);
    }
  };

  return (
    <Modal visible={showUpdateModal} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.overlay, { opacity: fadeValue }]}>
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ scale: scaleValue }],
              opacity: fadeValue,
            },
          ]}
        >
          {/* 图标 */}
          <View style={styles.iconContainer}>
            <Icon
              name={isForced ? 'error' : 'rocket-launch'}
              size={40}
              color={isForced ? theme.colors.error : theme.colors.primary}
            />
          </View>

          {/* 标题 */}
          <Text style={styles.title}>
            {t(isForced ? 'version.forceUpdateTitle' : 'version.optionalUpdateTitle')}
          </Text>

          {/* 版本号 */}
          <Text style={styles.versionText}>
            {t('version.newVersion', { version: latestVersion })}
          </Text>

          {/* 更新说明 */}
          {releaseNotes ? (
            <Text style={styles.releaseNotes}>{releaseNotes}</Text>
          ) : null}

          {/* 按钮 */}
          <View style={styles.buttonContainer}>
            {!isForced && (
              <TouchableOpacity
                style={styles.laterButton}
                onPress={handleDismiss}
                activeOpacity={0.8}
              >
                <Text style={styles.laterButtonText}>{t('version.later')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.updateButton, isForced && styles.updateButtonFull]}
              onPress={handleUpdate}
              activeOpacity={0.8}
            >
              <Text style={styles.updateButtonText}>{t('version.updateNow')}</Text>
            </TouchableOpacity>
          </View>
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
  container: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.spacing.borderRadius.md,
    paddingHorizontal: 24,
    paddingVertical: 24,
    width: theme.screen.width - 64,
    alignItems: 'center',
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  iconContainer: {
    marginBottom: 12,
  },
  title: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  versionText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
    marginBottom: 12,
  },
  releaseNotes: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    textAlign: 'left',
    lineHeight: 22,
    marginBottom: 20,
    alignSelf: 'stretch',
    paddingHorizontal: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  laterButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: theme.spacing.borderRadius.sm,
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  laterButtonText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.secondary,
  },
  updateButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: theme.spacing.borderRadius.sm,
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
  },
  updateButtonFull: {
    flex: undefined,
    width: '100%',
  },
  updateButtonText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.inverse,
  },
});
