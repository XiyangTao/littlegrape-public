import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import Icon from '@/components/Icon';

interface ConfirmTestSheetProps {
  visible: boolean;
  learnedCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmTestSheet({
  visible,
  learnedCount,
  onConfirm,
  onCancel,
}: ConfirmTestSheetProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme);
  const slideAnim = useRef(new Animated.Value(theme.screen.height)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 60,
          friction: 10,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: theme.screen.height,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, opacityAnim]);

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      presentationStyle="overFullScreen"
      animationType="none"
      onRequestClose={onCancel}
    >
      <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onCancel} />
      </Animated.View>

      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <Icon name="quiz" size={22} color={theme.colors.primary} />
          </View>
          <View style={styles.titleArea}>
            <Text style={styles.title}>{t('words.confirmTest.title')}</Text>
            <Text style={styles.subtitle}>{t('words.confirmTest.learnedCount', { count: learnedCount })}</Text>
          </View>
        </View>

        <Text style={styles.description}>
          {t('words.confirmTest.description')}
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.secondaryButton} onPress={onCancel} activeOpacity={0.8}>
            <Text style={styles.secondaryButtonText}>{t('words.confirmTest.later')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton} onPress={onConfirm} activeOpacity={0.8}>
            <Text style={styles.primaryButtonText}>{t('words.confirmTest.startTest')}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.colors.overlay,
    },
    sheet: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.background.primary,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 28,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 8,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: theme.spacing.borderRadius.lg,
      backgroundColor: theme.colors.primary + '14',
      alignItems: 'center',
      justifyContent: 'center',
    },
    titleArea: {
      flex: 1,
    },
    title: {
      fontSize: 18,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
    },
    subtitle: {
      marginTop: 2,
      fontSize: 13,
      color: theme.colors.text.secondary,
    },
    description: {
      marginTop: 14,
      fontSize: 14,
      color: theme.colors.text.secondary,
      lineHeight: 20,
    },
    actions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 20,
    },
    secondaryButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: theme.spacing.borderRadius.base,
      backgroundColor: theme.colors.background.secondary,
      alignItems: 'center',
    },
    secondaryButtonText: {
      fontSize: 15,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
    },
    primaryButton: {
      flex: 1.2,
      paddingVertical: 12,
      borderRadius: theme.spacing.borderRadius.base,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
    },
    primaryButtonText: {
      fontSize: 15,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.inverse,
    },
  });
