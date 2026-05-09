import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
import { Theme } from '@/context/ThemeProvider';
import { type PronunciationAssessmentState } from '@/hooks/usePronunciationAssessment';
import Icon from '@/components/Icon';
import { PhonemeTip } from './PhonemeTip';
import { type Phoneme, type PhonemeWord } from '@/data/phonemes';
import { arpabetToIPA, isPhonemeMatch, fillEmptyPhonemes } from '@/utils/phonemeMapping';
import { type SpeakStep } from './types';
import { createStyles } from './styles';
import { getScoreLevel, getTargetFeedbackText } from './scoreLevels';

// ============================================================================
// Props
// ============================================================================

interface PracticeViewProps {
  phoneme: Phoneme;
  word: PhonemeWord;
  wordStep: SpeakStep;
  progress: { current: number; total: number };
  tipExpanded: boolean;

  // 发音评估状态
  pronunciation: PronunciationAssessmentState & {
    recordingUri: string | null;
  };
  tts: { isPlaying: boolean; isLoading: boolean };
  audioPlayer: { isPlaying: boolean };

  // 操作
  onPlayStandard: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onPlayRecording: () => void;
  onRetry: () => void;
  onNext: () => void;
  onToggleTip: () => void;
  onBack: () => void;
  theme: Theme;
  t: (key: string, options?: any) => string;
}

// ============================================================================
// 组件
// ============================================================================

// 倒计时圆圈常量
const COUNTDOWN_DURATION = 3000;
const RING_SIZE = 100;
const RING_RADIUS = 46;
const RING_STROKE_WIDTH = 4;
const RING_CIRCUMFERENCE = Math.PI * 2 * RING_RADIUS;

