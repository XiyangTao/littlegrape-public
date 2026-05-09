/**
 * WordCard Hook
 * 管理卡片交互逻辑：翻转、发音、AI讲解、认识标记等
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Animated, useWindowDimensions } from 'react-native';
import { Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import { useTTS } from '@/hooks/useTTS';
import type { LearnWordWithProgress } from '@/types/word';
import { parseLocalWord, generateWordExplanation } from '@/services/WordService';
import { getErrorMessage } from '@/utils/errorUtils';
import { useAuth } from '@/stores/AuthStore';
import { useUserStore } from '@/stores';
import { generateParticles, ANIMATION_DURATION } from './styles';

interface UseWordCardParams {
  word: LearnWordWithProgress;
  isActive: boolean;
  isScrolling: boolean;
  onFlipChange: (isFlipped: boolean) => void;
  onMarkKnown: () => void;
  onSkip?: () => void;
  onKnownAnimatingChange: (animating: boolean) => void;
  theme: Theme;
  initialFavorited?: boolean;
  onFavoriteChange?: (wordId: string, isFav: boolean) => void;
}

export function useWordCard({
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
}: UseWordCardParams) {
  const { width: screenWidth } = useWindowDimensions();
  const tts = useTTS();
  const { t } = useI18n();
  const aiTts = useTTS();
  const { user } = useAuth();
  const { addFavorite, removeFavorite } = useUserStore();
  const parsed = useMemo(() => parseLocalWord(word), [word]);

  // ==================== 状态 ====================

  const [isFlipped, setIsFlipped] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [isKnownAnimating, setIsKnownAnimating] = useState(false);
  const [particles, setParticles] = useState(() => generateParticles(screenWidth));
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isFav, setIsFav] = useState<boolean>(initialFavorited ?? false);
  const [isFavLoading, setIsFavLoading] = useState(false);

  // 是否已掌握（初始状态 + 本次点击）
  const isMastered = word.progress?.status === 'mastered';
  const [isMarkedKnown, setIsMarkedKnown] = useState(isMastered);

  // ==================== 动画值 ====================

  const flipAnim = useRef(new Animated.Value(0)).current;
  const particleAnim = useRef(new Animated.Value(0)).current;
  const buttonColorAnim = useRef(new Animated.Value(isMastered ? 1 : 0)).current;
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;
  const iconAnim = useRef(new Animated.Value(isMastered ? 1 : 0)).current;

  // 同步：word.progress 变为 mastered 时更新按钮状态（动画中跳过，避免覆盖）
  useEffect(() => {
    if (word.progress?.status === 'mastered' && !isKnownAnimating) {
      buttonColorAnim.setValue(1);
      iconAnim.setValue(1);
      setIsMarkedKnown(true);
    }
  }, [word.progress?.status, isKnownAnimating, buttonColorAnim, iconAnim]);

  // ==================== 发音播放 ====================

  const handlePlayPronunciation = useCallback(() => {
    const messageId = `word_${word.word}_us`;
    const audioUrl = word.audioUrlUs || word.audioUrlUk;

    if (!audioUrl) return;
    tts.playUrl(messageId, audioUrl);
  }, [tts, word.word, word.audioUrlUs, word.audioUrlUk]);

  // ==================== AI 讲解 ====================

  const handleAiExplanation = useCallback(async () => {
    // 优先使用缓存的音频 URL
    if (word.audioAiExplanationUrl) {
      aiTts.playUrl(`ai_explanation_${word.word}`, word.audioAiExplanationUrl);
      return;
    }

    // 无预生成音频则跳过播放，直接生成文字讲解
    if (aiExplanation) return;

    // 调用 API 生成解说
    setIsGeneratingAi(true);
    setAiError(null);

    try {
      const etymologyData = parsed.etymology ? {
        roots: parsed.etymology.root ? [{
          root: parsed.etymology.root,
          meaning: parsed.etymology.rootMeaning || '',
        }] : [],
        affixes: [
          ...(parsed.etymology.prefix ? [{
            affix: parsed.etymology.prefix,
            type: 'prefix',
            meaning: parsed.etymology.prefixMeaning || '',
          }] : []),
          ...(parsed.etymology.suffix ? [{
            affix: parsed.etymology.suffix,
            type: 'suffix',
            meaning: parsed.etymology.suffixMeaning || '',
          }] : []),
        ],
      } : undefined;

      const result = await generateWordExplanation({
        word: word.word,
        phonetic: word.phoneticUs || word.phoneticUk || '',
        meanings: parsed.meanings.map(m => ({
          pos: m.pos,
          meaningCn: m.meaningCn,
          meaningEn: m.meaningEn || undefined,
        })),
        examples: parsed.meanings
          .filter(m => m.exampleEn)
          .map(m => ({
            en: m.exampleEn || '',
            cn: m.exampleCn || '',
          })),
        collocations: parsed.collocations.map(c => c.pattern),
        etymology: etymologyData,
      });

      if (result.success && result.explanation) {
        setAiExplanation(result.explanation);
        aiTts.speak(`ai_explanation_${word.word}`, result.explanation, 'zh-CN-XiaoxiaoNeural');
      } else {
        setAiError(result.error || '生成解说失败');
      }
    } catch (error) {
      console.error('AI 讲解失败:', error);
      setAiError(getErrorMessage(error));
    } finally {
      setIsGeneratingAi(false);
    }
  }, [aiTts, aiExplanation, word, parsed]);

  // ==================== 卡片翻转 ====================

  const handleFlip = useCallback(() => {
    if (isScrolling || isFlipping || isKnownAnimating) return;

    const newFlipped = !isFlipped;

    if (!newFlipped) {
      aiTts.stop();
    }

    setIsFlipping(true);
    Animated.spring(flipAnim, {
      toValue: newFlipped ? 1 : 0,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start(() => {
      setIsFlipping(false);
      if (newFlipped) {
        handleAiExplanation();
      }
    });

    setIsFlipped(newFlipped);
    onFlipChange(newFlipped);
  }, [isScrolling, isFlipped, isFlipping, isKnownAnimating, flipAnim, onFlipChange, aiTts, handleAiExplanation]);

  // ==================== 认识按钮 ====================

  // 防止动画完成回调重复触发
  const knownCallbackFiredRef = useRef(false);

  const handleKnownPress = useCallback(() => {
    if (isScrolling || isKnownAnimating) return;

    knownCallbackFiredRef.current = false;
    setIsKnownAnimating(true);
    onKnownAnimatingChange(true);
    setParticles(generateParticles(screenWidth));

    // 立即触发回调，不等动画结束
    if (onSkip) {
      onSkip();
    } else {
      onMarkKnown();
    }

    // 重置动画值
    particleAnim.setValue(0);
    buttonColorAnim.setValue(0);
    buttonScaleAnim.setValue(1);
    iconAnim.setValue(0);

    // 按钮缩放动画
    Animated.sequence([
      Animated.timing(buttonScaleAnim, {
        toValue: 0.9,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.spring(buttonScaleAnim, {
        toValue: 1.05,
        friction: 5,
        tension: 180,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // 并行动画
    Animated.parallel([
      Animated.timing(particleAnim, {
        toValue: 1,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(buttonColorAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: false,
      }),
      Animated.timing(iconAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsKnownAnimating(false);
      onKnownAnimatingChange(false);
      setIsMarkedKnown(true);
    });
  }, [isScrolling, isKnownAnimating, particleAnim, buttonColorAnim, buttonScaleAnim, iconAnim, onMarkKnown, onSkip, onKnownAnimatingChange]);

  // ==================== 生命周期 ====================

  // 卡片不活跃时重置状态
  useEffect(() => {
    if (!isActive) {
      if (tts.isPlaying) tts.stop();
      if (aiTts.isPlaying) aiTts.stop();
      if (isFlipped) {
        flipAnim.setValue(0);
        setIsFlipped(false);
        onFlipChange(false);
      }
    }
  }, [isActive, tts, aiTts, isFlipped, flipAnim, onFlipChange]);

  // 切换收藏
  const handleToggleFavorite = useCallback(async () => {
    if (isFavLoading || !user?.id) return;

    const prevFav = isFav;
    const newFav = !prevFav;
    setIsFav(newFav);
    setIsFavLoading(true);

    try {
      if (prevFav) {
        await removeFavorite(word.id);
      } else {
        await addFavorite(word.id);
      }
      onFavoriteChange?.(word.id, newFav);
    } catch (error) {
      console.error('收藏操作失败:', error);
      setIsFav(prevFav);
    } finally {
      setIsFavLoading(false);
    }
  }, [isFavLoading, isFav, user?.id, word.id, addFavorite, removeFavorite, onFavoriteChange]);

  // 自动播放发音
  const playPronunciationRef = useRef(handlePlayPronunciation);
  playPronunciationRef.current = handlePlayPronunciation;

  useEffect(() => {
    if (isActive) {
      playPronunciationRef.current();
    }
  }, [isActive]);

  // ==================== 计算属性 ====================

  const status = useMemo(() => {
    if (!word.progress) return { text: t('words.newWord'), color: theme.colors.primary };
    switch (word.progress.status) {
      case 'learned':
        return { text: t('words.learnedStatus'), color: theme.colors.warning };
      case 'mastered':
        return { text: t('words.masteredStatus'), color: theme.colors.success };
      default:
        return { text: t('words.newWord'), color: theme.colors.primary };
    }
  }, [word.progress, theme.colors]);

  // ==================== 动画样式 ====================

  const frontAnimatedStyle = {
    transform: [
      { perspective: 1000 },
      {
        rotateY: flipAnim.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '180deg'],
        }),
      },
    ],
    opacity: flipAnim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [1, 0, 0],
    }),
  };

  const backAnimatedStyle = {
    transform: [
      { perspective: 1000 },
      {
        rotateY: flipAnim.interpolate({
          inputRange: [0, 1],
          outputRange: ['180deg', '360deg'],
        }),
      },
    ],
    opacity: flipAnim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 0, 1],
    }),
  };

  const fadeOutStyle = {
    opacity: flipAnim.interpolate({
      inputRange: [0, 0.6],
      outputRange: [1, 0],
      extrapolate: 'clamp' as const,
    }),
  };

  return {
    // 解析数据
    parsed,
    // TTS
    tts,
    aiTts,
    // 状态
    isFlipped,
    isKnownAnimating,
    isMarkedKnown,
    isGeneratingAi,
    aiError,
    particles,
    status,
    // 动画值
    particleAnim,
    buttonColorAnim,
    buttonScaleAnim,
    iconAnim,
    // 动画样式
    frontAnimatedStyle,
    backAnimatedStyle,
    fadeOutStyle,
    // 收藏
    isFav,
    handleToggleFavorite,
    // 回调
    handlePlayPronunciation,
    handleAiExplanation,
    handleFlip,
    handleKnownPress,
  };
}
