/**
 * 练习结果页
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import Icon from '@/components/Icon';
import type { LocalWord } from '@/types/word';
import type { PracticeResult } from './usePractice';

interface ResultViewProps {
  styles: any;
  practiceResult: PracticeResult | null;
  masteredWords: LocalWord[];
  wrongWords: LocalWord[];
  onRetry: () => void;
  onBack: () => void;
}

export default function ResultView({
  styles,
  practiceResult,
  masteredWords,
  wrongWords,
  onRetry,
  onBack,
}: ResultViewProps) {
  const { theme } = useTheme();
  const { t } = useI18n();

  const rate = practiceResult && practiceResult.totalCount > 0
    ? Math.round((practiceResult.correctCount / practiceResult.totalCount) * 100)
    : 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('wordPractice.resultTitle')}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.centerContent}>
        <Text style={styles.resultEmoji}>{'\uD83D\uDCAA'}</Text>
        <Text style={styles.resultTitle}>{t('wordPractice.resultTitle')}!</Text>

        <Text style={styles.resultRate}>{rate}%</Text>
        <Text style={styles.resultDetail}>
          {t('wordPractice.correctDetail', { correct: practiceResult?.correctCount, total: practiceResult?.totalCount })}
        </Text>

        {masteredWords.length > 0 && (
          <View style={styles.masteredSection}>
            <Text style={styles.masteredSectionTitle}>
              {t('wordPractice.masteredSection', { count: masteredWords.length })}
            </Text>
            {masteredWords.map(w => (
              <View key={w.id} style={styles.masteredWordItem}>
                <Text style={styles.masteredWord}>
                  {w.word}
                  <Text style={styles.masteredMeaning}>  {w.meaningCn}</Text>
                </Text>
              </View>
            ))}
          </View>
        )}

        {wrongWords.length > 0 && (
          <View style={styles.wrongSection}>
            <Text style={styles.wrongSectionTitle}>
              {t('wordPractice.wrongSection', { count: wrongWords.length })}
            </Text>
            {wrongWords.map(w => (
              <View key={w.id} style={styles.wrongWordItem}>
                <Text style={styles.wrongWord}>
                  {w.word}
                  <Text style={styles.wrongMeaning}>  {w.meaningCn}</Text>
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.resultButtons}>
          <TouchableOpacity style={styles.retryButton} onPress={onRetry} activeOpacity={0.8}>
            <Text style={styles.retryButtonText}>{t('wordPractice.retry')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButton2} onPress={onBack} activeOpacity={0.8}>
            <Text style={styles.backButtonText}>{t('wordPractice.back')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
