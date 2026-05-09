import { type Phoneme, type PhonemeWord, type MinimalPair } from '@/data/phonemes';
import { type PhonemeProgressRow } from '@/db/PhonemeProgressDB';
import { type SessionDrill } from './types';

// ============================================================================
// 题目生成
// ============================================================================

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 从最小对数据生成 listen_identify 题目
 */
function makeLIFromPair(
  pair: MinimalPair,
  targetPhoneme: Phoneme,
  confusable: Phoneme,
  playTargetWord: boolean,
  id: string,
): SessionDrill {
  const playWord: PhonemeWord = playTargetWord
    ? { word: pair.word1, phonetic: pair.phonetic1, position: 'middle' }
    : { word: pair.word2, phonetic: pair.phonetic2, position: 'middle' };
  const otherWord = playTargetWord
    ? { word: pair.word2, phonetic: pair.phonetic2 }
    : { word: pair.word1, phonetic: pair.phonetic1 };
  const playPhoneme = playTargetWord ? targetPhoneme.symbol : confusable.symbol;

  const optionA = { word: playWord.word, phonetic: playWord.phonetic, phonemeSymbol: playPhoneme };
  const optionB = {
    word: otherWord.word,
    phonetic: otherWord.phonetic,
    phonemeSymbol: playTargetWord ? confusable.symbol : targetPhoneme.symbol,
  };
  const options = Math.random() < 0.5 ? [optionA, optionB] : [optionB, optionA];

  return {
    id,
    type: 'listen_identify',
    targetPhoneme,
    confusablePhoneme: confusable,
    playWord,
    playPhoneme,
    options,
    correctIndex: options.findIndex(o => o.word === playWord.word),
  };
}

/**
 * 从最小对数据生成 same_different 题目
 * isSame=true: 随机选 word1 或 word2，播放两次
 * isSame=false: 播放 word1 和 word2（顺序随机）
 */
/** 统一音色：Sonia(女) + Ryan(男)，使用应用内 ID */
export function getPhonemeVoice(_type: 'vowel' | 'consonant'): 'sonia' | 'ryan' {
  return 'sonia';
}

/** SD 题型音色：Sonia(女) + Ryan(男)，随机分配先后顺序 */
function pickTwoVoices(): ['sonia', 'ryan'] | ['ryan', 'sonia'] {
  return Math.random() < 0.5 ? ['sonia', 'ryan'] : ['ryan', 'sonia'];
}

function makeSDFromPair(
  pair: MinimalPair,
  targetPhoneme: Phoneme,
  confusable: Phoneme,
  isSame: boolean,
  id: string,
): SessionDrill {
  const [voice1, voice2] = pickTwoVoices();

  if (isSame) {
    // 始终使用包含目标音素的 word1
    const word: PhonemeWord = { word: pair.word1, phonetic: pair.phonetic1, position: 'middle' };
    return {
      id,
      type: 'same_different',
      targetPhoneme,
      confusablePhoneme: confusable,
      word1: word,
      word2: word,
      isSame: true,
      contrastInfo: { phoneme1: targetPhoneme.symbol, phoneme2: confusable.symbol },
      voice1,
      voice2,
    };
  }
  // 不同：播放 word1 和 word2，顺序随机
  const w1: PhonemeWord = { word: pair.word1, phonetic: pair.phonetic1, position: 'middle' };
  const w2: PhonemeWord = { word: pair.word2, phonetic: pair.phonetic2, position: 'middle' };
  const swap = Math.random() < 0.5;
  return {
    id,
    type: 'same_different',
    targetPhoneme,
    confusablePhoneme: confusable,
    word1: swap ? w2 : w1,
    word2: swap ? w1 : w2,
    isSame: false,
    contrastInfo: { phoneme1: targetPhoneme.symbol, phoneme2: confusable.symbol },
    voice1,
    voice2,
  };
}

/**
 * 根据 masteryLevel 获取听辨/跟读题目数量比例
 */
type MasteryLevel = PhonemeProgressRow['masteryLevel'];

