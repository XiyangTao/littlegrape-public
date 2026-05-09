/**
 * 搭配区（可折叠）：常用搭配列表
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import Icon from '@/components/Icon';
import type { WordCollocation } from '@/types/word';
import { createStyles } from './styles';

interface CollocationsSectionProps {
  collocations: WordCollocation[];
  showCollocations: boolean;
  onToggle: () => void;
  bottomInset: number;
}

export default function CollocationsSection({
  collocations,
  showCollocations,
  onToggle,
  bottomInset,
}: CollocationsSectionProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme, bottomInset);

  if (collocations.length === 0) {
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
          <Text style={styles.foldableIcon}>📝</Text>
          <Text style={styles.foldableTitle}>{t('wordCard.collocations')}</Text>
        </View>
        <Icon
          name={showCollocations ? 'expand-less' : 'expand-more'}
          size={24}
          color={theme.colors.text.secondary}
        />
      </View>
      {showCollocations && (
        <View style={styles.collocationsContent}>
          {collocations.map((collocation, index) => {
            let examples: string[] = [];
            if (collocation.examples) {
              if (typeof collocation.examples === 'string') {
                try {
                  examples = JSON.parse(collocation.examples);
                } catch {
                  examples = [];
                }
              } else if (Array.isArray(collocation.examples)) {
                examples = collocation.examples;
              }
            }
            return (
              <View key={collocation.id || index} style={styles.collocationItem}>
                <Text style={styles.collocationPattern}>{collocation.pattern}</Text>
                {collocation.meaningCn && (
                  <Text style={styles.collocationMeaning}>{collocation.meaningCn}</Text>
                )}
                {examples.length > 0 && (
                  <View style={styles.collocationExamples}>
                    {examples.map((example, i) => (
                      <Text key={i} style={styles.collocationExample}>• {example}</Text>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}
    </TouchableOpacity>
  );
}
