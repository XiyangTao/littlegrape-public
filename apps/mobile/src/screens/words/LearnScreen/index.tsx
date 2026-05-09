/**
 * 学新词页面
 *
 * FlatList 垂直翻卡，无固定批次，随时可退出。
 * 两个操作：「去练习」2 道题全对后标记已学习 / 「已掌握」跳过不复习
 */

import React from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '@/components/Icon';
import { useTheme } from '@/context/ThemeProvider';
import type { LearnWordWithProgress } from '@/types/word';
import QuestionRenderer from '@/components/QuestionRenderer';
import { useI18n } from '@/context/I18nProvider';
import WordCard from '../components/WordCard';
import { useLearn } from './useLearn';
import { createStyles } from './styles';

export default function LearnScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();
  const {
    words,
    isLoading,
    loadError,
    currentIndex,
    cardHeight,
    isScrolling,
    isCardFlipped,
    isKnownAnimating,
    flatListRef,
    onViewableItemsChanged,
    viewabilityConfig,
    onContainerLayout,
    // 练习
    isPracticing,
    practiceWord,
    practiceQuestion,
    practiceIndex,
    practiceTotal,
    practicePhase,
    practiceCorrect,
    practiceAttempt,
    canSubmit,
    submitRef,
    handleEnterPractice,
    handlePracticeAnswer,
    handlePracticeRetry,
    handleCancelPractice,
    handlePracticeDismiss,
    onSubmitReady,
    // 收藏
    favoritedIds,
    handleFavoriteChange,
    // 操作
    handleSkipWord,
    handleFlipChange,
    handleKnownAnimatingChange,
    handleScrollBeginDrag,
    handleScrollEndDrag,
    handleMomentumScrollEnd,
    handleGoBack,
  } = useLearn();

  // ==================== Loading ====================

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={handleGoBack}>
            <Icon name="close" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{t('home.learnNew')}</Text>
          </View>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </View>
    );
  }

  // ==================== Error / All Learned ====================

  if (loadError || words.length === 0) {
    const isAllLearned = loadError === t('words.allWordsLearned');
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={handleGoBack}>
            <Icon name="close" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{t('home.learnNew')}</Text>
          </View>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorEmoji}>{isAllLearned ? '\uD83C\uDF89' : '\uD83D\uDE22'}</Text>
          <Text style={styles.errorTitle}>
            {isAllLearned ? t('words.allLearnedTitle') : t('words.loadFailed')}
          </Text>
          <Text style={styles.errorText}>
            {isAllLearned ? t('words.allLearnedDesc') : (loadError || t('words.pleaseRetryLater'))}
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
            <Text style={styles.backButtonText}>{t('words.back')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ==================== 练习模式 ====================

  if (isPracticing) {
    // 完成页面
    if (practicePhase === 'complete') {
      return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <View style={styles.completeContainer}>
            {/* 成功圆圈 */}
            <View style={styles.completeCircle}>
              <Icon name="check" size={48} color={theme.colors.text.inverse} />
            </View>

            <Text style={styles.completeTitle}>{t('words.awesome')}</Text>

            {/* 单词卡片 */}
            {practiceWord && (
              <View style={styles.completeWordCard}>
                <Text style={styles.completeWord}>{practiceWord.word}</Text>
                {practiceWord.phoneticUs ? (
                  <Text style={styles.completePhonetic}>{practiceWord.phoneticUs}</Text>
                ) : null}
                <Text style={styles.completeMeaning}>{practiceWord.meaningCn}</Text>
              </View>
            )}

            <TouchableOpacity style={styles.completeButton} onPress={handlePracticeDismiss}>
              <Text style={styles.completeButtonText}>{t('words.quiz.continueLearning')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // 答题页面
    if (practiceQuestion) {
      return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={handleCancelPractice}>
              <Icon name="arrow-back" size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>{t('words.miniQuiz')}</Text>
              <Text style={styles.headerSubtitle}>{practiceIndex + 1}/{practiceTotal}</Text>
            </View>
            <View style={styles.placeholder} />
          </View>

          {/* 进度条 */}
          <View style={styles.practiceProgress}>
            <View style={styles.practiceProgressBg}>
              <View style={[styles.practiceProgressFill, { width: `${((practiceIndex + 1) / practiceTotal) * 100}%` }]} />
            </View>
          </View>

          {/* 题目 */}
          <View style={{ flex: 1 }}>
            <QuestionRenderer
              key={`${practiceIndex}_${practiceAttempt}`}
              question={practiceQuestion}
              isAnswered={practicePhase === 'feedback'}
              onAnswer={handlePracticeAnswer}
              submitRef={submitRef}
              onSubmitReady={onSubmitReady}
            />
          </View>

          {/* 底部按钮区 */}
          {canSubmit && practicePhase === 'answering' && (
            <View style={styles.practiceSubmitContainer}>
              <TouchableOpacity
                style={styles.practiceSubmitButton}
                onPress={() => submitRef.current?.()}
              >
                <Text style={styles.practiceSubmitButtonText}>{t('common.confirm')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 答错重试按钮 */}
          {practicePhase === 'feedback' && !practiceCorrect && (
            <View style={styles.practiceSubmitContainer}>
              <View style={styles.feedbackWrongBar}>
                <Text style={styles.feedbackWrongText}>{t('words.wrongRetry')}</Text>
              </View>
              <TouchableOpacity style={styles.retryButton} onPress={handlePracticeRetry}>
                <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      );
    }
  }

  // ==================== 翻卡学习 ====================

  const shouldBlockScroll = isCardFlipped || isKnownAnimating;

  const renderItem = ({ item, index }: { item: LearnWordWithProgress; index: number }) => (
    <WordCard
      word={item}
      isActive={index === currentIndex}
      isScrolling={isScrolling}
      onEnterPractice={() => handleEnterPractice(item)}
      onMarkKnown={() => handleEnterPractice(item)}
      onSkip={() => handleSkipWord(item)}
      onClose={handleGoBack}
      onFlipChange={handleFlipChange}
      onKnownAnimatingChange={handleKnownAnimatingChange}
      theme={theme}
      cardHeight={cardHeight}
      knownLabel={t('words.masteredStatus')}
      knownHint={t('words.markMasteredDesc')}
      practiceLabel={t('words.goPractice')}
      initialFavorited={favoritedIds.has(item.id)}
      onFavoriteChange={handleFavoriteChange}
    />
  );

  const getItemLayout = (_: ArrayLike<LearnWordWithProgress> | null | undefined, index: number) => ({
    length: cardHeight,
    offset: cardHeight * index,
    index,
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Card List */}
      <View style={{ flex: 1 }} onLayout={onContainerLayout}>
        <FlatList
          ref={flatListRef}
          data={words}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          pagingEnabled
          scrollEnabled={!shouldBlockScroll}
          showsVerticalScrollIndicator={false}
          initialScrollIndex={currentIndex}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          getItemLayout={getItemLayout}
          initialNumToRender={2}
          maxToRenderPerBatch={3}
          windowSize={5}
          onScrollBeginDrag={handleScrollBeginDrag}
          onScrollEndDrag={handleScrollEndDrag}
          onMomentumScrollEnd={handleMomentumScrollEnd}
        />
      </View>
    </View>
  );
}
