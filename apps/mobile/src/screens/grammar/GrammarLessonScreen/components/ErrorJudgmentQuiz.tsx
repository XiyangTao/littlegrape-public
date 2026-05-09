import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from '@/components/Icon';
import { useI18n } from '@/context/I18nProvider';
import type { LessonQuestion } from '@/api/modules/grammar';

interface Props {
  question: LessonQuestion;
  selectedAnswer: string | null;
  isAnswered: boolean;
  isCorrect: boolean;
  onSelect: (answer: string) => void;
  styles: any;
  theme: any;
}

export default function ErrorJudgmentQuiz({
  question, selectedAnswer, isAnswered, isCorrect, onSelect, styles, theme,
}: Props) {
  const { t } = useI18n();

  const getButtonStyle = (value: string) => {
    const base = [styles.judgmentButton];
    if (isAnswered) {
      const isThisCorrect = value === question.answer;
      if (isThisCorrect) {
        base.push(styles.judgmentButtonCorrectResult);
      } else if (selectedAnswer === value && !isThisCorrect) {
        base.push(styles.judgmentButtonIncorrectResult);
      }
    } else if (selectedAnswer === value) {
      base.push(styles.judgmentButtonSelected);
    }
    return base;
  };

  return (
    <View>
      {/* 句子大字显示 */}
      <Text style={styles.questionText}>{question.question}</Text>

      {/* 两个大按钮 */}
      <View style={styles.judgmentContainer}>
        <TouchableOpacity
          style={getButtonStyle('correct')}
          onPress={() => onSelect('correct')}
          disabled={isAnswered}
          activeOpacity={0.7}
        >
          <Icon
            name="check-circle"
            size={28}
            color={isAnswered && question.answer === 'correct'
              ? theme.colors.success
              : selectedAnswer === 'correct' ? theme.colors.primary : theme.colors.text.secondary}
          />
          <Text style={styles.judgmentButtonText}>{t('learn.judgeCorrect')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={getButtonStyle('incorrect')}
          onPress={() => onSelect('incorrect')}
          disabled={isAnswered}
          activeOpacity={0.7}
        >
          <Icon
            name="cancel"
            size={28}
            color={isAnswered && question.answer === 'incorrect'
              ? theme.colors.success
              : selectedAnswer === 'incorrect' ? theme.colors.primary : theme.colors.text.secondary}
          />
          <Text style={styles.judgmentButtonText}>{t('learn.judgeIncorrect')}</Text>
        </TouchableOpacity>
      </View>

      {/* 答题后反馈 */}
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
          {question.answer === 'correct' ? (
            <Text style={styles.explanationText}>{t('learn.sentenceCorrect')}</Text>
          ) : (
            <>
              {question.errorPart ? (
                <Text style={styles.correctAnswer}>
                  {t('learn.correctSentence')}: {question.correctVersion}
                </Text>
              ) : null}
            </>
          )}
          <Text style={styles.explanationText}>{question.explanation}</Text>
        </View>
      )}
    </View>
  );
}
