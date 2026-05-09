/**
 * 名著章节标题显示规则:
 * - 若原 title 是纯罗马数字或阿拉伯数字（19 世纪小说普遍用法），合成 "第 N 章 / Chapter N"
 * - 否则保留原文 title
 *
 * 适用于 Austen / Dickens / Eliot / Hardy / 勃朗特 等未给章节起名的小说
 */

const NUMERIC_ONLY = /^[IVXLCDM]+\.?$/i;
const DIGITS_ONLY = /^\d+\.?$/;
// "Chapter I" / "Chapter 3" / "Stave V" / "Book II" 等纯前缀+编号，无描述
const PREFIXED_NUMBER = /^(?:chapter|stave|book|part|act|scene)\s+(?:[IVXLCDM]+|\d+)\.?$/i;

function isNumericOnly(title: string): boolean {
  const t = title.trim();
  return NUMERIC_ONLY.test(t) || DIGITS_ONLY.test(t) || PREFIXED_NUMBER.test(t);
}

/** 显示用英文/原文章节标题 */
export function formatChapterTitle(
  title: string,
  chapterNumber: number,
  lang: 'zh-CN' | 'en' = 'en',
): string {
  if (!isNumericOnly(title)) return title;
  return lang === 'zh-CN' ? `第 ${chapterNumber} 章` : `Chapter ${chapterNumber}`;
}

/** 显示用中文章节标题（优先 titleZh，其次合成，最后 fallback 原文） */
export function formatChapterTitleZh(
  titleZh: string | null,
  title: string,
  chapterNumber: number,
): string {
  if (titleZh && titleZh.trim()) return titleZh;
  if (isNumericOnly(title)) return `第 ${chapterNumber} 章`;
  return title;
}
