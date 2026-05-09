import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '@/components/Icon';
import { useTheme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import { useGrammarPractice, type GrammarQuestion } from './useGrammarPractice';
import createStyles from './styles';

export default function GrammarPracticeScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme);

  const {
    point,
    questions,
    currentIndex,
    currentQuestion,
    selectedAnswer,
    isAnswered,
    isCorrect,
    isLoading,
    isFinished,
    result,
    handleSelectOption,
    handleSubmit,
    handleNext,
    handleRetry,
    handleDone,
  } = useGrammarPractice();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  // 练习结果页
  if (isFinished && result) {
    const scoreColor = result.score >= 80 ? theme.colors.success : result.score >= 60 ? theme.colors.warning : theme.colors.error;
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.resultContainer}>
          <View style={[styles.resultScoreCircle, { borderColor: scoreColor }]}>
            <Text style={[styles.resultScore, { color: scoreColor }]}>{result.score}</Text>
            <Text style={styles.resultScoreUnit}>{t('learn.score')}</Text>
          </View>
          <Text style={styles.resultTitle}>{t('learn.practiceResult')}</Text>
          <View style={styles.resultStats}>
            <View style={styles.resultStatItem}>
              <Text style={[styles.resultStatValue, { color: theme.colors.success }]}>{result.correctCount}</Text>
              <Text style={styles.resultStatLabel}>{t('learn.correctCount')}</Text>
            </View>
            <View style={styles.resultStatItem}>
              <Text style={[styles.resultStatValue, { color: theme.colors.error }]}>{result.incorrectCount}</Text>
              <Text style={styles.resultStatLabel}>{t('learn.incorrectCount')}</Text>
            </View>
          </View>
          <View style={styles.resultButtons}>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry} activeOpacity={0.7}>
              <Text style={styles.retryButtonText}>{t('learn.retry')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.doneButton} onPress={handleDone} activeOpacity={0.8}>
              <Text style={styles.doneButtonText}>{t('learn.backToGrammar')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentQuestion) return null;

  const progress = (currentIndex + 1) / questions.length;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* 顶部导航 + 进度条 */}
      <View style={styles.progressHeader}>
        <View style={styles.progressRow}>
          <TouchableOpacity style={styles.closeButton} onPress={handleDone}>
            <Icon name="close" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progress * 100}%` as any }]} />
          </View>
          <Text style={styles.progressText}>{currentIndex + 1}/{questions.length}</Text>
        </View>
      </View>

      <ScrollView style={styles.questionSection} showsVerticalScrollIndicator={false}>
        {/* 题型标签 */}
        <Text style={styles.questionType}>
          {currentQuestion.type === 'choice' ? t('learn.chooseAnswer') : t('learn.fillInBlank')}
        </Text>

        {/* 题干 */}
        <Text style={styles.questionText}>{currentQuestion.question}</Text>

        {/* 选择题 */}
        {currentQuestion.type === 'choice' && currentQuestion.options && (
          <ChoiceOptions
            options={currentQuestion.options}
            selectedAnswer={selectedAnswer}
            correctAnswer={currentQuestion.answer}
            isAnswered={isAnswered}
            onSelect={handleSelectOption}
            styles={styles}
            theme={theme}
          />
        )}

        {/* 选词填空 */}
        {currentQuestion.type === 'fill_blank' && currentQuestion.options && (
          <WordBank
            options={currentQuestion.options}
            selectedAnswer={selectedAnswer}
            correctAnswer={currentQuestion.answer}
            isAnswered={isAnswered}
            onSelect={handleSelectOption}
            styles={styles}
            theme={theme}
          />
        )}

        {/* 解析 */}
        {isAnswered && (
          <View style={styles.explanationCard}>
            <View style={styles.explanationTitle}>
              <Icon
                name={isCorrect ? 'check-circle' : 'cancel'}
                size={18}
                color={isCorrect ? theme.colors.success : theme.colors.error}
              />
              <Text style={styles.explanationTitleText}>
                {isCorrect ? t('learn.correct') : t('learn.incorrect')}
              </Text>
            </View>
            {!isCorrect && (
              <Text style={styles.correctAnswer}>
                {t('learn.correct')}: {currentQuestion.answer}
              </Text>
            )}
            <Text style={styles.explanationText}>{currentQuestion.explanation}</Text>
          </View>
        )}

        <View style={{ height: 16 }} />
      </ScrollView>

      {/* 底部按钮 */}
      <View style={styles.bottomBar}>
        {!isAnswered ? (
          <TouchableOpacity
            style={[styles.nextButton, !selectedAnswer && styles.nextButtonDisabled]}
            onPress={handleSubmit}
            activeOpacity={0.8}
            disabled={!selectedAnswer}
          >
            <Text style={styles.nextButtonText}>{t('learn.submitAnswer')}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <Text style={styles.nextButtonText}>
              {currentIndex >= questions.length - 1 ? t('learn.practiceResult') : t('learn.nextQuestion')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

// 选择题选项
function ChoiceOptions({
  options, selectedAnswer, correctAnswer, isAnswered, onSelect, styles, theme,
}: {
  options: string[];
  selectedAnswer: string | null;
  correctAnswer: string;
  isAnswered: boolean;
  onSelect: (option: string) => void;
  styles: any;
  theme: any;
}) {
  return (
    <View>
      {options.map((option) => {
        const isSelected = selectedAnswer === option;
        const isCorrectOption = option === correctAnswer;

        let optionStyle = styles.optionButton;
        if (isAnswered) {
          if (isCorrectOption) {
            optionStyle = [styles.optionButton, styles.optionCorrect];
          } else if (isSelected && !isCorrectOption) {
            optionStyle = [styles.optionButton, styles.optionIncorrect];
          }
        } else if (isSelected) {
          optionStyle = [styles.optionButton, styles.optionSelected];
        }

        return (
          <TouchableOpacity
            key={option}
            style={optionStyle}
            onPress={() => onSelect(option)}
            activeOpacity={0.7}
            disabled={isAnswered}
          >
            <Text style={styles.optionText}>{option}</Text>
            {isAnswered && isCorrectOption && (
              <Icon name="check-circle" size={20} color={theme.colors.success} style={styles.optionIcon} />
            )}
            {isAnswered && isSelected && !isCorrectOption && (
              <Icon name="cancel" size={20} color={theme.colors.error} style={styles.optionIcon} />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// 选词填空
function WordBank({
  options, selectedAnswer, correctAnswer, isAnswered, onSelect, styles, theme,
}: {
  options: string[];
  selectedAnswer: string | null;
  correctAnswer: string;
  isAnswered: boolean;
  onSelect: (option: string) => void;
  styles: any;
  theme: any;
}) {
  return (
    <View style={styles.wordBankContainer}>
      {options.map((option) => {
        const isSelected = selectedAnswer === option;
        const isCorrectOption = option === correctAnswer;

        let chipStyle = [styles.wordChip];
        let textStyle = [styles.wordChipText];
        if (isAnswered) {
          if (isCorrectOption) {
            chipStyle.push(styles.wordChipCorrect);
            textStyle.push(styles.wordChipTextCorrect);
          } else if (isSelected && !isCorrectOption) {
            chipStyle.push(styles.wordChipIncorrect);
            textStyle.push(styles.wordChipTextIncorrect);
          }
        } else if (isSelected) {
          chipStyle.push(styles.wordChipSelected);
          textStyle.push(styles.wordChipTextSelected);
        }

        return (
          <TouchableOpacity
            key={option}
            style={chipStyle}
            onPress={() => onSelect(option)}
            activeOpacity={0.7}
            disabled={isAnswered}
          >
            <Text style={textStyle}>{option}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
