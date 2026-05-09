import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import Icon from '@/components/Icon';
import { useI18n } from '@/context/I18nProvider';
import type { TimedMatchQuestion } from '@/api/modules/exercise';

interface Props {
  question: TimedMatchQuestion;
  isAnswered: boolean;
  onAnswer: (correct: boolean) => void;
  styles: any;
  theme: any;
}

const TOTAL_TIME = 90; // 90 seconds

export default function TimedMatchView({ question, isAnswered, onAnswer, styles, theme }: Props) {
  const { t } = useI18n();
  const [currentRound, setCurrentRound] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [leftSelected, setLeftSelected] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrongPair, setWrongPair] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const round = question.rounds[currentRound];

  const shuffledRight = useMemo(() => {
    if (!round) return [];
    return [...round.pairs].sort(() => Math.random() - 0.5);
  }, [currentRound, question.id]);

  // 倒计时
  useEffect(() => {
    if (finished || isAnswered) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setFinished(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [finished, isAnswered]);

  // 完成时触发 onAnswer
  useEffect(() => {
    if (finished && !isAnswered) {
      onAnswer(score >= 30); // 30+ 分算通过
    }
  }, [finished, isAnswered, onAnswer, score]);

  // 检查当前轮是否全部匹配
  useEffect(() => {
    if (!round) return;
    if (matched.size === round.pairs.length) {
      const nextRound = currentRound + 1;
      if (nextRound < question.rounds.length) {
        setTimeout(() => {
          setCurrentRound(nextRound);
          setMatched(new Set());
          setLeftSelected(null);
        }, 500);
      } else {
        setFinished(true);
      }
    }
  }, [matched.size, round, currentRound, question.rounds.length]);

  const handleLeftSelect = (pairId: string) => {
    if (isAnswered || finished) return;
    setLeftSelected(pairId === leftSelected ? null : pairId);
    setWrongPair(null);
  };

  const handleRightSelect = (pairId: string) => {
    if (isAnswered || finished || !leftSelected) return;

    if (leftSelected === pairId) {
      // 正确匹配
      setMatched(prev => new Set([...prev, pairId]));
      setScore(prev => prev + 10);
      setLeftSelected(null);
    } else {
      // 错误匹配
      setWrongPair(pairId);
      setScore(prev => Math.max(0, prev - 5));
      setTimeout(() => {
        setWrongPair(null);
        setLeftSelected(null);
      }, 600);
    }
  };

  const timerColor = timeLeft > 30 ? theme.colors.success : timeLeft > 10 ? theme.colors.warning : theme.colors.error;

  return (
    <View>
      {/* 顶部计时器和分数 */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="timer" size={20} color={timerColor} />
          <Text style={{ fontSize: 18, fontWeight: '700', color: timerColor }}>{timeLeft}s</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="star" size={20} color={theme.colors.warning} />
          <Text style={{ fontSize: 18, fontWeight: '700', color: theme.colors.text.primary }}>{score}</Text>
        </View>
      </View>

      {/* 进度条 */}
      <View style={{ height: 6, backgroundColor: theme.colors.border.light, borderRadius: 3, marginBottom: 20 }}>
        <View style={{
          height: 6,
          backgroundColor: timerColor,
          borderRadius: 3,
          width: `${(timeLeft / TOTAL_TIME) * 100}%`,
        }} />
      </View>

      {/* 轮次标识 */}
      <Text style={{ textAlign: 'center', color: theme.colors.text.tertiary, fontSize: 13, marginBottom: 12 }}>
        {t('exercise.timedMatch.round', { current: currentRound + 1, total: question.rounds.length })}
      </Text>

      {/* 配对区域 */}
      {round && !finished && (
        <View style={styles.pairsContainer}>
          {/* 左列 - 英文 */}
          <View style={styles.pairsColumn}>
            {round.pairs.map((pair) => {
              const isMatched = matched.has(pair.id);
              const isSelected = leftSelected === pair.id;
              const isWrong = wrongPair !== null && leftSelected === pair.id;

              return (
                <TouchableOpacity
                  key={pair.id}
                  style={[
                    styles.pairItem,
                    isMatched && styles.pairItemMatched,
                    isSelected && styles.pairItemSelected,
                    isWrong && styles.pairItemWrong,
                  ]}
                  onPress={() => handleLeftSelect(pair.id)}
                  disabled={isMatched}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.pairItemText,
                    isMatched && { opacity: 0.3 },
                  ]}>{pair.english}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 右列 - 中文 */}
          <View style={styles.pairsColumn}>
            {shuffledRight.map((pair) => {
              const isMatched = matched.has(pair.id);
              const isWrong = wrongPair === pair.id;

              return (
                <TouchableOpacity
                  key={pair.id}
                  style={[
                    styles.pairItem,
                    isMatched && styles.pairItemMatched,
                    isWrong && styles.pairItemWrong,
                  ]}
                  onPress={() => handleRightSelect(pair.id)}
                  disabled={isMatched || !leftSelected}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.pairItemText,
                    isMatched && { opacity: 0.3 },
                  ]}>{pair.chinese}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* 结束画面 */}
      {(finished || isAnswered) && (
        <View style={{ alignItems: 'center', paddingVertical: 32 }}>
          <Icon name="emoji-events" size={48} color={theme.colors.warning} />
          <Text style={{ fontSize: 36, fontWeight: '700', color: theme.colors.text.primary, marginTop: 12 }}>
            {score}
          </Text>
          <Text style={{ fontSize: 16, color: theme.colors.text.secondary, marginTop: 4 }}>{t('exercise.timedMatch.totalScore')}</Text>
          <Text style={{ fontSize: 14, color: theme.colors.text.tertiary, marginTop: 8 }}>
            {t('exercise.timedMatch.completedRounds', { count: currentRound + (matched.size === round?.pairs.length ? 1 : 0) })}
          </Text>
        </View>
      )}
    </View>
  );
}
