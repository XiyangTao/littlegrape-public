import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from '@/components/Icon';
import type { ImmersiveReadingQuestion } from '@/api/modules/exercise';

interface Props {
  question: ImmersiveReadingQuestion;
  isAnswered: boolean;
  onAnswer: (correct: boolean) => void;
  styles: any;
  theme: any;
}

export default function ImmersiveReadingView({ question, isAnswered, onAnswer, styles, theme }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (option: string) => {
    if (isAnswered) return;
    setSelected(option);
    onAnswer(option === question.answer);
  };

  return (
    <View>
      <Text style={styles.questionType}>Read and answer</Text>

      {/* 英文文章 */}
      <View style={styles.promptCard}>
        <Text style={[styles.promptText, { fontSize: 16, lineHeight: 26 }]}>{question.passage}</Text>
      </View>

      {/* 英文问题 */}
      <Text style={[styles.questionType, { fontSize: 16, marginTop: 8 }]}>{question.questionText}</Text>

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

      {isAnswered && question.explanation && (
        <View style={{ backgroundColor: theme.colors.primary + '08', borderLeftWidth: 3, borderLeftColor: theme.colors.primary, borderRadius: theme.spacing.borderRadius.sm, padding: 12, marginTop: 12 }}>
          <Text style={{ color: theme.colors.text.primary, fontSize: 14, lineHeight: 22 }}>{question.explanation}</Text>
        </View>
      )}
    </View>
  );
}
