/**
 * 题目生成器
 *
 * 本地生成单词练习题目，供闯关/复习/巩固共用。
 * 所有题型的 question 字段与对应练习组件的 Props 完全匹配。
 */

import type { LocalWord } from '@/types/word';
import { parseLocalWord } from '@/db/WordDB';
import {
  getSmartDistractorMeanings,
  getSmartDistractorWords,
} from '@/db/WordDB';
import { safeJsonParse } from '@/utils/safeJsonParse';

// ==================== 类型定义 ====================

export interface GeneratedQuestion {
  type: string;
  question: any;
  wordId: string;
  word: string;
}

/** 巩固练习维度 */
export type PracticeDimension = 'spelling' | 'meaning' | 'listening' | 'pronunciation';

// ==================== 工具函数 ====================

function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function generateId(): string {
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getFirstExample(word: LocalWord): { en: string; cn: string } | null {
  const examples: Array<{ en: string; cn: string }> = safeJsonParse(word.examples, []);
  if (examples.length > 0 && examples[0].en) {
    return { en: examples[0].en, cn: examples[0].cn || '' };
  }
  return null;
}

function getRandomExample(word: LocalWord): { en: string; cn: string } | null {
  const examples: Array<{ en: string; cn: string }> = safeJsonParse(word.examples, []);
  const valid = examples.filter(e => e.en);
  if (valid.length === 0) return null;
  return valid[Math.floor(Math.random() * valid.length)];
}

// ==================== 单题生成器 ====================

/** 看词选义 */
export async function generateMeaningChoice(word: LocalWord): Promise<GeneratedQuestion> {
  const distractors = await getSmartDistractorMeanings(word.id, word.meaningCn, 3);
  const options = shuffleArray([word.meaningCn, ...distractors]);
  const example = getFirstExample(word);

  return {
    type: 'meaning_choice',
    question: {
      type: 'meaning_choice',
      id: generateId(),
      sentence: example?.en || word.word,
      options,
      answer: word.meaningCn,
    },
    wordId: word.id,
    word: word.word,
  };
}

/** 听音辨词 */
async function generateListenChoice(word: LocalWord, allWords: LocalWord[]): Promise<GeneratedQuestion> {
  const distractors = await getSmartDistractorWords(word.id, word.word, 3);
  const options = shuffleArray([word.word, ...distractors]);

  return {
    type: 'listen_choice',
    question: {
      type: 'listen_choice',
      id: generateId(),
      audio: word.word,
      options,
      answer: word.word,
    },
    wordId: word.id,
    word: word.word,
  };
}

/** 词义配对 */
function generateMatchingPairs(words: LocalWord[]): GeneratedQuestion {
  const selected = shuffleArray(words).slice(0, Math.min(5, words.length));
  const pairs = selected.map(w => ({
    id: w.id,
    english: w.word,
    chinese: w.meaningCn,
  }));

  return {
    type: 'matching_pairs',
    question: {
      type: 'matching_pairs',
      id: generateId(),
      pairs,
    },
    wordId: selected[0].id,
    word: selected[0].word,
  };
}

/** 选词填空 */
async function generateFillBlank(word: LocalWord): Promise<GeneratedQuestion | null> {
  const example = getRandomExample(word);
  if (!example) return null;

  const regex = new RegExp(`\\b${word.word}\\b`, 'i');
  if (!regex.test(example.en)) return null;

  const sentence = example.en.replace(regex, '_____');
  const distractors = await getSmartDistractorWords(word.id, word.word, 3);
  const options = shuffleArray([word.word, ...distractors]);

  return {
    type: 'fill_blank',
    question: {
      type: 'fill_blank',
      id: generateId(),
      sentence,
      options,
      answer: word.word,
      explanation: word.meaningCn,
    },
    wordId: word.id,
    word: word.word,
  };
}

/** 补全翻译 */
function generateCompleteTranslation(word: LocalWord): GeneratedQuestion | null {
  const example = getRandomExample(word);
  if (!example) return null;

  const regex = new RegExp(`\\b${word.word}\\b`, 'i');
  if (!regex.test(example.en)) return null;

  const sentenceEn = example.en.replace(regex, '_____');

  return {
    type: 'complete_translation',
    question: {
      type: 'complete_translation',
      id: generateId(),
      sentenceCn: example.cn,
      sentenceEn,
      answer: word.word,
      hint: word.word[0],
    },
    wordId: word.id,
    word: word.word,
  };
}

/** 拼写拼图 */
/** 将单词拆分为 2-3 字母的音节块，短词按单字母拆分 */
function splitIntoChunks(word: string): string[] {
  // 短词（2-3 字母）按单字母拆分，保证至少 2 个 part
  if (word.length <= 3) {
    return word.split('');
  }
  const chunks: string[] = [];
  let i = 0;
  while (i < word.length) {
    const remaining = word.length - i;
    let size: number;
    if (remaining <= 3) {
      size = remaining;
    } else if (remaining === 4) {
      size = 2; // 4 → 2+2
    } else {
      size = Math.random() < 0.5 ? 2 : 3;
    }
    chunks.push(word.slice(i, i + size));
    i += size;
  }
  return chunks;
}

export function generateWordPuzzle(word: LocalWord): GeneratedQuestion {
  const chunks = splitIntoChunks(word.word);
  const correctParts = [...chunks];

  // 无干扰项，只打乱顺序，降低难度
  const parts = shuffleArray(chunks.map((text, i) => ({
    id: `p_${i}`,
    text,
    isDistractor: false,
  })));

  return {
    type: 'word_puzzle',
    question: {
      id: generateId(),
      parts,
      correctParts,
      word: word.word,
      meaningCn: word.meaningCn,
    },
    wordId: word.id,
    word: word.word,
  };
}

/** 阅读理解 */
async function generateReadRespond(word: LocalWord): Promise<GeneratedQuestion | null> {
  const example = getRandomExample(word);
  if (!example) return null;

  const distractors = await getSmartDistractorMeanings(word.id, word.meaningCn, 3);
  const options = shuffleArray([word.meaningCn, ...distractors]);

  return {
    type: 'read_respond',
    question: {
      type: 'read_respond',
      id: generateId(),
      sentence: example.en,
      highlightWord: word.word,
      options,
      answer: word.meaningCn,
    },
    wordId: word.id,
    word: word.word,
  };
}

/** 完美发音 */
function generatePerfectPronunciation(word: LocalWord): GeneratedQuestion {
  const example = getFirstExample(word);

  return {
    type: 'perfect_pronunciation',
    question: {
      type: 'perfect_pronunciation',
      id: generateId(),
      targetWord: word.word,
      phonetic: word.phoneticUs || word.phoneticUk || '',
      weakPhonemes: [],
      exampleSentence: example?.en || '',
      tips: '',
    },
    wordId: word.id,
    word: word.word,
  };
}

// ==================== 句子级题型 ====================

/** 翻译题 */
function generateTranslation(word: LocalWord): GeneratedQuestion | null {
  const example = getRandomExample(word);
  if (!example) return null;

  return {
    type: 'translation',
    question: {
      type: 'translation',
      id: generateId(),
      sentenceCn: example.cn,
      answer: example.en,
    },
    wordId: word.id,
    word: word.word,
  };
}

/** 句子重排 */
function generateSentenceShuffle(word: LocalWord): GeneratedQuestion | null {
  const example = getRandomExample(word);
  if (!example) return null;

  const correctWords = example.en.replace(/[.,!?;:'"]/g, '').split(/\s+/);
  if (correctWords.length < 3) return null;

  return {
    type: 'sentence_shuffle',
    question: {
      type: 'sentence_shuffle',
      id: generateId(),
      sentenceCn: example.cn,
      correctWords,
      shuffledWords: shuffleArray([...correctWords]),
    },
    wordId: word.id,
    word: word.word,
  };
}

/** 朗读 */
function generateReadAloud(word: LocalWord): GeneratedQuestion | null {
  const example = getRandomExample(word);
  if (!example) return null;

  return {
    type: 'read_aloud',
    question: {
      type: 'read_aloud',
      id: generateId(),
      sentence: example.en,
      sentenceCn: example.cn,
    },
    wordId: word.id,
    word: word.word,
  };
}

/** 听写 */
function generateDictation(word: LocalWord): GeneratedQuestion | null {
  const example = getRandomExample(word);
  if (!example) return null;

  return {
    type: 'dictation',
    question: {
      type: 'dictation',
      id: generateId(),
      sentence: example.en,
      sentenceCn: example.cn,
    },
    wordId: word.id,
    word: word.word,
  };
}

/** 听后复述 */
function generateListenRepeat(word: LocalWord): GeneratedQuestion | null {
  const example = getRandomExample(word);
  if (!example) return null;

  return {
    type: 'listen_repeat',
    question: {
      type: 'listen_repeat',
      id: generateId(),
      sentence: example.en,
      sentenceCn: example.cn,
    },
    wordId: word.id,
    word: word.word,
  };
}

// ==================== 阶段组题 ====================

// 单词级题型池（不含 meaning_choice，用于重点词追加题）
const WORD_EXTRA_TYPES = [
  'listen_choice',
  'fill_blank',
  'complete_translation',
  'word_puzzle',
  'read_respond',
] as const;

/**
 * 阶段二：理解阶段
 * 先每词 1 道 meaning_choice，答错标记重点词；
 * 再为重点词各追加 1 道其他类型题。
 */
export async function generateStage2Questions(
  words: LocalWord[],
  weakWordIds?: string[],
): Promise<GeneratedQuestion[]> {
  const questions: GeneratedQuestion[] = [];

  // 1. 每个词一道 meaning_choice
  for (const w of words) {
    questions.push(await generateMeaningChoice(w));
  }

  // 2. 如果有预设的重点词，给它们各追加 1 道
  if (weakWordIds && weakWordIds.length > 0) {
    const weakWords = words.filter(w => weakWordIds.includes(w.id));
    for (const w of weakWords) {
      const q = await generateExtraQuestion(w, words);
      if (q) questions.push(q);
    }
  }

  return questions;
}

/** 为重点词生成一道非 meaning_choice 的额外题 */
async function generateExtraQuestion(
  word: LocalWord,
  allWords: LocalWord[],
): Promise<GeneratedQuestion | null> {
  const typeIndex = Math.floor(Math.random() * WORD_EXTRA_TYPES.length);
  const type = WORD_EXTRA_TYPES[typeIndex];

  switch (type) {
    case 'listen_choice':
      return generateListenChoice(word, allWords);
    case 'fill_blank':
      return (await generateFillBlank(word)) || generateWordPuzzle(word);
    case 'complete_translation':
      return generateCompleteTranslation(word) || generateWordPuzzle(word);
    case 'word_puzzle':
      return generateWordPuzzle(word);
    case 'read_respond':
      return (await generateReadRespond(word)) || (await generateMeaningChoice(word));
    default:
      return await generateMeaningChoice(word);
  }
}

/**
 * 阶段三：运用阶段
 * 5-8 道句子级题型（translation, sentence_shuffle, read_aloud, dictation, listen_repeat）
 */
export async function generateStage3Questions(
  words: LocalWord[],
  weakWordIds?: string[],
): Promise<GeneratedQuestion[]> {
  // 优先用重点词，不足则随机补充
  const targetWords = weakWordIds && weakWordIds.length > 0
    ? words.filter(w => weakWordIds.includes(w.id))
    : words;

  const pool = shuffleArray(targetWords.length >= 5 ? targetWords : [...targetWords, ...words]).slice(0, 8);
  const sentenceGenerators = [
    generateTranslation,
    generateSentenceShuffle,
    generateReadAloud,
    generateDictation,
    generateListenRepeat,
  ];

  const questions: GeneratedQuestion[] = [];
  for (const w of pool) {
    if (questions.length >= 8) break;
    const gen = sentenceGenerators[Math.floor(Math.random() * sentenceGenerators.length)];
    const q = gen(w);
    if (q) questions.push(q);
  }

  // 至少保证 5 道题
  if (questions.length < 5) {
    for (const w of pool) {
      if (questions.length >= 5) break;
      const q = generateSentenceShuffle(w) || generateTranslation(w);
      if (q) questions.push(q);
    }
  }

  return questions;
}

/**
 * 强化复习：混合单词级题型
 */
export async function generateReviewQuestions(
  words: LocalWord[],
): Promise<GeneratedQuestion[]> {
  const questions: GeneratedQuestion[] = [];
  const shuffled = shuffleArray(words).slice(0, 20);

  // 如果 >= 5 词，先来一道配对题
  if (shuffled.length >= 5) {
    questions.push(generateMatchingPairs(shuffled));
  }

  for (const w of shuffled) {
    if (questions.length >= 30) break;
    const roll = Math.random();

    if (roll < 0.3) {
      questions.push(await generateMeaningChoice(w));
    } else if (roll < 0.5) {
      questions.push(await generateListenChoice(w, shuffled));
    } else if (roll < 0.65) {
      const q = await generateFillBlank(w);
      if (q) questions.push(q);
      else questions.push(generateWordPuzzle(w));
    } else if (roll < 0.8) {
      questions.push(generateWordPuzzle(w));
    } else {
      const q = await generateReadRespond(w);
      if (q) questions.push(q);
      else questions.push(await generateMeaningChoice(w));
    }
  }

  return questions;
}

// 维度→题型映射
const DIMENSION_TYPES: Record<PracticeDimension, string[]> = {
  spelling: ['fill_blank', 'complete_translation', 'word_puzzle'],
  meaning: ['meaning_choice', 'matching_pairs', 'read_respond'],
  listening: ['listen_choice', 'dictation'],
  pronunciation: ['perfect_pronunciation'],
};

/**
 * 巩固练习：按维度组题
 */
export async function generatePracticeQuestions(
  words: LocalWord[],
  dimensions: PracticeDimension[],
): Promise<GeneratedQuestion[]> {
  const questions: GeneratedQuestion[] = [];
  const shuffled = shuffleArray(words);

  // 收集所有可用题型
  const allTypes = new Set<string>();
  for (const dim of dimensions) {
    for (const t of DIMENSION_TYPES[dim]) {
      allTypes.add(t);
    }
  }

  // 如果有 matching_pairs 且 >= 5 词
  if (allTypes.has('matching_pairs') && shuffled.length >= 5) {
    questions.push(generateMatchingPairs(shuffled));
  }

  const typesArray = [...allTypes].filter(t => t !== 'matching_pairs');

  for (const w of shuffled) {
    if (questions.length >= 20) break;
    const type = typesArray[Math.floor(Math.random() * typesArray.length)];
    const q = await generateSingleByType(type, w, shuffled);
    if (q) questions.push(q);
  }

  return questions;
}

/**
 * 复习出题：每词 3 道题，按轮次交叉排列
 *
 * 第1轮：所有词 meaning_choice（看词选义）
 * 第2轮：所有词 listen_choice（听音辨词）
 * 第3轮：所有词随机 fill_blank / word_puzzle / dictation
 *
 * 每轮内随机打乱顺序，最终拼接返回。
 */
export async function generateReviewSessionQuestions(
  words: LocalWord[],
): Promise<GeneratedQuestion[]> {
  // 第1轮：meaning_choice
  const round1: GeneratedQuestion[] = [];
  for (const w of words) {
    const q = await generateMeaningChoice(w);
    round1.push(q);
  }

  // 第2轮：listen_choice
  const round2: GeneratedQuestion[] = [];
  for (const w of words) {
    const q = await generateListenChoice(w, words);
    round2.push(q);
  }

  // 第3轮：fill_blank / word_puzzle / dictation（随机选一种）
  const round3Types = ['fill_blank', 'word_puzzle', 'dictation'] as const;
  const round3: GeneratedQuestion[] = [];
  for (const w of words) {
    // 随机选题型
    const shuffledTypes = shuffleArray([...round3Types]);
    let q: GeneratedQuestion | null = null;

    for (const type of shuffledTypes) {
      if (type === 'fill_blank') {
        q = await generateFillBlank(w);
      } else if (type === 'word_puzzle') {
        q = generateWordPuzzle(w);
      } else {
        q = generateDictation(w);
      }
      if (q) break;
    }

    // 最终降级：word_puzzle 总是能生成
    if (!q) q = generateWordPuzzle(w);
    round3.push(q);
  }

  return [...shuffleArray(round1), ...shuffleArray(round2), ...shuffleArray(round3)];
}

/** 根据题型名生成单题 */
async function generateSingleByType(
  type: string,
  word: LocalWord,
  allWords: LocalWord[],
): Promise<GeneratedQuestion | null> {
  switch (type) {
    case 'meaning_choice':
      return generateMeaningChoice(word);
    case 'listen_choice':
      return generateListenChoice(word, allWords);
    case 'fill_blank':
      return generateFillBlank(word);
    case 'complete_translation':
      return generateCompleteTranslation(word);
    case 'word_puzzle':
      return generateWordPuzzle(word);
    case 'read_respond':
      return generateReadRespond(word);
    case 'perfect_pronunciation':
      return generatePerfectPronunciation(word);
    case 'dictation':
      return generateDictation(word);
    default:
      return null;
  }
}
