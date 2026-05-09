import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import type { Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import { createStyles } from './styles';

interface QuizResultProps {
  theme: Theme;
  correctCount: number;
  totalCount: number;
  onComplete: () => void;
}

export default function QuizResult({
  theme,
  correctCount,
  totalCount,
  onComplete,
}: QuizResultProps) {
  const { t } = useI18n();
  const styles = createStyles(theme);
  const percentage = Math.round((correctCount / totalCount) * 100);
  const isPassed = percentage >= 60;

  return (
    <View style={styles.resultContent}>
      <Text style={styles.resultEmoji}>{isPassed ? '🎉' : '💪'}</Text>
      <Text style={styles.resultTitle}>
        {isPassed ? t('words.quiz.testPassed') : t('words.quiz.keepGoing')}
      </Text>

      <View style={styles.resultScoreContainer}>
        <Text style={[
          styles.resultScore,
          { color: isPassed ? theme.colors.success : theme.colors.warning }
        ]}>
          {percentage}%
        </Text>
        <Text style={styles.resultDetail}>
          {t('words.quiz.correct', { correct: correctCount, total: totalCount })}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.completeButton}
        onPress={onComplete}
        activeOpacity={0.8}
      >
        <Text style={styles.completeButtonText}>{t('words.quiz.continueLearning')}</Text>
      </TouchableOpacity>
    </View>
  );
}
