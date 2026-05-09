import { useState, useEffect, useRef, useCallback } from 'react';
import { Animated, PanResponder, useWindowDimensions } from 'react-native';
import { useTTS } from '@/hooks/useTTS';
import { useCustomAlert } from '@/hooks/useCustomAlert';
import type { LocalWord, LocalProgress } from '@/types/word';
import { parseLocalWord, isFavorited as checkIsFavorited } from '@/services/WordService';
import { ensureWordDetails } from '@/db/word/WordDetailCacheDB';
import { getWordById } from '@/db/word/WordQueryDB';
import { isAiLookupId } from '@/utils/aiWordLookup';
import { skipWord } from '@/services/LearningService';
import { useAuth } from '@/stores/AuthStore';
import { useUserStore } from '@/stores';
import { useI18n } from '@/context/I18nProvider';
import { DRAG_THRESHOLD } from './styles';

interface UseWordDetailSheetParams {
  visible: boolean;
  word: LocalWord | null;
  progress?: LocalProgress | null;
  currentTag?: string | null;
  initialFavorited?: boolean;
  onClose: () => void;
  onFavoriteChange?: (isFavorited: boolean) => void;
  onSkipped?: (wordId: string) => void;
}

export function useWordDetailSheet({
  visible,
  word,
  progress,
  currentTag,
  initialFavorited,
  onClose,
  onFavoriteChange,
  onSkipped,
}: UseWordDetailSheetParams) {
  const { height: screenHeight } = useWindowDimensions();
  const { user } = useAuth();
  const { addFavorite, removeFavorite } = useUserStore();
  const { t } = useI18n();
  const tts = useTTS();
  const { confirm, AlertComponent } = useCustomAlert();
  const sheetMaxHeight = screenHeight * 0.85;

  const [sheetHeight, setSheetHeight] = useState(sheetMaxHeight);
  const [showEtymology, setShowEtymology] = useState(false);
  const [showCollocations, setShowCollocations] = useState(false);
  const [isStarred, setIsStarred] = useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const [playingAccent, setPlayingAccent] = useState<'us' | 'uk' | null>(null);

  // 动画值
  const translateY = useRef(new Animated.Value(screenHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // AI 兜底/占位词：id 不是词库真实 id，禁用收藏与"标记已掌握"，避免脏 wordId 污染本地表与同步数据
  const isAiWord = isAiLookupId(word?.id);

  // 按需加载详情数据（精简 words.db 后可能缺少详情字段）
  const [enrichedWord, setEnrichedWord] = useState<LocalWord | null>(null);

  useEffect(() => {
    if (!visible || !word?.id) {
      setEnrichedWord(null);
      return;
    }

    // AI 兜底词 / 占位词 — id 不是词库真实 id，跳过 ensureWordDetails 避免无效网络请求
    if (isAiLookupId(word.id)) {
      setEnrichedWord(word);
      return;
    }

    // 检查是否需要加载详情（meanings 为空或 '[]' 时触发）
    const needsDetail = !word.meanings || word.meanings === '[]';
    if (!needsDetail) {
      setEnrichedWord(word);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        await ensureWordDetails([word.id]);
        // 从 DB 重新获取（LEFT JOIN 缓存后的完整数据）
        const reloaded = await getWordById(word.id);
        if (!cancelled && reloaded) {
          setEnrichedWord(reloaded);
        }
      } catch {
        // 降级使用原始数据
        if (!cancelled) setEnrichedWord(word);
      }
    })();

    return () => { cancelled = true; };
  }, [visible, word?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // 解析单词数据
  const wordToUse = enrichedWord || word;
  const parsedWord = wordToUse ? parseLocalWord(wordToUse) : null;
  const meanings = parsedWord?.meanings || [];
  const etymology = parsedWord?.etymology;
  const collocations = parsedWord?.collocations || [];

  // 对标签排序：当前选中的词库标签排在最前面（"全部"模式不排序）
  const rawTags = parsedWord?.tags || [];
  const tags = currentTag && currentTag !== '全部'
    ? [...rawTags].sort((a, b) => {
        if (a === currentTag) return -1;
        if (b === currentTag) return 1;
        return 0;
      })
    : rawTags;

  // 显示/隐藏动画
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          damping: 20,
          stiffness: 200,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: screenHeight,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, translateY, backdropOpacity]);

  // 重置展开状态
  useEffect(() => {
    if (visible) {
      setShowEtymology(false);
      setShowCollocations(false);
    }
  }, [visible, word?.id]);

  // 初始化收藏状态
  useEffect(() => {
    if (visible && word?.id && user?.id) {
      if (initialFavorited !== undefined) {
        setIsStarred(initialFavorited);
      } else {
        checkIsFavorited(word.id, user.id).then(isFav => {
          setIsStarred(isFav);
        }).catch(() => {
          setIsStarred(false);
        });
      }
    }
  }, [visible, word?.id, user?.id, initialFavorited]);

  // 切换收藏状态
  const handleToggleFavorite = useCallback(async () => {
    if (!word?.id || !user?.id || isTogglingFavorite) return;
    if (isAiLookupId(word.id)) return; // AI 词双保险：UI 已隐藏按钮，此处防绕过

    setIsTogglingFavorite(true);
    try {
      if (isStarred) {
        await removeFavorite(word.id);
        setIsStarred(false);
        onFavoriteChange?.(false);
      } else {
        await addFavorite(word.id);
        setIsStarred(true);
        onFavoriteChange?.(true);
      }
    } catch (error) {
      console.error('切换收藏失败:', error);
    } finally {
      setIsTogglingFavorite(false);
    }
  }, [word?.id, user?.id, isStarred, isTogglingFavorite, onFavoriteChange]);

  // 关闭抽屉
  const handleClose = useCallback(() => {
    tts.stop();
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: screenHeight,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  }, [onClose, translateY, backdropOpacity, tts]);

  // 拖拽手势
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > DRAG_THRESHOLD || gestureState.vy > 0.5) {
          handleClose();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            damping: 20,
            stiffness: 200,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // 播放发音
  // AI 兜底词首次查询时服务端异步合成 TTS，当次查询 URL 可能还是 null —
  // 下次查同一词 cache 就有 URL 了。这里无 URL 直接静默不播。
  const handlePlayPronunciation = useCallback((accent: 'us' | 'uk') => {
    const w = enrichedWord || word;
    if (!w) return;
    if (tts.isLoading || tts.isPlaying) {
      tts.stop();
      setPlayingAccent(null);
      return;
    }

    const audioUrl = accent === 'us' ? w.audioUrlUs : w.audioUrlUk;
    if (!audioUrl) return;

    setPlayingAccent(accent);
    tts.playUrl(`word_${w.word}_${accent}`, audioUrl);
  }, [tts, enrichedWord, word]);

  // 监听播放状态变化，重置 playingAccent
  useEffect(() => {
    if (!tts.isPlaying && !tts.isLoading) {
      setPlayingAccent(null);
    }
  }, [tts.isPlaying, tts.isLoading]);

  // 跳过（标记为已掌握）
  const handleSkipWord = useCallback(() => {
    if (!word?.id || !user?.id) return;
    if (isAiLookupId(word.id)) return; // AI 词双保险：UI 已隐藏按钮，此处防绕过
    confirm(
      t('words.markMasteredTitle'),
      t('words.markMasteredDesc'),
      async () => {
        try {
          await skipWord(user.id, word.id);
          onSkipped?.(word.id);
          handleClose();
        } catch (error) {
          console.error('[WordDetail] 跳过失败:', error);
        }
      },
    );
  }, [word?.id, user?.id, confirm, handleClose, onSkipped]);

  const isSkipped = progress?.isSkipped === 1;

  // 获取状态颜色
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'learned': return 'warning' as const;
      case 'mastered': return 'success' as const;
      default: return undefined;
    }
  };

  // 获取状态文本
  const getStatusText = (status?: string) => {
    if (isSkipped) return t('words.masteredSkipped');
    switch (status) {
      case 'learned': return t('words.learningStatus');
      case 'mastered': return t('words.masteredStatus');
      default: return '未学习';
    }
  };

  const status = progress?.status || 'new';

  return {
    // 动画值
    translateY,
    backdropOpacity,
    panResponder,
    sheetHeight,

    // 解析后的数据
    meanings,
    etymology,
    collocations,
    tags,
    status,

    // 收藏状态
    isStarred,
    isTogglingFavorite,
    handleToggleFavorite,

    // 发音
    tts,
    playingAccent,
    handlePlayPronunciation,

    // 折叠状态
    showEtymology,
    setShowEtymology,
    showCollocations,
    setShowCollocations,

    // 跳过
    isSkipped,
    handleSkipWord,
    AlertComponent,

    // 操作
    handleClose,
    getStatusColor,
    getStatusText,

    // AI 兜底词标记（UI 层用来隐藏收藏、标记已掌握等依赖真实 wordId 的按钮）
    isAiWord,
  };
}
