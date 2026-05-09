import type { LocalWord, LocalProgress, ParsedWord, LocalFavorite, LocalDifficultWord, VocabularyTestWord, VocabularyTestRecord } from './types';
import { safeJsonParse } from '@/utils/safeJsonParse';

/** SQLite words 表行（snake_case） */
export interface WordRow {
  id: string;
  word: string;
  phonetic_us: string | null;
  phonetic_uk: string | null;
  audio_url_us: string | null;
  audio_url_uk: string | null;
  audio_ai_explanation_url: string | null;
  pos: string | null;
  meaning_cn: string;
  meaning_en: string | null;
  level: number | null;
  frequency: number | null;
  meanings: string | null;
  examples: string | null;
  etymology: string | null;
  collocations: string | null;
  inflections: string | null;
  tags: string | null;
  synced_at: number;
}

/** SQLite word_progress 表行（snake_case） */
export interface ProgressRow {
  id: string;
  word_id: string;
  user_id: string;
  status: 'new' | 'learned' | 'mastered';
  learned_at: number | null;
  mastered_at: number | null;
  synced_at: number | null;
  updated_at: number;
  is_skipped: number;
}

/**
 * 将 SQLite 行映射为 LocalWord
 * words.db 瘦身后部分字段可能不存在，用安全降级兜底
 */
export function rowToLocalWord(row: WordRow): LocalWord {
  return {
    id: row.id,
    word: row.word,
    phoneticUs: row.phonetic_us ?? null,
    phoneticUk: row.phonetic_uk ?? null,
    audioUrlUs: row.audio_url_us ?? null,
    audioUrlUk: row.audio_url_uk ?? null,
    audioAiExplanationUrl: row.audio_ai_explanation_url ?? null,
    pos: row.pos ?? null,
    meaningCn: row.meaning_cn,
    meaningEn: row.meaning_en ?? null,
    level: row.level ?? null,
    frequency: row.frequency ?? null,
    meanings: row.meanings ?? '[]',
    examples: row.examples ?? '[]',
    etymology: row.etymology ?? null,
    collocations: row.collocations ?? '[]',
    inflections: row.inflections ?? '[]',
    tags: row.tags ?? '[]',
    syncedAt: row.synced_at,
  };
}

export function rowToLocalProgress(row: ProgressRow): LocalProgress {
  return {
    id: row.id,
    wordId: row.word_id,
    userId: row.user_id,
    status: row.status,
    learnedAt: row.learned_at,
    masteredAt: row.mastered_at,
    syncedAt: row.synced_at,
    updatedAt: row.updated_at,
    isSkipped: row.is_skipped ?? 0,
  };
}

/** SQLite favorite_words 表行（snake_case） */
export interface FavoriteRow {
  id: string;
  word_id: string;
  user_id: string;
  created_at: number;
  synced_at: number | null;
}

/** SQLite difficult_words 表行（snake_case） */
export interface DifficultWordRow {
  id: string;
  word_id: string;
  user_id: string;
  wrong_count: number;
  correct_count: number;
  last_wrong_at: number;
  created_at: number;
  synced_at: number | null;
}

/** SQLite vocabulary_test_results 表行（snake_case） */
export interface VocabularyTestResultRow {
  id: string;
  user_id: string;
  estimated_vocabulary: number;
  total_questions: number;
  correct_count: number;
  duration: number;
  level: string;
  level_description: string;
  confidence_lower: number;
  confidence_upper: number;
  event_time: number;
  sync_status: 'pending' | 'synced' | 'failed';
  synced_at: number | null;
}

/** SQLite words 表部分字段行，用于词汇量测试（snake_case） */
export interface VocabularyTestWordRow {
  id: string;
  word: string;
  meaning_cn: string;
  pos: string | null;
  phonetic_us: string | null;
  bnc_coca_level: number;
}

/** SQLite library_info 表行（snake_case） */
export interface LibraryInfoRow {
  tag: string;
  word_count: number;
}

export function rowToFavorite(row: FavoriteRow): LocalFavorite {
  return {
    id: row.id,
    wordId: row.word_id,
    userId: row.user_id,
    createdAt: row.created_at,
    syncedAt: row.synced_at,
  };
}

export function rowToDifficultWord(row: DifficultWordRow): LocalDifficultWord {
  return {
    id: row.id,
    wordId: row.word_id,
    userId: row.user_id,
    wrongCount: row.wrong_count,
    correctCount: row.correct_count,
    lastWrongAt: row.last_wrong_at,
    createdAt: row.created_at,
    syncedAt: row.synced_at,
  };
}

export function rowToVocabTestRecord(row: VocabularyTestResultRow): VocabularyTestRecord {
  return {
    id: row.id,
    userId: row.user_id,
    estimatedVocabulary: row.estimated_vocabulary,
    totalQuestions: row.total_questions,
    correctCount: row.correct_count,
    duration: row.duration,
    level: row.level,
    levelDescription: row.level_description,
    confidenceLower: row.confidence_lower,
    confidenceUpper: row.confidence_upper,
    eventTime: row.event_time,
    syncStatus: row.sync_status,
    syncedAt: row.synced_at,
  };
}

export function rowToVocabTestWord(row: VocabularyTestWordRow): VocabularyTestWord {
  return {
    id: row.id,
    word: row.word,
    meaningCn: row.meaning_cn,
    pos: row.pos || undefined,
    phoneticUs: row.phonetic_us || undefined,
    level: row.bnc_coca_level,
  };
}

export function rowToLibraryInfo(row: LibraryInfoRow): { tag: string; wordCount: number } {
  return {
    tag: row.tag,
    wordCount: row.word_count,
  };
}

/** 生词本 JOIN 查询结果行（words + difficult_words 部分字段） */
export interface DifficultWordDetailRow extends WordRow {
  wrong_count: number;
  correct_count: number;
  last_wrong_at: number;
}

/** 生词本单词详情（LocalWord + 生词统计） */
export type DifficultWordDetail = LocalWord & {
  wrongCount: number;
  correctCount: number;
  lastWrongAt: number;
};

export function rowToDifficultWordDetail(row: DifficultWordDetailRow): DifficultWordDetail {
  return {
    ...rowToLocalWord(row),
    wrongCount: row.wrong_count,
    correctCount: row.correct_count,
    lastWrongAt: row.last_wrong_at,
  };
}

// 解析本地单词的 JSON 字段
export function parseLocalWord(word: LocalWord): ParsedWord {
  return {
    word,
    meanings: safeJsonParse(word.meanings, []),
    examples: safeJsonParse(word.examples, []),
    etymology: safeJsonParse(word.etymology, null),
    collocations: safeJsonParse(word.collocations, []),
    inflections: safeJsonParse(word.inflections, []),
    tags: safeJsonParse(word.tags, []),
  };
}
