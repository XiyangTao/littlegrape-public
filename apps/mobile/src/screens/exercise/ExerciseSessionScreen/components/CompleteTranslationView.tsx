import React, { useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import Icon from '@/components/Icon';
import { useI18n } from '@/context/I18nProvider';
import type { CompleteTranslationQuestion } from '@/api/modules/exercise';

interface Props {
  question: CompleteTranslationQuestion;
  isAnswered: boolean;
  onAnswer: (correct: boolean) => void;
  onSubmitReady: (ready: boolean) => void;
  styles: any;
  theme: any;
  submitRef: React.MutableRefObject<(() => void) | null>;
}

export default function CompleteTranslationView({ question, isAnswered, onAnswer, onSubmitReady, styles, theme, submitRef }: Props) {
  const { t } = useI18n();
  const [input, setInput] = useState('');

  submitRef.current = () => {
    const isCorrect = input.trim().toLowerCase() === question.answer.toLowerCase();
    onAnswer(isCorrect);
  };

  const handleChange = (text: string) => {
    setInput(text);
    onSubmitReady(text.trim().length > 0);
  };

  return (
    <View>
      <Text style={styles.questionType}>{t('exercise.completeTranslation.prompt')}</Text>

      <View style={styles.promptCard}>
        <Text style={styles.promptText}>{question.sentenceCn}</Text>
      </View>

      <View style={[styles.promptCard, { backgroundColor: 'transparent', padding: 0, marginBottom: 12 }]}>
        <Text style={[styles.promptText, { fontSize: 18 }]}>{question.sentenceEn}</Text>
      </View>

      {question.hint && (
        <Text style={styles.hintText}>{t('exercise.completeTranslation.hint', { hint: question.hint })}</Text>
      )}

      <TextInput
        style={styles.textInput}
        value={input}
        onChangeText={handleChange}
        placeholder={t('exercise.completeTranslation.placeholder')}
        placeholderTextColor={theme.colors.text.disabled}
        editable={!isAnswered}
        autoCapitalize="none"
        autoCorrect={false}
      />

      {isAnswered && (() => {
        const isCorrectResult = input.trim().toLowerCase() === question.answer.toLowerCase();
        return (
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
                <Text style={styles.feedbackAnswer}>{t('exercise.correctAnswer')}: {question.answer}</Text>
              )}
            </View>
          </View>
        );
      })()}
    </View>
  );
}
