import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useI18n } from '@/context/I18nProvider';
import type { MatchingPairsQuestion } from '@/api/modules/exercise';

interface Props {
  question: MatchingPairsQuestion;
  isAnswered: boolean;
  onAnswer: (correct: boolean) => void;
  styles: any;
  theme: any;
}

export default function MatchingPairsView({ question, isAnswered, onAnswer, styles, theme }: Props) {
  const { t } = useI18n();
  const [leftSelected, setLeftSelected] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrongPair, setWrongPair] = useState<{ left: string; right: string } | null>(null);

  // 右列打乱顺序
  const shuffledRight = useMemo(() => {
    const items = question.pairs.map(p => ({ id: p.id, chinese: p.chinese }));
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }, [question.id]);

  // 全部匹配完 → 自动通知正确
  useEffect(() => {
    if (matched.size === question.pairs.length && !isAnswered) {
      onAnswer(true);
    }
  }, [matched.size, question.pairs.length, isAnswered, onAnswer]);

  const handleLeftSelect = (pairId: string) => {
    if (isAnswered || matched.has(pairId)) return;
    setLeftSelected(pairId);
    setWrongPair(null);
  };

  const handleRightSelect = (pairId: string) => {
    if (isAnswered || !leftSelected || matched.has(pairId)) return;

    if (leftSelected === pairId) {
      // 匹配成功
      setMatched(new Set([...matched, pairId]));
      setLeftSelected(null);
      setWrongPair(null);
    } else {
      // 匹配失败
      setWrongPair({ left: leftSelected, right: pairId });
      setTimeout(() => {
        setWrongPair(null);
        setLeftSelected(null);
      }, 800);
    }
  };

  return (
    <View>
      <Text style={styles.questionType}>{t('exercise.matchingPairs.prompt')}</Text>

      <View style={styles.pairsContainer}>
        {/* 左列：英文 */}
        <View style={styles.pairsColumn}>
          {question.pairs.map((pair) => {
            const isMatched = matched.has(pair.id);
            const isSelected = leftSelected === pair.id;
            const isWrong = wrongPair?.left === pair.id;

            let itemStyle = [styles.pairItem];
            if (isMatched) itemStyle.push(styles.pairItemMatched);
            else if (isWrong) itemStyle.push(styles.pairItemWrong);
            else if (isSelected) itemStyle.push(styles.pairItemSelected);

            return (
              <TouchableOpacity
                key={pair.id}
                style={itemStyle}
                onPress={() => handleLeftSelect(pair.id)}
                disabled={isAnswered || isMatched}
                activeOpacity={0.7}
              >
                <Text style={styles.pairItemText}>{pair.english}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 右列：中文（打乱） */}
        <View style={styles.pairsColumn}>
          {shuffledRight.map((item) => {
            const isMatched = matched.has(item.id);
            const isWrong = wrongPair?.right === item.id;

            let itemStyle = [styles.pairItem];
            if (isMatched) itemStyle.push(styles.pairItemMatched);
            else if (isWrong) itemStyle.push(styles.pairItemWrong);

            return (
              <TouchableOpacity
                key={item.id}
                style={itemStyle}
                onPress={() => handleRightSelect(item.id)}
                disabled={isAnswered || isMatched || !leftSelected}
                activeOpacity={0.7}
              >
                <Text style={styles.pairItemText}>{item.chinese}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}
