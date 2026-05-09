import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from '@/components/Icon';
import { useTTS } from '@/hooks/useTTS';
import { useI18n } from '@/context/I18nProvider';
import type { MinimalPairsQuestion } from '@/api/modules/exercise';

interface Props {
  question: MinimalPairsQuestion;
  isAnswered: boolean;
  onAnswer: (correct: boolean) => void;
  styles: any;
  theme: any;
}

export default function MinimalPairsView({ question, isAnswered, onAnswer, styles, theme }: Props) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<string | null>(null);
  const tts = useTTS();

  // 自动播放目标词
  useEffect(() => {
    tts.speak(`mp_${question.id}`, question.targetWord, 'en-US-JennyNeural');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id, question.targetWord]);

  const handleSelect = (option: string) => {
    if (isAnswered) return;
    setSelected(option);
    onAnswer(option === question.targetWord);
  };

  return (
    <View>
      <Text style={styles.questionType}>{t('exercise.minimalPairs.prompt')}</Text>

      <TouchableOpacity
        style={[styles.ttsButton, tts.isPlaying && styles.ttsButtonPlaying]}
        onPress={() => tts.speak(`mp_${question.id}`, question.targetWord, 'en-US-JennyNeural')}
        activeOpacity={0.7}
      >
        <Icon name="volume-up" size={36} color={theme.colors.primary} />
      </TouchableOpacity>

      <View style={{ gap: 12, marginTop: 24 }}>
        {question.options.map((option) => {
          const isSelected = selected === option;
          const isCorrectOption = option === question.targetWord;

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
              <Text style={[styles.optionText, { fontSize: 22, fontWeight: '600', textAlign: 'center' }]}>{option}</Text>
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

      {isAnswered && (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 24, marginTop: 20 }}>
          <TouchableOpacity
            onPress={() => tts.speak(`mp_a_${question.id}`, question.options[0], 'en-US-JennyNeural')}
            style={{ alignItems: 'center' }}
          >
            <Icon name="volume-up" size={24} color={theme.colors.text.secondary} />
            <Text style={{ color: theme.colors.text.secondary, marginTop: 4 }}>{question.options[0]}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => tts.speak(`mp_b_${question.id}`, question.options[1], 'en-US-JennyNeural')}
            style={{ alignItems: 'center' }}
          >
            <Icon name="volume-up" size={24} color={theme.colors.text.secondary} />
            <Text style={{ color: theme.colors.text.secondary, marginTop: 4 }}>{question.options[1]}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