export const PracticeView: React.FC<PracticeViewProps> = ({
  phoneme,
  word,
  wordStep,
  progress,
  tipExpanded,
  pronunciation,
  tts,
  audioPlayer,
  onPlayStandard,
  onStartRecording,
  onStopRecording,
  onPlayRecording,
  onRetry,
  onNext,
  onToggleTip,
  onBack,
  theme,
  t,
}) => {
  const styles = createStyles(theme);
  const result = pronunciation.result;

  // 填充 Azure 返回的空音素名称（en-GB 等非 en-US 语言）
  const filledPhonemes = result?.words?.[0]?.phonemes
    ? fillEmptyPhonemes(result.words[0].phonemes, word.phonetic)
    : undefined;

  // 查找目标音素得分
  const targetPhonemeResult = filledPhonemes?.find(
    p => isPhonemeMatch(p.phoneme, phoneme.symbol)
  );
  const targetScore = targetPhonemeResult?.accuracyScore ?? 0;
  const level = targetPhonemeResult ? getScoreLevel(targetScore, t) : null;

  // 倒计时进度动画
  const recordingProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (pronunciation.isRecording) {
      recordingProgress.setValue(0);
      Animated.timing(recordingProgress, {
        toValue: 1,
        duration: COUNTDOWN_DURATION,
        useNativeDriver: false,
      }).start();
    } else {
      recordingProgress.stopAnimation();
      recordingProgress.setValue(0);
    }
  }, [pronunciation.isRecording]);

  // 位置文案
  const getPositionText = (position: string): string => {
    switch (position) {
      case 'beginning': return t('phonemePractice.speak.posBeginning');
      case 'middle': return t('phonemePractice.speak.posMiddle');
      default: return t('phonemePractice.speak.posEnd');
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 顶部栏：关闭 + 进度条 + 题号 */}
      <View style={styles.sessionTopBar}>
        <TouchableOpacity style={styles.closeButton} onPress={onBack}>
          <Icon name="close" size={20} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(progress.current / progress.total) * 100}%` }]} />
          </View>
        </View>
        <Text style={styles.progressText}>{progress.current}/{progress.total}</Text>
      </View>

      {/* 目标音素紧凑卡片 */}
      <View style={styles.targetPhonemeCard}>
        <Text style={styles.targetPhonemeSymbol}>/{phoneme.symbol}/</Text>
        <Text style={styles.targetPhonemeHint} numberOfLines={1}>{phoneme.mouthTip}</Text>
      </View>

      {/* 可折叠发音技巧 */}
      <PhonemeTip
        phoneme={phoneme}
        expanded={tipExpanded}
        onToggle={onToggleTip}
        theme={theme}
        t={t}
      />

      {/* 单词卡片 */}
      <View style={styles.practiceWordCard}>
        <Text style={styles.practiceWordText}>{word.word}</Text>
        <Text style={styles.practiceWordPhonetic}>{word.phonetic}</Text>
        <Text style={styles.practiceWordPosition}>
          {t('phonemePractice.speak.positionHint', { phoneme: phoneme.symbol, position: getPositionText(word.position) })}
        </Text>
      </View>

      {/* 步骤区域 */}
      {wordStep === 'listen' && (
        <View style={styles.stepSection}>
          <TouchableOpacity
            style={styles.listenButton}
            onPress={onPlayStandard}
            activeOpacity={0.7}
          >
            {tts.isLoading ? (
              <ActivityIndicator size="small" color={theme.colors.text.inverse} />
            ) : (
              <>
                <Icon
                  name={tts.isPlaying ? 'stop' : 'volume-up'}
                  size={24}
                  color={theme.colors.text.inverse}
                />
                <Text style={styles.listenButtonText}>
                  {tts.isPlaying ? t('phonemePractice.speak.playing') : t('phonemePractice.speak.listenStandard')}
                </Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={styles.stepHint}>
            {tts.isPlaying ? t('phonemePractice.speak.listeningHint') : t('phonemePractice.speak.recordHint')}
          </Text>
          {!tts.isPlaying && !tts.isLoading && (
            <TouchableOpacity
              style={styles.startRecordBtn}
              onPress={onStartRecording}
              activeOpacity={0.7}
            >
              <Icon name="mic" size={24} color={theme.colors.primary} />
              <Text style={styles.startRecordBtnText}>{t('phonemePractice.speak.startRecord')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {wordStep === 'record' && (
        <View style={styles.stepSection}>
          <Text style={styles.stepHint}>
            {pronunciation.isInitializing ? t('phonemePractice.speak.initializing') :
             pronunciation.isRecording ? t('phonemePractice.speak.recording') :
             t('phonemePractice.speak.tapToRecord')}
          </Text>

          <View style={styles.recordButtonWrapper}>
            {/* 圆形进度条 */}
            {pronunciation.isRecording && (
              <Svg style={styles.progressRing} width={RING_SIZE} height={RING_SIZE}>
                {/* 背景圆 */}
                <Circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RING_RADIUS}
                  stroke={theme.colors.primary + '30'}
                  strokeWidth={RING_STROKE_WIDTH}
                  fill="transparent"
                />
                {/* 进度圆 */}
                <AnimatedCircle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RING_RADIUS}
                  stroke={theme.colors.primary}
                  strokeWidth={RING_STROKE_WIDTH}
                  fill="transparent"
                  strokeLinecap="round"
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={recordingProgress.interpolate({
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
              onPress={pronunciation.isRecording ? onStopRecording : onStartRecording}
              disabled={pronunciation.isInitializing}
              activeOpacity={0.7}
            >
              {pronunciation.isInitializing ? (
                <ActivityIndicator size="large" color={theme.colors.primary} />
              ) : (
                <Icon
                  name={pronunciation.isRecording ? 'stop' : 'mic'}
                  size={32}
                  color={pronunciation.isRecording ? theme.colors.text.inverse : theme.colors.primary}
                />
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.recordTip}>
            {pronunciation.isRecording ? t('phonemePractice.speak.stopRecord') : t('phonemePractice.speak.tapStart')}
          </Text>

          {/* 重播标准发音 */}
          {!pronunciation.isRecording && !pronunciation.isInitializing && (
            <TouchableOpacity
              style={styles.replayButton}
              onPress={onPlayStandard}
              activeOpacity={0.7}
            >
              <Icon name="volume-up" size={16} color={theme.colors.primary} />
              <Text style={styles.replayButtonText}>{t('phonemePractice.speak.replayStandard')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {wordStep === 'assessing' && (
        <View style={styles.stepSection}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.stepHint}>{t('phonemePractice.speak.assessing')}</Text>
        </View>
      )}

      {wordStep === 'feedback' && result && (
        <View style={styles.feedbackSection}>
          {/* 等级词 + emoji */}
          {level && (
            <View style={styles.feedbackLevelContainer}>
              <Text style={styles.feedbackEmoji}>{level.emoji}</Text>
              <Text style={[styles.feedbackLevelText, { color: level.color(theme) }]}>
                {level.label}
              </Text>
            </View>
          )}

          {/* 音素高亮条 */}
          {filledPhonemes && filledPhonemes.length > 0 && (
            <View style={styles.phonemeHighlightBar}>
              {filledPhonemes.map((p, index) => {
                const isGood = p.accuracyScore >= 60;
                const isTarget = isPhonemeMatch(p.phoneme, phoneme.symbol);
                const displayPhoneme = arpabetToIPA(p.phoneme);
                return (
                  <View key={index} style={styles.phonemeChipContainer}>
                    <View
                      style={[
                        styles.phonemeHighlightChip,
                        isGood ? styles.phonemeHighlightChipGood : styles.phonemeHighlightChipWeak,
                      ]}
                    >
                      <Text
                        style={[
                          styles.phonemeHighlightChipText,
                          isGood ? styles.phonemeHighlightChipTextGood : styles.phonemeHighlightChipTextWeak,
                        ]}
                      >
                        {displayPhoneme}
                      </Text>
                    </View>
                    {isTarget && <View style={styles.phonemeTargetIndicator} />}
                  </View>
                );
              })}
            </View>
          )}

          {/* 目标音素简要反馈 */}
          {targetPhonemeResult && (
            <Text style={styles.targetFeedbackText}>
              {getTargetFeedbackText(phoneme.symbol, targetScore, phoneme.mouthTip, t)}
            </Text>
          )}

          {/* 播放录音 */}
          {pronunciation.recordingUri && (
            <TouchableOpacity
              style={styles.playRecordingButton}
              onPress={onPlayRecording}
              activeOpacity={0.7}
            >
              <Icon
                name={audioPlayer.isPlaying ? 'stop' : 'play-arrow'}
                size={20}
                color={theme.colors.text.secondary}
              />
              <Text style={styles.playRecordingText}>
                {audioPlayer.isPlaying ? t('phonemePractice.speak.stopPlaying') : t('phonemePractice.speak.playRecording')}
              </Text>
            </TouchableOpacity>
          )}

          {/* 操作按钮 */}
          <View style={styles.feedbackActions}>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={onRetry}
              activeOpacity={0.7}
            >
              <Icon name="refresh" size={20} color={theme.colors.primary} />
              <Text style={styles.retryButtonText}>{t('phonemePractice.speak.retry')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.nextButton}
              onPress={onNext}
              activeOpacity={0.7}
            >
              <Text style={styles.nextButtonText}>
                {progress.current >= progress.total ? t('phonemePractice.speak.finish') : t('phonemePractice.speak.next')}
              </Text>
              <Icon name="arrow-forward" size={20} color={theme.colors.text.inverse} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 错误提示 */}
      {pronunciation.error && (
        <View style={styles.errorContainer}>
          <Icon name="error" size={20} color={theme.colors.error} />
          <Text style={styles.errorText}>{pronunciation.error}</Text>
        </View>
      )}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};
