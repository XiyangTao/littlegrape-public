/**
 * 补全翻译 — 首字母提示 + puzzle 碎片拼接
 *
 * 中文原句 + 英文挖空句 + 首字母提示 + 碎片拼接区
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import Icon from '@/components/Icon';
import { useI18n } from '@/context/I18nProvider';
import type { PracticeViewProps } from './types';

interface Fragment {
  id: string;
  text: string;
  isDistractor: boolean;
}

/** 将单词（去掉首字母后）拆成 2-3 段 */
function splitRemainder(remainder: string): string[] {
  const len = remainder.length;
  if (len <= 2) return [remainder];
  if (len <= 4) {
    const mid = Math.floor(len / 2);
    return [remainder.slice(0, mid), remainder.slice(mid)];
  }
  // 5+ 字母 → 2-3 段
  const numParts = len <= 7 ? 2 : 3;
  const segments: string[] = [];
  let pos = 0;
  const partSize = Math.floor(len / numParts);
  for (let i = 0; i < numParts; i++) {
    const end = i === numParts - 1 ? len : pos + partSize;
    segments.push(remainder.slice(pos, end));
    pos = end;
  }
  return segments;
}

/** 生成 1-2 个干扰碎片 */
function generateDistractors(remainder: string): string[] {
  const vowels = 'aeiou';
  const consonants = 'bcdfghlmnprst';
  const distractors: string[] = [];
  const fragLen = Math.max(2, Math.floor(remainder.length / 3));

  const count = remainder.length <= 4 ? 1 : 2;
  for (let i = 0; i < count; i++) {
    let frag = '';
    for (let j = 0; j < fragLen; j++) {
      const pool = j % 2 === 0 ? consonants : vowels;
      frag += pool[Math.floor(Math.random() * pool.length)];
    }
    if (!remainder.toLowerCase().includes(frag.toLowerCase())) {
      distractors.push(frag);
    }
  }
  return distractors;
}

/** 常见短单词池，用于生成整词干扰项 */
const SHORT_WORDS: Record<number, string[]> = {
  1: ['I', 'a', 'A'],
  2: ['am', 'is', 'an', 'at', 'be', 'by', 'do', 'go', 'he', 'if', 'in', 'it', 'me', 'my', 'no', 'of', 'on', 'or', 'so', 'to', 'up', 'us', 'we'],
};

/** 为短答案生成整词干扰项 */
function generateWordDistractors(answer: string): string[] {
  const pool = SHORT_WORDS[answer.length] || SHORT_WORDS[2];
  const candidates = pool.filter(w => w.toLowerCase() !== answer.toLowerCase());
  // 随机取 2-3 个
  const shuffled = candidates.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, answer.length === 1 ? 2 : 3);
}

