/**
 * 单词拆分工具
 * 将单词拆分成长度一致的部分，用于拼写练习
 */

// 常见的英文短单词（不能作为片段出现）
const COMMON_WORDS = new Set([
  // 1字母
  'a', 'i',
  // 2字母
  'am', 'an', 'as', 'at', 'be', 'by', 'do', 'go', 'he', 'if', 'in', 'is', 'it',
  'me', 'my', 'no', 'of', 'on', 'or', 'so', 'to', 'up', 'us', 'we',
  // 3字母
  'ace', 'act', 'add', 'age', 'ago', 'aid', 'aim', 'air', 'all', 'and', 'ant',
  'any', 'ape', 'arc', 'are', 'ark', 'arm', 'art', 'ask', 'ate', 'bad', 'bag',
  'ban', 'bar', 'bat', 'bay', 'bed', 'bee', 'bet', 'bid', 'big', 'bin', 'bit',
  'bow', 'box', 'boy', 'bud', 'bug', 'bus', 'but', 'buy', 'cab', 'can', 'cap',
  'car', 'cat', 'cop', 'cow', 'cry', 'cub', 'cup', 'cut', 'dad', 'dam', 'day',
  'den', 'dew', 'did', 'die', 'dig', 'dim', 'dip', 'dog', 'dot', 'dry', 'dub',
  'due', 'dug', 'dye', 'ear', 'eat', 'egg', 'ego', 'elf', 'elk', 'elm', 'end',
  'era', 'eve', 'eye', 'fan', 'far', 'fat', 'fax', 'fed', 'fee', 'few', 'fig',
  'fin', 'fir', 'fit', 'fix', 'fly', 'foe', 'fog', 'for', 'fox', 'fry', 'fun',
  'fur', 'gap', 'gas', 'gay', 'gel', 'gem', 'get', 'gin', 'god', 'got', 'gum',
  'gun', 'gut', 'guy', 'gym', 'had', 'ham', 'has', 'hat', 'hay', 'hen', 'her',
  'hid', 'him', 'hip', 'his', 'hit', 'hog', 'hop', 'hot', 'how', 'hub', 'hue',
  'hug', 'hut', 'ice', 'icy', 'ill', 'imp', 'ink', 'inn', 'ion', 'its', 'ivy',
  'jam', 'jar', 'jaw', 'jay', 'jet', 'jig', 'job', 'jog', 'joy', 'jug', 'key',
  'kid', 'kin', 'kit', 'lab', 'lad', 'lag', 'lap', 'law', 'lay', 'led', 'leg',
  'let', 'lid', 'lie', 'lip', 'lit', 'log', 'lot', 'low', 'mad', 'man', 'map',
  'mat', 'max', 'may', 'men', 'met', 'mid', 'mix', 'mob', 'mom', 'mop', 'mud',
  'mug', 'nap', 'net', 'new', 'nil', 'nod', 'nor', 'not', 'now', 'nut', 'oak',
  'oar', 'oat', 'odd', 'off', 'oil', 'old', 'one', 'opt', 'orb', 'ore', 'our',
  'out', 'owe', 'owl', 'own', 'pad', 'pal', 'pan', 'pat', 'paw', 'pay', 'pea',
  'peg', 'pen', 'per', 'pet', 'pie', 'pig', 'pin', 'pit', 'ply', 'pod', 'pop',
  'pot', 'pro', 'pub', 'pun', 'pup', 'put', 'rag', 'ram', 'ran', 'rap', 'rat',
  'raw', 'ray', 'red', 'ref', 'rib', 'rid', 'rig', 'rim', 'rip', 'rob', 'rod',
  'rot', 'row', 'rub', 'rug', 'run', 'rut', 'rye', 'sad', 'sap', 'sat', 'saw',
  'say', 'sea', 'set', 'sew', 'she', 'shy', 'sin', 'sip', 'sir', 'sis', 'sit',
  'six', 'ski', 'sky', 'sly', 'sob', 'sod', 'son', 'sop', 'sow', 'soy', 'spa',
  'spy', 'sub', 'sum', 'sun', 'tab', 'tag', 'tan', 'tap', 'tar', 'tax', 'tea',
  'ten', 'the', 'tie', 'tin', 'tip', 'toe', 'ton', 'too', 'top', 'tot', 'tow',
  'toy', 'try', 'tub', 'tug', 'two', 'urn', 'use', 'van', 'vat', 'vet', 'via',
  'vie', 'vow', 'wad', 'war', 'was', 'wax', 'way', 'web', 'wed', 'wet', 'who',
  'why', 'wig', 'win', 'wit', 'woe', 'wok', 'won', 'woo', 'wow', 'yak', 'yam',
  'yap', 'yaw', 'yea', 'yes', 'yet', 'yew', 'you', 'zap', 'zed', 'zip', 'zoo',
]);

