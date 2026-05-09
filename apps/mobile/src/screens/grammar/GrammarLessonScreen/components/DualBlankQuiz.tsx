import React, { useState } from 'react';
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

export default function DualBlankQuiz({
  question, selectedAnswer, isAnswered, isCorrect, onSelect, styles, theme,
}: Props) {
  const { t } = useI18n();
  // 跟踪当前活跃的空（1 或 2）
  const [activeSlot, setActiveSlot] = useState<1 | 2>(1);
  const [slot1Value, setSlot1Value] = useState<string | null>(null);
  const [slot2Value, setSlot2Value] = useState<string | null>(null);

  const handleOptionPress = (option: string) => {
    if (isAnswered) return;

    if (activeSlot === 1) {
      setSlot1Value(option);
      setActiveSlot(2);
    } else {
      setSlot2Value(option);
      // 两个都填完，触发提交（编码为 "answer1|answer2"）
      const combined = `${slot1Value}|${option}`;
      onSelect(combined);
    }
  };

  const handleSlotPress = (slot: 1 | 2) => {
    if (isAnswered) return;
    setActiveSlot(slot);
  };

  // 渲染句子，空白处显示已选值或下划线
  const renderSentence = (text: string, slotNum: 1 | 2, value: string | null) => {
    const parts = text.split(/_{3,}/);
    const isActive = activeSlot === slotNum && !isAnswered;
    const isSlotCorrect = isAnswered && value === (slotNum === 1 ? question.answer : question.answer2);
    const isSlotIncorrect = isAnswered && value !== (slotNum === 1 ? question.answer : question.answer2);

    let cardStyle = [styles.dualSentenceCard];
    if (isActive) cardStyle.push(styles.dualSentenceCardActive);
    if (isSlotCorrect) cardStyle.push(styles.dualSentenceCardCorrect);
    if (isSlotIncorrect) cardStyle.push(styles.dualSentenceCardIncorrect);

    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={() => handleSlotPress(slotNum)}
        activeOpacity={0.7}
        disabled={isAnswered}
      >
        <Text style={styles.dualSentenceLabel}>
          {slotNum === 1 ? '1' : '2'}
        </Text>
        <Text style={styles.dualSentenceText}>
          {parts[0]}
          <Text style={styles.dualBlankSlot}>
            {value || '          '}
          </Text>
          {parts[1] || ''}
        </Text>
      </TouchableOpacity>
    );
  };

  const usedOptions = [slot1Value, slot2Value].filter(Boolean);

  return (
    <View>
      <Text style={styles.questionType}>{t('learn.fillBothBlanks')}</Text>
      {question.question ? (
        <Text style={styles.chineseTranslation}>{question.question}</Text>
      ) : null}

      {/* 两个句子 */}
      <View style={styles.dualSentenceContainer}>
        {renderSentence(question.sentence1 || '', 1, slot1Value)}
        {renderSentence(question.sentence2 || '', 2, slot2Value)}
      </View>

      {/* 共享选项 */}
      <View style={styles.wordBankContainer}>
        {question.options?.map((option) => {
          const isUsed = usedOptions.includes(option) && !isAnswered;
          return (
            <TouchableOpacity
              key={option}
              style={[styles.wordChip, isUsed && styles.wordChipUsed]}
              onPress={() => handleOptionPress(option)}
              activeOpacity={0.7}
              disabled={isAnswered || isUsed}
            >
              <Text style={styles.wordChipText}>{option}</Text>
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
            <Text style={styles.correctAnswer}>
              1: {question.answer}  |  2: {question.answer2}
            </Text>
          )}
          <Text style={styles.explanationText}>{question.explanation}</Text>
        </View>
      )}
    </View>
  );
}
