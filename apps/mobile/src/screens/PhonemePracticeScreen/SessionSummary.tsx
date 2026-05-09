import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Theme } from '@/context/ThemeProvider';
import Icon from '@/components/Icon';
import { ConfettiEffect } from '@/components/ConfettiEffect';
import { type Phoneme } from '@/data/phonemes';
import { type DrillResult, type SpeakDrillResult, type ListenDrillResult } from './types';
import { createStyles } from './styles';
import { getScoreLevel } from './scoreLevels';
import { PHONEME_CONFETTI_COLORS } from '@/constants/colors';

interface SessionSummaryProps {
  phoneme: Phoneme;
  confusablePhoneme: Phoneme | null;
  results: DrillResult[];
  onRestart: () => void;
  onBack: () => void;
  theme: Theme;
  t: (key: string, options?: any) => string;
}

export const SessionSummary: React.FC<SessionSummaryProps> = ({
  phoneme,
  confusablePhoneme,
  results,
  onRestart,
  onBack,
  theme,
  t,
}) => {
  const styles = createStyles(theme);

  // 分类结果
  const speakResults = useMemo(
    () => results.filter((r): r is SpeakDrillResult => r.drillType === 'speak'),
    [results],
  );
  const listenResults = useMemo(
    () => results.filter((r): r is ListenDrillResult =>
      r.drillType === 'listen_identify' || r.drillType === 'same_different',
    ),
    [results],
  );

  // 跟读整体等级（基于目标音素平均得分）
  const speakOverallLevel = useMemo(() => {
    if (speakResults.length === 0) return null;
    const targetScores = speakResults
      .filter(r => r.targetPhonemeScore !== null)
      .map(r => r.targetPhonemeScore!);
    if (targetScores.length === 0) return null;
    const avg = targetScores.reduce((sum, s) => sum + s, 0) / targetScores.length;
    return { avg, level: getScoreLevel(avg, t) };
  }, [speakResults, t]);

  // 听辨统计
  const listenStats = useMemo(() => {
    if (listenResults.length === 0) return null;
    return {
      total: listenResults.length,
      correct: listenResults.filter(r => r.correct).length,
      results: listenResults,
    };
  }, [listenResults]);

  // 是否触发庆祝动画
  const showConfetti = speakOverallLevel ? speakOverallLevel.avg >= 75 : false;

  if (speakResults.length === 0 && listenResults.length === 0) return null;

  return (
    <View style={styles.container}>
      {/* 庆祝动画 */}
      <ConfettiEffect
        visible={showConfetti}
        colors={PHONEME_CONFETTI_COLORS}
        particleCount={25}
        duration={2000}
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 标题 */}
        <View style={styles.summaryHeader}>
          <Text style={styles.summaryEmoji}>🎉</Text>
          <Text style={styles.summaryTitle}>{t('phonemePractice.summary.title')}</Text>
        </View>

        {/* 音素信息卡片 */}
        <View style={styles.summaryPhonemeCard}>
          <Text style={styles.summaryPhonemeLabel}>{t('phonemePractice.summary.practicedToday')}</Text>
          <Text style={styles.summaryPhonemeSymbol}>/{phoneme.symbol}/</Text>
          <Text style={styles.summaryPhonemeName}>{phoneme.name}</Text>
        </View>

        {/* 练习概要 */}
        <View style={styles.summarySection}>
          <Text style={styles.summarySectionTitle}>{t('phonemePractice.summary.overview')}</Text>

          {/* 听辨统计 */}
          {listenStats && (
            <View style={styles.summaryStatRow}>
              <Text style={styles.summaryStatLabel}>{t('phonemePractice.summary.listening')}</Text>
              <View style={styles.summaryStatDots}>
                {listenStats.results.map((r, i) => (
                  <View
                    key={i}
                    style={[
                      styles.summaryStatDot,
                      r.correct ? styles.summaryStatDotCorrect : styles.summaryStatDotWrong,
                    ]}
                  />
                ))}
              </View>
              <Text style={styles.summaryStatValue}>
                {t('phonemePractice.summary.correctCount', { correct: listenStats.correct, total: listenStats.total })}
              </Text>
            </View>
          )}

          {/* 跟读统计 */}
          {speakOverallLevel && (
            <View style={styles.summaryStatRow}>
              <Text style={styles.summaryStatLabel}>{t('phonemePractice.summary.speaking')}</Text>
              <Text style={[styles.summaryStatLevel, { color: speakOverallLevel.level.color(theme) }]}>
                {speakOverallLevel.level.emoji} {speakOverallLevel.level.label}
              </Text>
            </View>
          )}
        </View>

        {/* 跟读详情 */}
        {speakResults.length > 0 && (
          <View style={styles.summarySection}>
            <Text style={styles.summarySectionTitle}>{t('phonemePractice.summary.speakDetail')}</Text>
            {speakResults.map((r, index) => {
              const targetScore = r.targetPhonemeScore ?? r.accuracyScore;
              const level = getScoreLevel(targetScore, t);
              const isLast = index === speakResults.length - 1;
              return (
                <View
                  key={index}
                  style={[styles.summaryWordItem, isLast && styles.summaryWordItemLast]}
                >
                  <View style={styles.summaryWordLeft}>
                    <Text style={styles.summaryWordText}>{r.word.word}</Text>
                    <Text style={styles.summaryWordPhonetic}>{r.word.phonetic}</Text>
                  </View>
                  <Text style={[styles.summaryWordLevel, { color: level.color(theme) }]}>
                    {level.emoji} {level.label}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* 发音小贴士 */}
        {phoneme.mouthTip && (
          <View style={styles.summaryTip}>
            <Text style={styles.summaryTipTitle}>{t('phonemePractice.summary.tipTitle')}</Text>
            <Text style={styles.summaryTipText}>{phoneme.mouthTip}</Text>
          </View>
        )}

        {/* 操作按钮 */}
        <View style={styles.summaryActions}>
          <TouchableOpacity
            style={styles.summaryRestartBtn}
            onPress={onRestart}
            activeOpacity={0.7}
          >
            <Icon name="refresh" size={20} color={theme.colors.primary} />
            <Text style={styles.summaryRestartText}>{t('phonemePractice.summary.restart')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.summaryBackBtn}
            onPress={onBack}
            activeOpacity={0.7}
          >
            <Text style={styles.summaryBackText}>{t('phonemePractice.summary.back')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};
