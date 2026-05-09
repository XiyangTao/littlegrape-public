/**
 * 点词查义 + TTS 懒合成
 *
 * 公共字典能力，结果写入 WordLookupCache 全局共享：
 * - 不走用户 usage / 配额（见 routes/words/lookup.ts 注释）
 * - 未命中词库时调 AI 生成释义，同步返回给客户端
 * - AI 返回后 fire-and-forget 启动 TTS 合成，结果补回 cache.audioUrlUs
 *   下次查同一词即可拿到音频 URL
 */

import { prisma } from '@/config/database';
import { ossClient, OSS_CONFIG } from '@/config/oss';
import { speechServiceClient } from '@/clients/speechServiceClient';
import { aiServiceClient } from '@/clients/aiServiceClient';
import { logger } from '@/utils/logger';

export interface LookupResult {
  text: string;
  found: boolean;
  lemma: string | null;
  phonetic: string | null;
  partOfSpeech: string | null;
  meaning: string | null;
  meanings: Array<{ pos: string | null; definition: string }>;
  notes: string | null;
  source: 'dict' | 'ai' | 'none';
  wordId: string | null;
  audioUrlUs: string | null;
  audioUrlUk: string | null;
}

// 与词库离线合成脚本保持一致（scripts/word-processor/generate_audio_only.py），
// 避免同一用户在 AI 兜底词与词库词之间切换时音色突变
const WORD_TTS_VOICE_US = process.env.WORD_TTS_VOICE_US || 'en-US-JennyNeural';
const WORD_TTS_VOICE_UK = process.env.WORD_TTS_VOICE_UK || 'en-GB-SoniaNeural';

