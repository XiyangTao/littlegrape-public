import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from '@/components/Icon';
import type { ImmersiveDialogueQuestion } from '@/api/modules/exercise';

interface Props {
  question: ImmersiveDialogueQuestion;
  isAnswered: boolean;
  onAnswer: (correct: boolean) => void;
  styles: any;
  theme: any;
}

export default function ImmersiveDialogueView({ question, isAnswered, onAnswer, styles, theme }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (option: string) => {
    if (isAnswered) return;
    setSelected(option);
    onAnswer(option === question.answer);
  };

  return (
    <View>
      <Text style={styles.questionType}>Choose the best response</Text>

      {/* 场景标题 */}
      <Text style={{ color: theme.colors.text.tertiary, fontSize: 13, marginBottom: 12, textAlign: 'center' }}>
        {question.context}
      </Text>

      {/* 对话列表 */}
      <View style={{ marginBottom: 16 }}>
        {question.dialogue.map((line, i) => {
          const isBlank = i === question.blankLineIndex;
          const displayText = isBlank
            ? (isAnswered ? (selected || '...') : '______')
            : line.text;

          return (
            <View key={i} style={{
              flexDirection: 'row',
              marginBottom: 10,
              paddingHorizontal: 4,
            }}>
              <Text style={{
                fontWeight: '700',
                color: theme.colors.primary,
                fontSize: 14,
                width: 80,
              }}>
                {line.speaker}:
              </Text>
              <View style={{
                flex: 1,
                backgroundColor: isBlank ? (theme.colors.primary + '10') : theme.colors.background.secondary,
                borderRadius: theme.spacing.borderRadius.base,
                padding: 12,
                borderWidth: isBlank ? 2 : 0,
                borderColor: isBlank ? theme.colors.primary + '40' : 'transparent',
                borderStyle: isBlank && !isAnswered ? 'dashed' : 'solid',
              }}>
                <Text style={{
                  color: isBlank && !isAnswered ? theme.colors.text.disabled : theme.colors.text.primary,
                  fontSize: 15,
                  lineHeight: 22,
                  fontStyle: isBlank && !isAnswered ? 'italic' : 'normal',
                }}>
                  {displayText}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* 选项 */}
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
            <Text style={[styles.optionText, { fontSize: 14 }]}>{option}</Text>
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
