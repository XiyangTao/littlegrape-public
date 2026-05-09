/**
 * 词汇量测试界面
 *
 * 基于 IRT-CAT 自适应测试算法
 * - 使用 Rasch 模型估算用户能力 θ
 * - 自适应选题：选择难度接近当前 θ 的单词
 * - 最小 50 题，最大 80 题，精度达标可提前结束
 * - 词汇量 = BNC Level × 1000
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import Icon from '@/components/Icon';
import { createStyles } from './styles';
import useVocabTest from './useVocabTest';
import IntroSection from './IntroSection';
import TestingSection from './TestingSection';
import ResultSection from './ResultSection';

export default function VocabularyTestScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme, insets);

  const {
    testState,
    currentQuestion,
    result,
    isLoading,
    selectedOption,
    showFeedback,
    vocabularyTest,
    progress,
    fadeAnim,
    slideAnim,
    handleStartTest,
    handleAnswer,
    handleRetry,
    handleGoBack,
  } = useVocabTest();

  return (
    <View style={styles.container}>
      {/* 顶部导航栏 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleGoBack}
          activeOpacity={0.7}
        >
          <Icon name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('vocabTest.title')}</Text>
        <View style={styles.headerRight} />
      </View>

      {/* 内容区 */}
      {testState === 'intro' && (
        <IntroSection
          vocabularyTest={vocabularyTest}
          isLoading={isLoading}
          onStartTest={handleStartTest}
          styles={styles}
        />
      )}
      {testState === 'testing' && currentQuestion && progress && (
        <TestingSection
          currentQuestion={currentQuestion}
          progress={progress}
          selectedOption={selectedOption}
          showFeedback={showFeedback}
          fadeAnim={fadeAnim}
          slideAnim={slideAnim}
          onAnswer={handleAnswer}
          styles={styles}
        />
      )}
      {testState === 'result' && result && (
        <ResultSection
          result={result}
          onRetry={handleRetry}
          onGoBack={handleGoBack}
          styles={styles}
        />
      )}
    </View>
  );
}
