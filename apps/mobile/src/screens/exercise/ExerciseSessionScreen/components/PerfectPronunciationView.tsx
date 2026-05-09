import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from '@/components/Icon';
import { useTTS } from '@/hooks/useTTS';
import { usePronunciationAssessment } from '@/hooks/usePronunciationAssessment';
import { useI18n } from '@/context/I18nProvider';
import type { PerfectPronunciationQuestion } from '@/api/modules/exercise';

interface Props {
  question: PerfectPronunciationQuestion;
  isAnswered: boolean;
  onAnswer: (correct: boolean) => void;
  styles: any;
  theme: any;
}

export default function PerfectPronunciationView({ question, isAnswered, onAnswer, styles, theme }: Props) {
  const { t } = useI18n();
  const [hasResult, setHasResult] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const tts = useTTS();

  const pronunciation = usePronunciationAssessment();

  // 自动播放示范
  useEffect(() => {
    tts.speak(`pp_${question.id}`, question.targetWord, 'en-US-JennyNeural');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id, question.targetWord]);

  const handleToggleRecord = async () => {
    if (pronunciation.isRecording || pronunciation.isAssessing) {
      pronunciation.stop();
    } else {
      pronunciation.reset();
      setHasResult(false);
      pronunciation.start({
        referenceText: question.targetWord,
        language: 'en-US',
        granularity: 'phoneme',
        enableProsody: false,
        enableMiscue: false,
        maxDuration: 10000,
      });
    }
  };

  // 监听结果
  useEffect(() => {
    if (pronunciation.result && !hasResult) {
      setHasResult(true);
      const score = pronunciation.result.pronunciationScore ?? 0;
      onAnswer(score >= 70);
    }
  }, [pronunciation.result, hasResult, onAnswer]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return theme.colors.success;
    if (score >= 60) return theme.colors.warning;
    return theme.colors.error;
  };

  return (
    <View>
      <Text style={styles.questionType}>{t('exercise.perfectPronunciation.prompt')}</Text>

      {/* 目标单词 */}
      <View style={[styles.promptCard, { alignItems: 'center' }]}>
        <TouchableOpacity
          onPress={() => tts.speak(`pp_${question.id}`, question.targetWord, 'en-US-JennyNeural')}
          activeOpacity={0.7}
        >
          <Icon name="volume-up" size={28} color={theme.colors.primary} style={{ marginBottom: 8 }} />
        </TouchableOpacity>
        <Text style={{ fontSize: 32, fontWeight: '700', color: theme.colors.text.primary, marginBottom: 4 }}>
          {question.targetWord}
        </Text>
        <Text style={{ fontSize: 16, color: theme.colors.text.tertiary }}>
          {question.phonetic}
        </Text>
      </View>

      {/* 薄弱音素标签 */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
        {question.weakPhonemes.map((p, i) => (
          <View key={i} style={{
            paddingHorizontal: 12,
            paddingVertical: 4,
            borderRadius: theme.spacing.borderRadius.base,
            backgroundColor: theme.colors.warning + '15',
          }}>
            <Text style={{ color: theme.colors.warning, fontSize: 13, fontWeight: '600' }}>/{p}/</Text>
          </View>
        ))}
      </View>

      {/* 例句 */}
      <Text style={{ color: theme.colors.text.secondary, fontSize: 14, textAlign: 'center', marginBottom: 16, fontStyle: 'italic' }}>
        {question.exampleSentence}
      </Text>

      {/* 发音技巧 */}
      <TouchableOpacity
        onPress={() => setShowTips(!showTips)}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 16 }}
        activeOpacity={0.7}
      >
        <Icon name="lightbulb" size={16} color={theme.colors.primary} />
        <Text style={{ color: theme.colors.primary, fontSize: 13 }}>
          {showTips ? t('exercise.perfectPronunciation.hideTips') : t('exercise.perfectPronunciation.showTips')}
        </Text>
      </TouchableOpacity>

      {showTips && (
        <View style={{
          backgroundColor: theme.colors.primary + '08',
          borderRadius: 12,
          padding: 14,
          marginBottom: 16,
          borderLeftWidth: 3,
          borderLeftColor: theme.colors.primary,
        }}>
          <Text style={{ color: theme.colors.text.primary, fontSize: 14, lineHeight: 22 }}>
            {question.tips}
          </Text>
        </View>
      )}

      {/* 录音按钮 */}
      {!isAnswered && (
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
            {pronunciation.isRecording ? t('exercise.flashcard.recording') :
             pronunciation.isAssessing ? t('exercise.flashcard.assessing') : t('exercise.perfectPronunciation.tapToRecord')}
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
                const score = w.accuracyScore ?? 0;
                const color = getScoreColor(score);
                return (
                  <View key={i} style={[styles.wordScoreItem, { backgroundColor: color + '15' }]}>
                    <Text style={[styles.wordScoreText, { color }]}>
                      {w.word}({score})
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
