import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { createStyles } from '../styles';
import { Theme } from '@/context/ThemeProvider';

import type { QuizQuestion } from '@/api/modules/reading';

interface QuizStepProps {
  currentIndex: number;
  totalCount: number;
  question: QuizQuestion;
  selectedAnswer: string | null;
  isChecked: boolean;
  isSubmitting: boolean;
  onSelect: (answer: string) => void;
  onCheck: () => void;
  onNext: () => void;
  theme: Theme;
  t: (key: string) => string;
}

export function QuizStep({
  currentIndex,
  totalCount,
  question,
  selectedAnswer,
  isChecked,
  isSubmitting,
  onSelect,
  onCheck,
  onNext,
  theme,
  t,
}: QuizStepProps) {
  const styles = createStyles(theme);
  const isLastQuestion = currentIndex === totalCount - 1;

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.quizHeader}>
        <Text style={styles.quizProgress}>
          {currentIndex + 1} / {totalCount}
        </Text>
      </View>

      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.quizQuestionCard}>
          <Text style={styles.quizQuestionText}>{question.question}</Text>
          <Text style={styles.quizQuestionZh}>{question.questionZh}</Text>

          {question.options.map((option, index) => {
            const isSelected = selectedAnswer === option;
            const isCorrectAnswer = option === question.answer;

            let optionStyle = styles.quizOption;
            if (isChecked) {
              if (isCorrectAnswer) {
                optionStyle = { ...styles.quizOption, ...styles.quizOptionCorrect };
              } else if (isSelected && !isCorrectAnswer) {
                optionStyle = { ...styles.quizOption, ...styles.quizOptionWrong };
              }
            } else if (isSelected) {
              optionStyle = { ...styles.quizOption, ...styles.quizOptionSelected };
            }

            return (
              <TouchableOpacity
                key={index}
                style={optionStyle}
                onPress={() => onSelect(option)}
                disabled={isChecked}
                activeOpacity={0.7}
              >
                <Text style={styles.quizOptionText}>{option}</Text>
              </TouchableOpacity>
            );
          })}

          {isChecked && (
            <View style={styles.quizExplanation}>
              <Text style={styles.quizExplanationText}>{question.explanation}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        {!isChecked ? (
          <TouchableOpacity
            style={[styles.nextButton, !selectedAnswer && styles.nextButtonDisabled]}
            onPress={onCheck}
            disabled={!selectedAnswer}
            activeOpacity={0.7}
          >
            <Text style={styles.nextButtonText}>{t('intensiveReading.checkAnswer')}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.nextButton, isSubmitting && styles.nextButtonDisabled]}
            onPress={onNext}
            disabled={isSubmitting}
            activeOpacity={0.7}
          >
            {isSubmitting ? (
              <ActivityIndicator color={theme.colors.text.inverse} />
            ) : (
              <Text style={styles.nextButtonText}>
                {isLastQuestion ? t('intensiveReading.viewResult') : t('intensiveReading.nextQuestion')}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
