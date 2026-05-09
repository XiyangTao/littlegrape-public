import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from '@/components/Icon';
import { useI18n } from '@/context/I18nProvider';
import type { ReadRespondQuestion } from '@/api/modules/exercise';

interface Props {
  question: ReadRespondQuestion;
  isAnswered: boolean;
  onAnswer: (correct: boolean) => void;
  styles: any;
  theme: any;
}

export default function ReadRespondView({ question, isAnswered, onAnswer, styles, theme }: Props) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (option: string) => {
    if (isAnswered) return;
    setSelected(option);
    onAnswer(option === question.answer);
  };

  // 渲染句子，高亮指定词
  const renderSentence = () => {
    const idx = question.sentence.indexOf(question.highlightWord);
    if (idx === -1) {
      return <Text style={styles.promptText}>{question.sentence}</Text>;
    }
    const before = question.sentence.slice(0, idx);
    const word = question.sentence.slice(idx, idx + question.highlightWord.length);
    const after = question.sentence.slice(idx + question.highlightWord.length);
    return (
      <Text style={styles.promptText}>
        {before}
        <Text style={styles.highlightWord}>{word}</Text>
        {after}
      </Text>
    );
  };

  return (
    <View>
      <Text style={styles.questionType}>{t('exercise.readRespond.prompt')}</Text>

      <View style={styles.promptCard}>
        {renderSentence()}
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
