import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import Icon from '@/components/Icon';
import { useI18n } from '@/context/I18nProvider';
import { useTTS } from '@/hooks/useTTS';
import { usePronunciationAssessment } from '@/hooks/usePronunciationAssessment';
import type { FlashcardQuestion } from '@/api/modules/exercise';
import type { Theme } from '@/context/ThemeProvider';

interface Props {
  question: FlashcardQuestion;
  isAnswered: boolean;
  onAnswer: (correct: boolean) => void;
  styles: ReturnType<typeof import('../styles').createStyles>;
  theme: Theme;
}

export default function FlashcardView({ question, isAnswered, onAnswer, styles, theme }: Props) {
  const { t } = useI18n();
  const [flipped, setFlipped] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;
  const tts = useTTS();
  const localStyles = createLocalStyles(theme);

  const pronunciation = usePronunciationAssessment();

  const handleFlip = () => {
    if (flipped) return;
    setFlipped(true);
    Animated.spring(flipAnim, {
      toValue: 1,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
  };

  const handleToggleRecord = async () => {
    if (pronunciation.isRecording || pronunciation.isAssessing) {
      pronunciation.stop();
    } else {
      pronunciation.reset();
      setHasResult(false);
      pronunciation.start({
        referenceText: question.word,
        language: 'en-US',
        granularity: 'phoneme',
        enableProsody: false,
        enableMiscue: true,
        maxDuration: 8000,
      });
    }
  };

  // 监听结果
  useEffect(() => {
    if (pronunciation.result && !hasResult) {
      setHasResult(true);
      const score = pronunciation.result.pronunciationScore ?? 0;
      onAnswer(score >= 60);
    }
  }, [pronunciation.result, hasResult, onAnswer]);

  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '90deg', '90deg'],
  });
  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['90deg', '90deg', '0deg'],
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return theme.colors.success;
    if (score >= 60) return theme.colors.warning;
    return theme.colors.error;
  };

  return (
    <View>
      <Text style={styles.questionType}>{t('exercise.flashcard.learnWord')}</Text>

      {/* 闪卡区域 */}
      <View style={localStyles.cardContainer}>
        {/* 正面 */}
        <Animated.View style={[
          styles.promptCard,
          localStyles.cardFace,
          localStyles.cardFront,
          flipped && localStyles.cardAbsolute,
          { transform: [{ perspective: 1000 }, { rotateY: frontInterpolate }] },
        ]}>
          <Text style={localStyles.wordText}>
            {question.word}
          </Text>
          <Text style={localStyles.phoneticText}>
            {question.phonetic}
          </Text>
          <TouchableOpacity
            style={localStyles.ttsTouch}
            onPress={() => tts.speak(`fc_${question.id}`, question.word, 'en-US-JennyNeural')}
          >
            <Icon name="volume-up" size={28} color={theme.colors.primary} />
          </TouchableOpacity>
          {!flipped && (
            <TouchableOpacity
              style={[styles.submitButton, localStyles.flipButton]}
              onPress={handleFlip}
              activeOpacity={0.8}
            >
              <Text style={styles.submitButtonText}>{t('exercise.flashcard.flipToSee')}</Text>
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* 背面 */}
        <Animated.View style={[
          styles.promptCard,
          localStyles.cardFace,
          localStyles.cardBack,
          { transform: [{ perspective: 1000 }, { rotateY: backInterpolate }] },
        ]}>
          <Text style={localStyles.meaningText}>
            {question.meaningCn}
          </Text>
          <View style={localStyles.exampleContainer}>
            <Text style={styles.promptText}>{question.exampleSentence}</Text>
            <Text style={[styles.promptSubText, localStyles.exampleSubText]}>{question.exampleSentenceCn}</Text>
          </View>
        </Animated.View>
      </View>

      {/* 录音按钮 - 翻转后显示 */}
      {flipped && !isAnswered && (
        <>
          <Text style={localStyles.readAloudPrompt}>
            {t('exercise.flashcard.readAloudPrompt')}
          </Text>
          <TouchableOpacity
            style={[
              styles.recordButton,
              (pronunciation.isRecording || pronunciation.isAssessing) && styles.recordButtonActive,
            ]}
            onPress={handleToggleRecord}
            activeOpacity={0.7}
          >
            <Icon
              name={pronunciation.isRecording ? 'stop' : pronunciation.isAssessing ? 'hourglass-top' : 'mic'}
              size={32}
              color={pronunciation.isRecording || pronunciation.isAssessing ? theme.colors.text.inverse : theme.colors.error}
            />
          </TouchableOpacity>
          <Text style={localStyles.recordingStatus}>
            {pronunciation.isRecording ? t('exercise.flashcard.recording') :
             pronunciation.isAssessing ? t('exercise.flashcard.assessing') : t('exercise.flashcard.tapToRead')}
          </Text>
        </>
      )}

      {/* 评分结果 */}
      {isAnswered && pronunciation.result && (
        <View style={[styles.scoreCircle, { borderColor: getScoreColor(pronunciation.result.pronunciationScore ?? 0) }]}>
          <Text style={[styles.scoreText, { color: getScoreColor(pronunciation.result.pronunciationScore ?? 0) }]}>
            {pronunciation.result.pronunciationScore ?? 0}
          </Text>
          <Text style={styles.scoreLabel}>{t('exercise.flashcard.scoreUnit')}</Text>
        </View>
      )}
    </View>
  );
}

const createLocalStyles = (theme: Theme) => StyleSheet.create({
  cardContainer: {
    minHeight: theme.scale(200),
    marginBottom: theme.scale(20),
  },
  cardFace: {
    alignItems: 'center',
    backfaceVisibility: 'hidden',
  },
  cardFront: {
    paddingVertical: theme.scale(32),
    width: '100%',
  },
  cardBack: {
    paddingVertical: theme.scale(24),
  },
  cardAbsolute: {
    position: 'absolute',
    width: '100%',
  },
  wordText: {
    fontSize: theme.fontScale(36),
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  phoneticText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.tertiary,
    marginTop: theme.spacing.sm,
  },
  ttsTouch: {
    marginTop: theme.spacing.md,
  },
  flipButton: {
    marginTop: theme.scale(24),
    paddingHorizontal: theme.scale(40),
  },
  meaningText: {
    fontSize: theme.fontScale(24),
    fontWeight: '600',
    color: theme.colors.primary,
  },
  exampleContainer: {
    marginTop: theme.spacing.md,
    width: '100%',
  },
  exampleSubText: {
    marginTop: theme.spacing.xs,
  },
  readAloudPrompt: {
    textAlign: 'center',
    color: theme.colors.text.secondary,
    marginBottom: 12,
  },
  recordingStatus: {
    textAlign: 'center',
    color: theme.colors.text.tertiary,
    fontSize: theme.typography.fontSize.sm,
  },
});