/**
 * 检查片段是否是常见单词
 */
function isCommonWord(part: string): boolean {
  return COMMON_WORDS.has(part.toLowerCase());
}

/**
 * 生成所有可能的拆分方案（指定片段数量）
 * @param word 单词
 * @param n 片段数量
 * @returns 所有可能的拆分方案
 */
function generateAllSplits(word: string, n: number): string[][] {
  if (n === 1) {
    return [[word]];
  }

  const results: string[][] = [];
  const len = word.length;

  // 第一个片段至少1个字符，最多 len - (n-1) 个字符（留给后面的片段）
  for (let firstLen = 1; firstLen <= len - (n - 1); firstLen++) {
    const firstPart = word.slice(0, firstLen);
    const remaining = word.slice(firstLen);

    // 递归获取剩余部分的所有拆分方案
    const subSplits = generateAllSplits(remaining, n - 1);

    for (const subSplit of subSplits) {
      results.push([firstPart, ...subSplit]);
    }
  }

  return results;
}

/**
 * 将单词拆分成部分（随机拆分）
 * - 2字母：拆成2个
 * - 3字母：拆成3个
 * - 4字母：拆成3个
 * - 5-6字母：至少3个
 * - 其他：最多5个
 * @param word 要拆分的单词
 */
export function splitWord(word: string): string[] {
  const lowerWord = word.toLowerCase();
  const len = lowerWord.length;

  // 2字母：拆成2个单字母（只有一种方式）
  if (len === 2) {
    return lowerWord.split('');
  }

  // 3字母：拆成3个单字母（只有一种方式）
  if (len === 3) {
    return lowerWord.split('');
  }

  // 4字母：拆成3个片段，随机选择一种拆分方式
  // 可能的拆分：2+1+1, 1+2+1, 1+1+2
  if (len === 4) {
    const allSplits = generateAllSplits(lowerWord, 3);
    return allSplits[Math.floor(Math.random() * allSplits.length)];
  }

  // 5字母：拆成3个片段，随机选择
  // 可能的拆分：3+1+1, 1+3+1, 1+1+3, 2+2+1, 2+1+2, 1+2+2
  if (len === 5) {
    const allSplits = generateAllSplits(lowerWord, 3);
    return allSplits[Math.floor(Math.random() * allSplits.length)];
  }

  // 6字母：拆成3个片段，随机选择
  if (len === 6) {
    const allSplits = generateAllSplits(lowerWord, 3);
    return allSplits[Math.floor(Math.random() * allSplits.length)];
  }

  // 7字母及以上：最多5个片段，随机选择
  const targetParts = Math.min(5, Math.ceil(len / 2));
  const allSplits = generateAllSplits(lowerWord, targetParts);
  return allSplits[Math.floor(Math.random() * allSplits.length)];
}

/**
 * 生成干扰项（长度与正确选项一致）
 * @param correctParts 正确的单词部分
 * @param count 干扰项数量
 */