function normalizeWord(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^[^a-z'-]+/, '')
    .replace(/[^a-z'-]+$/, '');
}

const emptyLookup = (text: string): LookupResult => ({
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
});

async function aiLookup(word: string): Promise<Omit<LookupResult, 'text' | 'wordId' | 'source' | 'found' | 'audioUrlUs' | 'audioUrlUk'>> {
  const data = (await aiServiceClient.post('/word-lookup/define', { word })) as {
    lemma: string | null;
    phonetic: string | null;
    partOfSpeech: string | null;
    meaning: string | null;
    meanings: Array<{ pos: string | null; definition: string }>;
    notes: string | null;
  };
  return {
    lemma: data.lemma ?? null,
    phonetic: data.phonetic ?? null,
    partOfSpeech: data.partOfSpeech ?? null,
    meaning: data.meaning ?? null,
    meanings: Array.isArray(data.meanings) ? data.meanings.filter((m) => m && m.definition).slice(0, 6) : [],
    notes: data.notes ?? null,
  };
}

/**
 * 后台 TTS 合成任务 — fire-and-forget
 * 直接覆盖 cache 对应字段；重复触发会重新合成覆盖，内容相同代价可忽略
 */
async function synthesizeAndSaveWordTts(word: string, accent: 'us' | 'uk'): Promise<void> {
  const voice = accent === 'us' ? WORD_TTS_VOICE_US : WORD_TTS_VOICE_UK;
  const resp = await speechServiceClient.synthesizeSpeech({
    text: word,
    voice,
    speed: 1.0,
    format: 'mp3',
    quality: 'standard',
  });
  const buffer = Buffer.from(resp.data as ArrayBuffer);
  const ossPath = `${OSS_CONFIG.pathPrefixes.audio}words/${accent}/${word}.mp3`;
  await ossClient.put(ossPath, buffer, { mime: 'audio/mpeg' });
  const url = `${OSS_CONFIG.cdnDomain}/${ossPath}?v=${Date.now()}`;

  await prisma.wordLookupCache.update({
    where: { text: word },
    data: accent === 'us' ? { audioUrlUs: url } : { audioUrlUk: url },
  });
}

function scheduleWordTts(word: string): void {
  setImmediate(() => {
    synthesizeAndSaveWordTts(word, 'us').catch((err) => {
      logger.warn('单词 TTS 合成失败', { word, err: err instanceof Error ? err.message : err });
    });
  });
}

/** 点词查义：词库 → cache → AI 兜底；AI 命中后异步触发 TTS */
export async function lookupWord(text: string): Promise<LookupResult> {
  const norm = normalizeWord(text);
  if (!norm) return emptyLookup(text);

  // 1) 词库精确匹配（词库有自带音频 URL）
  const word = await prisma.word.findUnique({
    where: { word: norm },
    include: {
      meanings: {
        orderBy: { orderIndex: 'asc' },
        select: { pos: true, meaningCn: true },
      },
    },
  });
  if (word) {
    return {
      text: norm,
      found: true,
      lemma: norm,
      phonetic: word.phoneticUs || word.phoneticUk || null,
      partOfSpeech: word.pos,
      meaning: word.meaningCn,
      meanings: word.meanings.map((m) => ({ pos: m.pos, definition: m.meaningCn })),
      notes: null,
      source: 'dict',
      wordId: word.id,
      audioUrlUs: word.audioUsUrl || null,
      audioUrlUk: word.audioUkUrl || null,
    };
  }

  // 2) cache 命中
  // cached 存在即命中（包括空 meaning — 表示曾经查过但 AI 无法识别，避免重复 AI 调用）
  const cached = await prisma.wordLookupCache.findUnique({ where: { text: norm } });
  if (cached) {
    if (!cached.meaning) {
      return { ...emptyLookup(norm), source: 'none' };
    }
    return {
      text: norm,
      found: true,
      lemma: cached.lemma,
      phonetic: cached.phonetic,
      partOfSpeech: cached.partOfSpeech,
      meaning: cached.meaning,
      meanings: (cached.meanings as unknown as LookupResult['meanings']) ?? [],
      notes: cached.notes,
      source: cached.source === 'manual' ? 'dict' : 'ai',
      wordId: null,
      audioUrlUs: cached.audioUrlUs,
      audioUrlUk: cached.audioUrlUk,
    };
  }

  // 3) AI 兜底
  let ai: Awaited<ReturnType<typeof aiLookup>>;
  try {
    ai = await aiLookup(norm);
  } catch (err) {
    logger.warn('AI 查词失败', { word: norm, err: err instanceof Error ? err.message : err });
    // AI 服务本身异常不缓存（下次应重试），直接返回空
    return emptyLookup(norm);
  }

  if (!ai.meaning) {
    // 缓存"不识别"结果：meaning='' 表示已确认 AI 无法识别，下次命中空 cache 瞬间返回
    await prisma.wordLookupCache.upsert({
      where: { text: norm },
      create: {
        text: norm,
        lemma: null,
        phonetic: null,
        partOfSpeech: null,
        meaning: '',
        meanings: [] as unknown as object,
        notes: null,
        source: 'ai',
      },
      update: {
        lemma: null,
        phonetic: null,
        partOfSpeech: null,
        meaning: '',
        meanings: [] as unknown as object,
        notes: null,
        source: 'ai',
      },
    });
    return { ...emptyLookup(norm), source: 'none' };
  }

  // 写 cache（upsert 应对并发，同词重复写内容一致）
  await prisma.wordLookupCache.upsert({
    where: { text: norm },
    create: {
      text: norm,
      lemma: ai.lemma,
      phonetic: ai.phonetic,
      partOfSpeech: ai.partOfSpeech,
      meaning: ai.meaning,
      meanings: ai.meanings as unknown as object,
      notes: ai.notes,
      source: 'ai',
    },
    update: {
      lemma: ai.lemma,
      phonetic: ai.phonetic,
      partOfSpeech: ai.partOfSpeech,
      meaning: ai.meaning,
      meanings: ai.meanings as unknown as object,
      notes: ai.notes,
      source: 'ai',
    },
  });

  // AI 命中 → 异步触发 TTS（不阻塞响应，失败不影响查词结果）
  scheduleWordTts(norm);

  return {
    text: norm,
    found: true,
    lemma: ai.lemma,
    phonetic: ai.phonetic,
    partOfSpeech: ai.partOfSpeech,
    meaning: ai.meaning,
    meanings: ai.meanings,
    notes: ai.notes,
    source: 'ai',
    wordId: null,
    audioUrlUs: null,
    audioUrlUk: null,
  };
}
