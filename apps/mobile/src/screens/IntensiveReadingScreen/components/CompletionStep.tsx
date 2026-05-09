import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { createStyles } from '../styles';
import { Theme } from '@/context/ThemeProvider';

interface CompletionStepProps {
  quizScore: number | null;
  readTime: number;
  vocabCount: number;
  onGoHome: () => void;
  onGoArticles: () => void;
  theme: Theme;
  t: (key: string) => string;
}

export function CompletionStep({
  quizScore,
  readTime,
  vocabCount,
  onGoHome,
  onGoArticles,
  theme,
  t,
}: CompletionStepProps) {
  const styles = createStyles(theme);
  const minutes = Math.max(1, Math.round(readTime / 60));

  return (
    <View style={styles.completionContainer}>
      <Text style={styles.completionEmoji}>
        {quizScore !== null && quizScore >= 80 ? '🎉' : '👏'}
      </Text>
      <Text style={styles.completionTitle}>{t('intensiveReading.completed')}</Text>
      <Text style={styles.completionSubtitle}>{t('intensiveReading.completedDesc')}</Text>

      <View style={styles.completionStats}>
        <View style={styles.completionStatRow}>
          <Text style={styles.completionStatLabel}>{t('intensiveReading.readingTime')}</Text>
          <Text style={styles.completionStatValue}>
            {minutes} {t('intensiveReading.minutes')}
          </Text>
        </View>
        {quizScore !== null && (
          <View style={styles.completionStatRow}>
            <Text style={styles.completionStatLabel}>{t('intensiveReading.quizScore')}</Text>
            <Text style={[
              styles.completionStatValue,
              { color: quizScore >= 80 ? theme.colors.success : theme.colors.warning },
            ]}>
              {quizScore}%
            </Text>
          </View>
        )}
        <View style={styles.completionStatRow}>
          <Text style={styles.completionStatLabel}>{t('intensiveReading.newVocab')}</Text>
          <Text style={styles.completionStatValue}>
            {vocabCount} {t('intensiveReading.words')}
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.nextButton} onPress={onGoHome} activeOpacity={0.7}>
        <Text style={styles.nextButtonText}>{t('intensiveReading.backHome')}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryButton} onPress={onGoArticles} activeOpacity={0.7}>
        <Text style={styles.secondaryButtonText}>{t('intensiveReading.moreArticles')}</Text>
      </TouchableOpacity>
    </View>
  );
}