export function generateDistractors(correctParts: string[], count: number): string[] {
  const distractors: string[] = [];
  const usedDistractors = new Set(correctParts.map(p => p.toLowerCase()));

  // 判断目标长度（根据正确选项的平均长度）
  const avgLength = Math.round(correctParts.reduce((sum, p) => sum + p.length, 0) / correctParts.length);
  const targetLength = avgLength === 1 ? 1 : 2;

  if (targetLength === 1) {
    // 单字母干扰项
    const allLetters = 'abcdefghijklmnopqrstuvwxyz'.split('');
    const shuffledLetters = shuffleArray(allLetters);

    for (const letter of shuffledLetters) {
      if (distractors.length >= count) break;
      if (!usedDistractors.has(letter)) {
        distractors.push(letter);
        usedDistractors.add(letter);
      }
    }
  } else {
    // 2字母干扰项（排除常见单词）
    const twoLetterCombos = [
      'ab', 'ac', 'ad', 'af', 'ag', 'ak', 'al', 'ap', 'ar', 'av', 'aw', 'ax',
      'ba', 'bl', 'bo', 'br', 'bu', 'ca', 'ce', 'ch', 'ci', 'cl', 'co', 'cr',
      'cu', 'da', 'de', 'di', 'dr', 'du', 'ea', 'eb', 'ec', 'ed', 'ef', 'eg',
      'ek', 'el', 'em', 'en', 'ep', 'er', 'es', 'et', 'ev', 'ew', 'ex', 'ez',
      'fa', 'fe', 'fi', 'fl', 'fo', 'fr', 'fu', 'ga', 'ge', 'gi', 'gl', 'gr',
      'gu', 'ha', 'hi', 'ho', 'hu', 'ib', 'ic', 'id', 'ig', 'ik', 'il', 'im',
      'ip', 'ir', 'iv', 'iz', 'ja', 'je', 'jo', 'ju', 'ka', 'ke', 'ki', 'kn',
      'ko', 'ku', 'la', 'le', 'li', 'lo', 'lu', 'ly', 'ma', 'mi', 'mo', 'mu',
      'na', 'ne', 'ni', 'nu', 'ny', 'ob', 'oc', 'od', 'og', 'ok', 'ol', 'om',
      'op', 'os', 'ot', 'ov', 'ow', 'ox', 'oy', 'oz', 'pa', 'pe', 'ph', 'pi',
      'pl', 'po', 'pr', 'pu', 'qu', 'ra', 'ri', 'ro', 'ru', 'ry', 'sa', 'sc',
      'se', 'sh', 'si', 'sk', 'sl', 'sm', 'sn', 'sp', 'sq', 'st', 'su', 'sw',
      'sy', 'ta', 'te', 'th', 'ti', 'tl', 'tr', 'tu', 'tw', 'ty', 'ub', 'uc',
      'ud', 'uf', 'ug', 'uk', 'ul', 'um', 'un', 'up', 'ur', 'ut', 'uv', 'uw',
      'va', 've', 'vi', 'vo', 'wa', 'wi', 'wo', 'wr', 'wu', 'xa', 'xe', 'xi',
      'ya', 'ye', 'yi', 'yo', 'yu', 'za', 'ze', 'zi', 'zo', 'zu',
    ];

    // 过滤掉常见单词
    const validCombos = twoLetterCombos.filter(c => !isCommonWord(c));

    // 策略1：替换字母生成相似的部分
    for (const part of correctParts) {
      if (distractors.length >= count) break;
      if (part.length < 2) continue;

      const similar = generateSimilarPart(part);
      if (similar && similar.length === 2 && !usedDistractors.has(similar.toLowerCase()) && !isCommonWord(similar)) {
        distractors.push(similar);
        usedDistractors.add(similar.toLowerCase());
      }
    }

    // 策略2：从有效的2字母组合中随机选择
    const shuffledCombos = shuffleArray([...validCombos]);
    for (const combo of shuffledCombos) {
      if (distractors.length >= count) break;

      if (!usedDistractors.has(combo.toLowerCase())) {
        distractors.push(combo);
        usedDistractors.add(combo.toLowerCase());
      }
    }

    // 策略3：如果还不够，生成随机2字母组合
    let attempts = 0;
    while (distractors.length < count && attempts < 100) {
      attempts++;
      const c1 = String.fromCharCode(97 + Math.floor(Math.random() * 26));
      const c2 = String.fromCharCode(97 + Math.floor(Math.random() * 26));
      const randomStr = c1 + c2;
      if (!usedDistractors.has(randomStr) && !isCommonWord(randomStr)) {
        distractors.push(randomStr);
        usedDistractors.add(randomStr);
      }
    }
  }

  return distractors.slice(0, count);
}

