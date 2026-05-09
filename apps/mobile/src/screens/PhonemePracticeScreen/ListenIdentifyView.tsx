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
import { type ListenIdentifyDrill, type ListenStep } from './types';
import { type Phoneme } from '@/data/phonemes';
import { createStyles } from './styles';

interface ListenIdentifyViewProps {
  drill: ListenIdentifyDrill & { targetPhoneme: Phoneme; confusablePhoneme: Phoneme | null };
  drillStep: ListenStep;
  progress: { current: number; total: number };
  selectedOption: number | null;
  isOptionCorrect: boolean | null;
  tts: { isPlaying: boolean; isLoading: boolean };
  onPlayStandard: () => void;
  onSelectOption: (index: number) => void;
  onNext: () => void;
  onBack: () => void;
  theme: Theme;
  t: (key: string, options?: any) => string;
}

export const ListenIdentifyView: React.FC<ListenIdentifyViewProps> = ({
  drill,
  drillStep,
  progress,
  selectedOption,
  isOptionCorrect,
  tts,
  onPlayStandard,
  onSelectOption,
  onNext,
  onBack,
  theme,
  t,
}) => {
  const styles = createStyles(theme);
  const showFeedback = drillStep === 'feedback';

  const getOptionStyle = (index: number) => {
    if (!showFeedback) {
      if (index === selectedOption) {
        return [styles.listenDrillOption, styles.listenDrillOptionSelected];
      }
      return styles.listenDrillOption;
    }
    if (index === drill.correctIndex) {
      return [styles.listenDrillOption, styles.listenDrillOptionCorrect];
    }
    if (index === selectedOption && !isOptionCorrect) {
      return [styles.listenDrillOption, styles.listenDrillOptionWrong];
    }
    return styles.listenDrillOption;
  };

  const getFeedbackContent = () => {
    const correctOption = drill.options[drill.correctIndex];
    if (isOptionCorrect) {
      return {
        title: t('phonemePractice.listen.correct'),
        hint: t('phonemePractice.listen.correctHint', { phoneme: drill.playPhoneme }),
      };
    }
    return {
      title: t('phonemePractice.listen.wrongAnswer', { word: correctOption.word, phonetic: correctOption.phonetic }),
      hint: '',
    };
  };

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
        <Text style={styles.listenDrillPrompt}>{t('phonemePractice.listen.prompt')}</Text>

        {/* 播放按钮 */}
        <TouchableOpacity
          style={styles.listenDrillPlayBtn}
          onPress={onPlayStandard}
          activeOpacity={0.7}
        >
          {tts.isLoading ? (
            <ActivityIndicator size="large" color={theme.colors.text.inverse} />
          ) : (
            <Icon name="volume-up" size={32} color={theme.colors.text.inverse} />
          )}
        </TouchableOpacity>

        {/* 选项列表 */}
        {drill.options.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={getOptionStyle(index)}
            onPress={() => !showFeedback && onSelectOption(index)}
            activeOpacity={showFeedback ? 1 : 0.7}
            disabled={showFeedback}
          >
            <Text style={styles.listenDrillOptionWord}>{option.word}</Text>
            <Text style={styles.listenDrillOptionPhonetic}>{option.phonetic}</Text>
          </TouchableOpacity>
        ))}

        {/* Feedback */}
        {showFeedback && (() => {
          const feedback = getFeedbackContent();
          return (
            <>
              <View style={[
                styles.listenDrillFeedback,
                isOptionCorrect ? styles.listenDrillFeedbackCorrect : styles.listenDrillFeedbackWrong,
              ]}>
                <Text style={[
                  styles.listenDrillFeedbackTitle,
                  { color: isOptionCorrect ? theme.colors.success : theme.colors.warning },
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