export default function CompleteTranslationView({
  question,
  isAnswered,
  isCorrect: isCorrectFromSession,
  onAnswer,
  styles,
  theme,
}: PracticeViewProps) {
  const { t } = useI18n();
  const { sentenceCn, sentenceWithBlank, answer, explanation } = question;

  // 短答案模式：≤ 2 字母时不拆分首字母，整词选择
  const isShortAnswer = answer.length <= 2;
  const firstLetter = isShortAnswer ? '' : answer.charAt(0);
  const remainder = isShortAnswer ? answer : answer.slice(1);

  // 生成碎片
  const fragments = useMemo<Fragment[]>(() => {
    let frags: Fragment[];

    if (isShortAnswer) {
      // 短答案：整词作为 1 个正确碎片 + 整词干扰项
      const distractors = generateWordDistractors(answer);
      frags = [
        { id: 'p_0', text: answer, isDistractor: false },
        ...distractors.map((text, i) => ({ id: `d_${i}`, text, isDistractor: true })),
      ];
    } else {
      // 正常模式：拆分 remainder + 碎片干扰项
      const parts = splitRemainder(remainder);
      const distractors = generateDistractors(remainder);
      frags = [
        ...parts.map((text, i) => ({ id: `p_${i}`, text, isDistractor: false })),
        ...distractors.map((text, i) => ({ id: `d_${i}`, text, isDistractor: true })),
      ];
    }

    // 随机打乱
    for (let i = frags.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [frags[i], frags[j]] = [frags[j], frags[i]];
    }
    return frags;
  }, [remainder, answer, isShortAnswer]);

  // 返回已答题时，直接恢复完成状态
  const [selectedFrags, setSelectedFrags] = useState<Fragment[]>(() => {
    if (isAnswered) {
      return fragments.filter(f => !f.isDistractor);
    }
    return [];
  });
  const [result, setResult] = useState<'correct' | 'wrong' | null>(() => {
    if (isAnswered) {
      return isCorrectFromSession ? 'correct' : 'wrong';
    }
    return null;
  });
  const shakeAnim = useState(new Animated.Value(0))[0];

  const assembledWord = useMemo(
    () => firstLetter + selectedFrags.map(f => f.text).join(''),
    [firstLetter, selectedFrags],
  );

  const handleSelect = useCallback((frag: Fragment) => {
    if (isAnswered || result === 'correct') return;
    const exists = selectedFrags.find(f => f.id === frag.id);
    if (exists) {
      setSelectedFrags(prev => prev.filter(f => f.id !== frag.id));
      setResult(null);
    } else {
      setSelectedFrags(prev => [...prev, frag]);
      setResult(null);
    }
  }, [selectedFrags, isAnswered, result]);

  const handleRemove = useCallback((frag: Fragment) => {
    if (isAnswered || result === 'correct') return;
    setSelectedFrags(prev => prev.filter(f => f.id !== frag.id));
    setResult(null);
  }, [isAnswered, result]);

  const handleClear = useCallback(() => {
    if (isAnswered || result === 'correct') return;
    setSelectedFrags([]);
    setResult(null);
  }, [isAnswered, result]);

  const handleCheck = useCallback(() => {
    if (selectedFrags.length === 0) return;
    const isCorrect = assembledWord.toLowerCase() === answer.toLowerCase();
    setResult(isCorrect ? 'correct' : 'wrong');
    onAnswer(isCorrect);

    if (!isCorrect) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }
  }, [assembledWord, answer, selectedFrags, shakeAnim, onAnswer]);

  const isSelected = useCallback((frag: Fragment) => {
    return selectedFrags.some(f => f.id === frag.id);
  }, [selectedFrags]);

  // 渲染挖空句子
  const renderBlankSentence = () => {
    const parts = sentenceWithBlank.split(/(_____+)/);
    return (
      <Text style={[styles.promptText, { fontSize: 18, lineHeight: 30 }]}>
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
      {/* 中文原句 */}
      <View style={styles.promptCard}>
        <Text style={[styles.promptText, { fontSize: 16 }]}>{sentenceCn}</Text>
      </View>

      {/* 英文挖空句 */}
      <View style={[styles.promptCard, { backgroundColor: theme.colors.card, marginBottom: 16 }]}>
        {renderBlankSentence()}
      </View>

      {/* 拼接区：首字母固定 + 碎片 */}
      <Animated.View
        style={[
          styles.answerSlot,
          selectedFrags.length > 0 && styles.answerSlotFilled,
          result === 'correct' && { borderColor: theme.colors.success, borderStyle: 'solid' as const, backgroundColor: theme.colors.success + '10' },
          result === 'wrong' && { borderColor: theme.colors.error, borderStyle: 'solid' as const, backgroundColor: theme.colors.error + '10' },
          { transform: [{ translateX: shakeAnim }] },
        ]}
      >
        {/* 固定首字母（短答案模式不显示） */}
        {!isShortAnswer && (
          <View style={[
            styles.answerWord,
            { backgroundColor: theme.colors.primary + '25', borderColor: theme.colors.primary + '50' },
            result === 'correct' && { backgroundColor: theme.colors.success + '25', borderColor: theme.colors.success + '50' },
          ]}>
            <Text style={[
              styles.answerWordText,
              { fontWeight: '700' },
              result === 'correct' && { color: theme.colors.success },
            ]}>
              {firstLetter}
            </Text>
          </View>
        )}

        {selectedFrags.length === 0 ? (
          <Text style={{ color: theme.colors.text.tertiary, fontSize: 14 }}>
            {isShortAnswer ? t('wordPractice.selectWord') : t('wordPractice.selectFragments')}
          </Text>
        ) : (
          selectedFrags.map((frag) => (
            <TouchableOpacity
              key={frag.id}
              style={[
                styles.answerWord,
                result === 'correct' && { backgroundColor: theme.colors.success + '20', borderColor: theme.colors.success + '40' },
                result === 'wrong' && frag.isDistractor && { backgroundColor: theme.colors.error + '20', borderColor: theme.colors.error + '40' },
              ]}
              onPress={() => handleRemove(frag)}
              disabled={isAnswered || result === 'correct'}
            >
              <Text style={[
                styles.answerWordText,
                result === 'correct' && { color: theme.colors.success },
              ]}>
                {frag.text}
              </Text>
            </TouchableOpacity>
          ))
        )}

        {selectedFrags.length > 0 && result !== 'correct' && !isAnswered && (
          <TouchableOpacity
            style={{
              width: 24, height: 24, borderRadius: theme.spacing.borderRadius.base,
              backgroundColor: theme.colors.background.tertiary,
              alignItems: 'center' as const, justifyContent: 'center' as const,
              marginLeft: 4,
            }}
            onPress={handleClear}
          >
            <Icon name="close" size={14} color={theme.colors.text.tertiary} />
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* 碎片区 */}
      <View style={styles.wordBankContainer}>
        {fragments.map((frag) => {
          const sel = isSelected(frag);
          return (
            <TouchableOpacity
              key={frag.id}
              style={[styles.wordChip, sel && styles.wordChipUsed]}
              onPress={() => handleSelect(frag)}
              disabled={isAnswered || result === 'correct'}
              activeOpacity={0.7}
            >
              <Text style={[styles.wordChipText, sel && { color: theme.colors.text.tertiary }]}>
                {frag.text}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 检查按钮 */}
      {!isAnswered && result === null && (
        <TouchableOpacity
          style={[
            {
              backgroundColor: theme.colors.primary,
              paddingVertical: 14,
              borderRadius: theme.spacing.borderRadius.xl,
              alignItems: 'center' as const,
              marginTop: 8,
            },
            selectedFrags.length === 0 && { backgroundColor: theme.colors.text.tertiary, opacity: 0.5 },
          ]}
          onPress={handleCheck}
          disabled={selectedFrags.length === 0}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.text.inverse }}>
            {t('wordPractice.checkSpelling')}
          </Text>
        </TouchableOpacity>
      )}

      {/* 反馈 */}
      {(isAnswered || result !== null) && (() => {
        const correct = result !== null ? result === 'correct' : isCorrectFromSession;
        return (
          <View style={[
            styles.feedbackBar,
            correct ? styles.feedbackBarCorrect : styles.feedbackBarIncorrect,
          ]}>
            <Icon
              name={correct ? 'check-circle' : 'cancel'}
              size={20}
              color={correct ? theme.colors.success : theme.colors.error}
            />
            <View style={{ flex: 1 }}>
              <Text style={[
                styles.feedbackText,
                correct ? styles.feedbackCorrectText : styles.feedbackIncorrectText,
              ]}>
                {correct ? t('wordPractice.correct') : t('wordPractice.correctAnswer', { answer })}
              </Text>
              {explanation && <Text style={styles.feedbackAnswer}>{explanation}</Text>}
            </View>
          </View>
        );
      })()}
    </ScrollView>
  );
}
