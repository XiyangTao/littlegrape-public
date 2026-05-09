/**
 * 名著章节段落渲染单元（FlatList renderItem）
 *
 * 抽离自 ClassicsReaderScreen/index.tsx，目的：
 *   - memo 化避免父组件 re-render 时重渲染
 *   - 用 zustand selector 订阅高亮切片，只有命中段感知变化
 *
 * 包含：
 *   - tokenizeText: 简单按空白拆 token（保留 token 起止位置用于段级高亮范围计算）
 *   - ParagraphEn: 英文段落 token 化渲染（支持单词点击、句子长按、句级高亮三种语义）
 *   - ParagraphItem: 顶层段组件，按 readMode 选择渲染分支
 */
import React, { memo, useCallback } from 'react';
import { View, Text } from 'react-native';
import type { Theme } from '@/context/ThemeProvider';
import { useClassicsReaderStore } from '@/stores/ClassicsReaderStore';

// ============================================================
// helpers
// ============================================================

function tokenizeText(text: string): Array<{ token: string; start: number; end: number }> {
  const parts = text.split(/(\s+)/);
  let pos = 0;
  return parts.map((token) => {
    const start = pos;
    pos += token.length;
    return { token, start, end: pos };
  });
}

// ============================================================
// ParagraphEn — 英文段落渲染（与原 index.tsx 实现等价）
// ============================================================

interface ParagraphEnProps {
  text: string;
  sentences?: string[];
  paragraphStyle: any;
  wordStyle: any;
  highlightStyle: any;
  sentenceHighlightStyle?: any;
  highlightKey: string | null;
  highlightSentence?: string | null;
  baseKey: string;
  onWordTap: (token: string, key: string) => void;
  onSentenceLongPress?: (sentenceIdx: number, pageY: number) => void;
  onLongPress?: () => void;
  highlightBackgroundColor?: string;
}

