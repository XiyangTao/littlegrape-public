/**
 * 名著精读 · 章节阅读页（仿真翻页 / 分页模式）
 * 三模切换: 原文 / 对照 / 译文
 *
 * 架构（2026-04-27 重构）：
 *   水平 FlatList + pagingEnabled 实现翻页（左右滑动）
 *   分页算法在前端：把章节展开成 sentence-level frames，估算高度切页（句不跨页，段可跨页）
 *   每页 PageView 渲染本页 frames，单页内套 ScrollView 兜底估算偏差
 *   性能：每页只 mount ~30 句 ~800 个 Text 元素，进章秒开
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Modal,
  Pressable,
  StyleSheet,
  AppState,
  useWindowDimensions,
  type ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@react-native-vector-icons/material-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useTheme, type Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import Icon, { IconNames } from '@/components/Icon';
import { CLASSICS } from '@/constants/classicsTheme';
import { formatChapterTitle, formatChapterTitleZh } from '@/utils/classicsTitle';
import {
  useClassicsChapter,
  useBookProgress,
  useUpdateBookProgress,
} from '@/hooks/queries/classicsQueries';
import { apiClient } from '@/api';
import { getWordByText, getWordById, ensureWordDetails } from '@/db/word';
import { aiLookupToLocalWord, emptyAiLookupWord } from '@/utils/aiWordLookup';
import WordLookupCard from '@/components/WordLookupCard';
import type { LocalWord } from '@/types/word';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import { classicsReaderActions } from '@/stores/ClassicsReaderStore';
import { useChapterPlayer } from './useChapterPlayer';
import { type ReadMode } from './ParagraphItem';
import { expandToFrames, paginate, findPageIndexForPara, type Page } from './pagination';
import { PageView } from './PageView';
import SentenceBubble, { type BubbleIconConfig } from './SentenceBubble';
import MiniPlayer from './MiniPlayer';
import ShadowingSheet from './ShadowingSheet';

type Params = { ClassicsReader: { slug: string; chapterNumber: number } };

const READ_MODE_KEY = 'classics.readMode';

const MODES: Array<{
  key: ReadMode;
  label: string;
  labelEn: string;
  hint: string;
  hintEn: string;
}> = [
  { key: 'original', label: '原文', labelEn: 'Original', hint: '沉浸英文阅读', hintEn: 'English only' },
  { key: 'bilingual', label: '对照', labelEn: 'Bilingual', hint: '英汉交错，边读边学', hintEn: 'EN + CN interleaved' },
  { key: 'chinese', label: '译文', labelEn: 'Chinese', hint: '纯中文，读大意', hintEn: 'Chinese only' },
];

// 分页估算：屏顶/屏底固定占用（与 styles 对齐）
const TOP_BAR_HEIGHT = 52;
const BOTTOM_BAR_HEIGHT = 52;
const PROGRESS_BAR_HEIGHT = 2;

const VIEWABILITY_CONFIG = {
  itemVisiblePercentThreshold: 80,
};

export default function ClassicsReaderScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<Params, 'ClassicsReader'>>();
  const { theme } = useTheme();
  const { effectiveLanguage } = useI18n();
  const lang = effectiveLanguage === 'zh-CN' ? 'zh-CN' : 'en';
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const { slug, chapterNumber } = route.params;
  const { data: chapter, isLoading } = useClassicsChapter(slug, chapterNumber);
  const { data: savedProgress } = useBookProgress(slug);
  const reportMutation = useUpdateBookProgress(slug);
  const reportProgress = reportMutation.mutate;
  const chapterGate = useFeatureGate('classicsChapter');
  const audioGate = useFeatureGate('classicsAudio');

  const [readMode, setReadMode] = useState<ReadMode>('original');
  const [readModeLoaded, setReadModeLoaded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [currentPageIdx, setCurrentPageIdx] = useState(0);

  // 查词状态
  const [wordDetailData, setWordDetailData] = useState<LocalWord | null>(null);
  const lookupSeqRef = useRef(0);
  const handleWordTap = useCallback(async (token: string, key: string) => {
    const cleaned = token.replace(/[^a-zA-Z'-]/g, '').toLowerCase();
    if (!cleaned || cleaned.length < 2) return;
    classicsReaderActions.setHighlightKey(key);
    const seq = ++lookupSeqRef.current;
    const result = await getWordByText(cleaned);
    if (seq !== lookupSeqRef.current) return;
    if (result) {
      await ensureWordDetails([result.id]).catch(() => {});
      if (seq !== lookupSeqRef.current) return;
      const detail = await getWordById(result.id);
      if (seq !== lookupSeqRef.current) return;
      setWordDetailData(detail);
      return;
    }
    setWordDetailData({ id: `pending:${cleaned}`, word: cleaned, meaningCn: '' } as LocalWord);
    try {
      const res = await apiClient.lookupWord(cleaned);
      if (seq !== lookupSeqRef.current) return;
      setWordDetailData(aiLookupToLocalWord(res.data, cleaned));
    } catch {
      if (seq !== lookupSeqRef.current) return;
      setWordDetailData(emptyAiLookupWord(cleaned));
    }
  }, []);

  const closeWordSheet = useCallback(() => {
    setWordDetailData(null);
    classicsReaderActions.setHighlightKey(null);
  }, []);

  // 章级播放控制器
  const player = useChapterPlayer(slug, chapter);
  const {
    currentParaIdx,
    currentSentIdx,
    currentSentCountInPara,
    currentHighlightSentence: highlightSentence,
    isLoading: isPlayerLoading,
    isPlaying: isPlayerPlaying,
    isPaused: isPlayerPaused,
    playFromSentence,
    playPrev: playerPrev,
    playNext: playerNext,
    canPrev: playerCanPrev,
    canNext: playerCanNext,
    pause: playerPause,
    resume: playerResume,
    stop: playerStop,
  } = player;

  // 把 player 高亮态推到 store
  useEffect(() => {
    classicsReaderActions.setActivePara(currentParaIdx, highlightSentence);
  }, [currentParaIdx, highlightSentence]);

  // 句长按气泡
  const [bubble, setBubble] = useState<{ paraIdx: number; sentIdx: number; y: number } | null>(null);
  const dismissBubble = useCallback(() => setBubble(null), []);

  const [shadowingTarget, setShadowingTarget] = useState<{ sentence: string } | null>(null);
  const closeShadowing = useCallback(() => setShadowingTarget(null), []);

  const handleSentenceLongPress = useCallback((paraIdx: number, sentIdx: number, pageY: number) => {
    setBubble({ paraIdx, sentIdx, y: pageY });
  }, []);

  const bubbleIcons = useMemo<BubbleIconConfig[]>(() => {
    if (!bubble) return [];
    const isCurrent =
      player.track != null &&
      bubble.paraIdx === currentParaIdx &&
      bubble.sentIdx === currentSentIdx;
    const audioLocked = !audioGate.isAllowed();

    const lockedPress = () => {
      audioGate.guard();
      dismissBubble();
    };

    const shadowIcon: BubbleIconConfig = {
      key: 'shadow',
      iconName: 'mic',
      label: '跟读',
      locked: audioLocked,
      onPress: audioLocked
        ? lockedPress
        : () => {
            const para = chapter?.paragraphs[bubble.paraIdx];
            const enSents = Array.isArray(para?.englishSentences) ? para!.englishSentences : null;
            const sentence = enSents?.[bubble.sentIdx];
            if (!sentence) return;
            if (isPlayerPlaying) playerPause();
            setShadowingTarget({ sentence });
            dismissBubble();
          },
    };

    if (isCurrent) return [shadowIcon];
    return [
      {
        key: 'play-en',
        iconName: 'volume-up',
        label: '朗读',
        locked: audioLocked,
        onPress: audioLocked
          ? lockedPress
          : () => {
              playFromSentence({ paraIdx: bubble.paraIdx, sentIdx: bubble.sentIdx, track: 'en' });
              dismissBubble();
            },
      },
      {
        key: 'play-ai',
        iconName: 'auto-awesome',
        label: '讲解',
        locked: audioLocked,
        onPress: audioLocked
          ? lockedPress
          : () => {
              playFromSentence({ paraIdx: bubble.paraIdx, sentIdx: bubble.sentIdx, track: 'ai' });
              dismissBubble();
            },
      },
      shadowIcon,
    ];
  }, [bubble, player.track, currentParaIdx, currentSentIdx, playFromSentence, dismissBubble, chapter, isPlayerPlaying, playerPause, audioGate]);

  const playerPreviewText = useMemo(() => {
    if (player.track == null || currentParaIdx == null || currentSentIdx == null || !chapter) return '';
    const para = chapter.paragraphs[currentParaIdx];
    if (!para) return '';
    const enSents = Array.isArray(para.englishSentences) ? para.englishSentences : [];
    const zhSents = Array.isArray(para.sentenceTranslations) ? para.sentenceTranslations : [];
    if (player.track === 'ai') return zhSents[currentSentIdx] ?? enSents[currentSentIdx] ?? '';
    return enSents[currentSentIdx] ?? '';
  }, [player.track, currentParaIdx, currentSentIdx, chapter]);

  // ============================================================
  // 分页：根据 chapter + readMode + 屏幕高度切 pages
  // ============================================================
  const pageHeight = windowHeight - TOP_BAR_HEIGHT - BOTTOM_BAR_HEIGHT - PROGRESS_BAR_HEIGHT - theme.spacing.xl * 2;
  const contentWidth = windowWidth - theme.spacing.lg * 2;

  const pages: Page[] = useMemo(() => {
    if (!chapter) return [];
    const frames = expandToFrames(chapter.paragraphs);
    return paginate(frames, readMode, pageHeight, contentWidth);
  }, [chapter, readMode, pageHeight, contentWidth]);

  const totalPages = pages.length;

  // ============================================================
  // 进度追踪
  // ============================================================
  const listRef = useRef<FlatList<Page>>(null);
  // 当前页内最大 (paraDbIndex, sentIdx) — 上报到后端 lastParaIndex/lastSentenceIndex 用
  const currentPosRef = useRef<{ paraIndex: number; sentenceIndex: number }>({
    paraIndex: 0,
    sentenceIndex: 0,
  });
  const sessionStartRef = useRef<number>(Date.now());
  const isAppActiveRef = useRef(true);
  const hasRestoredRef = useRef(false);
  const completedReportedRef = useRef(false);

  // 进度恢复目标位置（PageView 接收后单页内 ScrollView 滚到目标句附近留下文）
  const [restorePos, setRestorePos] = useState<{ paraDbIndex: number; sentenceIndex: number } | null>(null);

  // 阅读模式偏好（异步从 AsyncStorage 加载）
  // readModeLoaded 同步置位是关键：进度恢复 effect 必须等真正的 readMode 才能算对页号
  useEffect(() => {
    AsyncStorage.getItem(READ_MODE_KEY).then((v) => {
      if (v === 'original' || v === 'bilingual' || v === 'chinese') setReadMode(v);
      setReadModeLoaded(true);
    });
  }, []);

  // 章节切换 reset
  useEffect(() => {
    currentPosRef.current = { paraIndex: 0, sentenceIndex: 0 };
    completedReportedRef.current = false;
    sessionStartRef.current = Date.now();
    hasRestoredRef.current = false;
    setCurrentPageIdx(0);
    setRestorePos(null);
    classicsReaderActions.reset();
  }, [chapterNumber]);

  // AppState 变化结算时段
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      const wasActive = isAppActiveRef.current;
      isAppActiveRef.current = next === 'active';
      if (wasActive && next !== 'active') flushProgress();
      if (!wasActive && next === 'active') sessionStartRef.current = Date.now();
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterNumber]);

  const flushProgress = useCallback(
    (chapterCompleted?: boolean) => {
      if (!slug) return;
      const elapsed = Math.min(
        3600,
        Math.max(0, Math.floor((Date.now() - sessionStartRef.current) / 1000)),
      );
      sessionStartRef.current = Date.now();
      reportProgress({
        chapterNumber,
        paraIndex: currentPosRef.current.paraIndex,
        sentenceIndex: currentPosRef.current.sentenceIndex,
        addedSeconds: elapsed,
        chapterCompleted,
      });
    },
    [slug, chapterNumber, reportProgress],
  );

  // 每 15 秒上报一次（前台）
  useEffect(() => {
    const id = setInterval(() => {
      if (isAppActiveRef.current) flushProgress();
    }, 15000);
    return () => clearInterval(id);
  }, [flushProgress]);

  // 离开页面 flush
  useEffect(() => {
    return () => {
      flushProgress();
    };
  }, [flushProgress]);

  // ============================================================
  // 进度恢复：用 lastParaIndex + lastSentenceIndex（上次离开位置，不是 max）
  // 句级精确：找到目标 (paraIdx, sentIdx) 所在的 frame，再找该 frame 在哪一页
  // 单页内 ScrollView 自动滚动到目标句附近（PageView 接收 restorePos 处理）
  // ============================================================
  useEffect(() => {
    if (hasRestoredRef.current) return;
    if (!chapter || !savedProgress || pages.length === 0) return;
    // 必须等 readMode 真正加载完（AsyncStorage 是异步），否则 pages 会用错误的初始 readMode
    // 算出的 targetPageIdx 与用户实际离开位置不符
    if (!readModeLoaded) return;

    const chapterEntry = savedProgress.chapters?.[chapterNumber];
    // 优先用本章 lastParaIndex / lastSentenceIndex；如果是 0（默认值，未上报新字段）
    // 兜底到 maxParaIndex（旧数据），再兜底到头表 lastChapter
    const lastP = chapterEntry?.lastParaIndex ?? 0;
    const maxP = chapterEntry?.maxParaIndex ?? 0;
    const targetParaDbIndex =
      lastP > 0
        ? lastP
        : maxP > 0
          ? maxP
          : (savedProgress.lastChapter === chapterNumber ? savedProgress.lastParaIndex : 0);
    const targetSentenceIndex = chapterEntry?.lastSentenceIndex ?? 0;

    hasRestoredRef.current = true;

    if (!targetParaDbIndex || targetParaDbIndex <= 0) return;

    // 找目标段在 chapter.paragraphs 数组中的下标
    const arrayIdx = chapter.paragraphs.findIndex((p) => p.index === targetParaDbIndex);
    if (arrayIdx < 0) return;

    // 找目标 (paraArrayIdx, sentenceIndex) 所在的 page —— 句级精确
    let targetPageIdx = 0;
    for (const pg of pages) {
      const found = pg.frames.find(
        (f) => f.paraArrayIdx === arrayIdx && f.kind === 'sentence' && f.sentIdx === targetSentenceIndex,
      );
      if (found) {
        targetPageIdx = pg.pageIndex;
        break;
      }
    }
    // 没匹配到精确句（可能是 paragraph fallback frame） → 按段所在第一页定位
    if (targetPageIdx === 0) {
      targetPageIdx = findPageIndexForPara(pages, arrayIdx);
    }

    // 把目标位置传给 PageView，由它在单页 ScrollView 内滚到目标句附近（留下文）
    setRestorePos({
      paraDbIndex: targetParaDbIndex,
      sentenceIndex: targetSentenceIndex,
    });

    if (targetPageIdx > 0) {
      setCurrentPageIdx(targetPageIdx);
      const t = setTimeout(() => {
        listRef.current?.scrollToOffset({
          offset: targetPageIdx * windowWidth,
          animated: false,
        });
      }, 150);
      return () => clearTimeout(t);
    }
  }, [chapter, savedProgress, chapterNumber, pages, windowWidth, readModeLoaded]);

  // ============================================================
  // 模式切换：保持视觉位置（最顶段所在页号映射到新模式下的页号）
  // ============================================================
  const prevReadModeRef = useRef(readMode);
  const topParaArrayIdxRef = useRef(0);
  useEffect(() => {
    if (prevReadModeRef.current === readMode) return;
    prevReadModeRef.current = readMode;
    if (pages.length === 0) return;
    const targetPage = findPageIndexForPara(pages, topParaArrayIdxRef.current);
    setCurrentPageIdx(targetPage);
    const t = setTimeout(() => {
      listRef.current?.scrollToIndex({ index: targetPage, animated: false });
    }, 50);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readMode]);

  // ============================================================
  // AI 朗读跨页自动翻页
  // 段可跨页时，必须按 (paraIdx, sentIdx) 精确定位「句」所在页，
  // 否则用 findPageIndexForPara 返回段首页 → 用户在末尾页点讲解会被拉回段首页
  // ============================================================
  useEffect(() => {
    if (currentParaIdx == null || pages.length === 0) return;
    let targetPage = -1;
    for (const pg of pages) {
      const found = pg.frames.find(
        (f) =>
          f.paraArrayIdx === currentParaIdx &&
          (f.kind === 'paragraph' ||
            (f.kind === 'sentence' && f.sentIdx === currentSentIdx)),
      );
      if (found) {
        targetPage = pg.pageIndex;
        break;
      }
    }
    // 兜底：找不到精确句（如 sentIdx 越界）→ 段首页
    if (targetPage < 0) targetPage = findPageIndexForPara(pages, currentParaIdx);
    if (targetPage !== currentPageIdx) {
      setCurrentPageIdx(targetPage);
      listRef.current?.scrollToIndex({ index: targetPage, animated: true });
    }
  }, [currentParaIdx, currentSentIdx, pages, currentPageIdx]);

  // ============================================================
  // 翻页时更新引用
  //   currentParaDbIndexRef 用「页内最大段 db index」上报：
  //     段跨页时（句 1-3 在 P4，句 4-10 在 P5），P5 内段 N 的句 4 所在的 frame
  //     paraDbIndex 仍为 N。但同页可能还有 N+1, N+2 等更深段，取 max 反映"已读最深"。
  //     下次恢复时找段 N+k 所在页（k 是页内最大段的偏移）→ 命中真正的 P5。
  //   topParaArrayIdxRef 用「页起始段」给模式切换 effect 用（保持视觉位置最顶段一致）
  // ============================================================
  // pagingEnabled horizontal FlatList 上 onViewableItemsChanged 触发不稳定，
  // 把"页号 + 页内 max 段对"的更新逻辑抽出，由 onViewableItemsChanged 和
  // onMomentumScrollEnd（翻页完成）双路触发，保证至少一处工作
  const updateCurrentPage = useCallback(
    (pageIdx: number) => {
      setCurrentPageIdx(pageIdx);
      const page = pages[pageIdx];
      if (page && page.frames.length > 0) {
        let maxPara = page.frames[0].paraDbIndex;
        let maxSent = page.frames[0].kind === 'sentence' ? page.frames[0].sentIdx : 0;
        for (const f of page.frames) {
          const sIdx = f.kind === 'sentence' ? f.sentIdx : 0;
          if (f.paraDbIndex > maxPara || (f.paraDbIndex === maxPara && sIdx > maxSent)) {
            maxPara = f.paraDbIndex;
            maxSent = sIdx;
          }
        }
        currentPosRef.current = { paraIndex: maxPara, sentenceIndex: maxSent };
        topParaArrayIdxRef.current = page.frames[0].paraArrayIdx;
      }
    },
    [pages],
  );

  // 用 ref 中转让 onMomentumScrollEnd 拿最新版（onMomentumScrollEnd 用 native event 不能加 deps）
  const updateCurrentPageRef = useRef(updateCurrentPage);
  updateCurrentPageRef.current = updateCurrentPage;

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length === 0) return;
    const visible = viewableItems[0];
    const pageIdx = visible.index ?? 0;
    updateCurrentPageRef.current(pageIdx);
  }).current;

  // pagingEnabled horizontal FlatList 上 onViewableItemsChanged 触发不稳定，
  // onMomentumScrollEnd 兜底（翻页动画结束时按 scrollX 算页号）
  const handleMomentumScrollEnd = useCallback(
    (e: { nativeEvent: { contentOffset: { x: number } } }) => {
      if (windowWidth <= 0) return;
      const pageIdx = Math.round(e.nativeEvent.contentOffset.x / windowWidth);
      updateCurrentPageRef.current(pageIdx);
    },
    [windowWidth],
  );

  const handleScrollToIndexFailed = useCallback(
    (info: { index: number; averageItemLength: number }) => {
      const offset = info.index * info.averageItemLength;
      listRef.current?.scrollToOffset({ offset, animated: false });
    },
    [],
  );

  const selectMode = (m: ReadMode) => {
    setReadMode(m);
    setShowMenu(false);
    AsyncStorage.setItem(READ_MODE_KEY, m).catch(() => {});
  };

  const goToChapter = (n: number) => {
    if (!chapterGate.guard({ chapterNumber: n, bookSlug: slug })) return;
    playerStop();
    flushProgress();
    navigation.replace('ClassicsReader', { slug, chapterNumber: n });
  };

  const goToPrevPage = () => {
    if (currentPageIdx > 0) {
      const target = currentPageIdx - 1;
      setCurrentPageIdx(target);
      listRef.current?.scrollToIndex({ index: target, animated: true });
    } else if (chapter?.prevChapter) {
      goToChapter(chapter.prevChapter);
    }
  };

  const goToNextPage = () => {
    if (currentPageIdx < totalPages - 1) {
      const target = currentPageIdx + 1;
      setCurrentPageIdx(target);
      listRef.current?.scrollToIndex({ index: target, animated: true });
    } else if (chapter?.nextChapter) {
      goToChapter(chapter.nextChapter);
    }
  };

  // 章节标题（仅渲染在第一页顶部）— useMemo 必须在 early return 之前调用，
  // 否则 hooks 顺序在 chapter 加载前后不一致会触发 React 报错
  const chapterHeader = useMemo(() => {
    if (!chapter) return null;
    const enTitle = formatChapterTitle(chapter.title, chapter.chapterNumber, 'en');
    const zhTitle = formatChapterTitleZh(chapter.titleZh, chapter.title, chapter.chapterNumber);
    const showBoth = readMode === 'bilingual' && enTitle !== zhTitle;
    return (
      <View>
        {readMode === 'original' && <Text style={styles.chapterTitle}>{enTitle}</Text>}
        {readMode === 'chinese' && <Text style={styles.chapterTitle}>{zhTitle}</Text>}
        {readMode === 'bilingual' && (
          <>
            <Text style={styles.chapterTitle}>{enTitle}</Text>
            {showBoth && <Text style={styles.chapterTitleZh}>{zhTitle}</Text>}
          </>
        )}
        <View style={styles.chapterDivider} />
      </View>
    );
  }, [chapter, readMode, styles]);

  // ============================================================
  // 渲染
  // ============================================================
  if (isLoading || !chapter) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor={CLASSICS.colors.paper} barStyle="dark-content" />
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Icon name={IconNames.left} size={24} color={CLASSICS.colors.ink} />
          </TouchableOpacity>
        </View>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={CLASSICS.colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  const highlightBgColor = theme.colors.warning + '33';

  const scrollPercent = totalPages > 0 ? (currentPageIdx + 1) / totalPages : 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={CLASSICS.colors.paper} barStyle="dark-content" />

      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Icon name={IconNames.left} size={24} color={CLASSICS.colors.ink} />
        </TouchableOpacity>
        <Text style={styles.topTitle} numberOfLines={1}>
          {readMode === 'chinese' && chapter.bookTitleZh ? chapter.bookTitleZh : chapter.bookTitle}
        </Text>
        <TouchableOpacity
          onPress={() => setShowMenu(true)}
          style={styles.iconBtn}
          activeOpacity={0.7}
        >
          <MaterialIcons name="translate" size={22} color={CLASSICS.colors.ink} />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={listRef}
        data={pages}
        keyExtractor={(p) => `page-${p.pageIndex}`}
        renderItem={({ item, index }) => (
          <PageView
            page={item}
            readMode={readMode}
            width={windowWidth}
            styles={styles}
            highlightBgColor={highlightBgColor}
            headerElement={index === 0 ? chapterHeader : undefined}
            restorePos={restorePos}
            onWordTap={handleWordTap}
            onSentenceLongPress={handleSentenceLongPress}
          />
        )}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={VIEWABILITY_CONFIG}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        onScrollToIndexFailed={handleScrollToIndexFailed}
        getItemLayout={(_data, index) => ({
          length: windowWidth,
          offset: windowWidth * index,
          index,
        })}
        windowSize={3}
        maxToRenderPerBatch={2}
        initialNumToRender={2}
        removeClippedSubviews
      />

      {/* 章节进度金线 */}
      <View style={styles.chapterProgressTrack}>
        <View
          style={[
            styles.chapterProgressFill,
            { width: `${Math.round(scrollPercent * 100)}%` },
          ]}
        />
      </View>

      {/* 点词查义 */}
      {wordDetailData && (
        <WordLookupCard
          word={wordDetailData}
          onClose={closeWordSheet}
          variant="classics"
        />
      )}

      {/* 句级长按气泡 */}
      <SentenceBubble
        visible={bubble != null && bubbleIcons.length > 0}
        anchorY={bubble?.y ?? 0}
        icons={bubbleIcons}
        onDismiss={dismissBubble}
      />

      {/* 跟读面板 */}
      <ShadowingSheet
        visible={shadowingTarget != null}
        sentence={shadowingTarget?.sentence ?? ''}
        onClose={closeShadowing}
      />

      {/* 底部：MiniPlayer / 翻页栏 互斥 */}
      {player.track != null && currentParaIdx != null && currentSentIdx != null ? (
        <MiniPlayer
          track={player.track}
          paraIdx={currentParaIdx}
          sentIdx={currentSentIdx}
          sentCountInPara={currentSentCountInPara}
          previewText={playerPreviewText}
          isLoading={isPlayerLoading}
          isPlaying={isPlayerPlaying}
          isPaused={isPlayerPaused}
          canPrev={playerCanPrev}
          canNext={playerCanNext}
          onPrev={playerPrev}
          onNext={playerNext}
          onToggle={isPlayerPaused ? playerResume : playerPause}
          onStop={playerStop}
        />
      ) : (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.navBtn, currentPageIdx === 0 && !chapter.prevChapter && styles.navBtnDisabled]}
            onPress={goToPrevPage}
            disabled={currentPageIdx === 0 && !chapter.prevChapter}
            activeOpacity={0.7}
          >
            <Icon
              name={IconNames.left}
              size={18}
              color={currentPageIdx === 0 && !chapter.prevChapter ? CLASSICS.colors.inkFaint : CLASSICS.colors.ink}
            />
            <Text style={[styles.navBtnText, currentPageIdx === 0 && !chapter.prevChapter && { color: CLASSICS.colors.inkFaint }]}>
              {currentPageIdx === 0 && chapter.prevChapter
                ? (lang === 'zh-CN' ? '上一章' : 'Prev Ch.')
                : (lang === 'zh-CN' ? '上一页' : 'Prev')}
            </Text>
          </TouchableOpacity>

          <Text style={styles.chapterIndicator}>
            {totalPages > 0
              ? `${lang === 'zh-CN' ? `第 ${chapter.chapterNumber} 章` : `Ch. ${chapter.chapterNumber}`} · ${currentPageIdx + 1}/${totalPages}`
              : ''}
          </Text>

          <TouchableOpacity
            style={[styles.navBtn, currentPageIdx >= totalPages - 1 && !chapter.nextChapter && styles.navBtnDisabled]}
            onPress={goToNextPage}
            disabled={currentPageIdx >= totalPages - 1 && !chapter.nextChapter}
            activeOpacity={0.7}
          >
            <Text style={[styles.navBtnText, currentPageIdx >= totalPages - 1 && !chapter.nextChapter && { color: CLASSICS.colors.inkFaint }]}>
              {currentPageIdx >= totalPages - 1 && chapter.nextChapter
                ? (lang === 'zh-CN' ? '下一章' : 'Next Ch.')
                : (lang === 'zh-CN' ? '下一页' : 'Next')}
            </Text>
            {currentPageIdx >= totalPages - 1 && chapter.nextChapter && !chapterGate.isAllowed({ chapterNumber: chapter.nextChapter, bookSlug: slug }) ? (
              <MaterialIcons name="lock" size={16} color={theme.colors.text.disabled} />
            ) : (
              <Icon
                name={IconNames.right}
                size={18}
                color={currentPageIdx >= totalPages - 1 && !chapter.nextChapter ? CLASSICS.colors.inkFaint : CLASSICS.colors.ink}
              />
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* 阅读模式抽屉 */}
      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <Pressable style={styles.menuOverlay} onPress={() => setShowMenu(false)}>
          <Pressable style={styles.menuSheet} onPress={() => {}}>
            <View style={styles.menuHandle} />
            <Text style={styles.menuTitle}>
              {lang === 'zh-CN' ? '阅读模式' : 'Reading Mode'}
            </Text>
            {MODES.map((m) => {
              const active = readMode === m.key;
              return (
                <TouchableOpacity
                  key={m.key}
                  onPress={() => selectMode(m.key)}
                  style={[styles.menuRow, active && styles.menuRowActive]}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuRowMain}>
                    <Text style={[styles.menuLabel, active && styles.menuLabelActive]}>
                      {lang === 'zh-CN' ? m.label : m.labelEn}
                    </Text>
                    <Text style={styles.menuHint}>
                      {lang === 'zh-CN' ? m.hint : m.hintEn}
                    </Text>
                  </View>
                  {active && (
                    <MaterialIcons name="check" size={20} color={CLASSICS.colors.accent} />
                  )}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: CLASSICS.colors.paper },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: CLASSICS.colors.divider,
    },
    iconBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    topTitle: {
      flex: 1,
      textAlign: 'center',
      fontFamily: CLASSICS.fontFamily.serif,
      fontSize: theme.typography.fontSize.sm,
      color: CLASSICS.colors.inkMuted,
      fontStyle: 'italic',
    },
    centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.xl,
      paddingBottom: theme.spacing.xl,
    },
    chapterTitle: {
      fontFamily: CLASSICS.fontFamily.serifBold,
      fontSize: theme.typography.fontSize.xl,
      color: CLASSICS.colors.ink,
      lineHeight: 32,
      textAlign: 'center',
    },
    chapterTitleZh: {
      marginTop: theme.spacing.xs,
      fontSize: theme.typography.fontSize.base,
      color: CLASSICS.colors.inkMuted,
      lineHeight: 24,
      textAlign: 'center',
    },
    chapterDivider: {
      alignSelf: 'center',
      width: 48,
      height: 2,
      backgroundColor: CLASSICS.colors.gold,
      marginVertical: theme.spacing.lg,
      opacity: 0.7,
    },
    paragraphEn: {
      fontFamily: CLASSICS.fontFamily.serif,
      fontSize: theme.typography.fontSize.base,
      lineHeight: 30,
      color: CLASSICS.colors.ink,
      marginBottom: theme.spacing.md,
      textAlign: 'justify',
    },
    paragraphZhPrimary: {
      fontSize: theme.typography.fontSize.base,
      lineHeight: 30,
      color: CLASSICS.colors.ink,
      marginBottom: theme.spacing.md,
      textAlign: 'justify',
    },
    paragraphZhSub: {
      fontSize: theme.typography.fontSize.sm,
      lineHeight: 24,
      color: CLASSICS.colors.inkMuted,
      marginTop: -theme.spacing.xs,
      marginBottom: theme.spacing.md,
      textAlign: 'justify',
    },
    bilingualBlock: {
      marginBottom: theme.spacing.lg,
      paddingBottom: theme.spacing.lg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: CLASSICS.colors.divider + '60',
    },
    sentencePair: {
      marginBottom: theme.spacing.sm,
    },
    sentenceEn: {
      fontFamily: CLASSICS.fontFamily.serif,
      fontSize: theme.typography.fontSize.base,
      lineHeight: 28,
      color: CLASSICS.colors.ink,
      textAlign: 'justify' as const,
    },
    sentenceZh: {
      fontSize: theme.typography.fontSize.sm,
      lineHeight: 22,
      color: CLASSICS.colors.inkMuted,
      marginTop: 2,
      textAlign: 'justify' as const,
    },
    clickableWord: {
      color: CLASSICS.colors.ink,
    },
    clickableWordHighlight: {
      color: CLASSICS.colors.accent,
      fontWeight: theme.typography.fontWeight.semibold,
      textDecorationLine: 'underline' as const,
      textDecorationColor: CLASSICS.colors.accent + '60',
    },
    sentenceHighlight: {},
    chapterEndSpacer: { height: theme.spacing.xl },
    chapterProgressTrack: {
      height: 2,
      backgroundColor: CLASSICS.colors.divider,
    },
    chapterProgressFill: {
      height: 2,
      backgroundColor: CLASSICS.colors.gold,
    },
    bottomBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: CLASSICS.colors.divider,
      backgroundColor: CLASSICS.colors.paper,
    },
    navBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs + 2,
      gap: 2,
    },
    navBtnDisabled: { opacity: 0.4 },
    navBtnText: {
      fontFamily: CLASSICS.fontFamily.serif,
      fontSize: theme.typography.fontSize.sm,
      color: CLASSICS.colors.ink,
    },
    chapterIndicator: {
      fontFamily: CLASSICS.fontFamily.serif,
      fontSize: theme.typography.fontSize.xs,
      color: CLASSICS.colors.inkFaint,
      fontStyle: 'italic',
    },
    menuOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-end',
    },
    menuSheet: {
      backgroundColor: CLASSICS.colors.paper,
      borderTopLeftRadius: theme.spacing.borderRadius.xl,
      borderTopRightRadius: theme.spacing.borderRadius.xl,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.xl,
    },
    menuHandle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: CLASSICS.colors.divider,
      marginBottom: theme.spacing.md,
    },
    menuTitle: {
      fontFamily: CLASSICS.fontFamily.serifBold,
      fontSize: theme.typography.fontSize.base,
      color: CLASSICS.colors.ink,
      marginBottom: theme.spacing.sm,
    },
    menuRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: CLASSICS.colors.divider,
    },
    menuRowActive: {},
    menuRowMain: { flex: 1 },
    menuLabel: {
      fontFamily: CLASSICS.fontFamily.serifBold,
      fontSize: theme.typography.fontSize.base,
      color: CLASSICS.colors.ink,
    },
    menuLabelActive: {
      color: CLASSICS.colors.accent,
    },
    menuHint: {
      marginTop: 2,
      fontSize: theme.typography.fontSize.xs,
      color: CLASSICS.colors.inkMuted,
    },
  });
