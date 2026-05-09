/**
 * 拼接填空 — 特殊提交（点按钮检查）
 *
 * 挖空句子 + 答案拼接区 + 字母碎片（answer 拆段 + 干扰碎片）
 * 碎片在组件内部本地生成
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
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

/** 将单词拆成 2-4 段 */
function splitWord(word: string): string[] {
  const len = word.length;
  if (len <= 3) return [word];
  if (len <= 5) {
    const mid = Math.floor(len / 2);
    return [word.slice(0, mid), word.slice(mid)];
  }
  // 6+ 字母 → 2-3 段
  const segments: string[] = [];
  let pos = 0;
  const numParts = len <= 8 ? 2 : 3;
  const partSize = Math.floor(len / numParts);
  for (let i = 0; i < numParts; i++) {
    const end = i === numParts - 1 ? len : pos + partSize;
    segments.push(word.slice(pos, end));
    pos = end;
  }
  return segments;
}

/** 生成 1-2 个干扰碎片 */
function generateDistractors(answer: string): string[] {
  const vowels = 'aeiou';
  const consonants = 'bcdfghlmnprst';
  const distractors: string[] = [];
  const len = Math.max(2, Math.floor(answer.length / 3));

  for (let i = 0; i < (answer.length <= 5 ? 1 : 2); i++) {
    let frag = '';
    for (let j = 0; j < len; j++) {
      const pool = j % 2 === 0 ? consonants : vowels;
      frag += pool[Math.floor(Math.random() * pool.length)];
    }
    // 确保干扰碎片和正确碎片不同
    if (!answer.toLowerCase().includes(frag.toLowerCase())) {
      distractors.push(frag);
    }
  }
  return distractors;
}

export default function FillBlankPuzzleView({
  question,
  isAnswered,
  isCorrect: isCorrectFromSession,
  onAnswer,
  styles,
  theme,
}: PracticeViewProps) {
  const { t } = useI18n();
  const { sentence, sentenceCn, answer, explanation } = question;

  // 生成碎片（仅在初始化时）
  const fragments = useMemo<Fragment[]>(() => {
    const parts = splitWord(answer);
    const distractors = generateDistractors(answer);

    const frags: Fragment[] = [
      ...parts.map((text, i) => ({ id: `p_${i}`, text, isDistractor: false })),
      ...distractors.map((text, i) => ({ id: `d_${i}`, text, isDistractor: true })),
    ];

    // 随机打乱
    for (let i = frags.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [frags[i], frags[j]] = [frags[j], frags[i]];
    }
    return frags;
  }, [answer]);

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

  const currentWord = useMemo(() => selectedFrags.map(f => f.text).join(''), [selectedFrags]);

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
    const isCorrect = currentWord.toLowerCase() === answer.toLowerCase();
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
  }, [currentWord, answer, selectedFrags, shakeAnim, onAnswer]);

  const isSelected = useCallback((frag: Fragment) => {
    return selectedFrags.some(f => f.id === frag.id);
  }, [selectedFrags]);

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
      <View style={styles.promptCard}>
        {renderSentence()}
        <Text style={styles.promptSubText}>{sentenceCn}</Text>
      </View>

      {/* 答案拼接区 */}
      <Animated.View
        style={[
          styles.answerSlot,
          selectedFrags.length > 0 && styles.answerSlotFilled,
          result === 'correct' && { borderColor: theme.colors.success, borderStyle: 'solid' as const, backgroundColor: theme.colors.success + '10' },
          result === 'wrong' && { borderColor: theme.colors.error, borderStyle: 'solid' as const, backgroundColor: theme.colors.error + '10' },
          { transform: [{ translateX: shakeAnim }] },
        ]}
      >
        {selectedFrags.length === 0 ? (
          <Text style={{ color: theme.colors.text.tertiary, fontSize: 14 }}>
            {t('wordPractice.tapFragments')}
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

      {/* 操作按钮 */}
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
                {correct ? t('wordPractice.spellingCorrect') : t('wordPractice.correctAnswer', { answer })}
              </Text>
              {explanation && <Text style={styles.feedbackAnswer}>{explanation}</Text>}
            </View>
          </View>
        );
      })()}
    </ScrollView>
  );
}