function getDrillCounts(masteryLevel: MasteryLevel): { sdCount: number; liCount: number; speakCount: number } {
  switch (masteryLevel) {
    case 'advanced':
    case 'mastered':
      return { sdCount: 2, liCount: 2, speakCount: 6 };
    case 'intermediate':
      return { sdCount: 2, liCount: 3, speakCount: 5 };
    default: // none / beginner
      return { sdCount: 3, liCount: 3, speakCount: 4 };
  }
}

/**
 * 生成混合 Session 题目（自适应比例）
 * - 有混淆音素：根据 masteryLevel 调整听辨/跟读比例，总 10 题
 * - 无混淆音素：纯跟读 10 题
 * 顺序：听辨 → 最小对 → 跟读（由感知到产出递进）
 *
 * 使用 minimalPairs 数据生成听辨题和最小对题，
 * 确保两个选项为最小对（如 sit vs seat），用户必须听清音素差异才能分辨。
 *
 * 有混淆音素但缺少 minimalPairs 数据时返回 null（数据未同步），由 UI 层展示提示。
 */
export function generateSessionDrills(
  targetPhoneme: Phoneme,
  getPhonemeBySymbolFn: (symbol: string) => Phoneme | undefined,
  masteryLevel: MasteryLevel = 'none',
): {
  drills: SessionDrill[];
  confusablePhoneme: Phoneme | null;
} | null {
  // 汇集所有混淆音素的最小对，每个对子关联其对应的混淆音素
  const allPairsWithConfusable: { pair: MinimalPair; confusable: Phoneme }[] = [];
  let primaryConfusable: Phoneme | null = null;

  for (const confusableSymbol of (targetPhoneme.confusableWith ?? [])) {
    const confusable = getPhonemeBySymbolFn(confusableSymbol);
    if (!confusable) continue;
    const pairs = targetPhoneme.minimalPairs?.[confusableSymbol] ?? [];
    if (pairs.length > 0 && !primaryConfusable) {
      primaryConfusable = confusable;
    }
    for (const pair of pairs) {
      allPairsWithConfusable.push({ pair, confusable });
    }
  }

  // 无混淆音素 → 纯跟读 10 题
  if (!targetPhoneme.confusableWith?.length) {
    const words = targetPhoneme.words.length >= 10
      ? shuffleArray(targetPhoneme.words).slice(0, 10)
      : [...shuffleArray(targetPhoneme.words), ...shuffleArray(targetPhoneme.words), ...shuffleArray(targetPhoneme.words)].slice(0, 10);
    return {
      drills: words.map((w, i) => ({
        id: `speak_${i}`,
        type: 'speak' as const,
        targetPhoneme,
        confusablePhoneme: null,
        word: w,
      })),
      confusablePhoneme: null,
    };
  }

  // 有混淆音素但缺少最小对数据 → 数据未同步，返回 null
  if (allPairsWithConfusable.length === 0) {
    return null;
  }

  const shuffledPairs = shuffleArray(allPairsWithConfusable);

  const { sdCount, liCount, speakCount } = getDrillCounts(masteryLevel);
  const drills: SessionDrill[] = [];
  let pairCursor = 0;

  // same_different 题（顺序最前：感知→产出递进）
  for (let i = 0; i < sdCount; i++) {
    const { pair, confusable } = shuffledPairs[pairCursor % shuffledPairs.length];
    pairCursor++;
    // 交替 same / different 保证均衡
    const isSame = i % 2 === 0;
    drills.push(makeSDFromPair(pair, targetPhoneme, confusable, isSame, `sd_${i}`));
  }

  // listen_identify 题
  for (let i = 0; i < liCount; i++) {
    const { pair, confusable } = shuffledPairs[pairCursor % shuffledPairs.length];
    pairCursor++;
    const playTarget = i === 0 ? true : i === 1 ? false : Math.random() < 0.5;
    drills.push(makeLIFromPair(pair, targetPhoneme, confusable, playTarget, `li_${i}`));
  }

  // speak 题
  const speakWords = shuffleArray(targetPhoneme.words).slice(0, speakCount);
  speakWords.forEach((w, i) => {
    drills.push({
      id: `speak_${i}`,
      type: 'speak',
      targetPhoneme,
      confusablePhoneme: primaryConfusable,
      word: w,
    });
  });

  return { drills, confusablePhoneme: primaryConfusable };
}
