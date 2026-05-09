/**
 * 单词卡片组件
 * 支持正反面翻转、发音播放、AI讲解、认识标记等功能
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
} from 'react-native';
import Icon from '@/components/Icon';
import { useI18n } from '@/context/I18nProvider';
import type { LearnWordWithProgress } from '@/types/word';
import { useWordCard } from './useWordCard';
import { createStyles } from './styles';
import WordCardFront from './WordCardFront';
import WordCardBack from './WordCardBack';

// ==================== 类型定义 ====================

export interface WordCardProps {
  word: LearnWordWithProgress;
  isActive: boolean;
  isScrolling: boolean;
  onEnterPractice: () => void;
  onMarkKnown: () => void;
  onSkip?: () => void;
  onClose: () => void;
  onFlipChange: (isFlipped: boolean) => void;
  onKnownAnimatingChange: (animating: boolean) => void;
  theme: any;
  cardHeight: number;
  /** 按钮文案：左按钮 */
  knownLabel?: string;
  /** 按钮文案：右按钮 */
  practiceLabel?: string;
  /** 左按钮下方备注 */
  knownHint?: string;
  /** 初始收藏状态（由父组件批量查询提供） */
  initialFavorited?: boolean;
  /** 收藏状态变化回调 */
  onFavoriteChange?: (wordId: string, isFav: boolean) => void;
}

// ==================== 主组件 ====================

