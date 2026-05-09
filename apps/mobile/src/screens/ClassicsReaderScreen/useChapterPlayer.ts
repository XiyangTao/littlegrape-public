/**
 * 名著章级播放控制器（两轨统一走句级 TTS）
 *
 *   - 'en' 原文朗读：每句独立合成（track: 'en'），首次扣配额 + OSS 缓存
 *   - 'ai' AI 讲解：每句独立合成（track: 'ai'），文本脚本预生成，音频懒合成
 *
 * 两轨共用同一套 sentencePlayer 和推进逻辑：
 * 单句播完 → 同段下一句 → 段末跨段 → 章末停；暂停/恢复/停止透传底层
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSentenceStreamPlayer } from '@/hooks/useSentenceStreamPlayer';
import type { ChapterContent } from '@/api/modules/classics';

export type Track = 'en' | 'ai';

interface ControllerState {
  track: Track | null;
  paraIdx: number | null;
  sentIdx: number | null;
  isPaused: boolean;
}

const INITIAL_STATE: ControllerState = {
  track: null,
  paraIdx: null,
  sentIdx: null,
  isPaused: false,
};

export function useChapterPlayer(slug: string, chapter: ChapterContent | null | undefined) {
  const sentencePlayer = useSentenceStreamPlayer();

  const [state, setState] = useState<ControllerState>(INITIAL_STATE);
  const stateRef = useRef(state);
  stateRef.current = state;

  const chapterRef = useRef(chapter);
  chapterRef.current = chapter;

  const slugRef = useRef(slug);
  slugRef.current = slug;

  /** 当前 (paraIdx, sentIdx) 对应的英文原句，用于 UI 高亮 */
  const currentHighlightSentence: string | null = useMemo(() => {
    if (state.track == null || state.paraIdx == null || state.sentIdx == null || !chapter) return null;
    const para = chapter.paragraphs[state.paraIdx];
    if (!para) return null;
    const sentences = Array.isArray(para.englishSentences) ? para.englishSentences : [];
    return sentences[state.sentIdx] ?? null;
  }, [state, chapter]);

  /** 当前段内的英文句子数（辅助推进） */
  const paraSentenceCount = useCallback((paraIdx: number): number => {
    const ch = chapterRef.current;
    if (!ch) return 0;
    const sentences = ch.paragraphs[paraIdx]?.englishSentences;
    return Array.isArray(sentences) ? sentences.length : 0;
  }, []);

  /** 找到下一个有 englishSentences 的段 + 第 0 句；章末返回 null */
  const findNextNonEmptySentence = useCallback((fromParaIdx: number): { paraIdx: number; sentIdx: number } | null => {
    const ch = chapterRef.current;
    if (!ch) return null;
    for (let p = fromParaIdx; p < ch.paragraphs.length; p++) {
      if (paraSentenceCount(p) > 0) return { paraIdx: p, sentIdx: 0 };
    }
    return null;
  }, [paraSentenceCount]);

  const stop = useCallback(() => {
    sentencePlayer.stop();
    setState(INITIAL_STATE);
  }, [sentencePlayer]);

  const playSentence = useCallback((paraIdx: number, sentIdx: number, track: Track) => {
    const chapterNumber = chapterRef.current?.chapterNumber;
    if (!chapterNumber) return;
    sentencePlayer.play({
      slug: slugRef.current,
      chapterNumber,
      paraIndex: paraIdx,
      sentenceIndex: sentIdx,
      track,
      sessionKey: `${track}-p${paraIdx}-s${sentIdx}`,
      onEnded: () => handleSentenceEnded(),
      onError: () => stop(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentencePlayer, stop]);

  /** 单句播放自然结束 → 推进到下一句（同段 → 跨段 → 章末停） */
  const handleSentenceEnded = useCallback(() => {
    const { track, paraIdx, sentIdx, isPaused } = stateRef.current;
    if (track == null || paraIdx == null || sentIdx == null) return;
    if (isPaused) return;

    const currentCount = paraSentenceCount(paraIdx);
    const nextSentIdx = sentIdx + 1;
    if (nextSentIdx < currentCount) {
      setState(prev => ({ ...prev, sentIdx: nextSentIdx }));
      playSentence(paraIdx, nextSentIdx, track);
      return;
    }
    // 段末 → 下一段第 0 句（跳过无切句的空段）
    const next = findNextNonEmptySentence(paraIdx + 1);
    if (!next) {
      stop();
      return;
    }
    setState(prev => ({ ...prev, paraIdx: next.paraIdx, sentIdx: next.sentIdx }));
    playSentence(next.paraIdx, next.sentIdx, track);
  }, [paraSentenceCount, findNextNonEmptySentence, playSentence, stop]);

  /** 从指定句开始连读到章尾 */
  const playFromSentence = useCallback((params: { paraIdx: number; sentIdx: number; track: Track }) => {
    const { paraIdx, sentIdx, track } = params;
    if (!chapterRef.current) return;
    setState({ track, paraIdx, sentIdx, isPaused: false });
    playSentence(paraIdx, sentIdx, track);
  }, [playSentence]);

  /** 跳到上一句（同段 → 前一个非空段末句；章首无反应，UI 侧 disable 按钮） */
  const playPrev = useCallback(() => {
    const { track, paraIdx, sentIdx } = stateRef.current;
    if (track == null || paraIdx == null || sentIdx == null) return;
    if (sentIdx > 0) {
      setState(s => ({ ...s, sentIdx: sentIdx - 1, isPaused: false }));
      playSentence(paraIdx, sentIdx - 1, track);
      return;
    }
    for (let p = paraIdx - 1; p >= 0; p--) {
      const cnt = paraSentenceCount(p);
      if (cnt > 0) {
        setState(s => ({ ...s, paraIdx: p, sentIdx: cnt - 1, isPaused: false }));
        playSentence(p, cnt - 1, track);
        return;
      }
    }
  }, [paraSentenceCount, playSentence]);

  /** 跳到下一句（复用连播推进逻辑） */
  const playNext = useCallback(() => {
    handleSentenceEnded();
  }, [handleSentenceEnded]);

  /** 当前段句数（给 UI 显示"第 N/M 句"用） */
  const currentSentCountInPara = useMemo(() => {
    if (state.paraIdx == null) return 0;
    return paraSentenceCount(state.paraIdx);
  }, [state.paraIdx, paraSentenceCount]);

  /** 章首边界：上一句不可达 */
  const canPrev = useMemo(() => {
    if (state.track == null || state.paraIdx == null || state.sentIdx == null || !chapter) return false;
    if (state.sentIdx > 0) return true;
    for (let p = state.paraIdx - 1; p >= 0; p--) {
      const cnt = chapter.paragraphs[p]?.englishSentences?.length ?? 0;
      if (cnt > 0) return true;
    }
    return false;
  }, [state.track, state.paraIdx, state.sentIdx, chapter]);

  /** 章末边界：下一句不可达 */
  const canNext = useMemo(() => {
    if (state.track == null || state.paraIdx == null || state.sentIdx == null || !chapter) return false;
    const cnt = chapter.paragraphs[state.paraIdx]?.englishSentences?.length ?? 0;
    if (state.sentIdx + 1 < cnt) return true;
    for (let p = state.paraIdx + 1; p < chapter.paragraphs.length; p++) {
      const c = chapter.paragraphs[p]?.englishSentences?.length ?? 0;
      if (c > 0) return true;
    }
    return false;
  }, [state.track, state.paraIdx, state.sentIdx, chapter]);

  const pause = useCallback(() => {
    sentencePlayer.pause();
    setState(prev => ({ ...prev, isPaused: true }));
  }, [sentencePlayer]);

  const resume = useCallback(() => {
    sentencePlayer.resume();
    setState(prev => ({ ...prev, isPaused: false }));
  }, [sentencePlayer]);

  useEffect(() => {
    return () => { sentencePlayer.stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isActive = state.track != null;
  const isLoading = isActive && sentencePlayer.isLoading;
  const isPlaying = isActive && sentencePlayer.isPlaying;
  const isPaused = state.isPaused && isActive;

  return {
    track: state.track,
    currentParaIdx: state.paraIdx,
    currentSentIdx: state.sentIdx,
    currentSentCountInPara,
    currentHighlightSentence,
    isLoading,
    isPlaying,
    isPaused,
    error: (isActive && sentencePlayer.error) || null,
    playFromSentence,
    playPrev,
    playNext,
    canPrev,
    canNext,
    pause,
    resume,
    stop,
  };
}
