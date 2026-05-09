/**
 * 单页渲染（分页模式）
 *
 * 数据：来自 pagination.ts 的 Page —— 一组 frames
 * 段可跨页：本页可能只含某段的部分句子；同段连续 frames 合并渲染保持视觉连续
 *
 * 单页内套 ScrollView 兜底：估算偏差导致内容超出屏幕时单页可微滚，体感仍是"翻页"
 */

import React, { memo, useEffect, useMemo, useRef } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { type Frame, type Page, estimateFrameHeight } from './pagination';
import { ParagraphEn, type ReadMode } from './ParagraphItem';
import { useClassicsReaderStore } from '@/stores/ClassicsReaderStore';

interface PageViewProps {
  page: Page;
  readMode: ReadMode;
  width: number;
  styles: any;
  highlightBgColor: string;
  /** 仅第一页传入，用于在页顶渲染章节标题区 */
  headerElement?: React.ReactNode;
  /** 若本页含目标 (paraDbIndex, sentenceIndex)，挂载后单页内滚到目标句附近（留前文上下文） */
  restorePos?: { paraDbIndex: number; sentenceIndex: number } | null;
  onWordTap: (token: string, key: string) => void;
  onSentenceLongPress: (paraArrayIdx: number, sentIdx: number, pageY: number) => void;
}

/** 把 frames 按段分组（同段连续 frames 合并），并标记跨页 startsFromMid / endsAtMid */
interface ParagraphGroup {
  paraArrayIdx: number;
  paraDbIndex: number;
  frames: Frame[];
  startsFromMid: boolean;
  endsAtMid: boolean;
}

function groupFramesByParagraph(frames: Frame[]): ParagraphGroup[] {
  const groups: ParagraphGroup[] = [];
  for (const f of frames) {
    const last = groups[groups.length - 1];
    if (last && last.paraArrayIdx === f.paraArrayIdx) {
      last.frames.push(f);
    } else {
      groups.push({
        paraArrayIdx: f.paraArrayIdx,
        paraDbIndex: f.paraDbIndex,
        frames: [f],
        startsFromMid: false,
        endsAtMid: false,
      });
    }
  }
  if (groups.length > 0) {
    const first = groups[0];
    const firstFrame = first.frames[0];
    if (firstFrame.kind === 'sentence' && !firstFrame.isFirstInPara) {
      first.startsFromMid = true;
    }
    const last = groups[groups.length - 1];
    const lastFrame = last.frames[last.frames.length - 1];
    if (lastFrame.kind === 'sentence' && !lastFrame.isLastInPara) {
      last.endsAtMid = true;
    }
  }
  return groups;
}

function PageViewImpl({
  page,
  readMode,
  width,
  styles,
  highlightBgColor,
  headerElement,
  restorePos,
  onWordTap,
  onSentenceLongPress,
}: PageViewProps) {
  const groups = useMemo(() => groupFramesByParagraph(page.frames), [page]);
  const scrollRef = useRef<ScrollView>(null);

  // 进度恢复（句级精确）：本页含目标句时，单页内滚到目标句附近，前 1-2 句留作上下文
  useEffect(() => {
    if (!restorePos) return;
    const targetIdx = page.frames.findIndex(
      (f) =>
        f.kind === 'sentence' &&
        f.paraDbIndex === restorePos.paraDbIndex &&
        f.sentIdx === restorePos.sentenceIndex,
    );
    if (targetIdx <= 0) return; // 不在本页或在第一句不需滚
    // 累计目标前所有 frame 的估算高度
    const contentWidth = width - 48; // 与 paddingHorizontal lg=24 对齐
    let offsetY = 0;
    for (let i = 0; i < targetIdx; i++) {
      offsetY += estimateFrameHeight(page.frames[i], readMode, contentWidth);
    }
    // 留下文：往上回退 ~120px（约 4 行），让前 1-2 句仍可见
    const scrollY = Math.max(0, offsetY - 120);
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: scrollY, animated: false });
    }, 100);
    return () => clearTimeout(t);
  }, [restorePos, page, readMode, width]);

  return (
    <View style={{ width }}>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {headerElement}
        {groups.map((g) => (
          <ParagraphSection
            key={`page${page.pageIndex}-p${g.paraArrayIdx}`}
            paraArrayIdx={g.paraArrayIdx}
            frames={g.frames}
            readMode={readMode}
            styles={styles}
            highlightBgColor={highlightBgColor}
            startsFromMid={g.startsFromMid}
            endsAtMid={g.endsAtMid}
            onWordTap={onWordTap}
            onSentenceLongPress={onSentenceLongPress}
          />
        ))}
      </ScrollView>
    </View>
  );
}

export const PageView = memo(PageViewImpl);

// ============================================================
// ParagraphSection — 段在页内的部分渲染
// ============================================================

interface ParagraphSectionProps {
  paraArrayIdx: number;
  frames: Frame[]; // 同段的连续 frames（一定 ≥ 1）
  readMode: ReadMode;
  styles: any;
  highlightBgColor: string;
  startsFromMid: boolean;
  endsAtMid: boolean;
  onWordTap: (token: string, key: string) => void;
  onSentenceLongPress: (paraArrayIdx: number, sentIdx: number, pageY: number) => void;
}