/**
 * 生成相似的部分（替换一个字母）
 */
function generateSimilarPart(part: string): string | null {
  if (part.length < 2) return null;

  const similarLetters: Record<string, string[]> = {
    'a': ['e', 'o', 'u'],
    'e': ['a', 'i', 'o'],
    'i': ['e', 'y', 'a'],
    'o': ['a', 'u', 'e'],
    'u': ['o', 'a', 'i'],
    'b': ['d', 'p', 'v'],
    'c': ['k', 's', 'g'],
    'd': ['b', 't', 'g'],
    'f': ['v', 'ph', 'p'],
    'g': ['j', 'c', 'd'],
    'h': ['n', 'k', 'j'],
    'j': ['g', 'y', 'i'],
    'k': ['c', 'g', 'q'],
    'l': ['r', 'i', 'n'],
    'm': ['n', 'w', 'r'],
    'n': ['m', 'r', 'l'],
    'p': ['b', 'q', 'd'],
    'q': ['g', 'p', 'k'],
    'r': ['l', 'n', 'w'],
    's': ['z', 'c', 'x'],
    't': ['d', 'p', 'f'],
    'v': ['w', 'b', 'f'],
    'w': ['v', 'm', 'u'],
    'x': ['z', 's', 'k'],
    'y': ['i', 'j', 'e'],
    'z': ['s', 'x', 'c'],
  };

  // 随机选择一个位置替换
  const pos = Math.floor(Math.random() * part.length);
  const char = part[pos].toLowerCase();
  const replacements = similarLetters[char];

  if (!replacements || replacements.length === 0) return null;

  const replacement = replacements[Math.floor(Math.random() * replacements.length)];
  return part.slice(0, pos) + replacement + part.slice(pos + 1);
}

/**
 * 打乱数组顺序
 */
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * 计算干扰项数量
 * - 干扰项和正确项一样多
 * - 总数至少4个，最多10个
 */
function calculateDistractorCount(partsCount: number): number {
  const minTotal = 4;
  const maxTotal = 10;

  // 干扰项和正确项一样多
  let distractors = partsCount;

  // 确保总数至少4个
  if (partsCount + distractors < minTotal) {
    distractors = minTotal - partsCount;
  }

  // 确保总数不超过10个
  if (partsCount + distractors > maxTotal) {
    distractors = maxTotal - partsCount;
  }

  return distractors;
}

/**
 * 准备拼写练习数据
 * @param word 单词
 */
export function prepareSpellingPuzzle(word: string): {
  correctParts: string[];
  allParts: string[];
  shuffledParts: { id: string; text: string; isDistractor: boolean }[];
} {
  const correctParts = splitWord(word);
  const distractorCount = calculateDistractorCount(correctParts.length);
  const distractors = generateDistractors(correctParts, distractorCount);

  const allParts = [...correctParts, ...distractors];

  // 为每个部分生成唯一ID并标记是否是干扰项
  const shuffledParts = shuffleArray(
    allParts.map((text, index) => ({
      id: `part_${index}_${Date.now()}`,
      text,
      isDistractor: index >= correctParts.length,
    }))
  );

  return {
    correctParts,
    allParts,
    shuffledParts,
  };
}
