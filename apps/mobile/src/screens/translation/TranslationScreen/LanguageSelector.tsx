import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeProvider';
import Icon from '@/components/Icon';
import { LANGUAGES, LanguageCode } from './constants';
import type { Theme } from '@/context/ThemeProvider';

interface LanguageSelectorProps {
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  disabled: boolean;
  onSwitch: () => void;
}

export default function LanguageSelector({
  sourceLanguage,
  targetLanguage,
  disabled,
  onSwitch,
}: LanguageSelectorProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <Text style={[styles.langText, disabled && styles.langTextDisabled]}>
        {LANGUAGES[sourceLanguage].shortName}
      </Text>
      <TouchableOpacity
        style={styles.swapButton}
        onPress={onSwitch}
        disabled={disabled}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Icon
          name="swap-horiz"
          size={18}
          color={disabled ? theme.colors.text.tertiary : theme.colors.primary}
        />
      </TouchableOpacity>
      <Text style={[styles.langText, disabled && styles.langTextDisabled]}>
        {LANGUAGES[targetLanguage].shortName}
      </Text>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xxs,
    },
    langText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
    },
    langTextDisabled: {
      color: theme.colors.text.tertiary,
    },
    swapButton: {
      padding: theme.spacing.xxs,
    },
  });
