/**
 * 场景选词 — 自动提交
 *
 * 场景描述 + 挖空句子 + 4选项
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import Icon from '@/components/Icon';
import { useI18n } from '@/context/I18nProvider';
import type { PracticeViewProps } from './types';

export default function SceneChoiceView({
  question,
  isAnswered,
  isCorrect,
  onAnswer,
  styles,
  theme,
}: PracticeViewProps) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<string | null>(null);
  const { scene, sentence, sentenceCn, options, answer, explanation } = question;

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

  // 渲染挖空句子
  const renderSentence = () => {
    const parts = sentence.split(/(_____+)/);
    return (
      <Text style={styles.promptText}>
        {parts.map((part: string, i: number) =>
          part.match(/^_+$/) ? (
            <Text key={i} style={{ color: theme.colors.primary, fontWeight: '700' }}>
              {'______'}
            </Text>
          ) : (
            <Text key={i}>{part}</Text>
          )
        )}
      </Text>
    );
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
      {/* 场景描述 */}
      <View style={[styles.promptCard, { borderLeftWidth: 4, borderLeftColor: theme.colors.warning }]}>
        <Text style={[styles.promptSubText, { marginTop: 0, color: theme.colors.text.secondary }]}>
          {scene}
        </Text>
      </View>

      {/* 挖空句子 */}
      <View style={styles.promptCard}>
        {renderSentence()}
        <Text style={styles.promptSubText}>{sentenceCn}</Text>
      </View>

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