export function ParagraphEn({
  text,
  sentences,
  paragraphStyle,
  wordStyle,
  highlightStyle,
  sentenceHighlightStyle,
  highlightKey,
  highlightSentence,
  baseKey,
  onWordTap,
  onSentenceLongPress,
  onLongPress,
  highlightBackgroundColor,
}: ParagraphEnProps) {
  const [layoutLines, setLayoutLines] = React.useState<Array<{ x: number; y: number; width: number; height: number; text: string }>>([]);

  const fullText = sentences && sentences.length > 0 ? sentences.join(' ') : text;
  const highlightRange = React.useMemo(() => {
    if (!highlightSentence) return null;
    const idx = fullText.indexOf(highlightSentence);
    if (idx < 0) return null;
    return { start: idx, end: idx + highlightSentence.length };
  }, [fullText, highlightSentence]);

  const highlightRects = React.useMemo(() => {
    if (!highlightRange || layoutLines.length === 0 || !highlightBackgroundColor) return [];
    const rects: Array<{ left: number; top: number; width: number; height: number }> = [];
    let charCount = 0;
    for (const line of layoutLines) {
      const lineStart = charCount;
      const lineEnd = lineStart + line.text.length;
      charCount = lineEnd;
      const overlapStart = Math.max(lineStart, highlightRange.start);
      const overlapEnd = Math.min(lineEnd, highlightRange.end);
      if (overlapStart >= overlapEnd) continue;
      const lineLen = Math.max(1, line.text.length);
      const leftRatio = (overlapStart - lineStart) / lineLen;
      const rightRatio = (overlapEnd - lineStart) / lineLen;
      const left = line.x + leftRatio * line.width;
      const right = line.x + rightRatio * line.width;
      rects.push({
        left,
        top: line.y,
        width: Math.max(0, right - left),
        height: line.height,
      });
    }
    return rects;
  }, [layoutLines, highlightRange, highlightBackgroundColor]);

  const handleTextLayout = React.useCallback((e: any) => {
    const lines = e?.nativeEvent?.lines ?? [];
    setLayoutLines(lines.map((l: any) => ({ x: l.x, y: l.y, width: l.width, height: l.height, text: l.text })));
  }, []);

  // 模式 A1：多句合段（原文模式 / bilingual fallback）— inline backgroundColor 按句染色
  if (sentences && sentences.length > 1) {
    return (
      <Text style={paragraphStyle}>
        {sentences.flatMap((sentence, sIdx) => {
          const isHighlighted = highlightSentence != null && highlightSentence === sentence;
          const inlineBg = isHighlighted && highlightBackgroundColor
            ? { backgroundColor: highlightBackgroundColor }
            : null;
          const tokens = tokenizeText(sentence);
          const sentenceOnLongPress = (e: any) => {
            const pageY = e?.nativeEvent?.pageY ?? 0;
            onSentenceLongPress?.(sIdx, pageY);
          };
          const tokenElements: React.ReactNode[] = tokens.map(({ token }, tIdx) => {
            const key = `${baseKey}-s${sIdx}-t${tIdx}`;
            if (/^\s+$/.test(token)) {
              return (
                <Text key={`s${sIdx}-t${tIdx}`} style={inlineBg ?? undefined}>{token}</Text>
              );
            }
            const isWordActive = highlightKey === key;
            return (
              <Text
                key={`s${sIdx}-t${tIdx}`}
                style={[wordStyle, inlineBg, isWordActive && highlightStyle]}
                onPress={() => onWordTap(token, key)}
                onLongPress={sentenceOnLongPress}
                suppressHighlighting
              >
                {token}
              </Text>
            );
          });
          if (sIdx < sentences.length - 1) {
            tokenElements.push(<Text key={`s${sIdx}-sep`}>{' '}</Text>);
          }
          return tokenElements;
        })}
      </Text>
    );
  }

  // 模式 A2：单句渲染（bilingual 主路径）— 绝对定位矩形高亮层
  if (sentences && sentences.length > 0) {
    return (
      <View style={{ position: 'relative' }}>
        {highlightRects.map((rect, i) => (
          <View
            key={`hl-${i}`}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height,
              backgroundColor: highlightBackgroundColor,
              borderRadius: 2,
            }}
          />
        ))}
        <Text style={paragraphStyle} onTextLayout={handleTextLayout}>
          {sentences.flatMap((sentence, sIdx) => {
            const isHighlighted = highlightSentence != null && highlightSentence === sentence;
            const tokens = tokenizeText(sentence);
            const sentenceOnLongPress = (e: any) => {
              const pageY = e?.nativeEvent?.pageY ?? 0;
              onSentenceLongPress?.(sIdx, pageY);
            };
            const tokenElements = tokens.map(({ token }, tIdx) => {
              const key = `${baseKey}-s${sIdx}-t${tIdx}`;
              if (/^\s+$/.test(token)) {
                return <Text key={`s${sIdx}-t${tIdx}`}>{token}</Text>;
              }
              const isWordActive = highlightKey === key;
              return (
                <Text
                  key={`s${sIdx}-t${tIdx}`}
                  style={[
                    wordStyle,
                    isHighlighted && sentenceHighlightStyle,
                    isWordActive && highlightStyle,
                  ]}
                  onPress={() => onWordTap(token, key)}
                  onLongPress={sentenceOnLongPress}
                  suppressHighlighting
                >
                  {token}
                </Text>
              );
            });
            if (sIdx < sentences.length - 1) {
              tokenElements.push(<Text key={`s${sIdx}-sep`}>{' '}</Text>);
            }
            return tokenElements;
          })}
        </Text>
      </View>
    );
  }

  // 模式 B：按整段 text 切 token（兼容无 englishSentences 老数据）
  const tokenData = tokenizeText(text);
  const modeBHighlightRange = (() => {
    if (!highlightSentence) return null;
    const idx = text.indexOf(highlightSentence);
    if (idx === -1) return null;
    return { start: idx, end: idx + highlightSentence.length };
  })();

  return (
    <Text style={paragraphStyle}>
      {tokenData.map(({ token, start, end }, i) => {
        if (/^\s+$/.test(token)) {
          const isSentActiveSpace = modeBHighlightRange
            ? start >= modeBHighlightRange.start && end <= modeBHighlightRange.end
            : false;
          return <Text key={i} style={isSentActiveSpace ? sentenceHighlightStyle : undefined}>{token}</Text>;
        }
        const key = `${baseKey}-${i}`;
        const isWordActive = highlightKey === key;
        const isSentActive = modeBHighlightRange
          ? start >= modeBHighlightRange.start && end <= modeBHighlightRange.end
          : false;
        return (
          <Text
            key={i}
            style={[wordStyle, isSentActive && sentenceHighlightStyle, isWordActive && highlightStyle]}
            onPress={() => onWordTap(token, key)}
            onLongPress={onLongPress}
            suppressHighlighting
          >
            {token}
          </Text>
        );
      })}
    </Text>
  );
}

