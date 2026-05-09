/**
 * 词源区（可折叠）：前缀、词根、后缀、分析
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import Icon from '@/components/Icon';
import type { WordEtymology } from '@/types/word';
import { createStyles } from './styles';

interface EtymologySectionProps {
  etymology: WordEtymology;
  showEtymology: boolean;
  onToggle: () => void;
  bottomInset: number;
}

export default function EtymologySection({
  etymology,
  showEtymology,
  onToggle,
  bottomInset,
}: EtymologySectionProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme, bottomInset);

  if (!etymology.root && !etymology.prefix && !etymology.suffix) {
    return null;
  }

  return (
    <TouchableOpacity
      style={styles.foldableSection}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <View style={styles.foldableHeader}>
        <View style={styles.foldableTitleRow}>
          <Text style={styles.foldableIcon}>💡</Text>
          <Text style={styles.foldableTitle}>{t('wordCard.etymology')}</Text>
        </View>
        <Icon
          name={showEtymology ? 'expand-less' : 'expand-more'}
          size={24}
          color={theme.colors.text.secondary}
        />
      </View>
      {showEtymology && (
        <View style={styles.etymologyContent}>
          {etymology.prefix && (
            <View style={styles.etymologyRow}>
              <View style={styles.etymologyLabelBadge}>
                <Text style={styles.etymologyLabel}>{t('wordCard.prefix')}</Text>
              </View>
              <Text style={styles.etymologyValue}>
                <Text style={styles.etymologyPart}>{etymology.prefix}</Text>
                {etymology.prefixMeaning && ` (${etymology.prefixMeaning})`}
              </Text>
            </View>
          )}
          {etymology.root && (
            <View style={styles.etymologyRow}>
              <View style={[styles.etymologyLabelBadge, styles.etymologyLabelRoot]}>
                <Text style={styles.etymologyLabel}>{t('wordCard.root')}</Text>
              </View>
              <Text style={styles.etymologyValue}>
                <Text style={styles.etymologyPart}>{etymology.root}</Text>
                {etymology.rootMeaning && ` (${etymology.rootMeaning})`}
              </Text>
            </View>
          )}
          {etymology.suffix && (
            <View style={styles.etymologyRow}>
              <View style={[styles.etymologyLabelBadge, styles.etymologyLabelSuffix]}>
                <Text style={styles.etymologyLabel}>{t('wordCard.suffix')}</Text>
              </View>
              <Text style={styles.etymologyValue}>
                <Text style={styles.etymologyPart}>{etymology.suffix}</Text>
                {etymology.suffixMeaning && ` (${etymology.suffixMeaning})`}
              </Text>
            </View>
          )}
          {etymology.analysis && (
            <Text style={styles.etymologyAnalysis}>{etymology.analysis}</Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}
