/**
 * 名著跟读面板（底部 bottom sheet）
 *
 * 四态流转：
 *   idle      - 目标句 + 大录音按钮（点击开始录音）
 *   recording - 波形动画 + 实时识别文本 + 停止按钮
 *   assessing - loading
 *   result    - 综合分 + 4 项子分 + word-level 着色句子 + [重试] [关闭]
 */
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@react-native-vector-icons/material-icons';
import { useTheme, type Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import { usePronunciationAssessment } from '@/hooks/usePronunciationAssessment';
import { alignSpokenToReference, getWordScoreColor } from '@/utils/pronunciationAlignment';
import { CLASSICS } from '@/constants/classicsTheme';

interface Props {
  visible: boolean;
  sentence: string;
  onClose: () => void;
}

export default function ShadowingSheet({ visible, sentence, onClose }: Props) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const pronunciation = usePronunciationAssessment();
  const hasStartedRef = useRef(false);

  // 参考文本对齐 Azure 评估结果（Levenshtein DP，公共 util）
  const mergedWords = useMemo(() => {
    if (!pronunciation.result) return null;
    return alignSpokenToReference(sentence, pronunciation.result.words);
  }, [pronunciation.result, sentence]);

  // Sheet 关闭时硬停并清 state
  useEffect(() => {
    if (!visible) {
      if (pronunciation.isRecording || pronunciation.isAssessing) {
        pronunciation.cancel();
      }
      pronunciation.reset();
      hasStartedRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleStartRecord = useCallback(() => {
    if (pronunciation.isRecording || pronunciation.isAssessing) return;
    pronunciation.reset();
    hasStartedRef.current = true;
    pronunciation.start({
      referenceText: sentence,
      language: 'en-US',
      granularity: 'word',
      enableProsody: true,
      enableMiscue: true,
      maxDuration: 60000,
      engine: 'azure',
    });
  }, [pronunciation, sentence]);

  const handleStopRecord = useCallback(() => {
    if (!pronunciation.isRecording) return;
    pronunciation.stop();
  }, [pronunciation]);

  const handleRetry = useCallback(() => {
    pronunciation.reset();
    hasStartedRef.current = false;
  }, [pronunciation]);

  // —— 渲染四态 ——
  const renderBody = () => {
    // 已有结果 → 结果态
    if (pronunciation.result) {
      const r = pronunciation.result;
      return (
        <ScrollView contentContainerStyle={styles.resultContainer} showsVerticalScrollIndicator={false}>
          {/* 综合分圆圈 */}
          <View style={[styles.scoreCircle, { borderColor: getWordScoreColor(r.pronunciationScore, theme) }]}>
            <Text style={[styles.scoreNum, { color: getWordScoreColor(r.pronunciationScore, theme) }]}>
              {Math.round(r.pronunciationScore)}
            </Text>
            <Text style={styles.scoreLabel}>{t('classics.shadowing.overall')}</Text>
          </View>

          {/* 4 项子分 */}
          <View style={styles.subScoresRow}>
            <SubScore label={t('classics.shadowing.accuracy')} value={r.accuracyScore} />
            <SubScore label={t('classics.shadowing.fluency')} value={r.fluencyScore} />
            <SubScore label={t('classics.shadowing.completeness')} value={r.completenessScore} />
            {r.prosodyScore != null && (
              <SubScore label={t('classics.shadowing.prosody')} value={r.prosodyScore} />
            )}
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleRetry} activeOpacity={0.7}>
              <MaterialIcons name="refresh" size={18} color={CLASSICS.colors.ink} />
              <Text style={styles.secondaryBtnText}>{t('classics.shadowing.retry')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.primaryBtnText}>{t('classics.shadowing.done')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      );
    }

    // 评估中
    if (pronunciation.isAssessing) {
      return (
        <View style={styles.centerBody}>
          <ActivityIndicator size="large" color={CLASSICS.colors.accent} />
          <Text style={styles.hintText}>{t('classics.shadowing.assessing')}</Text>
        </View>
      );
    }

    // 录音中
    if (pronunciation.isRecording) {
      return (
        <View style={styles.centerBody}>
          {/* 波形（用 volumeHistory 最新值做动画） */}
          <Waveform volumes={pronunciation.volumeHistory} />

          {/* 实时识别文本 */}
          {pronunciation.recognizingText ? (
            <Text style={styles.recognizingText} numberOfLines={3}>
              {pronunciation.recognizingText}
            </Text>
          ) : (
            <Text style={styles.hintText}>{t('classics.shadowing.speaking')}</Text>
          )}

          <Text style={styles.durationText}>
            {(pronunciation.duration / 1000).toFixed(1)}s
          </Text>

          {/* 停止按钮 */}
          <TouchableOpacity
            style={[styles.recordButton, styles.recordButtonActive]}
            onPress={handleStopRecord}
            activeOpacity={0.8}
          >
            <MaterialIcons name="stop" size={36} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.hintText}>{t('classics.shadowing.tapToFinish')}</Text>
        </View>
      );
    }

    // idle
    return (
      <View style={styles.centerBody}>
        <TouchableOpacity
          style={styles.recordButton}
          onPress={handleStartRecord}
          activeOpacity={0.8}
          disabled={pronunciation.isInitializing}
        >
          {pronunciation.isInitializing ? (
            <ActivityIndicator size="large" color="#fff" />
          ) : (
            <MaterialIcons name="mic" size={36} color="#fff" />
          )}
        </TouchableOpacity>
        <Text style={styles.hintText}>{t('classics.shadowing.tapToRecord')}</Text>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => { /* 吞事件 */ }}>
          <SafeAreaView edges={['bottom']}>
            <View style={styles.handle} />

            {/* 顶部：目标句子 + 关闭 */}
            <View style={styles.header}>
              <Text style={styles.headerLabel}>
                {t('classics.shadowing.title')}
              </Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialIcons name="close" size={22} color={CLASSICS.colors.inkMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.sentenceBox} showsVerticalScrollIndicator={false}>
              {mergedWords ? (
                <Text style={styles.sentenceText}>
                  {mergedWords.map((w, i) => {
                    const color = w.errorType === 'Omission'
                      ? CLASSICS.colors.inkFaint
                      : getWordScoreColor(w.accuracyScore, theme);
                    return (
                      <Text key={i} style={{ color }}>
                        {i > 0 ? ' ' : ''}{w.word}
                      </Text>
                    );
                  })}
                </Text>
              ) : (
                <Text style={styles.sentenceText}>{sentence}</Text>
              )}
            </ScrollView>

            <View style={styles.bodyBox}>
              {renderBody()}
            </View>

            {pronunciation.error && (
              <Text style={styles.errorText}>{pronunciation.error}</Text>
            )}
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ============================================================================
// 子组件
// ============================================================================

function SubScore({ label, value }: { label: string; value: number }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const color = getWordScoreColor(value, theme);
  return (
    <View style={styles.subScoreItem}>
      <Text style={[styles.subScoreValue, { color }]}>{Math.round(value)}</Text>
      <Text style={styles.subScoreLabel}>{label}</Text>
    </View>
  );
}

/** 简易波形：取 volumeHistory 最后 24 个样本画竖条 */
function Waveform({ volumes }: { volumes: number[] }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const bars = volumes.slice(-24);
  // 不足 24 条补 0
  const padded = bars.length < 24 ? [...Array(24 - bars.length).fill(0), ...bars] : bars;
  return (
    <View style={styles.waveform}>
      {padded.map((v, i) => (
        <View
          key={i}
          style={[
            styles.waveBar,
            { height: Math.max(4, v * 40) },
          ]}
        />
      ))}
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: CLASSICS.colors.paper,
      borderTopLeftRadius: theme.spacing.borderRadius.xl,
      borderTopRightRadius: theme.spacing.borderRadius.xl,
      maxHeight: '80%',
      minHeight: '55%',
    },
    handle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: CLASSICS.colors.divider,
      marginTop: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.sm,
    },
    headerLabel: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: CLASSICS.colors.ink,
      fontFamily: CLASSICS.fontFamily.serif,
    },
    sentenceBox: {
      maxHeight: 260,
      paddingHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.sm,
    },
    sentenceText: {
      fontSize: theme.typography.fontSize.base,
      lineHeight: 30,
      color: CLASSICS.colors.ink,
      fontFamily: CLASSICS.fontFamily.serif,
    },
    bodyBox: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    centerBody: {
      alignItems: 'center',
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.md,
    },
    recordButton: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: CLASSICS.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      ...theme.spacing.shadows.sm,
    },
    recordButtonActive: {
      backgroundColor: '#D64545',
    },
    hintText: {
      fontSize: theme.typography.fontSize.sm,
      color: CLASSICS.colors.inkMuted,
    },
    durationText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: CLASSICS.colors.accent,
    },
    recognizingText: {
      fontSize: theme.typography.fontSize.sm,
      color: CLASSICS.colors.inkMuted,
      textAlign: 'center',
      minHeight: 20,
    },
    waveform: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      height: 48,
    },
    waveBar: {
      width: 4,
      borderRadius: 2,
      backgroundColor: CLASSICS.colors.accent,
    },
    resultContainer: {
      alignItems: 'center',
      gap: theme.spacing.md,
      paddingBottom: theme.spacing.lg,
    },
    scoreCircle: {
      width: 100,
      height: 100,
      borderRadius: 50,
      borderWidth: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scoreNum: {
      fontSize: theme.typography.fontSize['3xl'],
      fontWeight: theme.typography.fontWeight.bold,
    },
    scoreLabel: {
      fontSize: theme.typography.fontSize.xxs,
      color: CLASSICS.colors.inkFaint,
    },
    subScoresRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignSelf: 'stretch',
    },
    subScoreItem: {
      alignItems: 'center',
      minWidth: 56,
    },
    subScoreValue: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    subScoreLabel: {
      fontSize: theme.typography.fontSize.xxs,
      color: CLASSICS.colors.inkMuted,
      marginTop: 2,
    },
    actionRow: {
      flexDirection: 'row',
      gap: theme.spacing.md,
      marginTop: theme.spacing.sm,
    },
    primaryBtn: {
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.sm,
      backgroundColor: CLASSICS.colors.accent,
      borderRadius: theme.spacing.borderRadius.sm,
    },
    primaryBtnText: {
      color: '#fff',
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    secondaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.spacing.borderRadius.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: CLASSICS.colors.divider,
    },
    secondaryBtnText: {
      color: CLASSICS.colors.ink,
      fontSize: theme.typography.fontSize.sm,
    },
    errorText: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
      color: '#D64545',
      fontSize: theme.typography.fontSize.xs,
      textAlign: 'center',
    },
  });
