import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from '@/components/Icon';
import type { ImmersiveFillQuestion } from '@/api/modules/exercise';

interface Props {
  question: ImmersiveFillQuestion;
  isAnswered: boolean;
  onAnswer: (correct: boolean) => void;
  onSubmitReady: (ready: boolean) => void;
  styles: any;
  theme: any;
  submitRef: React.MutableRefObject<(() => void) | null>;
}

export default function ImmersiveFillView({ question, isAnswered, onAnswer, onSubmitReady, styles, theme, submitRef }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

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

  const displaySentence = selected
    ? question.blankSentence.replace('_____', selected)
    : question.blankSentence;

  return (
    <View>
      <Text style={styles.questionType}>Read and fill in the blank</Text>

      {/* 段落上下文 */}
      <View style={[styles.promptCard, { marginBottom: 8 }]}>
        <Text style={[styles.promptSubText, { fontSize: 14, lineHeight: 22 }]}>{question.passage}</Text>
      </View>

      {/* 带空白的句子 */}
      <View style={styles.promptCard}>
        <Text style={[styles.promptText, { fontSize: 18 }]}>{displaySentence}</Text>
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
              {selected === question.answer ? 'Correct!' : 'Incorrect'}
            </Text>
            {selected !== question.answer && (
              <Text style={styles.feedbackAnswer}>Answer: {question.answer}</Text>
            )}
            <Text style={[styles.feedbackAnswer, { marginTop: 4 }]}>{question.explanation}</Text>
          </View>
        </View>
      )}
    </View>
  );
}
