import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeProvider';
import { CustomAlert } from '@/components/CustomAlert';
import { IntroView } from './IntroView';
import { PracticeView } from './PracticeView';
import { ListenIdentifyView } from './ListenIdentifyView';
import { SessionSummary } from './SessionSummary';
import { SameDifferentView } from './SameDifferentView';
import { usePhonemePractice } from './usePhonemePractice';
import { type SpeakStep, type ListenStep, type SameDifferentStep } from './types';
import { createStyles } from './styles';

export default function PhonemePracticeScreen() {
  const { theme } = useTheme();
  const practice = usePhonemePractice();
  const styles = createStyles(theme);
  const { t } = practice;

  const renderContent = () => {
    // Intro 介绍页
    if (practice.mode === 'intro' && practice.intro) {
      return (
        <IntroView
          targetPhoneme={practice.intro.targetPhoneme}
          confusablePhoneme={practice.intro.confusablePhoneme}
          tts={practice.tts}
          onPlayPhonemeWord={practice.handlePlayPhonemeWord}
          onStart={practice.handleStartFromIntro}
          onBack={practice.handleBack}
          theme={theme}
          t={t}
        />
      );
    }

    // Session 练习中
    if (practice.mode === 'session' && practice.session && practice.currentDrill) {
      const drill = practice.currentDrill;

      switch (drill.type) {
        case 'listen_identify':
          return (
            <ListenIdentifyView
              drill={drill}
              drillStep={practice.drillStep as ListenStep}
              progress={practice.progress}
              selectedOption={practice.selectedOption}
              isOptionCorrect={practice.isOptionCorrect}
              tts={practice.tts}
              onPlayStandard={practice.handlePlayStandard}
              onSelectOption={practice.handleSelectOption}
              onNext={practice.handleNextDrill}
              onBack={practice.handleExitSession}
              theme={theme}
              t={t}
            />
          );

        case 'same_different':
          return (
            <SameDifferentView
              drill={drill}
              drillStep={practice.drillStep as SameDifferentStep}
              progress={practice.progress}
              selectedAnswer={practice.selectedAnswer}
              isAnswerCorrect={practice.isAnswerCorrect}
              tts={practice.tts}
              onSelectAnswer={practice.handleSelectSameDifferent}
              onPlaySDWord={practice.handlePlaySDWord}
              onNext={practice.handleNextDrill}
              onBack={practice.handleExitSession}
              theme={theme}
              t={t}
            />
          );

        case 'speak':
          return (
            <PracticeView
              phoneme={practice.session.targetPhoneme}
              word={drill.word}
              wordStep={practice.drillStep as SpeakStep}
              progress={practice.progress}
              tipExpanded={practice.tipExpanded}
              pronunciation={practice.pronunciation}
              tts={practice.tts}
              audioPlayer={practice.audioPlayer}
              onPlayStandard={practice.handlePlayStandard}
              onStartRecording={practice.handleStartRecording}
              onStopRecording={practice.handleStopRecording}
              onPlayRecording={practice.handlePlayRecording}
              onRetry={practice.handleRetryDrill}
              onNext={practice.handleNextDrill}
              onToggleTip={practice.handleToggleTip}
              onBack={practice.handleExitSession}
              theme={theme}
              t={t}
            />
          );
      }
    }

    // 练习总结
    if (practice.mode === 'summary' && practice.session) {
      return (
        <SessionSummary
          phoneme={practice.session.targetPhoneme}
          confusablePhoneme={practice.session.confusablePhoneme}
          results={practice.session.results}
          onRestart={practice.handleRestartSession}
          onBack={practice.handleBack}
          theme={theme}
          t={t}
        />
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {renderContent()}
      <CustomAlert
        visible={practice.showExitAlert}
        title={t('phonemePractice.exit.title')}
        message={t('phonemePractice.exit.message')}
        showCancel
        confirmText={t('phonemePractice.exit.confirm')}
        onConfirm={practice.handleConfirmExit}
        onCancel={practice.handleCancelExit}
      />
    </SafeAreaView>
  );
}
