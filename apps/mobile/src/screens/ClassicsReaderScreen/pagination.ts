/**
 * 名著章节分页算法
 *
 * 输入: chapter.paragraphs[] + readMode + 屏幕可用高度
 * 输出: pages[]，每页含若干 frame（句级最小单元）
 *
 * 分页策略：
 *   - 每个 frame = 一个英文句子 + 对应中文翻译（句不跨页，段可跨页）
 *   - 段没有 englishSentences 数据时 fallback 为整段单 frame（段不可拆）
 *   - 估算每个 frame 的渲染高度，累加到接近屏幕高度就切下一页
 *   - 第一页可用高度减去章节标题 + 分隔线占用空间
 *
 * 估算偏差由单页 ScrollView 兜底（页内可微滚），不影响功能正确性。
 */

import type { ReadMode } from './ParagraphItem';

// ============================================================
// 类型
// ============================================================

export interface Paragraph {
  index: number; // 数据库段号 (book_paragraphs.paraIndex)
  text: string;
  translationZh: string | null;
  englishSentences?: string[] | null;
  sentenceTranslations?: string[] | null;
}

export type Frame =
  | {
      kind: 'sentence';
      paraArrayIdx: number;       // 段在 chapter.paragraphs 数组的下标
      paraDbIndex: number;         // 数据库段号（用于进度上报）
      sentIdx: number;             // 段内句序号
      sentenceCountInPara: number; // 段内总句数
      enText: string;
      zhText: string | null;
      isFirstInPara: boolean;
      isLastInPara: boolean;
    }
  | {
      kind: 'paragraph';
      paraArrayIdx: number;
      paraDbIndex: number;
      enText: string;
      zhText: string | null;
    };

export interface Page {
  pageIndex: number;
  frames: Frame[];
  startParaArrayIdx: number;
  endParaArrayIdx: number;
}

// ============================================================
// 度量常数（与 createStyles 对齐，调样式时同步改这里）
// ============================================================

const PARA_EN_LINE_H = 30;        // paragraphEn lineHeight
const SENT_EN_LINE_H = 28;        // sentenceEn lineHeight (bilingual 句对模式)
const PARA_ZH_PRIMARY_LINE_H = 30; // paragraphZhPrimary
const PARA_ZH_SUB_LINE_H = 24;     // paragraphZhSub (bilingual fallback)
const SENT_ZH_LINE_H = 22;         // sentenceZh (bilingual 句对模式)

const PARA_MARGIN = 16;            // 段间距 marginBottom md
const BILINGUAL_BLOCK_PADDING = 32; // bilingualBlock paddingBottom + marginBottom
const SENTENCE_PAIR_MARGIN = 8;    // sentencePair marginBottom

// 字符宽度估算（用于换算每行字符数）
const EN_CHAR_WIDTH = 8.5;  // serif 16sp 平均
const ZH_CHAR_WIDTH = 16;   // 中文方块字双倍宽

// 章节首页预留：标题 + 分隔线
const CHAPTER_HEADER_HEIGHT = 80;

// ============================================================
// 1. 把章节 paragraphs[] 展开为 frames[]
// ============================================================

export function expandToFrames(paragraphs: Paragraph[]): Frame[] {
  const out: Frame[] = [];
  paragraphs.forEach((p, paraArrayIdx) => {
    const enSents = Array.isArray(p.englishSentences) ? p.englishSentences : null;
    const zhSents = Array.isArray(p.sentenceTranslations) ? p.sentenceTranslations : null;

    if (enSents && enSents.length > 0) {
      const count = enSents.length;
      enSents.forEach((sentence, sIdx) => {
        out.push({
          kind: 'sentence',
          paraArrayIdx,
          paraDbIndex: p.index,
          sentIdx: sIdx,
          sentenceCountInPara: count,
          enText: sentence,
          zhText: zhSents?.[sIdx] ?? null,
          isFirstInPara: sIdx === 0,
          isLastInPara: sIdx === count - 1,
        });
      });
    } else {
      // 没有句级数据 → 整段为单 frame，不可拆分
      out.push({
        kind: 'paragraph',
        paraArrayIdx,
        paraDbIndex: p.index,
        enText: p.text,
        zhText: p.translationZh,
      });
    }
  });
  return out;
}

