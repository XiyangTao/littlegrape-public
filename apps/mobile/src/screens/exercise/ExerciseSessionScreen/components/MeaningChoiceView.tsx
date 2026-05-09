import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from '@/components/Icon';
import { useI18n } from '@/context/I18nProvider';
import type { MeaningChoiceQuestion } from '@/api/modules/exercise';

interface Props {
  question: MeaningChoiceQuestion;
  isAnswered: boolean;
  onAnswer: (correct: boolean) => void;
  styles: any;
  theme: any;
}

export default function MeaningChoiceView({ question, isAnswered, onAnswer, styles, theme }: Props) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (option: string) => {
    if (isAnswered) return;
    setSelected(option);
    onAnswer(option === question.answer);
  };

  return (
    <View>
      <Text style={styles.questionType}>{t('exercise.meaningChoice.prompt')}</Text>
      <View style={styles.promptCard}>
        <Text style={styles.promptText}>{question.sentence}</Text>
      </View>
      {question.options.map((option) => {
        const isSelected = selected === option;
        const isCorrectOption = option === question.answer;

        let optionStyle = [styles.optionButton];
        if (isAnswered) {
          if (isCorrectOption) optionStyle.push(styles.optionCorrect);
          else if (isSelected) optionStyle.push(styles.optionIncorrect);
        } else if (isSelected) {
          optionStyle.push(styles.optionSelected);
        }

        return (
          <TouchableOpacity
            key={option}
            style={optionStyle}
            onPress={() => handleSelect(option)}
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