function ParagraphSectionImpl({
  paraArrayIdx,
  frames,
  readMode,
  styles,
  highlightBgColor,
  startsFromMid,
  endsAtMid,
  onWordTap,
  onSentenceLongPress,
}: ParagraphSectionProps) {
  // 订阅 store 切片：仅本段是活跃段时才感知 highlightSentence
  const isActive = useClassicsReaderStore((s) => s.activeParaArrayIdx === paraArrayIdx);
  const highlightSentence = useClassicsReaderStore((s) =>
    s.activeParaArrayIdx === paraArrayIdx ? s.highlightSentence : null,
  );
  const highlightKey = useClassicsReaderStore((s) => s.highlightKey);

  const firstFrame = frames[0];
  const isParaFallback = firstFrame.kind === 'paragraph';

  // ──────── original 模式：多句合段 ────────
  if (readMode === 'original') {
    if (isParaFallback) {
      const f = firstFrame as Extract<Frame, { kind: 'paragraph' }>;
      const containerStyle = endsAtMid ? null : { marginBottom: 16 };
      return (
        <View style={containerStyle}>
          <ParagraphEn
            text={f.enText}
            baseKey={`p-${f.paraDbIndex}`}
            paragraphStyle={styles.paragraphEn}
            wordStyle={styles.clickableWord}
            highlightStyle={styles.clickableWordHighlight}
            sentenceHighlightStyle={styles.sentenceHighlight}
            highlightKey={highlightKey}
            highlightSentence={isActive ? highlightSentence : null}
            highlightBackgroundColor={highlightBgColor}
            onWordTap={onWordTap}
          />
        </View>
      );
    }
    // 句级 frames：合并为多句 ParagraphEn 渲染
    const sentences = (frames as Array<Extract<Frame, { kind: 'sentence' }>>).map((f) => f.enText);
    // 多句中只渲染本组 sentence，但 ParagraphEn 的 highlightSentence 比较的是字符串值，跨段不会误高亮
    const handleSentenceLongPress = (localSIdx: number, pageY: number) => {
      const dbSentIdx = (frames[localSIdx] as Extract<Frame, { kind: 'sentence' }>).sentIdx;
      onSentenceLongPress(paraArrayIdx, dbSentIdx, pageY);
    };
    return (
      <View style={endsAtMid ? null : { marginBottom: 16 }}>
        <ParagraphEn
          text={sentences.join(' ')}
          sentences={sentences}
          baseKey={`p-${(firstFrame as Extract<Frame, { kind: 'sentence' }>).paraDbIndex}-pageStart-${(firstFrame as Extract<Frame, { kind: 'sentence' }>).sentIdx}`}
          paragraphStyle={styles.paragraphEn}
          wordStyle={styles.clickableWord}
          highlightStyle={styles.clickableWordHighlight}
          sentenceHighlightStyle={styles.sentenceHighlight}
          highlightKey={highlightKey}
          highlightSentence={isActive ? highlightSentence : null}
          highlightBackgroundColor={highlightBgColor}
          onWordTap={onWordTap}
          onSentenceLongPress={handleSentenceLongPress}
        />
      </View>
    );
  }

  // ──────── chinese 模式：仅中文 ────────
  if (readMode === 'chinese') {
    let zhText = '';
    if (isParaFallback) {
      const f = firstFrame as Extract<Frame, { kind: 'paragraph' }>;
      zhText = f.zhText || f.enText;
    } else {
      zhText = (frames as Array<Extract<Frame, { kind: 'sentence' }>>)
        .map((f) => f.zhText ?? f.enText)
        .join('');
    }
    return (
      <View style={endsAtMid ? null : { marginBottom: 16 }}>
        <Text style={styles.paragraphZhPrimary}>{zhText}</Text>
      </View>
    );
  }

  // ──────── bilingual 模式 ────────
  // 段尾视觉：endsAtMid → 不画 borderBottom；否则保留 bilingualBlock 完整样式
  const blockStyle = endsAtMid
    ? { marginBottom: 16 }
    : styles.bilingualBlock;

  if (isParaFallback) {
    const f = firstFrame as Extract<Frame, { kind: 'paragraph' }>;
    return (
      <View style={blockStyle}>
        <ParagraphEn
          text={f.enText}
          baseKey={`p-${f.paraDbIndex}`}
          paragraphStyle={styles.paragraphEn}
          wordStyle={styles.clickableWord}
          highlightStyle={styles.clickableWordHighlight}
          sentenceHighlightStyle={styles.sentenceHighlight}
          highlightKey={highlightKey}
          highlightSentence={isActive ? highlightSentence : null}
          highlightBackgroundColor={highlightBgColor}
          onWordTap={onWordTap}
        />
        {f.zhText ? <Text style={styles.paragraphZhSub}>{f.zhText}</Text> : null}
      </View>
    );
  }

  // bilingual 句对模式
  return (
    <View style={blockStyle}>
      {(frames as Array<Extract<Frame, { kind: 'sentence' }>>).map((f) => {
        const sentenceBaseKey = `p-${f.paraDbIndex}-s-${f.sentIdx}`;
        const isSentenceHighlighted = isActive && highlightSentence === f.enText;
        return (
          <View key={sentenceBaseKey} style={styles.sentencePair}>
            <ParagraphEn
              text={f.enText}
              sentences={[f.enText]}
              baseKey={sentenceBaseKey}
              paragraphStyle={styles.sentenceEn}
              wordStyle={styles.clickableWord}
              highlightStyle={styles.clickableWordHighlight}
              sentenceHighlightStyle={styles.sentenceHighlight}
              highlightKey={highlightKey}
              highlightSentence={isSentenceHighlighted ? f.enText : null}
              highlightBackgroundColor={highlightBgColor}
              onWordTap={onWordTap}
              onSentenceLongPress={(_, pageY) => onSentenceLongPress(paraArrayIdx, f.sentIdx, pageY)}
            />
            {f.zhText ? <Text style={styles.sentenceZh}>{f.zhText}</Text> : null}
          </View>
        );
      })}
    </View>
  );
}

const ParagraphSection = memo(ParagraphSectionImpl);