// ============================================================
// 2. 估算 frame 渲染高度
// ============================================================

export function estimateFrameHeight(
  f: Frame,
  mode: ReadMode,
  contentWidth: number,
): number {
  const enCharsPerLine = Math.max(20, Math.floor(contentWidth / EN_CHAR_WIDTH));
  const zhCharsPerLine = Math.max(10, Math.floor(contentWidth / ZH_CHAR_WIDTH));

  const enLen = f.enText.length;
  const zhLen = f.zhText?.length ?? 0;
  const enLines = Math.max(1, Math.ceil(enLen / enCharsPerLine));
  const zhLines = zhLen > 0 ? Math.max(1, Math.ceil(zhLen / zhCharsPerLine)) : 0;

  if (f.kind === 'sentence') {
    if (mode === 'original') {
      // 多句合段渲染：每句只占段内一部分高度
      let h = enLines * PARA_EN_LINE_H;
      // 段尾的 marginBottom 加在 last sentence
      if (f.isLastInPara) h += PARA_MARGIN;
      return h;
    }
    if (mode === 'chinese') {
      // 仅中文：每句对应翻译；多句合段
      let h = (zhLines || 1) * PARA_ZH_PRIMARY_LINE_H;
      if (f.isLastInPara) h += PARA_MARGIN;
      return h;
    }
    // bilingual 句对模式：每句独立行 + 对应中文 + 句对间距
    let h = enLines * SENT_EN_LINE_H + (zhLines || 1) * SENT_ZH_LINE_H + SENTENCE_PAIR_MARGIN;
    if (f.isLastInPara) h += BILINGUAL_BLOCK_PADDING;
    return h;
  }

  // paragraph fallback
  if (mode === 'original') return enLines * PARA_EN_LINE_H + PARA_MARGIN;
  if (mode === 'chinese') return (zhLines || 1) * PARA_ZH_PRIMARY_LINE_H + PARA_MARGIN;
  // bilingual fallback
  return enLines * PARA_EN_LINE_H + (zhLines || 1) * PARA_ZH_SUB_LINE_H + BILINGUAL_BLOCK_PADDING;
}

// ============================================================
// 3. 切分 frames → pages
// ============================================================

export function paginate(
  frames: Frame[],
  mode: ReadMode,
  pageHeight: number,
  contentWidth: number,
): Page[] {
  if (frames.length === 0) return [];

  const pages: Page[] = [];
  let cur: Frame[] = [];
  let curHeight = 0;
  let pageIdx = 0;
  // 第一页要扣去章节标题 + 分隔线占用
  let budget = pageHeight - CHAPTER_HEADER_HEIGHT;

  const commitPage = () => {
    if (cur.length === 0) return;
    pages.push({
      pageIndex: pageIdx++,
      frames: cur,
      startParaArrayIdx: cur[0].paraArrayIdx,
      endParaArrayIdx: cur[cur.length - 1].paraArrayIdx,
    });
    cur = [];
    curHeight = 0;
    // 后续页全屏可用
    budget = pageHeight;
  };

  for (const f of frames) {
    const h = estimateFrameHeight(f, mode, contentWidth);
    if (curHeight + h > budget && cur.length > 0) {
      commitPage();
    }
    cur.push(f);
    curHeight += h;
  }
  commitPage();

  return pages;
}

// ============================================================
// 4. 工具：根据段号定位页号
// ============================================================

/** 根据 paraArrayIdx 找出该段所在的第一页（段可跨页时返回起始页） */
export function findPageIndexForPara(pages: Page[], paraArrayIdx: number): number {
  if (pages.length === 0) return 0;
  for (const p of pages) {
    if (p.startParaArrayIdx <= paraArrayIdx && paraArrayIdx <= p.endParaArrayIdx) {
      return p.pageIndex;
    }
  }
  // 兜底：超过末段则返回末页
  return pages[pages.length - 1].pageIndex;
}
