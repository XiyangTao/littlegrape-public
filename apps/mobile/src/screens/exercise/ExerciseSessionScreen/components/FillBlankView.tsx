import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from '@/components/Icon';
import { useI18n } from '@/context/I18nProvider';
import type { FillBlankQuestion } from '@/api/modules/exercise';

interface Props {
  question: FillBlankQuestion;
  isAnswered: boolean;
  onAnswer: (correct: boolean) => void;
  onSubmitReady: (ready: boolean) => void;
  styles: any;
  theme: any;
  // 由父组件控制提交
  submitRef: React.MutableRefObject<(() => void) | null>;
}

export default function FillBlankView({ question, isAnswered, onAnswer, onSubmitReady, styles, theme, submitRef }: Props) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<string | null>(null);

  // 注册提交函数
  submitRef.current = () => {
    if (selected) {
      onAnswer(selected === question.answer);
    }
  };

  const handleSelect = (option: string) => {
    if (isAnswered) return;
    setSelected(option);
    onSubmitReady(true);
  };

  // 将 _____ 替换为选中的词（带高亮）
  const displaySentence = selected
    ? question.sentence.replace('_____', selected)
    : question.sentence;

  return (
    <View>
      <Text style={styles.questionType}>{t('exercise.fillBlank.prompt')}</Text>

      <View style={styles.promptCard}>
        <Text style={styles.promptText}>{displaySentence}</Text>
      </View>

      <View style={styles.wordBankContainer}>
        {question.options.map((option) => {
          const isSelected = selected === option;
          const isCorrectOption = option === question.answer;

          let chipStyle = [styles.wordChip];
          if (isAnswered) {
            if (isCorrectOption) chipStyle.push(styles.wordChipCorrect);
            else if (isSelected && !isCorrectOption) chipStyle.push(styles.wordChipIncorrect);
          } else if (isSelected) {
            chipStyle.push(styles.wordChipSelected);
          }

          return (
            <TouchableOpacity
              key={option}
              style={chipStyle}
              onPress={() => handleSelect(option)}
              activeOpacity={0.7}
              disabled={isAnswered}
            >
              <Text style={[
                styles.wordChipText,
                isSelected && !isAnswered && styles.wordChipTextSelected,
              ]}>{option}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isAnswered && (
        <View style={[styles.feedbackBar, selected === question.answer ? styles.feedbackBarCorrect : styles.feedbackBarIncorrect]}>
          <Icon
            name={selected === question.answer ? 'check-circle' : 'cancel'}
            size={18}
            color={selected === question.answer ? theme.colors.success : theme.colors.error}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.feedbackText, selected === question.answer ? styles.feedbackCorrectText : styles.feedbackIncorrectText]}>
              {selected === question.answer ? t('exercise.correct') : t('exercise.incorrect')}
            </Text>
            {selected !== question.answer && (
              <Text style={styles.feedbackAnswer}>{t('exercise.correctAnswer')}: {question.answer}</Text>
            )}
            {question.explanation && (
              <Text style={styles.feedbackAnswer}>{question.explanation}</Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
}
