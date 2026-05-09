import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from '@/components/Icon';
import { useTTS } from '@/hooks/useTTS';
import { useI18n } from '@/context/I18nProvider';
import type { ListenChoiceQuestion } from '@/api/modules/exercise';

interface Props {
  question: ListenChoiceQuestion;
  isAnswered: boolean;
  onAnswer: (correct: boolean) => void;
  styles: any;
  theme: any;
}

export default function ListenChoiceView({ question, isAnswered, onAnswer, styles, theme }: Props) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<string | null>(null);
  const tts = useTTS();

  // 自动播放
  useEffect(() => {
    tts.speak(`listen_${question.id}`, question.audio, 'en-US-JennyNeural');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id, question.audio]);

  const handleSelect = (option: string) => {
    if (isAnswered) return;
    setSelected(option);
    onAnswer(option === question.answer);
  };

  return (
    <View>
      <Text style={styles.questionType}>{t('exercise.listenChoice.prompt')}</Text>

      <TouchableOpacity
        style={[styles.ttsButton, tts.isPlaying && styles.ttsButtonPlaying]}
        onPress={() => tts.speak(`listen_${question.id}`, question.audio, 'en-US-JennyNeural')}
        activeOpacity={0.7}
      >
        <Icon name="volume-up" size={36} color={theme.colors.primary} />
      </TouchableOpacity>

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
