import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from '@/components/Icon';
import { usePronunciationAssessment } from '@/hooks/usePronunciationAssessment';
import { useI18n } from '@/context/I18nProvider';
import type { SpeakTranslationQuestion } from '@/api/modules/exercise';

interface Props {
  question: SpeakTranslationQuestion;
  isAnswered: boolean;
  onAnswer: (correct: boolean) => void;
  styles: any;
  theme: any;
}

export default function SpeakTranslationView({ question, isAnswered, onAnswer, styles, theme }: Props) {
  const { t } = useI18n();
  const [hasResult, setHasResult] = useState(false);

  const pronunciation = usePronunciationAssessment();

  const handleToggleRecord = async () => {
    if (pronunciation.isRecording || pronunciation.isAssessing) {
      pronunciation.stop();
    } else {
      pronunciation.reset();
      setHasResult(false);
      pronunciation.start({
        referenceText: question.expectedEnglish,
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
      <Text style={styles.questionType}>{t('exercise.speakTranslation.prompt')}</Text>

      <View style={styles.promptCard}>
        <Text style={[styles.promptText, { fontSize: 22 }]}>{question.sentenceCn}</Text>
      </View>

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
            {pronunciation.isRecording ? t('exercise.speakTranslation.recording') :
             pronunciation.isAssessing ? t('exercise.flashcard.assessing') : t('exercise.speakTranslation.tapToSpeak')}
          </Text>
        </>
      )}

      {isAnswered && pronunciation.result && (
        <View>
          <View style={[styles.scoreCircle, { borderColor: getScoreColor(pronunciation.result.pronunciationScore ?? 0) }]}>
            <Text style={[styles.scoreText, { color: getScoreColor(pronunciation.result.pronunciationScore ?? 0) }]}>
              {pronunciation.result.pronunciationScore ?? 0}
            </Text>
            <Text style={styles.scoreLabel}>{t('exercise.flashcard.scoreUnit')}</Text>
          </View>

          {/* 显示参考答案 */}
          <View style={[styles.promptCard, { marginTop: 16 }]}>
            <Text style={[styles.promptSubText, { marginBottom: 4, fontWeight: '600' }]}>{t('exercise.speakTranslation.referenceAnswer')}</Text>
            <Text style={styles.promptText}>{question.expectedEnglish}</Text>
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
