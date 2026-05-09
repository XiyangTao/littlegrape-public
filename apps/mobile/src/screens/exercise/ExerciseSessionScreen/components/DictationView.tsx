import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import Icon from '@/components/Icon';
import { useTTS } from '@/hooks/useTTS';
import { useI18n } from '@/context/I18nProvider';
import type { DictationQuestion } from '@/api/modules/exercise';

interface Props {
  question: DictationQuestion;
  isAnswered: boolean;
  onAnswer: (correct: boolean) => void;
  onSubmitReady: (ready: boolean) => void;
  styles: any;
  theme: any;
  submitRef: React.MutableRefObject<(() => void) | null>;
}

/** 逐词对比 */
function compareWords(userText: string, correctText: string) {
  const normalize = (s: string) => s.trim().toLowerCase().replace(/[.,!?;:'"]/g, '');
  const userWords = normalize(userText).split(/\s+/).filter(Boolean);
  const correctWords = normalize(correctText).split(/\s+/).filter(Boolean);

  return correctWords.map((word, i) => ({
    word: correctText.split(/\s+/)[i] || word,
    isCorrect: i < userWords.length && normalize(userWords[i]) === normalize(word),
    userWord: i < userWords.length ? userText.split(/\s+/)[i] : undefined,
  }));
}

export default function DictationView({ question, isAnswered, onAnswer, onSubmitReady, styles, theme, submitRef }: Props) {
  const { t } = useI18n();
  const [mode, setMode] = useState<'wordbank' | 'keyboard'>(question.words?.length ? 'wordbank' : 'keyboard');
  const [textInput, setTextInput] = useState('');
  const [arranged, setArranged] = useState<string[]>([]);
  const [available, setAvailable] = useState<string[]>(question.words || []);
  const [comparison, setComparison] = useState<ReturnType<typeof compareWords>>([]);
  const tts = useTTS();

  // 自动播放
  useEffect(() => {
    tts.speak(`dictation_${question.id}`, question.sentence, 'en-US-JennyNeural');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id, question.sentence]);

  submitRef.current = () => {
    const userAnswer = mode === 'wordbank' ? arranged.join(' ') : textInput;
    const result = compareWords(userAnswer, question.sentence);
    setComparison(result);
    const correctCount = result.filter(w => w.isCorrect).length;
    onAnswer(correctCount === result.length);
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
  const isAllCorrect = isAnswered && comparison.every(w => w.isCorrect);

  return (
    <View>
      <Text style={styles.questionType}>{t('exercise.dictation.prompt')}</Text>

      <TouchableOpacity
        style={[styles.ttsButton, tts.isPlaying && styles.ttsButtonPlaying]}
        onPress={() => tts.speak(`dictation_${question.id}`, question.sentence, 'en-US-JennyNeural')}
        activeOpacity={0.7}
      >
        <Icon name="volume-up" size={36} color={theme.colors.primary} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.ttsSlowButton}
        onPress={() => tts.speak(`dictation_slow_${question.id}`, question.sentence, 'en-US-JennyNeural')}
        activeOpacity={0.7}
      >
        <Icon name="slow-motion-video" size={20} color={theme.colors.text.secondary} />
      </TouchableOpacity>

      {/* 模式切换 */}
      {question.words?.length ? (
        <View style={styles.modeSwitch}>
          <TouchableOpacity
            style={[styles.modeSwitchButton, mode === 'wordbank' && styles.modeSwitchButtonActive]}
            onPress={() => { setMode('wordbank'); onSubmitReady(arranged.length > 0); }}
          >
            <Text style={[styles.modeSwitchText, mode === 'wordbank' && styles.modeSwitchTextActive]}>{t('exercise.dictation.modeWordbank')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeSwitchButton, mode === 'keyboard' && styles.modeSwitchButtonActive]}
            onPress={() => { setMode('keyboard'); onSubmitReady(textInput.trim().length > 0); }}
          >
            <Text style={[styles.modeSwitchText, mode === 'keyboard' && styles.modeSwitchTextActive]}>{t('exercise.dictation.modeKeyboard')}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {mode === 'wordbank' ? (
        <>
          {/* 答案槽 */}
          <View style={[styles.answerSlot, arranged.length > 0 && styles.answerSlotFilled]}>
            {arranged.length === 0 ? (
              <Text style={{ color: theme.colors.text.disabled }}>{t('exercise.dictation.placeholder')}</Text>
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
          placeholder={t('exercise.dictation.keyboardPlaceholder')}
          placeholderTextColor={theme.colors.text.disabled}
          multiline
          editable={!isAnswered}
          autoCapitalize="none"
          autoCorrect={false}
        />
      )}

      {isAnswered && (
        <View>
          <View style={[
            styles.feedbackBar,
            isAllCorrect ? styles.feedbackBarCorrect : styles.feedbackBarIncorrect,
          ]}>
            <Icon
              name={isAllCorrect ? 'check-circle' : 'cancel'}
              size={18}
              color={isAllCorrect ? theme.colors.success : theme.colors.error}
            />
            <Text style={[
              styles.feedbackText,
              isAllCorrect ? styles.feedbackCorrectText : styles.feedbackIncorrectText,
            ]}>
              {t('exercise.dictation.wordsCorrect', { correct: comparison.filter(w => w.isCorrect).length, total: comparison.length })}
            </Text>
          </View>

          <View style={styles.wordCompare}>
            {comparison.map((w, i) => (
              <Text
                key={i}
                style={w.isCorrect ? styles.wordCorrect : styles.wordWrong}
              >
                {w.word}
              </Text>
            ))}
          </View>

          <Text style={[styles.promptSubText, { marginTop: 12 }]}>{question.sentenceCn}</Text>
        </View>
      )}
    </View>
  );
}
