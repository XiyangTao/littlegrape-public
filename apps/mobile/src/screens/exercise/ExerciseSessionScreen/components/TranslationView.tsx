import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import Icon from '@/components/Icon';
import { useI18n } from '@/context/I18nProvider';
import type { TranslationQuestion } from '@/api/modules/exercise';

interface Props {
  question: TranslationQuestion;
  isAnswered: boolean;
  onAnswer: (correct: boolean) => void;
  onSubmitReady: (ready: boolean) => void;
  styles: any;
  theme: any;
  submitRef: React.MutableRefObject<(() => void) | null>;
}

export default function TranslationView({ question, isAnswered, onAnswer, onSubmitReady, styles, theme, submitRef }: Props) {
  const { t } = useI18n();
  const [mode, setMode] = useState<'wordbank' | 'keyboard'>(question.words?.length ? 'wordbank' : 'keyboard');
  const [textInput, setTextInput] = useState('');
  // 词库模式
  const [arranged, setArranged] = useState<string[]>([]);
  const [available, setAvailable] = useState<string[]>(question.words || []);

  const checkAnswer = (userAnswer: string) => {
    const normalize = (s: string) => s.trim().toLowerCase().replace(/[.,!?;:'"]/g, '');
    const correct = normalize(userAnswer) === normalize(question.answer);
    if (correct) return true;
    if (question.acceptableAnswers) {
      return question.acceptableAnswers.some(a => normalize(userAnswer) === normalize(a));
    }
    return false;
  };

  submitRef.current = () => {
    const userAnswer = mode === 'wordbank' ? arranged.join(' ') : textInput;
    onAnswer(checkAnswer(userAnswer));
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

  const handleTextChange = (text: string) => {
    setTextInput(text);
    onSubmitReady(text.trim().length > 0);
  };

  const userAnswer = mode === 'wordbank' ? arranged.join(' ') : textInput;
  const isCorrectResult = isAnswered && checkAnswer(userAnswer);

  return (
    <View>
      <Text style={styles.questionType}>{t('exercise.translation.prompt')}</Text>

      <View style={styles.promptCard}>
        <Text style={styles.promptText}>{question.sentenceCn}</Text>
      </View>

      {/* 模式切换 */}
      {question.words?.length ? (
        <View style={styles.modeSwitch}>
          <TouchableOpacity
            style={[styles.modeSwitchButton, mode === 'wordbank' && styles.modeSwitchButtonActive]}
            onPress={() => { setMode('wordbank'); onSubmitReady(arranged.length > 0); }}
          >
            <Text style={[styles.modeSwitchText, mode === 'wordbank' && styles.modeSwitchTextActive]}>{t('exercise.translation.modeWordbank')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeSwitchButton, mode === 'keyboard' && styles.modeSwitchButtonActive]}
            onPress={() => { setMode('keyboard'); onSubmitReady(textInput.trim().length > 0); }}
          >
            <Text style={[styles.modeSwitchText, mode === 'keyboard' && styles.modeSwitchTextActive]}>{t('exercise.translation.modeKeyboard')}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {mode === 'wordbank' ? (
        <>
          {/* 答案槽 */}
          <View style={[styles.answerSlot, arranged.length > 0 && styles.answerSlotFilled]}>
            {arranged.length === 0 ? (
              <Text style={{ color: theme.colors.text.disabled }}>{t('exercise.translation.placeholder')}</Text>
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
        </>
      ) : (
        <TextInput
          style={styles.textInput}
          value={textInput}
          onChangeText={handleTextChange}
          placeholder={t('exercise.translation.keyboardPlaceholder')}
          placeholderTextColor={theme.colors.text.disabled}
          multiline
          editable={!isAnswered}
          autoCapitalize="none"
          autoCorrect={false}
        />
      )}

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
              <Text style={styles.feedbackAnswer}>{t('exercise.correctAnswer')}: {question.answer}</Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
}
