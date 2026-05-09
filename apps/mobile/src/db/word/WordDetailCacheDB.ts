/**
 * 单词详情缓存 DB
 *
 * words.db 瘦身后，详情数据通过 API 按需获取并缓存到 word_details_cache 表。
 * 缓存 TTL 为 1 天，过期后重新请求 API。
 *
 * 核心方法：
 *   - ensureWordDetails(wordIds) — 确保详情数据就绪（查缓存 → 请求API → 写入缓存）
 *   - getCachedWordDetails(wordIds) — 查询缓存
 *   - cacheWordDetails(details) — 写入缓存
 *   - getFullWords(wordIds) — words LEFT JOIN 缓存，组装完整 LocalWord[]
 */

import { getDatabase, runSerialWrite } from '../DatabaseManager';
import { apiClient } from '@/api';
import type { WordDetailBatchItem } from '@/api/modules/words';
import type { LocalWord } from './types';
import { rowToLocalWord } from './helpers';

// 缓存 TTL：1 天（毫秒）
const CACHE_TTL = 24 * 60 * 60 * 1000;

// 批量请求最大数量
const BATCH_SIZE = 50;

/**
 * 确保指定单词的详情数据已缓存就绪
 *
 * 1. 查询 word_details_cache，过滤出缺失或过期的
 * 2. 批量请求 API 获取缺失数据
 * 3. 写入缓存
 *
 * 离线降级：API 请求失败时静默忽略，UI 用 CoreWord 的最小信息展示
 */
export async function ensureWordDetails(wordIds: string[]): Promise<void> {
  if (wordIds.length === 0) return;

  const db = await getDatabase();
  const now = Date.now();
  const ttlThreshold = now - CACHE_TTL;

  // 1. 查询已缓存且未过期的 word_id
  const placeholders = wordIds.map(() => '?').join(',');
  const cachedResult = await db.execute(
    `SELECT word_id FROM word_details_cache WHERE word_id IN (${placeholders}) AND cached_at > ?`,
    [...wordIds, ttlThreshold]
  );
  const cachedIds = new Set((cachedResult.rows as any[]).map(r => r.word_id));

  // 2. 过滤出需要请求的 ID
  const missingIds = wordIds.filter(id => !cachedIds.has(id));
  if (missingIds.length === 0) return;

  // 3. 分批请求 API
  try {
    for (let i = 0; i < missingIds.length; i += BATCH_SIZE) {
      const batch = missingIds.slice(i, i + BATCH_SIZE);
      const response = await apiClient.getWordDetailsBatch(batch);
      if (response.success && response.data.length > 0) {
        await cacheWordDetails(response.data);
      }
    }
  } catch (error) {
    // 离线降级：静默忽略，上层使用 CoreWord 最小信息
    console.warn('[WordDetailCache] API 请求失败，使用离线降级:', error instanceof Error ? error.message : error);
  }
}

/**
 * 查询已缓存的单词详情
 */
export async function getCachedWordDetails(
  wordIds: string[]
): Promise<Map<string, any>> {
  if (wordIds.length === 0) return new Map();

  const db = await getDatabase();
  const placeholders = wordIds.map(() => '?').join(',');
  const result = await db.execute(
    `SELECT * FROM word_details_cache WHERE word_id IN (${placeholders})`,
    wordIds
  );

  const map = new Map<string, any>();
  for (const row of result.rows as any[]) {
    map.set(row.word_id, row);
  }
  return map;
}

/**
 * 写入缓存（批量 Upsert）
 */
export async function cacheWordDetails(details: WordDetailBatchItem[]): Promise<void> {
  if (details.length === 0) return;

  return runSerialWrite(async () => {
    const db = await getDatabase();
    const now = Date.now();

    await db.transaction(async (tx) => {
      for (const detail of details) {
        await tx.execute(`
          INSERT INTO word_details_cache (
            word_id, phonetic_us, phonetic_uk,
            audio_url_us, audio_url_uk, audio_ai_explanation_url,
            meanings, examples, etymology,
            collocations, inflections, tags,
            cached_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(word_id) DO UPDATE SET
            phonetic_us = excluded.phonetic_us,
            phonetic_uk = excluded.phonetic_uk,
            audio_url_us = excluded.audio_url_us,
            audio_url_uk = excluded.audio_url_uk,
            audio_ai_explanation_url = excluded.audio_ai_explanation_url,
            meanings = excluded.meanings,
            examples = excluded.examples,
            etymology = excluded.etymology,
            collocations = excluded.collocations,
            inflections = excluded.inflections,
            tags = excluded.tags,
            cached_at = excluded.cached_at
        `, [
          detail.id,
          detail.phoneticUs,
          detail.phoneticUk,
          detail.audioUsUrl,
          detail.audioUkUrl,
          detail.audioAiExplanationUrl,
          JSON.stringify(detail.meanings),
          JSON.stringify(detail.examples),
          detail.etymology ? JSON.stringify(detail.etymology) : null,
          JSON.stringify(detail.collocations),
          JSON.stringify(detail.inflections),
          JSON.stringify(detail.tags),
          now,
        ]);
      }
    });
  });
}

/**
 * 从 words 表 LEFT JOIN word_details_cache 获取完整的 LocalWord[]
 *
 * 缓存有数据时覆盖 words 表的同名字段，否则用 words 表的默认值（降级）
 */
export async function getFullWords(wordIds: string[]): Promise<LocalWord[]> {
  if (wordIds.length === 0) return [];

  const db = await getDatabase();
  const placeholders = wordIds.map(() => '?').join(',');

  const result = await db.execute(`
    SELECT
      w.id, w.word,
      COALESCE(c.phonetic_us, w.phonetic_us) as phonetic_us,
      COALESCE(c.phonetic_uk, w.phonetic_uk) as phonetic_uk,
      COALESCE(c.audio_url_us, w.audio_url_us) as audio_url_us,
      COALESCE(c.audio_url_uk, w.audio_url_uk) as audio_url_uk,
      COALESCE(c.audio_ai_explanation_url, w.audio_ai_explanation_url) as audio_ai_explanation_url,
      w.pos, w.meaning_cn, w.meaning_en,
      w.level, w.bnc_coca_level, w.is_headword, w.headword_id,
      COALESCE(c.meanings, w.meanings) as meanings,
      COALESCE(c.examples, w.examples) as examples,
      COALESCE(c.etymology, w.etymology) as etymology,
      COALESCE(c.collocations, w.collocations) as collocations,
      COALESCE(c.inflections, w.inflections) as inflections,
      COALESCE(c.tags, w.tags) as tags,
      w.synced_at
    FROM words w
    LEFT JOIN word_details_cache c ON w.id = c.word_id
    WHERE w.id IN (${placeholders})
  `, wordIds);

  // 按 wordIds 顺序重排
  const wordMap = new Map<string, any>();
  for (const row of result.rows as any[]) {
    wordMap.set(row.id, row);
  }

  return wordIds
    .filter(id => wordMap.has(id))
    .map(id => rowToLocalWord(wordMap.get(id)!));
}
