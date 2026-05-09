import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from '@/components/Icon';
import type { Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import type { MultipleChoiceQuestion } from './useQuizState';
import { createStyles } from './styles';

interface MultipleChoiceQuizProps {
  theme: Theme;
  questions: MultipleChoiceQuestion[];
  currentQuestionIndex: number;
  selectedOptionIndex: number | null;
  showAnswer: boolean;
  onOptionPress: (index: number) => void;
  onNextQuestion: () => void;
}

export default function MultipleChoiceQuiz({
  theme,
  questions,
  currentQuestionIndex,
  selectedOptionIndex,
  showAnswer,
  onOptionPress,
  onNextQuestion,
}: MultipleChoiceQuizProps) {
  const { t } = useI18n();
  const styles = createStyles(theme);
  const question = questions[currentQuestionIndex];
  if (!question) return null;

  return (
    <View style={styles.quizContent}>
      <Text style={styles.quizTitle}>{t('words.quiz.multipleChoice')}</Text>
      <Text style={styles.quizSubtitle}>{t('words.quiz.multipleChoiceHint')}</Text>

      <View style={styles.questionContainer}>
        <Text style={styles.questionWord}>{question.word.word}</Text>
        {question.word.phoneticUs && (
          <Text style={styles.questionPhonetic}>{question.word.phoneticUs}</Text>
        )}
      </View>

      <View style={styles.optionsContainer}>
        {question.options.map((option, index) => {
          const isSelected = selectedOptionIndex === index;
          const isCorrect = index === question.correctIndex;
          const showCorrect = showAnswer && isCorrect;
          const showWrong = showAnswer && isSelected && !isCorrect;

          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.optionItem,
                isSelected && !showAnswer && styles.optionItemSelected,
                showCorrect && styles.optionItemCorrect,
                showWrong && styles.optionItemWrong,
              ]}
              onPress={() => onOptionPress(index)}
              disabled={showAnswer}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.optionText,
                showCorrect && styles.optionTextCorrect,
                showWrong && styles.optionTextWrong,
              ]}>
                {option}
              </Text>
              {showCorrect && (
                <Icon name="check-circle" size={20} color={theme.colors.success} />
              )}
              {showWrong && (
                <Icon name="cancel" size={20} color={theme.colors.error} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {showAnswer && (
        <TouchableOpacity
          style={styles.nextButton}
          onPress={onNextQuestion}
          activeOpacity={0.8}
        >
          <Text style={styles.nextButtonText}>
            {currentQuestionIndex < questions.length - 1 ? '下一题' : '查看结果'}
          </Text>
          <Icon name="arrow-forward" size={20} color={theme.colors.text.inverse} />
        </TouchableOpacity>
      )}

      <View style={styles.progressInfo}>
        <Text style={styles.progressText}>
          {currentQuestionIndex + 1} / {questions.length}
        </Text>
      </View>
    </View>
  );
}
