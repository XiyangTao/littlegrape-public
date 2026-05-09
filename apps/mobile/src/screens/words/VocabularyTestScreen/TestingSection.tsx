import React from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { useTheme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import Icon from '@/components/Icon';
import type { TestQuestion } from '@/services/VocabularyTestService';

interface TestingSectionProps {
  currentQuestion: TestQuestion;
  progress: {
    currentQuestion: number;
    progressPercent: number;
  };
  selectedOption: string | null;
  showFeedback: boolean;
  fadeAnim: Animated.Value;
  slideAnim: Animated.Value;
  onAnswer: (optionId: string) => void;
  styles: any;
}

const TestingSection = React.memo(({
  currentQuestion,
  progress,
  selectedOption,
  showFeedback,
  fadeAnim,
  slideAnim,
  onAnswer,
  styles,
}: TestingSectionProps) => {
  const { theme } = useTheme();
  const { t } = useI18n();

  const progressPercent = progress.progressPercent;

  // 获取选项的样式
  const getOptionStyle = (option: { id: string; isCorrect: boolean }) => {
    if (!showFeedback) {
      return styles.optionButton;
    }

    if (option.isCorrect) {
      return [styles.optionButton, styles.optionCorrect];
    }

    if (selectedOption === option.id && !option.isCorrect) {
      return [styles.optionButton, styles.optionWrong];
    }

    return [styles.optionButton, styles.optionDisabled];
  };

  // 获取选项文字的样式
  const getOptionTextStyle = (option: { id: string; isCorrect: boolean }) => {
    if (!showFeedback) {
      return styles.optionText;
    }

    if (option.isCorrect) {
      return [styles.optionText, styles.optionTextCorrect];
    }

    if (selectedOption === option.id && !option.isCorrect) {
      return [styles.optionText, styles.optionTextWrong];
    }

    return [styles.optionText, styles.optionTextDisabled];
  };

  return (
    <View style={styles.testingContainer}>
      {/* 顶部进度 */}
      <View style={styles.progressHeader}>
        <View style={styles.progressInfo}>
          <Text style={styles.progressText}>
            {t('vocabTest.questionNumber', { n: progress.currentQuestion + 1 })}
          </Text>
        </View>
      </View>

      {/* 进度条 */}
      <View style={styles.progressBar}>
        <View
          style={[styles.progressFill, { width: `${progressPercent}%` }]}
        />
      </View>

      {/* 单词卡片 */}
      <Animated.View
        style={[
          styles.wordCard,
          {
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        <Text style={styles.wordText}>{currentQuestion.word}</Text>
        {currentQuestion.phoneticUs && (
          <Text style={styles.phoneticText}>{currentQuestion.phoneticUs}</Text>
        )}
      </Animated.View>

      {/* 4选1选项 + 不认识 */}
      <View style={styles.optionsContainer}>
        <Text style={styles.questionPrompt}>{t('vocabTest.questionPrompt')}</Text>

        {currentQuestion.options.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={getOptionStyle(option)}
            onPress={() => onAnswer(option.id)}
            activeOpacity={0.7}
            disabled={showFeedback}
          >
            <View style={styles.optionIdContainer}>
              <Text style={[
                styles.optionId,
                showFeedback && option.isCorrect && styles.optionIdCorrect,
                showFeedback && selectedOption === option.id && !option.isCorrect && styles.optionIdWrong,
              ]}>
                {option.id}
              </Text>
            </View>
            <Text style={getOptionTextStyle(option)} numberOfLines={2}>
              {option.text}
            </Text>
            {showFeedback && option.isCorrect && (
              <Icon name="check-circle" size={20} color={theme.colors.success} />
            )}
            {showFeedback && selectedOption === option.id && !option.isCorrect && (
              <Icon name="close" size={20} color={theme.colors.error} />
            )}
          </TouchableOpacity>
        ))}

        {/* 不认识按钮 */}
        <TouchableOpacity
          style={[
            styles.skipButton,
            showFeedback && selectedOption === 'SKIP' && styles.skipButtonSelected,
          ]}
          onPress={() => onAnswer('SKIP')}
          activeOpacity={0.7}
          disabled={showFeedback}
        >
          <Icon
            name="help-outline"
            size={18}
            color={showFeedback && selectedOption === 'SKIP'
              ? theme.colors.text.inverse
              : theme.colors.text.tertiary}
          />
          <Text style={[
            styles.skipButtonText,
            showFeedback && selectedOption === 'SKIP' && styles.skipButtonTextSelected,
          ]}>
            {t('vocabTest.dontKnow')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

export default TestingSection;
