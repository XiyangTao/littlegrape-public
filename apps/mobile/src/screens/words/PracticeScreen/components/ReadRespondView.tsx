/**
 * 词义理解 — 自动提交
 *
 * 句子卡片（高亮目标词）+ 问题 + 4选项
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import Icon from '@/components/Icon';
import { useI18n } from '@/context/I18nProvider';
import type { PracticeViewProps } from './types';

/** 将 **word** 高亮渲染 */
function renderHighlightedSentence(
  sentence: string,
  primaryColor: string,
  textStyle: any,
) {
  const parts = sentence.split(/(\*\*[^*]+\*\*)/g);
  return (
    <Text style={textStyle}>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          const word = part.slice(2, -2);
          return (
            <Text key={i} style={{ color: primaryColor, fontWeight: '700' }}>
              {word}
            </Text>
          );
        }
        return <Text key={i}>{part}</Text>;
      })}
    </Text>
  );
}

export default function ReadRespondView({
  question,
  isAnswered,
  isCorrect,
  onAnswer,
  styles,
  theme,
}: PracticeViewProps) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<string | null>(null);
  const { sentence, sentenceCn, questionText, options, answer, explanation } = question;

  // question 字段在数据库里叫 "question"
  const displayQuestion = questionText || question.question;

  const handleSelect = (option: string) => {
    if (isAnswered) return;
    setSelected(option);
    onAnswer(option === answer);
  };

  const getOptionStyle = (option: string) => {
    if (!isAnswered) {
      return option === selected ? [styles.optionSelected] : [];
    }
    if (option === answer) return [styles.optionCorrect];
    if (option === selected && option !== answer) return [styles.optionIncorrect];
    return [];
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
      {/* 句子卡片（不显示中文翻译，避免暴露答案） */}
      <View style={styles.promptCard}>
        {renderHighlightedSentence(sentence, theme.colors.primary, styles.promptText)}
      </View>

      {/* 问题 */}
      {displayQuestion && (
        <Text style={[styles.hintText, { fontStyle: 'normal', marginBottom: 16 }]}>
          {displayQuestion}
        </Text>
      )}

      {/* 选项 */}
      {options.map((option: string, index: number) => (
        <TouchableOpacity
          key={index}
          style={[styles.optionButton, ...getOptionStyle(option)]}
          onPress={() => handleSelect(option)}
          disabled={isAnswered}
          activeOpacity={0.7}
        >
          <Text style={styles.optionText}>{option}</Text>
          {isAnswered && option === answer && (
            <Icon name="check-circle" size={20} color={theme.colors.success} style={styles.optionIcon} />
          )}
          {isAnswered && option === selected && option !== answer && (
            <Icon name="cancel" size={20} color={theme.colors.error} style={styles.optionIcon} />
          )}
        </TouchableOpacity>
      ))}

      {/* 反馈 */}
      {isAnswered && explanation && (
        <View style={[
          styles.feedbackBar,
          isCorrect ? styles.feedbackBarCorrect : styles.feedbackBarIncorrect,
        ]}>
          <Icon
            name={isCorrect ? 'check-circle' : 'cancel'}
            size={20}
            color={isCorrect ? theme.colors.success : theme.colors.error}
          />
          <View style={{ flex: 1 }}>
            <Text style={[
              styles.feedbackText,
              isCorrect ? styles.feedbackCorrectText : styles.feedbackIncorrectText,
            ]}>
              {isCorrect ? t('wordPractice.correct') : t('wordPractice.correctAnswer', { answer })}
            </Text>
            <Text style={styles.feedbackAnswer}>{explanation}</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}
