/**
 * 关卡总结页面
 * 显示星级、XP、统计数据、薄弱词
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Animated, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '@/components/Icon';
import { useTheme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import { useLevelSummary } from './useLevelSummary';
import { createStyles } from './styles';
import { LEVEL_CONFETTI_COLORS } from '@/constants/colors';

// ==================== 五彩纸屑效果 ====================
const CONFETTI_COUNT = 30;

function ConfettiEffect() {
  const { width, height } = useWindowDimensions();
  const particles = useRef(
    Array.from({ length: CONFETTI_COUNT }, () => ({
      x: new Animated.Value(Math.random() * width),
      y: new Animated.Value(-20),
      rotate: new Animated.Value(0),
      opacity: new Animated.Value(1),
      color: LEVEL_CONFETTI_COLORS[Math.floor(Math.random() * LEVEL_CONFETTI_COLORS.length)],
      size: 6 + Math.random() * 6,
    }))
  ).current;

  useEffect(() => {
    particles.forEach((p, i) => {
      const delay = i * 30;
      const duration = 2000 + Math.random() * 1500;
      const targetX = (Math.random() - 0.5) * 200;

      Animated.parallel([
        Animated.timing(p.y, {
          toValue: height + 50,
          duration,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(p.x, {
          toValue: (p.x as any)._value + targetX,
          duration,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(p.rotate, {
          toValue: Math.random() * 10,
          duration,
          delay,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(delay + duration * 0.7),
          Animated.timing(p.opacity, {
            toValue: 0,
            duration: duration * 0.3,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    });
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.size,
            borderRadius: p.size / 2,
            backgroundColor: p.color,
            transform: [
              { translateX: p.x },
              { translateY: p.y },
              {
                rotate: p.rotate.interpolate({
                  inputRange: [0, 10],
                  outputRange: ['0deg', '3600deg'],
                }),
              },
            ],
            opacity: p.opacity,
          }}
        />
      ))}
    </View>
  );
}

// ==================== 主页面 ====================

export default function LevelSummaryScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme);

  const {
    isLoading,
    stars,
    xp,
    isFirstClear,
    isBoss,
    weakWords,
    nextPreviewWords,
    result,
    tag,
    levelIndex,
    starAnims,
    handleGoHome,
    handleNextLevel,
    navigation,
  } = useLevelSummary();

  // 三星时触发五彩纸屑
  const [showConfetti, setShowConfetti] = useState(false);
  useEffect(() => {
    if (stars === 3) {
      const timer = setTimeout(() => setShowConfetti(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [stars]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.headerSection}>
          <Text style={styles.titleEmoji}>{isBoss ? '\uD83D\uDC7E' : '\uD83C\uDF89'}</Text>
          <Text style={styles.title}>
            {result.learnedCount === 0
              ? t('words.allMastered')
              : isBoss ? t('words.bossCompleted') : t('words.levelCompleted')}
          </Text>
          {result.learnedCount === 0 && (
            <Text style={styles.headerSubtitle}>{t('words.goNextLevel')}</Text>
          )}
        </View>

        {/* Stars */}
        <View style={styles.starsContainer}>
          {[0, 1, 2].map((index) => {
            const isActive = index < stars;
            return (
              <Animated.View
                key={index}
                style={{
                  transform: [
                    {
                      scale: starAnims[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.3, 1],
                      }),
                    },
                  ],
                  opacity: starAnims[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 1],
                  }),
                }}
              >
                <Icon
                  name={isActive ? 'star' : 'star-border'}
                  size={index === 1 ? 56 : 44}
                  color={isActive ? theme.colors.warning : theme.colors.border.medium}
                />
              </Animated.View>
            );
          })}
        </View>

        {/* Boss warning */}
        {isBoss && stars < 2 && (
          <View style={styles.bossWarningContainer}>
            <Text style={styles.bossWarningText}>{t('words.bossWarning')}</Text>
          </View>
        )}

        {/* Stats — 三行布局 */}
        <View style={styles.statsContainer}>
          {/* 认识 */}
          <View style={styles.statRow}>
            <View style={styles.statRowLeft}>
              <Icon name="visibility" size={20} color={theme.colors.primary} />
              <Text style={styles.statRowLabel}>{t('words.recognize')}</Text>
            </View>
            <View style={styles.statRowRight}>
              <Text style={styles.statRowValue}>
                {result.learnedCount}/{result.learnedCount + result.skippedCount}
              </Text>
              <Text style={styles.statRowCheck}>{result.skippedCount === 0 ? ' ✅' : ''}</Text>
            </View>
          </View>

          <View style={styles.statRowDivider} />

          {/* 理解 */}
          <View style={styles.statRow}>
            <View style={styles.statRowLeft}>
              <Icon name="psychology" size={20} color={theme.colors.warning} />
              <Text style={styles.statRowLabel}>{t('words.understand')}</Text>
            </View>
            <View style={styles.statRowRight}>
              {result.stage2Total > 0 ? (
                <>
                  <Text style={styles.statRowValue}>
                    {result.stage2Correct}/{result.stage2Total}
                  </Text>
                  <Text style={styles.statRowPercent}>
                    {' '}{Math.round((result.stage2Correct / result.stage2Total) * 100)}%
                  </Text>
                </>
              ) : (
                <Text style={styles.statRowValue}>-</Text>
              )}
            </View>
          </View>

          <View style={styles.statRowDivider} />

          {/* 运用 */}
          <View style={styles.statRow}>
            <View style={styles.statRowLeft}>
              <Icon name="edit-note" size={20} color={theme.colors.success} />
              <Text style={styles.statRowLabel}>{t('words.apply')}</Text>
            </View>
            <View style={styles.statRowRight}>
              {result.stage3Total > 0 ? (
                <>
                  <Text style={styles.statRowValue}>
                    {result.stage3Correct}/{result.stage3Total}
                  </Text>
                  <Text style={styles.statRowPercent}>
                    {' '}{Math.round((result.stage3Correct / result.stage3Total) * 100)}%
                  </Text>
                </>
              ) : (
                <Text style={styles.statRowValue}>-</Text>
              )}
            </View>
          </View>
        </View>

        {/* XP */}
        <View style={styles.xpContainer}>
          <Icon name="auto-awesome" size={20} color={theme.colors.secondary} />
          <Text style={styles.xpValue}>+{xp} XP</Text>
        </View>

        {/* Weak words */}
        {weakWords.length > 0 && (
          <View style={styles.weakSection}>
            <Text style={styles.weakTitle}>{t('words.weakWords')}</Text>
            {weakWords.map((word) => (
              <View key={word.id} style={styles.weakWordCard}>
                <Text style={styles.weakWordText}>{word.word}</Text>
                <Text style={styles.weakWordMeaning}>{word.meaningCn}</Text>
              </View>
            ))}
            <TouchableOpacity
              style={styles.sentenceChallengeButton}
              onPress={() => {
                const randomWord = weakWords[Math.floor(Math.random() * weakWords.length)];
                navigation.navigate('SentenceChallenge', { wordId: randomWord.id });
              }}
            >
              <Icon name="edit" size={18} color={theme.colors.primary} />
              <Text style={styles.sentenceChallengeText}>{t('words.aiSentenceChallenge')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Next level preview */}
        {nextPreviewWords.length > 0 && (
          <View style={styles.nextPreviewSection}>
            <Text style={styles.nextPreviewTitle}>{t('words.nextLevelPreview')}</Text>
            <View style={styles.nextPreviewWords}>
              {nextPreviewWords.map((w, i) => (
                <View key={i} style={styles.nextPreviewWordItem}>
                  <Text style={styles.nextPreviewWord}>{w.word}</Text>
                  <Text style={styles.nextPreviewMeaning}>{w.meaningCn}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom buttons */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity style={styles.secondaryButton} onPress={handleGoHome}>
          <Text style={styles.secondaryButtonText}>{t('words.goHome')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryButton} onPress={handleNextLevel}>
          <Text style={styles.primaryButtonText}>{t('words.continueNextLevel')}</Text>
        </TouchableOpacity>
      </View>

      {/* 三星五彩纸屑 */}
      {showConfetti && <ConfettiEffect />}
    </SafeAreaView>
  );
}