// ============================================================
// ParagraphItem — 段顶层渲染（按 readMode 分支）
// ============================================================

export type ReadMode = 'original' | 'bilingual' | 'chinese';

interface ParagraphData {
  index: number;
  text: string;
  translationZh: string | null;
  englishSentences?: string[] | null;
  sentenceTranslations?: string[] | null;
}

interface ParagraphItemProps {
  p: ParagraphData;
  /** 段在 chapter.paragraphs 数组中的下标（与 useChapterPlayer paraIdx 对齐） */
  arrayIdx: number;
  readMode: ReadMode;
  styles: any;
  highlightBgColor: string;
  onWordTap: (token: string, key: string) => void;
  onSentenceLongPress: (paraArrayIdx: number, sentIdx: number, pageY: number) => void;
}

function ParagraphItemImpl({
  p,
  arrayIdx,
  readMode,
  styles,
  highlightBgColor,
  onWordTap,
  onSentenceLongPress,
}: ParagraphItemProps) {
  // 订阅 store 切片：仅当本段是活跃段时才感知 highlightSentence 变化
  const isActive = useClassicsReaderStore((s) => s.activeParaArrayIdx === arrayIdx);
  const highlightSentence = useClassicsReaderStore((s) =>
    s.activeParaArrayIdx === arrayIdx ? s.highlightSentence : null,
  );
  // 单词点击高亮 key 全局唯一：所有段订阅，但 zustand reference equality 让未变化时不重渲染
  const highlightKey = useClassicsReaderStore((s) => s.highlightKey);

  const en = p.text;
  const zh = p.translationZh;
  const enSentences = Array.isArray(p.englishSentences) ? p.englishSentences : null;
  const zhSentences = Array.isArray(p.sentenceTranslations) ? p.sentenceTranslations : null;
  const hasSentencePairs = !!(
    enSentences && zhSentences &&
    enSentences.length === zhSentences.length &&
    enSentences.length > 0
  );

  const handleSentenceLongPress = useCallback(
    (sentIdx: number, pageY: number) => onSentenceLongPress(arrayIdx, sentIdx, pageY),
    [arrayIdx, onSentenceLongPress],
  );

  if (readMode === 'original') {
    return (
      <View>
        <ParagraphEn
          text={en}
          sentences={enSentences ?? undefined}
          baseKey={`p-${p.index}`}
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

  if (readMode === 'chinese') {
    return (
      <View>
        <Text style={styles.paragraphZhPrimary}>{zh || en}</Text>
      </View>
    );
  }

  // bilingual + 句对模式
  if (hasSentencePairs && enSentences && zhSentences) {
    return (
      <View style={styles.bilingualBlock}>
        {enSentences.map((sentence, sIdx) => {
          const sentenceBaseKey = `p-${p.index}-s-${sIdx}`;
          const isSentenceHighlighted = isActive && highlightSentence === sentence;
          return (
            <View key={sIdx} style={styles.sentencePair}>
              <ParagraphEn
                text={sentence}
                sentences={[sentence]}
                baseKey={sentenceBaseKey}
                paragraphStyle={styles.sentenceEn}
                wordStyle={styles.clickableWord}
                highlightStyle={styles.clickableWordHighlight}
                sentenceHighlightStyle={styles.sentenceHighlight}
                highlightKey={highlightKey}
                highlightSentence={isSentenceHighlighted ? sentence : null}
                highlightBackgroundColor={highlightBgColor}
                onWordTap={onWordTap}
                onSentenceLongPress={(_, pageY) => onSentenceLongPress(arrayIdx, sIdx, pageY)}
              />
              <Text style={styles.sentenceZh}>{zhSentences[sIdx]}</Text>
            </View>
          );
        })}
      </View>
    );
  }

  // bilingual fallback（无逐句数据，整段对照）
  return (
    <View style={styles.bilingualBlock}>
      <ParagraphEn
        text={en}
        sentences={enSentences ?? undefined}
        baseKey={`p-${p.index}`}
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
      {zh ? <Text style={styles.paragraphZhSub}>{zh}</Text> : null}
    </View>
  );
}

export const ParagraphItem = memo(ParagraphItemImpl);
