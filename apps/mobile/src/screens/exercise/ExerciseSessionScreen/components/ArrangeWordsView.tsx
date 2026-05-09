import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from '@/components/Icon';
import { useI18n } from '@/context/I18nProvider';
import type { ArrangeWordsQuestion } from '@/api/modules/exercise';

interface Props {
  question: ArrangeWordsQuestion;
  isAnswered: boolean;
  onAnswer: (correct: boolean) => void;
  onSubmitReady: (ready: boolean) => void;
  styles: any;
  theme: any;
  submitRef: React.MutableRefObject<(() => void) | null>;
}

export default function ArrangeWordsView({ question, isAnswered, onAnswer, onSubmitReady, styles, theme, submitRef }: Props) {
  const { t } = useI18n();
  const [arranged, setArranged] = useState<string[]>([]);
  const [available, setAvailable] = useState<string[]>([...question.shuffledWords]);

  submitRef.current = () => {
    const userAnswer = arranged.join(' ');
    const correctAnswer = question.correctWords.join(' ');
    onAnswer(userAnswer === correctAnswer);
  };

  const handleWordSelect = (word: string, idx: number) => {
    if (isAnswered) return;
    const newAvailable = [...available];
    newAvailable.splice(idx, 1);
    setAvailable(newAvailable);
    const newArranged = [...arranged, word];
    setArranged(newArranged);
    onSubmitReady(newArranged.length > 0);
  };

  const handleWordRemove = (idx: number) => {
    if (isAnswered) return;
    const word = arranged[idx];
    const newArranged = [...arranged];
    newArranged.splice(idx, 1);
    setArranged(newArranged);
    setAvailable([...available, word]);
    onSubmitReady(newArranged.length > 0);
  };

  const isCorrectResult = isAnswered && arranged.join(' ') === question.correctWords.join(' ');

  return (
    <View>
      <Text style={styles.questionType}>{t('exercise.arrange.prompt')}</Text>

      <View style={styles.promptCard}>
        <Text style={styles.promptText}>{question.hint}</Text>
      </View>

      {/* 答案槽 */}
      <View style={[styles.answerSlot, arranged.length > 0 && styles.answerSlotFilled]}>
        {arranged.length === 0 ? (
          <Text style={{ color: theme.colors.text.disabled }}>{t('exercise.arrange.placeholder')}</Text>
        ) : (
          arranged.map((word, i) => (
            <TouchableOpacity
              key={`${word}_${i}`}
              style={styles.answerWord}
              onPress={() => handleWordRemove(i)}
              disabled={isAnswered}
              activeOpacity={0.7}
            >
              <Text style={styles.answerWordText}>{word}</Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* 可选词库 */}
      <View style={styles.wordBankContainer}>
        {available.map((word, i) => (
          <TouchableOpacity
            key={`${word}_${i}`}
            style={styles.wordChip}
            onPress={() => handleWordSelect(word, i)}
            disabled={isAnswered}
            activeOpacity={0.7}
          >
            <Text style={styles.wordChipText}>{word}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isAnswered && (
        <View style={[styles.feedbackBar, isCorrectResult ? styles.feedbackBarCorrect : styles.feedbackBarIncorrect]}>
          <Icon
            name={isCorrectResult ? 'check-circle' : 'cancel'}
            size={18}
            color={isCorrectResult ? theme.colors.success : theme.colors.error}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.feedbackText, isCorrectResult ? styles.feedbackCorrectText : styles.feedbackIncorrectText]}>
              {isCorrectResult ? t('exercise.correct') : t('exercise.incorrect')}
            </Text>
            {!isCorrectResult && (
              <Text style={styles.feedbackAnswer}>{t('exercise.correctAnswer')}: {question.correctWords.join(' ')}</Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
}
