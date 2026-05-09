import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from '@/components/Icon';
import { useTTS } from '@/hooks/useTTS';
import { usePronunciationAssessment } from '@/hooks/usePronunciationAssessment';
import { useI18n } from '@/context/I18nProvider';
import type { ListenRepeatQuestion } from '@/api/modules/exercise';

interface Props {
  question: ListenRepeatQuestion;
  isAnswered: boolean;
  onAnswer: (correct: boolean) => void;
  styles: any;
  theme: any;
}

export default function ListenRepeatView({ question, isAnswered, onAnswer, styles, theme }: Props) {
  const { t } = useI18n();
  const [phase, setPhase] = useState<'listen' | 'repeat'>('listen');
  const [hasResult, setHasResult] = useState(false);
  const tts = useTTS();

  const pronunciation = usePronunciationAssessment();

  // 自动播放
  useEffect(() => {
    tts.speak(`lr_${question.id}`, question.sentence, 'en-US-JennyNeural');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id, question.sentence]);

  // TTS 播放完毕自动切换到 repeat 阶段
  useEffect(() => {
    if (phase === 'listen' && !tts.isPlaying && !tts.isLoading) {
      const timer = setTimeout(() => setPhase('repeat'), 500);
      return () => clearTimeout(timer);
    }
  }, [tts.isPlaying, tts.isLoading, phase]);

  const handleToggleRecord = async () => {
    if (pronunciation.isRecording || pronunciation.isAssessing) {
      pronunciation.stop();
    } else {
      pronunciation.reset();
      setHasResult(false);
      pronunciation.start({
        referenceText: question.sentence,
        language: 'en-US',
        granularity: 'word',
        enableProsody: true,
        enableMiscue: true,
        maxDuration: 15000,
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

  const getScoreColor = (score: number) => {
    if (score >= 80) return theme.colors.success;
    if (score >= 60) return theme.colors.warning;
    return theme.colors.error;
  };

  const getWordColor = (score: number) => {
    if (score >= 80) return { bg: theme.colors.success + '15', text: theme.colors.success };
    if (score >= 60) return { bg: theme.colors.warning + '15', text: theme.colors.warning };
    return { bg: theme.colors.error + '15', text: theme.colors.error };
  };

  return (
    <View>
      <Text style={styles.questionType}>
        {phase === 'listen' ? t('exercise.listenRepeat.promptListen') : t('exercise.listenRepeat.promptRepeat')}
      </Text>

      {/* TTS 播放按钮 */}
      <TouchableOpacity
        style={[styles.ttsButton, tts.isPlaying && styles.ttsButtonPlaying]}
        onPress={() => tts.speak(`lr_${question.id}`, question.sentence, 'en-US-JennyNeural')}
        activeOpacity={0.7}
      >
        <Icon name="volume-up" size={36} color={theme.colors.primary} />
      </TouchableOpacity>

      <View style={styles.promptCard}>
        <Text style={[styles.promptText, { fontSize: 20, opacity: phase === 'listen' ? 0.5 : 1 }]}>
          {question.sentence}
        </Text>
        <Text style={styles.promptSubText}>{question.sentenceCn}</Text>
      </View>

      {/* 录音按钮 - repeat 阶段 */}
      {phase === 'repeat' && !isAnswered && (
        <>
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
          <Text style={{ textAlign: 'center', color: theme.colors.text.tertiary, fontSize: 13 }}>
            {pronunciation.isRecording ? t('exercise.listenRepeat.recording') :
             pronunciation.isAssessing ? t('exercise.flashcard.assessing') : t('exercise.listenRepeat.tapToRepeat')}
          </Text>
        </>
      )}

      {/* 评分结果 */}
      {isAnswered && pronunciation.result && (
        <View>
          <View style={[styles.scoreCircle, { borderColor: getScoreColor(pronunciation.result.pronunciationScore ?? 0) }]}>
            <Text style={[styles.scoreText, { color: getScoreColor(pronunciation.result.pronunciationScore ?? 0) }]}>
              {pronunciation.result.pronunciationScore ?? 0}
            </Text>
            <Text style={styles.scoreLabel}>{t('exercise.flashcard.scoreUnit')}</Text>
          </View>

          {pronunciation.result.words && (
            <View style={styles.wordScoreContainer}>
              {pronunciation.result.words.map((w: any, i: number) => {
                const colors = getWordColor(w.accuracyScore ?? 0);
                return (
                  <View key={i} style={[styles.wordScoreItem, { backgroundColor: colors.bg }]}>
                    <Text style={[styles.wordScoreText, { color: colors.text }]}>
                      {w.word}({w.accuracyScore ?? 0})
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}
    </View>
  );
}
