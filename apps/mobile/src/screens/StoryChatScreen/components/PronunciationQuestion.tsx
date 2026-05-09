import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import { usePronunciationAssessment } from '@/hooks/usePronunciationAssessment';
import { alignSpokenToReference, getWordScoreColor } from '@/utils/pronunciationAlignment';
import type { PronunciationWord } from '@/types/storyMode';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// 录音倒计时常量（和发音练习页一致）
const RECORD_MAX_DURATION = 10000; // 10秒
const RING_SIZE = 100;
const RING_RADIUS = 46;
const RING_STROKE_WIDTH = 4;
const RING_CIRCUMFERENCE = Math.PI * 2 * RING_RADIUS;

interface Props {
  sentence: string;
  onComplete: (score: number, words?: PronunciationWord[]) => void;
  onUserMessage?: (text: string, voiceData?: { filePath: string; duration: number }, pronunciationWords?: PronunciationWord[]) => void;
  disabled?: boolean;
}

export default function PronunciationQuestion({ sentence, onComplete, onUserMessage }: Props) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const pronunciation = usePronunciationAssessment();
  const [hasCompleted, setHasCompleted] = useState(false);

  // 圆环倒计时动画
  const ringProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (pronunciation.isRecording) {
      ringProgress.setValue(0);
      Animated.timing(ringProgress, {
        toValue: 1,
        duration: RECORD_MAX_DURATION,
        useNativeDriver: false,
      }).start();
    } else {
      ringProgress.stopAnimation();
      ringProgress.setValue(0);
    }
  }, [pronunciation.isRecording]);

  // 暂存录音结果，等评估完再发 onUserMessage
  const recordingResultRef = useRef<{ filePath: string; duration: number } | null>(null);

  // 开始/停止录音
  const handleToggleRecord = useCallback(async () => {
    if (pronunciation.isAssessing) return;

    if (pronunciation.isRecording) {
      const result = await pronunciation.stop();
      if (result) {
        recordingResultRef.current = { filePath: result.filePath, duration: result.duration };
      }
    } else {
      pronunciation.reset();
      recordingResultRef.current = null;
      pronunciation.start({
        referenceText: sentence,
        language: 'en-US',
        granularity: 'word',
        enableProsody: true,
        enableMiscue: true,
        maxDuration: RECORD_MAX_DURATION,
      });
    }
  }, [pronunciation, sentence]);

  // 参考文本对齐 Azure 评估结果（Levenshtein DP，公共 util）
  const mergedWords = useMemo<PronunciationWord[] | null>(
    () => pronunciation.result ? alignSpokenToReference(sentence, pronunciation.result.words || []) : null,
    [pronunciation.result, sentence],
  );

  // 监听评估结果 → 发用户气泡 + 自动完成
  useEffect(() => {
    if (mergedWords && !hasCompleted) {
      setHasCompleted(true);
      const score = pronunciation.result?.pronunciationScore ?? 0;

      // 评估完成后发用户气泡（附带合并后的逐词结果）
      if (onUserMessage && recordingResultRef.current) {
        onUserMessage(sentence, recordingResultRef.current, mergedWords);
      }

      setTimeout(() => onComplete(score, mergedWords), 2500);
    }
  }, [mergedWords, hasCompleted, onComplete, onUserMessage, sentence, pronunciation.result]);

  // 重试
  const handleRetry = useCallback(() => {
    pronunciation.reset();
    setHasCompleted(false);
  }, [pronunciation]);

  const getOverallLabel = (score: number) => {
    if (score >= 90) return { text: 'Excellent!', color: theme.colors.success };
    if (score >= 75) return { text: 'Good!', color: theme.colors.success };
    if (score >= 60) return { text: 'Not Bad!', color: theme.colors.warning };
    return { text: 'Keep Going!', color: theme.colors.warning };
  };

  return (
    <View style={styles.container}>
      {/* 句子展示 */}
      <View style={styles.sentenceBox}>
        {pronunciation.result ? (
          <View style={styles.wordsRow}>
            {mergedWords!.map((w, i) => (
              <Text
                key={i}
                style={[
                  styles.wordText,
                  { color: w.errorType === 'Omission'
                    ? theme.colors.text.disabled
                    : getWordScoreColor(w.accuracyScore, theme)
                  },
                ]}
              >
                {w.word}{' '}
              </Text>
            ))}
          </View>
        ) : (
          <Text style={styles.sentence}>{sentence}</Text>
        )}
      </View>

      {/* 评估结果 */}
      {pronunciation.result && (
        <View style={styles.resultContainer}>
          {(() => {
            const label = getOverallLabel(pronunciation.result.pronunciationScore);
            return (
              <Text style={[styles.overallLabel, { color: label.color }]}>
                {label.text}
              </Text>
            );
          })()}
        </View>
      )}

      {/* 录音控制区（和发音练习页一致的圆环按钮） */}
      {!pronunciation.result && (
        <View style={styles.controlArea}>
          {pronunciation.isAssessing ? (
            <View style={styles.assessingArea}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.hintText}>Evaluating...</Text>
            </View>
          ) : (
            <>
              {/* 状态提示 */}
              <Text style={styles.hintText}>
                {pronunciation.isInitializing ? 'Connecting...' :
                 pronunciation.isRecording ? 'Recording, read the sentence' :
                 'Tap to start reading'}
              </Text>

              {/* 录音按钮 + 圆环 */}
              <View style={styles.recordButtonWrapper}>
                {pronunciation.isRecording && (
                  <Svg style={styles.progressRing} width={RING_SIZE} height={RING_SIZE}>
                    <Circle
                      cx={RING_SIZE / 2}
                      cy={RING_SIZE / 2}
                      r={RING_RADIUS}
                      stroke={theme.colors.primary + '30'}
                      strokeWidth={RING_STROKE_WIDTH}
                      fill="transparent"
                    />
                    <AnimatedCircle
                      cx={RING_SIZE / 2}
                      cy={RING_SIZE / 2}
                      r={RING_RADIUS}
                      stroke={theme.colors.primary}
                      strokeWidth={RING_STROKE_WIDTH}
                      fill="transparent"
                      strokeLinecap="round"
                      strokeDasharray={RING_CIRCUMFERENCE}
                      strokeDashoffset={ringProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [RING_CIRCUMFERENCE, 0],
                      })}
                      transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
                    />
                  </Svg>
                )}
                <TouchableOpacity
                  style={[
                    styles.recordButton,
                    pronunciation.isRecording && styles.recordButtonActive,
                    pronunciation.isInitializing && styles.recordButtonDisabled,
                  ]}
                  onPress={handleToggleRecord}
                  disabled={pronunciation.isInitializing}
                  activeOpacity={0.7}
                >
                  {pronunciation.isInitializing ? (
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                  ) : (
                    <Ionicons
                      name={pronunciation.isRecording ? 'stop' : 'mic'}
                      size={32}
                      color={pronunciation.isRecording ? '#FFFFFF' : theme.colors.primary}
                    />
                  )}
                </TouchableOpacity>
              </View>

              {/* 底部提示 */}
              <Text style={styles.tipText}>
                {pronunciation.isRecording ? 'Tap again to stop' : ''}
              </Text>
            </>
          )}

          {/* 错误提示 */}
          {pronunciation.error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{pronunciation.error}</Text>
              <TouchableOpacity onPress={handleRetry}>
                <Text style={styles.retryLink}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
}


