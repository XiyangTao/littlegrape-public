import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from '@/components/Icon';
import type { Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import type { MatchingItem } from './useQuizState';
import { createStyles } from './styles';

interface MatchingQuizProps {
  theme: Theme;
  matchingItems: MatchingItem[];
  selectedWordId: string | null;
  matchedPairs: Set<string>;
  wrongPair: { wordId: string; meaningId: string } | null;
  shuffledMeanings: { id: string; meaning: string }[];
  onWordPress: (wordId: string) => void;
  onMeaningPress: (meaningId: string) => void;
}

export default function MatchingQuiz({
  theme,
  matchingItems,
  selectedWordId,
  matchedPairs,
  wrongPair,
  shuffledMeanings,
  onWordPress,
  onMeaningPress,
}: MatchingQuizProps) {
  const { t } = useI18n();
  const styles = createStyles(theme);

  return (
    <View style={styles.quizContent}>
      <Text style={styles.quizTitle}>{t('words.quiz.matching')}</Text>
      <Text style={styles.quizSubtitle}>{t('words.quiz.matchingHint')}</Text>

      <View style={styles.matchingContainer}>
        {/* 单词列表 */}
        <View style={styles.matchingColumn}>
          {matchingItems.map(item => {
            const isMatched = matchedPairs.has(item.id);
            const isSelected = selectedWordId === item.id;
            const isWrong = wrongPair?.wordId === item.id;

            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.matchingItem,
                  isMatched && styles.matchingItemMatched,
                  isSelected && styles.matchingItemSelected,
                  isWrong && styles.matchingItemWrong,
                ]}
                onPress={() => onWordPress(item.id)}
                disabled={isMatched}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.matchingItemText,
                  isMatched && styles.matchingItemTextMatched,
                ]}>
                  {item.word}
                </Text>
                {isMatched && (
                  <Icon name="check" size={16} color={theme.colors.success} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 释义列表 */}
        <View style={styles.matchingColumn}>
          {shuffledMeanings.map(item => {
            const isMatched = matchedPairs.has(item.id);
            const isWrong = wrongPair?.meaningId === item.id;

            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.matchingItem,
                  styles.matchingMeaningItem,
                  isMatched && styles.matchingItemMatched,
                  isWrong && styles.matchingItemWrong,
                ]}
                onPress={() => onMeaningPress(item.id)}
                disabled={isMatched}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.matchingMeaningText,
                    isMatched && styles.matchingItemTextMatched,
                  ]}
                  numberOfLines={2}
                >
                  {item.meaning}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.progressInfo}>
        <Text style={styles.progressText}>
          已匹配 {matchedPairs.size} / {matchingItems.length}
        </Text>
      </View>
    </View>
  );
}
