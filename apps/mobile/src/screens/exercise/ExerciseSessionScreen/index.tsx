import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '@/components/Icon';
import { useTheme } from '@/context/ThemeProvider';
import type { Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import { useExerciseSession } from './useExerciseSession';
import { createStyles } from './styles';

// 题型组件
import MeaningChoiceView from './components/MeaningChoiceView';
import ListenChoiceView from './components/ListenChoiceView';
import FillBlankView from './components/FillBlankView';
import ReadRespondView from './components/ReadRespondView';
import DictationView from './components/DictationView';
import CompleteTranslationView from './components/CompleteTranslationView';
import TranslationView from './components/TranslationView';
import SentenceShuffleView from './components/SentenceShuffleView';
import MatchingPairsView from './components/MatchingPairsView';
import ReadAloudView from './components/ReadAloudView';
// Batch 1
import ArrangeWordsView from './components/ArrangeWordsView';
import MinimalPairsView from './components/MinimalPairsView';
import ListenFillView from './components/ListenFillView';
import ListenRepeatView from './components/ListenRepeatView';
import SpeakTranslationView from './components/SpeakTranslationView';
import FlashcardView from './components/FlashcardView';
// Batch 2
import ImmersiveFillView from './components/ImmersiveFillView';
import ImmersiveReadingView from './components/ImmersiveReadingView';
import ImmersiveDialogueView from './components/ImmersiveDialogueView';
import DialogueSpeakingView from './components/DialogueSpeakingView';
import TimedMatchView from './components/TimedMatchView';
import PerfectPronunciationView from './components/PerfectPronunciationView';
// Batch 3
import DuoRadioView from './components/DuoRadioView';
import StoryView from './components/StoryView';
import AdventureView from './components/AdventureView';

// 需要显式提交按钮的题型
const NEEDS_SUBMIT: Set<string> = new Set([
  'fill_blank', 'dictation', 'complete_translation',
  'translation', 'sentence_shuffle',
  'arrange_words', 'listen_fill',
  'immersive_fill',
]);

export default function ExerciseSessionScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme);
  const localStyles = createLocalStyles(theme);
  const submitRef = useRef<(() => void) | null>(null);
  const [submitReady, setSubmitReady] = React.useState(false);

  const {
    exerciseType,
    phase,
    question,
    isCorrect,
    error,
    handleAnswer,
    handleNext,
    handleClose,
    explanation,
    isExplaining,
    handleExplain,
  } = useExerciseSession();

  const isAnswered = phase === 'feedback';
  const needsSubmit = question ? NEEDS_SUBMIT.has(question.type) : false;

  // 当加载新题目时重置 submitReady — 必须在所有 early return 之前
  useEffect(() => {
    setSubmitReady(false);
    submitRef.current = null;
  }, [question]);

  const handleSubmitPress = () => {
    if (submitRef.current) {
      submitRef.current();
    }
  };

  const onSubmitReady = (ready: boolean) => {
    setSubmitReady(ready);
  };

  if (phase === 'loading') {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={localStyles.loadingText}>{t('exercise.generating')}</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'bottom']}>
        <Icon name="error-outline" size={48} color={theme.colors.error} />
        <Text style={localStyles.loadingText}>{error}</Text>
        <TouchableOpacity style={[styles.submitButton, localStyles.retryButton]} onPress={handleNext}>
          <Text style={styles.submitButtonText}>{t('exercise.retry')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!question) return null;

  const renderQuestion = () => {
    switch (question.type) {
      case 'meaning_choice':
        return <MeaningChoiceView key={question.id} question={question} isAnswered={isAnswered} onAnswer={handleAnswer} styles={styles} theme={theme} />;
      case 'listen_choice':
        return <ListenChoiceView key={question.id} question={question} isAnswered={isAnswered} onAnswer={handleAnswer} styles={styles} theme={theme} />;
      case 'fill_blank':
        return <FillBlankView key={question.id} question={question} isAnswered={isAnswered} onAnswer={handleAnswer} onSubmitReady={onSubmitReady} styles={styles} theme={theme} submitRef={submitRef} />;
      case 'read_respond':
        return <ReadRespondView key={question.id} question={question} isAnswered={isAnswered} onAnswer={handleAnswer} styles={styles} theme={theme} />;
      case 'dictation':
        return <DictationView key={question.id} question={question} isAnswered={isAnswered} onAnswer={handleAnswer} onSubmitReady={onSubmitReady} styles={styles} theme={theme} submitRef={submitRef} />;
      case 'complete_translation':
        return <CompleteTranslationView key={question.id} question={question} isAnswered={isAnswered} onAnswer={handleAnswer} onSubmitReady={onSubmitReady} styles={styles} theme={theme} submitRef={submitRef} />;
      case 'translation':
        return <TranslationView key={question.id} question={question} isAnswered={isAnswered} onAnswer={handleAnswer} onSubmitReady={onSubmitReady} styles={styles} theme={theme} submitRef={submitRef} />;
      case 'sentence_shuffle':
        return <SentenceShuffleView key={question.id} question={question} isAnswered={isAnswered} onAnswer={handleAnswer} onSubmitReady={onSubmitReady} styles={styles} theme={theme} submitRef={submitRef} />;
      case 'matching_pairs':
        return <MatchingPairsView key={question.id} question={question} isAnswered={isAnswered} onAnswer={handleAnswer} styles={styles} theme={theme} />;
      case 'read_aloud':
        return <ReadAloudView key={question.id} question={question} isAnswered={isAnswered} onAnswer={handleAnswer} styles={styles} theme={theme} />;
      case 'arrange_words':
        return <ArrangeWordsView key={question.id} question={question} isAnswered={isAnswered} onAnswer={handleAnswer} onSubmitReady={onSubmitReady} styles={styles} theme={theme} submitRef={submitRef} />;
      case 'minimal_pairs':
        return <MinimalPairsView key={question.id} question={question} isAnswered={isAnswered} onAnswer={handleAnswer} styles={styles} theme={theme} />;
      case 'listen_fill':
        return <ListenFillView key={question.id} question={question} isAnswered={isAnswered} onAnswer={handleAnswer} onSubmitReady={onSubmitReady} styles={styles} theme={theme} submitRef={submitRef} />;
      case 'listen_repeat':
        return <ListenRepeatView key={question.id} question={question} isAnswered={isAnswered} onAnswer={handleAnswer} styles={styles} theme={theme} />;
      case 'speak_translation':
        return <SpeakTranslationView key={question.id} question={question} isAnswered={isAnswered} onAnswer={handleAnswer} styles={styles} theme={theme} />;
      case 'flashcard':
        return <FlashcardView key={question.id} question={question} isAnswered={isAnswered} onAnswer={handleAnswer} styles={styles} theme={theme} />;
      case 'immersive_fill':
        return <ImmersiveFillView key={question.id} question={question} isAnswered={isAnswered} onAnswer={handleAnswer} onSubmitReady={onSubmitReady} styles={styles} theme={theme} submitRef={submitRef} />;
      case 'immersive_reading':
        return <ImmersiveReadingView key={question.id} question={question} isAnswered={isAnswered} onAnswer={handleAnswer} styles={styles} theme={theme} />;
      case 'immersive_dialogue':
        return <ImmersiveDialogueView key={question.id} question={question} isAnswered={isAnswered} onAnswer={handleAnswer} styles={styles} theme={theme} />;
      case 'dialogue_speaking':
        return <DialogueSpeakingView key={question.id} question={question} isAnswered={isAnswered} onAnswer={handleAnswer} styles={styles} theme={theme} />;
      case 'timed_match':
        return <TimedMatchView key={question.id} question={question} isAnswered={isAnswered} onAnswer={handleAnswer} styles={styles} theme={theme} />;
      case 'perfect_pronunciation':
        return <PerfectPronunciationView key={question.id} question={question} isAnswered={isAnswered} onAnswer={handleAnswer} styles={styles} theme={theme} />;
      case 'duo_radio':
        return <DuoRadioView key={question.id} question={question} isAnswered={isAnswered} onAnswer={handleAnswer} styles={styles} theme={theme} />;
      case 'story':
        return <StoryView key={question.id} question={question} isAnswered={isAnswered} onAnswer={handleAnswer} styles={styles} theme={theme} />;
      case 'adventure':
        return <AdventureView key={question.id} question={question} isAnswered={isAnswered} onAnswer={handleAnswer} styles={styles} theme={theme} />;
      default:
        return <Text style={styles.questionType}>{t('exercise.unsupportedType')}</Text>;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* 顶部 */}
      <View style={styles.progressHeader}>
        <View style={styles.progressRow}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Icon name="close" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t(`exercise.types.${exerciseType}`, { defaultValue: exerciseType })}</Text>
        </View>
      </View>

      {/* 题目区域 */}
      <ScrollView style={styles.questionSection} showsVerticalScrollIndicator={false}>
        {renderQuestion()}
        <View style={localStyles.bottomSpacer} />
      </ScrollView>

      {/* AI 解释区域 */}
      {isAnswered && explanation && (
        <View style={localStyles.explanationWrapper}>
          <View style={localStyles.explanationCard}>
            <Text style={localStyles.explanationText}>{explanation}</Text>
            <Text style={{ fontSize: 10, color: theme.colors.text.disabled, textAlign: 'center', marginTop: 6 }}>
              {t('common.aiGenerated')}
            </Text>
          </View>
        </View>
      )}

      {/* 底部按钮 */}
      <View style={styles.bottomBar}>
        {!isAnswered && needsSubmit ? (
          <TouchableOpacity
            style={[styles.submitButton, !submitReady && styles.submitButtonDisabled]}
            onPress={handleSubmitPress}
            activeOpacity={0.8}
            disabled={!submitReady}
          >
            <Text style={styles.submitButtonText}>{t('exercise.checkAnswer')}</Text>
          </TouchableOpacity>
        ) : isAnswered ? (
          <View style={localStyles.feedbackButtonRow}>
            {!explanation && (
              <TouchableOpacity
                style={[styles.submitButton, localStyles.whyButton]}
                onPress={handleExplain}
                activeOpacity={0.8}
                disabled={isExplaining}
              >
                <Text style={[styles.submitButtonText, localStyles.whyButtonText]}>
                  {isExplaining ? t('exercise.explaining') : t('exercise.why')}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.submitButton, localStyles.continueButton]}
              onPress={handleNext}
              activeOpacity={0.8}
            >
              <Text style={styles.submitButtonText}>{t('exercise.continue')}</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const createLocalStyles = (theme: Theme) => StyleSheet.create({
  loadingText: {
    color: theme.colors.text.secondary,
    marginTop: 12,
  },
  retryButton: {
    marginTop: theme.scale(20),
    paddingHorizontal: theme.scale(32),
  },
  bottomSpacer: {
    height: theme.spacing.lg,
  },
  explanationWrapper: {
    paddingHorizontal: 16,
    paddingBottom: theme.spacing.sm,
  },
  explanationCard: {
    backgroundColor: theme.colors.primary + '08',
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
    borderRadius: theme.spacing.borderRadius.sm,
    padding: 12,
  },
  explanationText: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.fontSize.sm,
    lineHeight: theme.fontScale(22),
  },
  feedbackButtonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  whyButton: {
    flex: 0,
    paddingHorizontal: theme.scale(20),
    backgroundColor: theme.colors.background.secondary,
  },
  whyButtonText: {
    color: theme.colors.text.primary,
  },
  continueButton: {
    flex: 1,
  },
});
