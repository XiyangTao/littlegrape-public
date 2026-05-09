/**
 * 关卡学习页面 — 三段式
 *
 * 阶段一（认识）：WordCard 翻卡 + "学习这个词" / "已掌握"
 * 阶段二（理解）：看词选义 + 额外题
 * 阶段三（运用）：句子级题型
 */

import React, { useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '@/context/ThemeProvider';
import type { LearnWordWithProgress } from '@/types/word';
import { useI18n } from '@/context/I18nProvider';
import WordCard from '../components/WordCard';
import QuestionRenderer from '@/components/QuestionRenderer';
import { useLevelLearn } from './useLevelLearn';
import { createStyles } from './styles';

export default function LevelLearnScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme);

  const {
    words,
    isLoading,
    loadError,
    tag,
    levelIndex,
    isBoss,
    phase,
    navigation,
    // 收藏
    favoritedIds,
    handleFavoriteChange,
    // 阶段一
    currentIndex,
    cardHeight,
    isScrolling,
    isCardFlipped,
    isKnownAnimating,
    learnedWordIds,
    skippedWordIds,
    processedCount,
    isLastWord,
    flatListRef,
    onViewableItemsChanged,
    viewabilityConfig,
    onContainerLayout,
    handleLearnWord,
    handleSkipWord,
    handleFlipChange,
    handleKnownAnimatingChange,
    handleScrollBeginDrag,
    handleScrollEndDrag,
    handleMomentumScrollEnd,
    handleRecognitionComplete,
    // 过渡
    handleStartStage2,
    handleStartStage3,
    // 阶段二/三
    stage2Session,
    stage3Session,
    stage2Questions,
    stage3Questions,
  } = useLevelLearn();

  // ==================== Loading / Error ====================

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
            <Text style={{ fontSize: 24, color: theme.colors.text.primary }}>{'✕'}</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{t('levelLearn.levelTitle', { level: levelIndex + 1 })}</Text>
          </View>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
            <Text style={{ fontSize: 24, color: theme.colors.text.primary }}>{'✕'}</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{t('levelLearn.levelTitle', { level: levelIndex + 1 })}</Text>
          </View>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{loadError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.retryButtonText}>{t('levelLearn.goBack')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ==================== 三段指示器 ====================

  const phaseIndex = phase === 'recognition' ? 0
    : (phase === 'transition1' || phase === 'understanding') ? 1
    : 2;

  const phaseLabels = [
    t('levelLearn.phaseRecognition'),
    t('levelLearn.phaseUnderstanding'),
    t('levelLearn.phaseApplication'),
  ];

  const renderPhaseIndicator = () => (
    <View style={styles.phaseIndicator}>
      {phaseLabels.map((label, i) => (
        <View key={label} style={styles.phaseItem}>
          <View style={[
            styles.phaseDot,
            i <= phaseIndex && styles.phaseDotActive,
          ]} />
          <Text style={[
            styles.phaseLabel,
            i <= phaseIndex && styles.phaseLabelActive,
          ]}>{label}</Text>
        </View>
      ))}
    </View>
  );

  // ==================== 阶段一：认识 ====================

  if (phase === 'recognition') {
    const shouldBlockScroll = isCardFlipped || isKnownAnimating;

    const renderItem = ({ item, index }: { item: LearnWordWithProgress; index: number }) => (
      <WordCard
        word={item}
        isActive={index === currentIndex}
        isScrolling={isScrolling}
        onEnterPractice={() => handleLearnWord(item)}
        onMarkKnown={() => handleLearnWord(item)}
        onSkip={() => handleSkipWord(item)}
        onClose={() => navigation.goBack()}
        onFlipChange={handleFlipChange}
        onKnownAnimatingChange={handleKnownAnimatingChange}
        theme={theme}
        cardHeight={cardHeight}
        knownLabel={t('words.masteredStatus')}
        knownHint={t('words.markMasteredDesc')}
        practiceLabel={t('levelLearn.practiceLabel')}
        initialFavorited={favoritedIds.has(item.id)}
        onFavoriteChange={handleFavoriteChange}
      />
    );

    const getItemLayout = (_: any, index: number) => ({
      length: cardHeight,
      offset: cardHeight * index,
      index,
    });

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
            <Text style={{ fontSize: 24, color: theme.colors.text.primary }}>{'✕'}</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{isBoss ? '👾 BOSS' : t('levelLearn.levelTitle', { level: levelIndex + 1 })}</Text>
            <Text style={styles.headerSubtitle}>{currentIndex + 1}/{words.length}</Text>
          </View>
          {isLastWord && processedCount >= words.length ? (
            <TouchableOpacity style={styles.startButton} onPress={handleRecognitionComplete}>
              <Text style={styles.startButtonText}>{t('levelLearn.continue')}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.placeholder} />
          )}
        </View>

        {renderPhaseIndicator()}

        <View style={styles.progressContainer}>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${words.length > 0 ? (processedCount / words.length) * 100 : 0}%` }]} />
          </View>
          <Text style={styles.progressText}>{processedCount}/{words.length}</Text>
        </View>

        <View style={{ flex: 1 }} onLayout={onContainerLayout}>
          <FlatList
            ref={flatListRef}
            data={words}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            pagingEnabled
            scrollEnabled={!shouldBlockScroll}
            showsVerticalScrollIndicator={false}
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

  // ==================== 过渡页 ====================

  if (phase === 'transition1') {
    return (
      <View style={styles.container}>
        <View style={styles.transitionContainer}>
          <Text style={styles.transitionEmoji}>{'📝'}</Text>
          <Text style={styles.transitionTitle}>{t('levelLearn.transition1Title')}</Text>
          <Text style={styles.transitionStats}>
            {t('levelLearn.transition1StatsLearned', { count: learnedWordIds.length })}
            {skippedWordIds.length > 0 ? t('levelLearn.transition1StatsSkipped', { count: skippedWordIds.length }) : ''}
          </Text>
          <Text style={styles.transitionSubtitle}>{t('levelLearn.transition1Subtitle')}</Text>
          {stage2Questions.length > 0 ? (
            <TouchableOpacity style={styles.transitionButton} onPress={handleStartStage2}>
              <Text style={styles.transitionButtonText}>{t('levelLearn.startUnderstanding')}</Text>
            </TouchableOpacity>
          ) : (
            <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 24 }} />
          )}
        </View>
      </View>
    );
  }

  if (phase === 'transition2') {
    const stage2Rate = stage2Session.totalCount > 0
      ? Math.round((stage2Session.correctCount / stage2Session.totalCount) * 100)
      : 0;
    return (
      <View style={styles.container}>
        <View style={styles.transitionContainer}>
          <Text style={styles.transitionEmoji}>{'🚀'}</Text>
          <Text style={styles.transitionTitle}>{t('levelLearn.transition2Title')}</Text>
          <Text style={styles.transitionStats}>
            {t('levelLearn.transition2Stats', {
              rate: stage2Rate,
              correct: stage2Session.correctCount,
              total: stage2Session.totalCount,
            })}
          </Text>
          <Text style={styles.transitionSubtitle}>{t('levelLearn.transition2Subtitle')}</Text>
          {stage3Questions.length > 0 ? (
            <TouchableOpacity style={styles.transitionButton} onPress={handleStartStage3}>
              <Text style={styles.transitionButtonText}>{t('levelLearn.startApplication')}</Text>
            </TouchableOpacity>
          ) : (
            <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 24 }} />
          )}
        </View>
      </View>
    );
  }

  // ==================== 阶段二/三：做题 ====================

  if (phase === 'understanding' || phase === 'application') {
    const session = phase === 'understanding' ? stage2Session : stage3Session;
    const phaseLabel = phase === 'understanding' ? t('levelLearn.phaseUnderstanding') : t('levelLearn.phaseApplication');

    if (!session.currentQuestion) {
      return (
        <View style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
            <Text style={{ fontSize: 24, color: theme.colors.text.primary }}>{'✕'}</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{phaseLabel}</Text>
            <Text style={styles.headerSubtitle}>{session.currentIndex + 1}/{session.totalCount}</Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        {renderPhaseIndicator()}

        {/* 进度条 */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${session.totalCount > 0 ? ((session.currentIndex + 1) / session.totalCount) * 100 : 0}%` }]} />
          </View>
          {session.combo > 1 && (
            <Text style={styles.comboText}>{'🔥'} x{session.combo}</Text>
          )}
        </View>

        {/* 题目渲染 */}
        <View style={{ flex: 1 }}>
          <QuestionRenderer
            question={session.currentQuestion}
            isAnswered={session.phase === 'feedback'}
            onAnswer={session.onAnswer}
            submitRef={session.submitRef}
            onSubmitReady={session.onSubmitReady}
          />
        </View>

        {/* 提交按钮（需要手动提交的题型） */}
        {session.canSubmit && session.phase === 'answering' && (
          <View style={styles.submitContainer}>
            <TouchableOpacity
              style={styles.submitButton}
              onPress={() => session.submitRef.current?.()}
            >
              <Text style={styles.submitButtonText}>{t('levelLearn.confirm')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  return null;
}
