/**
 * AI 查词结果 → LocalWord 映射工具
 *
 * 把服务端 /api/words/lookup 返回的数据填充到 WordDetailSheet 期望的 LocalWord 结构。
 * audioUrlUs/Uk 来源：命中 WordLookupCache 或二次查询（首次 AI 兜底后服务端异步合成 TTS）；
 * 首次 AI 兜底响应时 audioUrl 可能为 null，此时 WordDetailSheet 的发音按钮静默不播。
 * etymology/collocations/inflections AI 路径不提供，留空即可。
 */

// AI_LOOKUP_ID_PREFIX 与 PENDING_LOOKUP_ID_PREFIX 用于识别本工具生成的占位/兜底 word.id，
// 防止 WordDetailSheet 对这类非词库 id 发起 ensureWordDetails 网络请求
export const PENDING_LOOKUP_ID_PREFIX = 'pending:';
export const AI_LOOKUP_ID_PREFIX = 'ai:';

export function isAiLookupId(id: string | null | undefined): boolean {
  return !!id && (id.startsWith(AI_LOOKUP_ID_PREFIX) || id.startsWith(PENDING_LOOKUP_ID_PREFIX));
}

/** AI 兜底查询进行中（尚未返回结果） — 用于 UI 显示 loading 态 */
export function isPendingLookupId(id: string | null | undefined): boolean {
  return !!id && id.startsWith(PENDING_LOOKUP_ID_PREFIX);
}

import type { LocalWord } from '@/types/word';
import type { LookupResult } from '@/api/modules/words';

/** 构造一个空的 AI 词条（id 带 ai: 前缀，无释义）。
 *  用于 AI 查词失败或 API 抛错时脱离 pending 态，让 UI fallback 到"暂无释义"。 */
export function emptyAiLookupWord(text: string): LocalWord {
  return aiLookupToLocalWord({
    text,
    found: false,
    lemma: null,
    phonetic: null,
    partOfSpeech: null,
    meaning: null,
    meanings: [],
    notes: null,
    source: 'none',
    wordId: null,
    audioUrlUs: null,
    audioUrlUk: null,
  }, text);
}

export function aiLookupToLocalWord(ai: LookupResult, fallbackText: string): LocalWord {
  // word 必须是用户点击的原词（如 "gone"），而不是 AI 识别的 lemma（"go"）
  // AI 的变形说明（notes，如 "imagine 的现在分词"）存到 inflections 里，UI 层按需展示
  const displayWord = fallbackText;
  const phonetic = ai.phonetic ?? null;
  const meaningsArr = (ai.meanings || []).map((m, i) => ({
    id: `ai-m-${i}`,
    pos: m.pos || '',
    meaningCn: m.definition,
    meaningEn: null,
    exampleEn: null,
    exampleCn: null,
    orderIndex: i,
    register: null,
  }));
  const inflections = ai.notes
    ? [{ id: 'ai-notes', inflection: ai.notes, type: 'ai_notes' }]
    : [];

  return {
    id: `${AI_LOOKUP_ID_PREFIX}${fallbackText.toLowerCase()}`,
    word: displayWord,
    phoneticUs: phonetic,
    phoneticUk: null,
    audioUrlUs: ai.audioUrlUs ?? null,
    audioUrlUk: ai.audioUrlUk ?? null,
    audioAiExplanationUrl: null,
    pos: ai.partOfSpeech,
    meaningCn: ai.meaning || '',
    meaningEn: null,
    level: null,
    frequency: null,
    meanings: JSON.stringify(meaningsArr),
    examples: '[]',
    etymology: null,
    collocations: '[]',
    inflections: JSON.stringify(inflections),
    tags: '[]',
    syncedAt: Date.now(),
  };
}