const WordCard = React.memo(({
  word,
  isActive,
  isScrolling,
  onEnterPractice,
  onMarkKnown,
  onSkip,
  onClose,
  onFlipChange,
  onKnownAnimatingChange,
  theme,
  cardHeight,
  knownLabel,
  practiceLabel,
  knownHint,
  initialFavorited,
  onFavoriteChange,
}: WordCardProps) => {
  const styles = createStyles(theme, cardHeight);
  const { t } = useI18n();
  const resolvedKnownLabel = knownLabel ?? t('wordCard.known');
  const resolvedPracticeLabel = practiceLabel ?? t('wordCard.practice');

  const {
    parsed,
    tts,
    aiTts,
    isFlipped,
    isKnownAnimating,
    isMarkedKnown,
    isGeneratingAi,
    aiError,
    particles,
    status,
    particleAnim,
    buttonColorAnim,
    buttonScaleAnim,
    iconAnim,
    frontAnimatedStyle,
    backAnimatedStyle,
    fadeOutStyle,
    isFav,
    handleToggleFavorite,
    handlePlayPronunciation,
    handleAiExplanation,
    handleFlip,
    handleKnownPress,
  } = useWordCard({
    word,
    isActive,
    isScrolling,
    onFlipChange,
    onMarkKnown,
    onSkip,
    onKnownAnimatingChange,
    theme,
    initialFavorited,
    onFavoriteChange,
  });

  return (
    <View style={styles.cardContainer}>
      {/* 顶部关闭按钮 */}
      <Animated.View style={[styles.closeButton, fadeOutStyle]} pointerEvents={isFlipped ? 'none' : 'auto'}>
        <TouchableOpacity onPress={onClose} style={styles.closeButtonTouchable}>
          <Icon name="close" size={28} color={theme.colors.text.primary} />
        </TouchableOpacity>
      </Animated.View>

      {/* 收藏按钮 */}
      <Animated.View style={[styles.favoriteButton, fadeOutStyle]} pointerEvents={isFlipped ? 'none' : 'auto'}>
        <TouchableOpacity onPress={handleToggleFavorite} style={styles.favoriteButtonTouchable}>
          <Icon
            name={isFav ? 'star' : 'star-border'}
            size={26}
            color={isFav ? theme.colors.warning : theme.colors.text.secondary}
          />
        </TouchableOpacity>
      </Animated.View>

      {/* 状态标签 */}
      <Animated.View
        style={[styles.statusBadge, { backgroundColor: status.color + '20' }, fadeOutStyle]}
        pointerEvents={isFlipped ? 'none' : 'auto'}
      >
        <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
      </Animated.View>

      {/* 正面 */}
      <WordCardFront
        word={word}
        parsed={parsed}
        tts={tts}
        theme={theme}
        cardHeight={cardHeight}
        frontAnimatedStyle={frontAnimatedStyle}
        isFlipped={isFlipped}
        onFlip={handleFlip}
        onPlayPronunciation={handlePlayPronunciation}
      />

      {/* 反面 */}
      <WordCardBack
        word={word}
        parsed={parsed}
        aiTts={aiTts}
        isGeneratingAi={isGeneratingAi}
        aiError={aiError}
        theme={theme}
        cardHeight={cardHeight}
        backAnimatedStyle={backAnimatedStyle}
        isFlipped={isFlipped}
        onFlip={handleFlip}
        onAiExplanation={handleAiExplanation}
      />

      {/* 星星粒子 */}
      {!isFlipped && (
        <View style={styles.particleContainer} pointerEvents="none">
          {particles.map((particle) => {
            const colors = [theme.colors.primary, theme.colors.secondary, theme.colors.warning];
            const particleColor = colors[particle.colorVariant];

            return (
              <Animated.Text
                key={particle.id}
                style={[
                  styles.particle,
                  {
                    fontSize: particle.size,
                    color: particleColor,
                    textShadowColor: particleColor,
                    textShadowOffset: { width: 0, height: 0 },
                    textShadowRadius: particle.size * 0.4,
                    transform: [
                      {
                        translateX: particleAnim.interpolate({
                          inputRange: [0, 0.3, 0.6, 1],
                          outputRange: [particle.startX, particle.startX + particle.midDriftX * 0.6, particle.startX + particle.midDriftX, particle.startX + particle.driftX],
                        }),
                      },
                      {
                        translateY: particleAnim.interpolate({
                          inputRange: [0, 0.2, 0.5, 0.8, 1],
                          outputRange: [0, particle.endY * 0.35, particle.endY * 0.65, particle.endY * 0.88, particle.endY],
                        }),
                      },
                      {
                        scale: particleAnim.interpolate({
                          inputRange: [0, 0.1, 0.25, 0.75, 1],
                          outputRange: [0, 1.3, 1, 0.8, 0],
                        }),
                      },
                      {
                        rotate: particleAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [`${particle.rotation}deg`, `${particle.rotation + particle.rotationSpeed}deg`],
                        }),
                      },
                    ],
                    opacity: particleAnim.interpolate({
                      inputRange: [0, 0.08, 0.2, 0.75, 1],
                      outputRange: [0, particle.baseOpacity, particle.baseOpacity, particle.baseOpacity * 0.6, 0],
                    }),
                  },
                ]}
              >
                {particle.star}
              </Animated.Text>
            );
          })}
        </View>
      )}

      {/* 底部操作区 */}
      <Animated.View style={[styles.bottomArea, fadeOutStyle]} pointerEvents={isFlipped ? 'none' : 'auto'}>
        <View style={styles.actionButtonsRow}>
          {/* 认识按钮 */}
          <Animated.View style={[styles.knownButtonOuter, { transform: [{ scale: buttonScaleAnim }] }]}>
            <Animated.View
              style={[
                styles.knownButton,
                {
                  backgroundColor: buttonColorAnim.interpolate({
                    inputRange: [0, 0.4, 1],
                    outputRange: ['transparent', theme.colors.success + '50', theme.colors.success],
                  }),
                  borderColor: buttonColorAnim.interpolate({
                    inputRange: [0, 0.4, 1],
                    outputRange: [theme.colors.primary + '40', theme.colors.success + '70', theme.colors.success],
                  }),
                },
              ]}
            >
              <TouchableOpacity
                style={styles.knownButtonTouchable}
                onPress={handleKnownPress}
                activeOpacity={0.9}
                disabled={isScrolling || isKnownAnimating || isMarkedKnown}
              >
                <View style={styles.knownButtonInner}>
                  <View style={styles.knownButtonIconWrapper}>
                    {/* 对勾图标（默认） */}
                    <Animated.View
                      style={{
                        position: 'absolute',
                        opacity: iconAnim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [1, 0, 0] }),
                        transform: [
                          { scale: iconAnim.interpolate({ inputRange: [0, 0.5], outputRange: [1, 0.3], extrapolate: 'clamp' }) },
                          { rotate: iconAnim.interpolate({ inputRange: [0, 0.5], outputRange: ['0deg', '-90deg'], extrapolate: 'clamp' }) },
                        ],
                      }}
                    >
                      <Icon name="check" size={18} color={theme.colors.primary} />
                    </Animated.View>
                    {/* 勾选图标（点击后） */}
                    <Animated.View
                      style={{
                        position: 'absolute',
                        opacity: iconAnim.interpolate({ inputRange: [0, 0.4, 0.7], outputRange: [0, 0, 1] }),
                        transform: [
                          { scale: iconAnim.interpolate({ inputRange: [0.4, 0.7, 0.85, 1], outputRange: [0.3, 1.2, 0.95, 1], extrapolate: 'clamp' }) },
                          { rotate: iconAnim.interpolate({ inputRange: [0.4, 0.7], outputRange: ['90deg', '0deg'], extrapolate: 'clamp' }) },
                        ],
                      }}
                    >
                      <Icon name="done" size={18} color={theme.colors.text.inverse} />
                    </Animated.View>
                  </View>
                  <Animated.Text
                    style={[
                      styles.knownButtonText,
                      {
                        color: buttonColorAnim.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: [theme.colors.primary, theme.colors.success, theme.colors.text.inverse],
                        }),
                      },
                    ]}
                  >
                    {resolvedKnownLabel}
                  </Animated.Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>

          {/* 练习按钮 */}
          <TouchableOpacity
            style={[styles.practiceButton, (isScrolling || isKnownAnimating) && styles.practiceButtonDisabled]}
            onPress={onEnterPractice}
            activeOpacity={0.8}
            disabled={isScrolling || isKnownAnimating}
          >
            <Text style={styles.practiceButtonText}>{resolvedPracticeLabel}</Text>
          </TouchableOpacity>
        </View>

        {knownHint && (
          <Text style={styles.knownHintText}>{knownHint}</Text>
        )}
        <View style={styles.swipeHint}>
          <Icon name="keyboard-arrow-up" size={20} color={theme.colors.text.disabled} />
          <Text style={styles.swipeHintText}>{t('wordCard.swipeHint')}</Text>
        </View>
      </Animated.View>
    </View>
  );
});

export default WordCard;
