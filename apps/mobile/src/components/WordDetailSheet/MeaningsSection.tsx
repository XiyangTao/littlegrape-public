/**
 * 释义区：义项列表
 */

import React from 'react';
import { View, Text } from 'react-native';
import { useTheme, Theme } from '@/context/ThemeProvider';
import type { LocalWord, WordMeaning } from '@/types/word';
import { createStyles } from './styles';

interface MeaningsSectionProps {
  word: LocalWord;
  meanings: WordMeaning[];
  bottomInset: number;
}

export default function MeaningsSection({
  word,
  meanings,
  bottomInset,
}: MeaningsSectionProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme, bottomInset);

  return (
    <View style={styles.meaningsSection}>
      {meanings.length > 0 ? (
        meanings.map((meaning, index) => (
          <View key={meaning.id || index} style={styles.meaningItem}>
            <View style={styles.meaningHeader}>
              <Text style={styles.meaningIndex}>{index + 1}</Text>
              <Text style={styles.posText}>{meaning.pos}</Text>
              {meaning.register && (
                <View style={[
                  styles.registerBadge,
                  meaning.register === '俚语' && styles.registerBadgeSlang,
                  meaning.register === '口语' && styles.registerBadgeInformal,
                  meaning.register === '正式' && styles.registerBadgeFormal,
                  meaning.register === '过时' && styles.registerBadgeDated,
                ]}>
                  <Text style={styles.registerText}>{meaning.register}</Text>
                </View>
              )}
              <Text style={styles.meaningText}>{meaning.meaningCn}</Text>
            </View>
            {meaning.meaningEn && (
              <Text style={styles.meaningEn}>{meaning.meaningEn}</Text>
            )}
            {meaning.exampleEn && (
              <View style={styles.exampleContainer}>
                <Text style={styles.exampleEn}>{meaning.exampleEn}</Text>
                {meaning.exampleCn && (
                  <Text style={styles.exampleCn}>{meaning.exampleCn}</Text>
                )}
              </View>
            )}
          </View>
        ))
      ) : (
        <View style={styles.meaningItem}>
          <View style={styles.meaningHeader}>
            <Text style={styles.meaningIndex}>1</Text>
            {word.pos && <Text style={styles.posText}>{word.pos}</Text>}
            <Text style={styles.meaningText}>{word.meaningCn}</Text>
          </View>
          {word.meaningEn && (
            <Text style={styles.meaningEn}>{word.meaningEn}</Text>
          )}
        </View>
      )}
    </View>
  );
}
