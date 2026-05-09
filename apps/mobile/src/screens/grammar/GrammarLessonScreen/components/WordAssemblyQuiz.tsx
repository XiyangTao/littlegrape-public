import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from '@/components/Icon';
import { useI18n } from '@/context/I18nProvider';
import type { LessonQuestion } from '@/api/modules/grammar';

interface Props {
  question: LessonQuestion;
  selectedAnswer: string | null;
  isAnswered: boolean;
  isCorrect: boolean;
  onSelect: (answer: string) => void;
  styles: any;
  theme: any;
}

export default function WordAssemblyQuiz({
  question, selectedAnswer, isAnswered, isCorrect, onSelect, styles, theme,
}: Props) {
  const { t } = useI18n();
  const [assembled, setAssembled] = useState<string[]>([]);
  const [showHint, setShowHint] = useState(false);

  // 正确答案词 + 干扰词，Fisher-Yates 均匀打乱
  const allWords = useMemo(() => {
    const words = [...(question.words || []), ...(question.distractors || [])];
    for (let i = words.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [words[i], words[j]] = [words[j], words[i]];
    }
    return words;
  }, [question.words, question.distractors]);

  const usedIndices = new Set<number>();
  assembled.forEach(word => {
    const idx = allWords.findIndex((w, i) => w === word && !usedIndices.has(i));
    if (idx !== -1) usedIndices.add(idx);
  });

  const handleWordPress = (word: string) => {
    if (isAnswered) return;
    const newAssembled = [...assembled, word];
    setAssembled(newAssembled);
    onSelect(newAssembled.join(' '));
  };

  const handleAssembledPress = (idx: number) => {
    if (isAnswered) return;
    const newAssembled = assembled.filter((_, i) => i !== idx);
    setAssembled(newAssembled);
    onSelect(newAssembled.length > 0 ? newAssembled.join(' ') : '');
  };

  return (
    <View>
      <Text style={styles.questionType}>{t('learn.selectWords')}</Text>

      {/* 中文原句 */}
      <Text style={styles.chineseTranslation}>{question.chineseTranslation || question.question}</Text>

      {/* 结构提示 */}
      {question.structureHint && !showHint && (
        <TouchableOpacity style={styles.hintButton} onPress={() => setShowHint(true)} activeOpacity={0.7}>
          <Icon name="lightbulb" size={14} color={theme.colors.warning} />
          <Text style={styles.hintButtonText}>{t('learn.structureHint')}</Text>
        </TouchableOpacity>
      )}
      {showHint && question.structureHint && (
        <Text style={styles.hintText}>{question.structureHint}</Text>
      )}

      {/* 答案组装区 */}
      <View style={[
        styles.assemblyArea,
        assembled.length > 0 && styles.assemblyAreaFilled,
        isAnswered && isCorrect && styles.assemblyCorrect,
        isAnswered && !isCorrect && styles.assemblyIncorrect,
      ]}>
        {assembled.map((word, i) => (
          <TouchableOpacity
            key={`${word}-${i}`}
            style={styles.assembledWord}
            onPress={() => handleAssembledPress(i)}
            disabled={isAnswered}
            activeOpacity={0.7}
          >
            <Text style={styles.assembledWordText}>{word}</Text>
          </TouchableOpacity>
        ))}
        {assembled.length === 0 && (
          <Text style={styles.assemblyPlaceholder}>{t('learn.selectWords')}</Text>
        )}
      </View>

      {/* 词库（正确词 + 干扰词） */}
      <View style={styles.wordBankContainer}>
        {allWords.map((word, i) => {
          const isUsed = usedIndices.has(i);
          return (
            <TouchableOpacity
              key={`${word}-${i}`}
              style={[styles.wordChip, isUsed && styles.wordChipUsed]}
              onPress={() => handleWordPress(word)}
              disabled={isAnswered || isUsed}
              activeOpacity={0.7}
            >
              <Text style={styles.wordChipText}>{word}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 解析 */}
      {isAnswered && (
        <View style={styles.explanationCard}>
          <View style={styles.explanationTitle}>
            <Icon
              name={isCorrect ? 'check-circle' : 'cancel'}
              size={18}
              color={isCorrect ? theme.colors.success : theme.colors.error}
            />
            <Text style={styles.explanationTitleText}>
              {isCorrect ? t('learn.correct') : t('learn.incorrect')}
            </Text>
          </View>
          {!isCorrect && (
            <Text style={styles.correctAnswer}>{question.answer}</Text>
          )}
          <Text style={styles.explanationText}>{question.explanation}</Text>
        </View>
      )}
    </View>
  );
}
