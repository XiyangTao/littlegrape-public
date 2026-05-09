import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from '@/components/Icon';
import { useTTS } from '@/hooks/useTTS';
import { useI18n } from '@/context/I18nProvider';
import type { ListenFillQuestion } from '@/api/modules/exercise';

interface Props {
  question: ListenFillQuestion;
  isAnswered: boolean;
  onAnswer: (correct: boolean) => void;
  onSubmitReady: (ready: boolean) => void;
  styles: any;
  theme: any;
  submitRef: React.MutableRefObject<(() => void) | null>;
}

export default function ListenFillView({ question, isAnswered, onAnswer, onSubmitReady, styles, theme, submitRef }: Props) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<string | null>(null);
  const tts = useTTS();

  // 自动播放
  useEffect(() => {
    tts.speak(`lf_${question.id}`, question.sentence, 'en-US-JennyNeural');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id, question.sentence]);

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
      <Text style={styles.questionType}>{t('exercise.listenFill.prompt')}</Text>

      <TouchableOpacity
        style={[styles.ttsButton, tts.isPlaying && styles.ttsButtonPlaying]}
        onPress={() => tts.speak(`lf_${question.id}`, question.sentence, 'en-US-JennyNeural')}
        activeOpacity={0.7}
      >
        <Icon name="volume-up" size={36} color={theme.colors.primary} />
      </TouchableOpacity>

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
            <Text style={styles.feedbackAnswer}>{question.sentenceCn}</Text>
          </View>
        </View>
      )}
    </View>
  );
}
