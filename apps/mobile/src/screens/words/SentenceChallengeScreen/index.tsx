/**
 * AI 造句挑战页面
 */
import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '@/components/Icon';
import { useTheme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import { useSentenceChallenge } from './useSentenceChallenge';
import { createStyles } from './styles';

export default function SentenceChallengeScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme);
  const {
    phase,
    wordData,
    inputText,
    setInputText,
    evalResult,
    error,
    handleSubmit,
    handleRetry,
    navigation,
  } = useSentenceChallenge();

  const renderScoreBar = (label: string, score: number, color: string) => {
    const percent = (score / 10) * 100;
    return (
      <View style={styles.scoreBarRow}>
        <Text style={styles.scoreLabel}>{label}</Text>
        <View style={styles.scoreBarBg}>
          <View style={[styles.scoreBarFill, { width: `${percent}%`, backgroundColor: color }]} />
        </View>
        <Text style={styles.scoreValue}>{score}/10</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="close" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('sentenceChallenge.title')}</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Word Info */}
          <View style={styles.wordCard}>
            <Text style={styles.wordText}>{wordData.word}</Text>
            <Text style={styles.meaningText}>{wordData.meaningCn}</Text>
            {wordData.collocations.length > 0 && (
              <View style={styles.collocationsContainer}>
                <Text style={styles.collocationsTitle}>{t('sentenceChallenge.collocations')}</Text>
                {wordData.collocations.map((c, i) => (
                  <Text key={i} style={styles.collocationText}>{c}</Text>
                ))}
              </View>
            )}
          </View>

          {/* Input Phase */}
          {phase === 'input' && (
            <View style={styles.inputSection}>
              <Text style={styles.inputPrompt}>{t('sentenceChallenge.inputPrompt', { word: wordData.word })}</Text>
              <TextInput
                style={styles.textInput}
                value={inputText}
                onChangeText={setInputText}
                placeholder={`Try using "${wordData.word}" in a sentence...`}
                placeholderTextColor={theme.colors.text.disabled}
                multiline
                textAlignVertical="top"
                autoCorrect={false}
              />
              {error && <Text style={styles.errorText}>{error}</Text>}
              <TouchableOpacity
                style={[styles.submitButton, !inputText.trim() && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={!inputText.trim()}
              >
                <Icon name="send" size={20} color={theme.colors.text.inverse} />
                <Text style={styles.submitButtonText}>{t('sentenceChallenge.submitEval')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Evaluating Phase */}
          {phase === 'evaluating' && (
            <View style={styles.evaluatingSection}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.evaluatingText}>{t('sentenceChallenge.evaluating')}</Text>
            </View>
          )}

          {/* Result Phase */}
          {phase === 'result' && evalResult && (
            <View style={styles.resultSection}>
              {/* Overall Score */}
              <View style={styles.overallScoreCard}>
                <Text style={styles.overallScoreValue}>{evalResult.overallScore}</Text>
                <Text style={styles.overallScoreLabel}>{t('sentenceChallenge.totalScore')}</Text>
              </View>

              {/* Score Bars */}
              <View style={styles.scoreBarsContainer}>
                {renderScoreBar(t('sentenceChallenge.scoreGrammar'), evalResult.grammarScore, theme.colors.primary)}
                {renderScoreBar(t('sentenceChallenge.scoreUsage'), evalResult.usageScore, theme.colors.secondary)}
                {renderScoreBar(t('sentenceChallenge.scoreNatural'), evalResult.naturalScore, theme.colors.warning)}
              </View>

              {/* Feedback */}
              <View style={styles.feedbackCard}>
                <Text style={styles.feedbackTitle}>{t('sentenceChallenge.aiFeedback')}</Text>
                <Text style={styles.feedbackText}>{evalResult.feedback}</Text>
              </View>

              {/* Improved sentence */}
              {evalResult.improvedSentence && (
                <View style={styles.improvedCard}>
                  <Text style={styles.improvedTitle}>{t('sentenceChallenge.improvedTitle')}</Text>
                  <Text style={styles.improvedText}>{evalResult.improvedSentence}</Text>
                </View>
              )}

              {/* Actions */}
              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
                  <Icon name="refresh" size={20} color={theme.colors.primary} />
                  <Text style={styles.retryButtonText}>{t('sentenceChallenge.retry')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.doneButton} onPress={() => navigation.goBack()}>
                  <Text style={styles.doneButtonText}>{t('sentenceChallenge.done')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
