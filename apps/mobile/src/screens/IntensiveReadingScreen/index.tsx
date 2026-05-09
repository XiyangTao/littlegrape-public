import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '@/components/Icon';
import { createStyles } from './styles';
import { useIntensiveReading } from './useIntensiveReading';
import { ReadingStep } from './components/ReadingStep';
import { QuizStep } from './components/QuizStep';
import { CompletionStep } from './components/CompletionStep';

export default function IntensiveReadingScreen() {
  const insets = useSafeAreaInsets();
  const {
    navigation,
    theme,
    t,
    goBack,
    goNext,

    article,
    isLoading,
    error,
    paragraphs,
    quizQuestions,

    currentStep,
    stepLabels,

    showTranslation,
    setShowTranslation,
    highlightParagraphIndex,
    highlightSentence,
    showExplanationLock,

    playFullAudio,
    playExplanation,
    togglePlayPause,
    stopAudio,
    ttsState,
    seekBy,

    teacherCharacter,
    voice,

    wordDetailData,
    setWordDetailData,
    handleWordPress,

    currentQuizIndex,
    currentQuestion,
    selectedAnswer,
    isAnswerChecked,
    selectAnswer,
    checkAnswer,
    nextQuestion,
    isSubmitting,

    quizScore,
    readTime,
  } = useIntensiveReading();

  const styles = createStyles(theme);

  // Loading
  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Error
  if (error || !article) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: theme.colors.text.secondary, fontSize: theme.typography.fontSize.sm }}>
          {t('intensiveReading.loadError')}
        </Text>
        <TouchableOpacity onPress={goBack} style={{ marginTop: theme.spacing.md }}>
          <Text style={{ color: theme.colors.primary }}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack} activeOpacity={0.7}>
          <Icon name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {t('intensiveReading.title')}
        </Text>
        <View style={styles.headerRight} />
      </View>

      {/* 步骤内容 */}
      {currentStep === 0 && (
        <ReadingStep
          paragraphs={paragraphs}
          showTranslation={showTranslation}
          onToggleTranslation={() => setShowTranslation(prev => !prev)}
          onPlayFullAudio={playFullAudio}
          onPlayExplanation={playExplanation}
          onTogglePlayPause={togglePlayPause}
          onStopAudio={stopAudio}
          onSeek={seekBy}
          ttsState={ttsState}
          article={article}
          keyVocabulary={article.keyVocabulary || []}
          wordDetail={wordDetailData}
          onWordPress={handleWordPress}
          onDismissWordDetail={() => setWordDetailData(null)}
          onNext={goNext}
          theme={theme}
          t={t}
          teacherName={teacherCharacter?.name}
          teacherRole={teacherCharacter?.teacherRole}
          teacherAvatar={teacherCharacter?.avatar}
          voice={voice}
          highlightParagraphIndex={highlightParagraphIndex}
          highlightSentence={highlightSentence}
          showExplanationLock={showExplanationLock}
        />
      )}

      {currentStep === 1 && currentQuestion && (
        <QuizStep
          currentIndex={currentQuizIndex}
          totalCount={quizQuestions.length}
          question={currentQuestion}
          selectedAnswer={selectedAnswer}
          isChecked={isAnswerChecked}
          isSubmitting={isSubmitting}
          onSelect={selectAnswer}
          onCheck={checkAnswer}
          onNext={nextQuestion}
          theme={theme}
          t={t}
        />
      )}

      {currentStep === 2 && (
        <CompletionStep
          quizScore={quizScore}
          readTime={readTime}
          vocabCount={article.keyVocabulary?.length || 0}
          onGoHome={() => navigation.popToTop()}
          onGoArticles={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
              navigation.navigate('ReadingList');
            } else {
              navigation.replace('ReadingList');
            }
          }}
          theme={theme}
          t={t}
        />
      )}

      {/* AI 生成内容标识：阅读步骤显示（译文/词义/讲解为 AI 生成，原文非 AI） */}
      {currentStep === 0 && (
        <Text style={{ fontSize: 10, color: theme.colors.text.disabled, textAlign: 'center', paddingVertical: 6, backgroundColor: theme.colors.background.primary }}>
          {t('common.aiGeneratedReading')}
        </Text>
      )}

    </View>
  );
}
