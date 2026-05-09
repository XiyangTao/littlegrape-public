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

export default function ErrorCorrectionQuiz({
  question, selectedAnswer, isAnswered, isCorrect, onSelect, styles, theme,
}: Props) {
  const { t } = useI18n();

  // 渲染带错误标注的句子
  const renderSentence = () => {
    if (!question.errorPart) {
      return <Text style={styles.sentenceWithError}>{question.question}</Text>;
    }

    const parts = question.question.split(question.errorPart);
    if (parts.length < 2) {
      return <Text style={styles.sentenceWithError}>{question.question}</Text>;
    }

    return (
      <Text style={styles.sentenceWithError}>
        {parts[0]}
        <Text style={styles.errorUnderline}>{question.errorPart}</Text>
        {parts.slice(1).join(question.errorPart)}
      </Text>
    );
  };

  return (
    <View>
      <Text style={styles.questionType}>{t('learn.selectCorrection')}</Text>

      {/* 带错误标注的句子 */}
      {renderSentence()}

      {/* 4 个替换选项 */}
      {question.options?.map((option) => {
        const isSelected = selectedAnswer === option;
        const isCorrectOption = option === question.answer;

        let optionStyle = [styles.optionButton];
        if (isAnswered) {
          if (isCorrectOption) {
            optionStyle.push(styles.optionCorrect);
          } else if (isSelected && !isCorrectOption) {
            optionStyle.push(styles.optionIncorrect);
          }
        } else if (isSelected) {
          optionStyle.push(styles.optionSelected);
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

      {/* 答题后显示完整修正句 */}
      {isAnswered && question.correctVersion && (
        <Text style={styles.correctedSentence}>
          {question.correctVersion}
        </Text>
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
          <Text style={styles.explanationText}>{question.explanation}</Text>
        </View>
      )}
    </View>
  );
}