const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    headerText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.primary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    sentenceBox: {
      padding: theme.spacing.md,
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.spacing.borderRadius.base,
      marginBottom: theme.spacing.md,
    },
    sentence: {
      fontSize: theme.typography.fontSize.lg,
      lineHeight: theme.typography.fontSize.lg * 1.5,
      color: theme.colors.text.primary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    wordsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    wordText: {
      fontSize: theme.typography.fontSize.lg,
      lineHeight: theme.typography.fontSize.lg * 1.5,
      fontWeight: theme.typography.fontWeight.semibold,
    },

    // ==================== 结果区 ====================
    resultContainer: {
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
    },
    overallLabel: {
      fontSize: theme.fontScale(22),
      fontWeight: theme.typography.fontWeight.bold,
      textAlign: 'center',
    },

    // ==================== 录音控制（和发音练习页一致） ====================
    controlArea: {
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    assessingArea: {
      alignItems: 'center',
      gap: theme.spacing.md,
      paddingVertical: theme.spacing.lg,
    },
    hintText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.tertiary,
      textAlign: 'center',
    },
    recordButtonWrapper: {
      width: RING_SIZE,
      height: RING_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
    },
    progressRing: {
      position: 'absolute',
    },
    recordButton: {
      width: theme.scale(80),
      height: theme.scale(80),
      borderRadius: theme.scale(40),
      backgroundColor: theme.colors.background.secondary,
      borderWidth: 3,
      borderColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    recordButtonActive: {
      backgroundColor: theme.colors.primary,
    },
    recordButtonDisabled: {
      opacity: 0.6,
    },
    tipText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.tertiary,
      marginTop: theme.spacing.xs,
    },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.error + '10',
      borderRadius: theme.spacing.borderRadius.sm,
      marginTop: theme.spacing.sm,
    },
    errorText: {
      flex: 1,
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.error,
    },
    retryLink: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.primary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    retryButton: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.primary,
      borderRadius: theme.spacing.borderRadius.sm,
      marginTop: theme.spacing.xs,
    },
    retryText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: '#FFFFFF',
    },
  });
