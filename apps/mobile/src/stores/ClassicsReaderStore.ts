/**
 * 名著章节阅读 — 跨段共享状态
 *
 * 设计目标：
 *   FlatList 虚拟化下，段组件用 selector 订阅 store 切片，
 *   只有切片真变化时段才 re-render。父组件 re-render 不再波及所有段。
 *
 * 用法：
 *   - 父组件（ClassicsReaderScreen）写：调 actions 把 player 高亮 / 单词点击 / 可见段 推到 store
 *   - 段组件（ParagraphItem）读：用 useClassicsReaderStore(s => ...) 订阅切片
 */
import { create } from 'zustand';

interface ClassicsReaderState {
  /** 当前播放段在 paragraphs 数组中的 index（与 useChapterPlayer.currentParaIdx 一致） */
  activeParaArrayIdx: number | null;
  /** 当前播放句的英文原文（仅活跃段命中时用于高亮） */
  highlightSentence: string | null;
  /** 单词点击高亮 key（含段+句+token 路径，全局唯一） */
  highlightKey: string | null;
  /** 当前最顶可见段的 array index（onViewableItemsChanged 推到这里） */
  topVisibleArrayIdx: number;
}

const initialState: ClassicsReaderState = {
  activeParaArrayIdx: null,
  highlightSentence: null,
  highlightKey: null,
  topVisibleArrayIdx: 0,
};

export const useClassicsReaderStore = create<ClassicsReaderState>(() => initialState);

export const classicsReaderActions = {
  setActivePara(arrayIdx: number | null, sentence: string | null) {
    const { activeParaArrayIdx, highlightSentence } = useClassicsReaderStore.getState();
    if (activeParaArrayIdx === arrayIdx && highlightSentence === sentence) return;
    useClassicsReaderStore.setState({
      activeParaArrayIdx: arrayIdx,
      highlightSentence: sentence,
    });
  },
  setHighlightKey(key: string | null) {
    if (useClassicsReaderStore.getState().highlightKey === key) return;
    useClassicsReaderStore.setState({ highlightKey: key });
  },
  setTopVisibleArrayIdx(idx: number) {
    if (useClassicsReaderStore.getState().topVisibleArrayIdx === idx) return;
    useClassicsReaderStore.setState({ topVisibleArrayIdx: idx });
  },
  reset() {
    useClassicsReaderStore.setState(initialState);
  },
};
