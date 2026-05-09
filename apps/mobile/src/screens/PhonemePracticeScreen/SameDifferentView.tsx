import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Theme } from '@/context/ThemeProvider';
import Icon from '@/components/Icon';
import { type SameDifferentDrill, type SameDifferentStep } from './types';
import { type Phoneme } from '@/data/phonemes';
import { createStyles } from './styles';

interface SameDifferentViewProps {
  drill: SameDifferentDrill & { targetPhoneme: Phoneme; confusablePhoneme: Phoneme | null };
  drillStep: SameDifferentStep;
  progress: { current: number; total: number };
  selectedAnswer: boolean | null;
  isAnswerCorrect: boolean | null;
  tts: { isPlaying: boolean; isLoading: boolean };
  onSelectAnswer: (answer: boolean) => void;
  onPlaySDWord: (wordIndex: 1 | 2) => void;
  onNext: () => void;
  onBack: () => void;
  theme: Theme;
  t: (key: string, options?: any) => string;
}

export const SameDifferentView: React.FC<SameDifferentViewProps> = ({
  drill,
  drillStep,
  progress,
  selectedAnswer,
  isAnswerCorrect,
  tts,
  onSelectAnswer,
  onPlaySDWord,
  onNext,
  onBack,
  theme,
  t,
}) => {
  const styles = createStyles(theme);
  const showFeedback = drillStep === 'feedback';
  const isChoosing = drillStep === 'choosing';

  const getChoiceBtnStyle = (answer: boolean) => {
    if (!showFeedback) return styles.sameDiffChoiceBtn;
    const isCorrectAnswer = answer === drill.isSame;
    if (isCorrectAnswer) {
      return [styles.sameDiffChoiceBtn, styles.sameDiffChoiceBtnCorrect];
    }
    if (answer === selectedAnswer && !isAnswerCorrect) {
      return [styles.sameDiffChoiceBtn, styles.sameDiffChoiceBtnWrong];
    }
    return styles.sameDiffChoiceBtn;
  };

  const getFeedbackContent = () => {
    if (isAnswerCorrect) {
      if (drill.isSame) {
        return {
          title: t('phonemePractice.sameDifferent.correctSame'),
          hint: t('phonemePractice.sameDifferent.correctSameHint', { word: drill.word1.word, phonetic: drill.word1.phonetic }),
        };
      }
      return {
        title: t('phonemePractice.sameDifferent.correctSame'),
        hint: t('phonemePractice.sameDifferent.correctDiffHint', {
          word1: drill.word1.word, phonetic1: drill.word1.phonetic,
          word2: drill.word2.word, phonetic2: drill.word2.phonetic,
        }),
      };
    }
    if (drill.isSame) {
      return {
        title: t('phonemePractice.sameDifferent.wrongSame'),
        hint: t('phonemePractice.sameDifferent.wrongSameHint', { word: drill.word1.word, phonetic: drill.word1.phonetic }),
      };
    }
    return {
      title: t('phonemePractice.sameDifferent.wrongDiff'),
      hint: t('phonemePractice.sameDifferent.wrongDiffHint', {
        word1: drill.word1.word, phonetic1: drill.word1.phonetic,
        word2: drill.word2.word, phonetic2: drill.word2.phonetic,
        phoneme1: drill.contrastInfo.phoneme1, phoneme2: drill.contrastInfo.phoneme2,
      }),
    };
  };

  const isPlaying = drillStep === 'playing_first' || drillStep === 'playing_second';

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 顶部栏 */}
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

      <View style={styles.listenDrillContent}>
        {/* 提示文字 */}
        <Text style={styles.listenDrillPrompt}>{t('phonemePractice.sameDifferent.prompt')}</Text>

        {/* 播放按钮行 */}
        <View style={styles.sameDiffPlayRow}>
          <View style={styles.minimalPairPlayItem}>
            <TouchableOpacity
              style={[
                styles.sameDiffPlayBtn,
                drillStep === 'playing_first' && { borderColor: theme.colors.success, backgroundColor: theme.colors.success + '15' },
              ]}
              onPress={() => onPlaySDWord(1)}
              activeOpacity={0.7}
              disabled={isPlaying}
            >
              {tts.isLoading && drillStep === 'playing_first' ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <Icon name="volume-up" size={24} color={theme.colors.primary} />
              )}
            </TouchableOpacity>
            <Text style={styles.sameDiffPlayLabel}>{t('phonemePractice.sameDifferent.word1')}</Text>
          </View>

          <View style={styles.minimalPairPlayItem}>
            <TouchableOpacity
              style={[
                styles.sameDiffPlayBtn,
                drillStep === 'playing_second' && { borderColor: theme.colors.success, backgroundColor: theme.colors.success + '15' },
              ]}
              onPress={() => onPlaySDWord(2)}
              activeOpacity={0.7}
              disabled={isPlaying}
            >
              {tts.isLoading && drillStep === 'playing_second' ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <Icon name="volume-up" size={24} color={theme.colors.primary} />
              )}
            </TouchableOpacity>
            <Text style={styles.sameDiffPlayLabel}>{t('phonemePractice.sameDifferent.word2')}</Text>
          </View>
        </View>

        {/* 选择按钮 */}
        <View style={styles.sameDiffChoiceRow}>
          <TouchableOpacity
            style={getChoiceBtnStyle(true)}
            onPress={() => isChoosing && onSelectAnswer(true)}
            activeOpacity={showFeedback ? 1 : 0.7}
            disabled={showFeedback || !isChoosing}
          >
            <Text style={styles.sameDiffChoiceText}>{t('phonemePractice.sameDifferent.same')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={getChoiceBtnStyle(false)}
            onPress={() => isChoosing && onSelectAnswer(false)}
            activeOpacity={showFeedback ? 1 : 0.7}
            disabled={showFeedback || !isChoosing}
          >
            <Text style={styles.sameDiffChoiceText}>{t('phonemePractice.sameDifferent.different')}</Text>
          </TouchableOpacity>
        </View>

        {/* Feedback */}
        {showFeedback && (() => {
          const feedback = getFeedbackContent();
          return (
            <>
              <View style={[
                styles.listenDrillFeedback,
                isAnswerCorrect ? styles.listenDrillFeedbackCorrect : styles.listenDrillFeedbackWrong,
              ]}>
                <Text style={[
                  styles.listenDrillFeedbackTitle,
                  { color: isAnswerCorrect ? theme.colors.success : theme.colors.warning },
                ]}>
                  {feedback.title}
                </Text>
                {feedback.hint ? (
                  <Text style={styles.listenDrillFeedbackHint}>{feedback.hint}</Text>
                ) : null}
              </View>

              <TouchableOpacity
                style={styles.listenDrillContinueBtn}
                onPress={onNext}
                activeOpacity={0.7}
              >
                <Text style={styles.listenDrillContinueText}>{t('phonemePractice.listen.continue')}</Text>
              </TouchableOpacity>
            </>
          );
        })()}
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};
