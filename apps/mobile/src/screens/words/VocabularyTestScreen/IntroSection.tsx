import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import Icon from '@/components/Icon';
import {
  getVocabularyLevelInfo,
  CAT_CONFIG,
} from '@/services/VocabularyTestService';
import { getLocalDateString } from '@/utils/dateUtils';

interface IntroSectionProps {
  vocabularyTest: {
    estimatedVocabulary: number;
    level: string;
    eventTime: number;
  } | null;
  isLoading: boolean;
  onStartTest: () => void;
  styles: any;
}

const IntroSection = React.memo(({ vocabularyTest, isLoading, onStartTest, styles }: IntroSectionProps) => {
  const { theme } = useTheme();
  const { t } = useI18n();

  // 如果已有测试结果，显示结果概要
  if (vocabularyTest) {
    const levelInfo = getVocabularyLevelInfo(vocabularyTest.estimatedVocabulary);
    const dateStr = getLocalDateString(vocabularyTest.eventTime);

    return (
      <View style={styles.introContainer}>
        {/* 已有结果展示 */}
        <View style={styles.existingResultCard}>
          <Text style={styles.existingResultLabel}>{t('vocabTest.lastResult')}</Text>
          <Text style={styles.existingResultValue}>
            {vocabularyTest.estimatedVocabulary.toLocaleString()}
          </Text>
          <View style={[styles.existingLevelBadge, { backgroundColor: theme.colors.primary + '15' }]}>
            <Text style={[styles.existingLevelText, { color: theme.colors.primary }]}>
              {vocabularyTest.level}
            </Text>
          </View>
          <Text style={styles.existingResultDate}>{t('vocabTest.testDate', { date: dateStr })}</Text>
        </View>

        <View style={styles.introInfoList}>
          <View style={styles.introInfoItem}>
            <Icon name="info-outline" size={20} color={theme.colors.text.tertiary} />
            <Text style={styles.introInfoText}>
              {t('vocabTest.retestWarning')}
            </Text>
          </View>
          <View style={styles.introInfoItem}>
            <Icon name="check-circle" size={20} color={theme.colors.success} />
            <Text style={styles.introInfoText}>
              {t('vocabTest.questionCount', { min: CAT_CONFIG.minQuestions, max: CAT_CONFIG.maxQuestions })}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.startButton}
          onPress={onStartTest}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color={theme.colors.text.inverse} />
          ) : (
            <>
              <Icon name="refresh" size={24} color={theme.colors.text.inverse} />
              <Text style={styles.startButtonText}>{t('vocabTest.retest')}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  // 首次测试介绍
  return (
    <View style={styles.introContainer}>
      <View style={styles.introIconWrap}>
        <Icon name="analytics" size={64} color={theme.colors.primary} />
      </View>

      <Text style={styles.introTitle}>{t('vocabTest.title')}</Text>
      <Text style={styles.introSubtitle}>{t('vocabTest.subtitle')}</Text>

      <View style={styles.introInfoList}>
        <View style={styles.introInfoItem}>
          <Icon name="check-circle" size={20} color={theme.colors.success} />
          <Text style={styles.introInfoText}>
            {t('vocabTest.info1')}
          </Text>
        </View>
        <View style={styles.introInfoItem}>
          <Icon name="check-circle" size={20} color={theme.colors.success} />
          <Text style={styles.introInfoText}>
            {t('vocabTest.info2')}
          </Text>
        </View>
        <View style={styles.introInfoItem}>
          <Icon name="check-circle" size={20} color={theme.colors.success} />
          <Text style={styles.introInfoText}>
            {t('vocabTest.questionCount', { min: CAT_CONFIG.minQuestions, max: CAT_CONFIG.maxQuestions })}
          </Text>
        </View>
        <View style={styles.introInfoItem}>
          <Icon name="check-circle" size={20} color={theme.colors.success} />
          <Text style={styles.introInfoText}>
            {t('vocabTest.info4')}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.startButton}
        onPress={onStartTest}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator color={theme.colors.text.inverse} />
        ) : (
          <>
            <Icon name="play-arrow" size={24} color={theme.colors.text.inverse} />
            <Text style={styles.startButtonText}>{t('vocabTest.startTest')}</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
});

export default IntroSection;
