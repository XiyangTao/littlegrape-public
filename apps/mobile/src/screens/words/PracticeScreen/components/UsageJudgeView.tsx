/**
 * 用法判断 — 自动提交
 *
 * 句子卡片（高亮 targetWord）+ 2 个大按钮：正确/错误
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import Icon from '@/components/Icon';
import { useI18n } from '@/context/I18nProvider';
import type { PracticeViewProps } from './types';

/** 高亮句子中的 targetWord */
function renderHighlightedWord(
  sentence: string,
  targetWord: string,
  primaryColor: string,
  textStyle: any,
) {
  // 用正则匹配 targetWord（忽略大小写）
  const regex = new RegExp(`(\\b${targetWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b)`, 'gi');
  const parts = sentence.split(regex);
  return (
    <Text style={textStyle}>
      {parts.map((part, i) =>
        part.toLowerCase() === targetWord.toLowerCase() ? (
          <Text key={i} style={{ color: primaryColor, fontWeight: '700' }}>
            {part}
          </Text>
        ) : (
          <Text key={i}>{part}</Text>
        )
      )}
    </Text>
  );
}

export default function UsageJudgeView({
  question,
  isAnswered,
  isCorrect: isCorrectFromSession,
  onAnswer,
  styles,
  theme,
}: PracticeViewProps) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<boolean | null>(null);
  const { sentence, sentenceCn, targetWord, isCorrect, correctSentence, explanation } = question;

  const handleJudge = (judgedCorrect: boolean) => {
    if (isAnswered) return;
    setSelected(judgedCorrect);
    onAnswer(judgedCorrect === isCorrect);
  };

  // 回看时用 session 的 isCorrect，首次答题时用本地判断
  const isUserCorrect = isCorrectFromSession;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
      {/* 句子卡片 */}
      <View style={styles.promptCard}>
        {renderHighlightedWord(sentence, targetWord, theme.colors.primary, styles.promptText)}
        <Text style={styles.promptSubText}>{sentenceCn}</Text>
      </View>

      <Text style={[styles.hintText, { fontStyle: 'normal', textAlign: 'center', marginBottom: 20 }]}>
        {t('wordPractice.judgePrompt')}
      </Text>

      {/* 两个大按钮 */}
      <View style={localStyles.buttonRow}>
        <TouchableOpacity
          style={[
            localStyles.judgeButton,
            { borderColor: theme.colors.border.light, backgroundColor: theme.colors.card },
            // 选中态
            selected === true && !isAnswered && { borderColor: theme.colors.success, backgroundColor: theme.colors.success + '08' },
            // 反馈态
            isAnswered && isCorrect === true && { borderColor: theme.colors.success, backgroundColor: theme.colors.success + '12' },
            isAnswered && selected === true && isCorrect !== true && { borderColor: theme.colors.error, backgroundColor: theme.colors.error + '08' },
          ]}
          onPress={() => handleJudge(true)}
          disabled={isAnswered}
          activeOpacity={0.7}
        >
          <Icon
            name={isAnswered && isCorrect === true ? 'check-circle' : 'check-circle-outline'}
            size={28}
            color={
              isAnswered && isCorrect === true
                ? theme.colors.success
                : isAnswered && selected === true
                  ? theme.colors.error
                  : selected === true
                    ? theme.colors.success
                    : theme.colors.text.tertiary
            }
          />
          <Text style={[
            localStyles.judgeButtonText,
            { color: theme.colors.text.primary },
            isAnswered && isCorrect === true && { color: theme.colors.success, fontWeight: '700' },
          ]}>
            {t('wordPractice.judgeCorrect')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            localStyles.judgeButton,
            { borderColor: theme.colors.border.light, backgroundColor: theme.colors.card },
            selected === false && !isAnswered && { borderColor: theme.colors.error, backgroundColor: theme.colors.error + '08' },
            isAnswered && isCorrect === false && { borderColor: theme.colors.success, backgroundColor: theme.colors.success + '12' },
            isAnswered && selected === false && isCorrect !== false && { borderColor: theme.colors.error, backgroundColor: theme.colors.error + '08' },
          ]}
          onPress={() => handleJudge(false)}
          disabled={isAnswered}
          activeOpacity={0.7}
        >
          <Icon
            name={isAnswered && isCorrect === false ? 'check-circle' : 'highlight-off'}
            size={28}
            color={
              isAnswered && isCorrect === false
                ? theme.colors.success
                : isAnswered && selected === false
                  ? theme.colors.error
                  : selected === false
                    ? theme.colors.error
                    : theme.colors.text.tertiary
            }
          />
          <Text style={[
            localStyles.judgeButtonText,
            { color: theme.colors.text.primary },
            isAnswered && isCorrect === false && { color: theme.colors.success, fontWeight: '700' },
          ]}>
            {t('wordPractice.judgeWrong')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 反馈 */}
      {isAnswered && (
        <View style={[
          styles.feedbackBar,
          isUserCorrect ? styles.feedbackBarCorrect : styles.feedbackBarIncorrect,
        ]}>
          <Icon
            name={isUserCorrect ? 'check-circle' : 'cancel'}
            size={20}
            color={isUserCorrect ? theme.colors.success : theme.colors.error}
          />
          <View style={{ flex: 1 }}>
            <Text style={[
              styles.feedbackText,
              isUserCorrect ? styles.feedbackCorrectText : styles.feedbackIncorrectText,
            ]}>
              {isUserCorrect ? t('wordPractice.judgeRight') : t('wordPractice.judgeWrongResult')}
            </Text>
            {!isCorrect && correctSentence && (
              <Text style={[styles.feedbackAnswer, { fontWeight: '500' }]}>
                {t('wordPractice.correctUsage', { sentence: correctSentence })}
              </Text>
            )}
            {explanation && <Text style={styles.feedbackAnswer}>{explanation}</Text>}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const localStyles = StyleSheet.create({
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  judgeButton: {
    flex: 1,
    paddingVertical: 20,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  judgeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
