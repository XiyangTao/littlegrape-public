/**
 * 复习页面
 *
 * 流程：加载 → 选词确认 → 做题（每词3题）→ 结果
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import Icon from '@/components/Icon';
import PracticeQuestionRenderer from './PracticeQuestionRenderer';
import createStyles from './styles';
import { usePractice } from './usePractice';
import ResultView from './ResultView';

export default function PracticeScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme);

  const {
    navigation,
    phase,
    selectedCandidates,
    canSwap,
    handleRemoveWord,
    handleStartReview,
    session,
    practiceResult,
    getWrongWords,
    getMasteredWords,
    handleRetry,
  } = usePractice();

  // ==================== 加载中 ====================

  if (phase === 'loading') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('wordPractice.title')}</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>{t('wordPractice.preparing')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ==================== 无可复习的词 ====================

  if (phase === 'empty') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('wordPractice.title')}</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.centerContent}>
          <Text style={styles.emptyEmoji}>{'\uD83C\uDF1F'}</Text>
          <Text style={styles.emptyTitle}>{t('wordPractice.emptyTitle')}</Text>
          <Text style={styles.emptyDesc}>{t('wordPractice.emptyDesc')}</Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={styles.emptyButtonText}>{t('wordPractice.back')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ==================== 选词确认 ====================

  if (phase === 'wordSelect') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('wordPractice.title')}</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.wordSelectContainer} contentContainerStyle={styles.wordSelectContent}>
          <Text style={styles.wordSelectHint}>
            {canSwap
              ? t('wordPractice.recommendedHint', { count: selectedCandidates.length })
              : t('wordPractice.pendingHint', { count: selectedCandidates.length })
            }
          </Text>

          {selectedCandidates.map((word) => (
            <View key={word.id} style={styles.wordSelectItem}>
              <View style={styles.wordSelectInfo}>
                <Text style={styles.wordSelectWord}>{word.word}</Text>
                <Text style={styles.wordSelectMeaning} numberOfLines={1}>{word.meaningCn}</Text>
              </View>
              {canSwap && (
                <TouchableOpacity
                  style={styles.wordSelectRemoveBtn}
                  onPress={() => handleRemoveWord(word.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Icon name="close" size={18} color={theme.colors.text.tertiary} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>

        <View style={styles.wordSelectFooter}>
          <TouchableOpacity
            style={[styles.startReviewButton, selectedCandidates.length === 0 && styles.startReviewButtonDisabled]}
            onPress={handleStartReview}
            activeOpacity={0.8}
            disabled={selectedCandidates.length === 0}
          >
            <Text style={styles.startReviewButtonText}>
              {t('wordPractice.startReview', { count: selectedCandidates.length })}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ==================== 做题 ====================

  if (phase === 'practicing') {
    if (!session.currentQuestion) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {t('wordPractice.progressTitle', { current: session.currentIndex + 1, total: session.totalCount })}
          </Text>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, {
            width: `${session.totalCount > 0 ? ((session.currentIndex + 1) / session.totalCount) * 100 : 0}%`,
          }]} />
        </View>

        {session.combo > 1 && (
          <View style={styles.comboContainer}>
            <Text style={styles.comboText}>{'\uD83D\uDD25'} x{session.combo}</Text>
          </View>
        )}

        <View style={{ flex: 1 }}>
          <PracticeQuestionRenderer
            key={session.currentIndex}
            question={session.currentQuestion}
            isAnswered={session.phase === 'feedback'}
            isCorrect={session.isCorrect}
            onAnswer={session.onAnswer}
            submitRef={session.submitRef}
            onSubmitReady={session.onSubmitReady}
          />
        </View>

        {/* 上一题 / 下一题 导航 */}
        <View style={styles.navContainer}>
          <TouchableOpacity
            style={[styles.navButton, !session.hasPrev && styles.navButtonDisabled]}
            onPress={session.goPrev}
            disabled={!session.hasPrev}
            activeOpacity={0.7}
          >
            <Icon
              name="chevron-left"
              size={20}
              color={session.hasPrev ? theme.colors.primary : theme.colors.text.disabled}
            />
            <Text style={[styles.navButtonText, !session.hasPrev && styles.navButtonTextDisabled]}>
              {t('wordPractice.prevQuestion')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navButton, styles.navButtonNext, !session.canGoNext && styles.navButtonDisabled]}
            onPress={session.goNext}
            disabled={!session.canGoNext}
            activeOpacity={0.7}
          >
            <Text style={[styles.navButtonText, styles.navButtonNextText, !session.canGoNext && styles.navButtonTextDisabled]}>
              {t('wordPractice.nextQuestion')}
            </Text>
            <Icon
              name="chevron-right"
              size={20}
              color={session.canGoNext ? theme.colors.text.inverse : theme.colors.text.disabled}
            />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ==================== 结果 ====================

  return (
    <ResultView
      styles={styles}
      practiceResult={practiceResult}
      masteredWords={getMasteredWords()}
      wrongWords={getWrongWords()}
      onRetry={handleRetry}
      onBack={() => navigation.goBack()}
    />
  );
}
