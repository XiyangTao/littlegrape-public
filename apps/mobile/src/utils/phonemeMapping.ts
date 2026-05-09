/**
 * ARPABET 到 IPA 音标映射
 * Azure Speech SDK 返回的是 ARPABET 格式，需要转换为 IPA 显示
 */

// ARPABET -> IPA 映射表
const ARPABET_TO_IPA: Record<string, string> = {
  // 元音 (Vowels)
  'aa': 'ɑː',   // father
  'ae': 'æ',    // cat
  'ah': 'ʌ',    // cut
  'ao': 'ɔː',   // call
  'aw': 'aʊ',   // how
  'ax': 'ə',    // about (schwa)
  'axr': 'ɚ',   // butter (r-colored schwa)
  'ay': 'aɪ',   // my
  'eh': 'e',    // bed
  'er': 'ɜː',   // bird
  'ey': 'eɪ',   // say
  'ih': 'ɪ',    // big
  'ix': 'ɨ',    // roses (reduced ih)
  'iy': 'iː',   // see
  'ow': 'əʊ',   // go
  'oy': 'ɔɪ',   // boy
  'uh': 'ʊ',    // book
  'uw': 'uː',   // food
  'ux': 'ʉ',    // dude (fronted uw)

  // 辅音 (Consonants)
  'b': 'b',
  'ch': 'tʃ',   // church
  'd': 'd',
  'dh': 'ð',    // this
  'dx': 'ɾ',    // butter (flap)
  'el': 'l̩',    // bottle (syllabic l)
  'em': 'm̩',    // rhythm (syllabic m)
  'en': 'n̩',    // button (syllabic n)
  'f': 'f',
  'g': 'ɡ',
  'hh': 'h',    // hat
  'h': 'h',
  'jh': 'dʒ',   // judge
  'k': 'k',
  'l': 'l',
  'm': 'm',
  'n': 'n',
  'ng': 'ŋ',    // sing
  'nx': 'ɾ̃',    // winner (nasal flap)
  'p': 'p',
  'q': 'ʔ',     // glottal stop
  'r': 'r',
  's': 's',
  'sh': 'ʃ',    // she
  't': 't',
  'th': 'θ',    // think
  'v': 'v',
  'w': 'w',
  'wh': 'ʍ',    // which (voiceless w)
  'y': 'j',     // yes
  'z': 'z',
  'zh': 'ʒ',    // measure
};

// IPA -> ARPABET 反向映射（用于匹配目标音素）
const IPA_TO_ARPABET: Record<string, string[]> = {
  'ɑː': ['aa'],
  'æ': ['ae'],
  'ʌ': ['ah'],
  'ɔː': ['ao'],
  'aʊ': ['aw'],
  'ə': ['ax', 'ah'],
  'aɪ': ['ay'],
  'e': ['eh'],
  'ɜː': ['er'],
  'eɪ': ['ey'],
  'ɪ': ['ih', 'ix'],
  'iː': ['iy'],
  'əʊ': ['ow'],
  'ɔɪ': ['oy'],
  'ʊ': ['uh'],
  'uː': ['uw'],
  'ɒ': ['aa', 'ao'],  // British short o
  'ɪə': ['ih', 'er'],
  'eə': ['eh', 'er'],
  'ʊə': ['uh', 'er'],

  'tʃ': ['ch'],
  'ð': ['dh'],
  'dʒ': ['jh'],
  'ŋ': ['ng'],
  'ʃ': ['sh'],
  'θ': ['th'],
  'j': ['y'],
  'ʒ': ['zh'],
  'h': ['hh', 'h'],
  'ɡ': ['g'],
  'b': ['b'],
  'd': ['d'],
  'f': ['f'],
  'k': ['k'],
  'l': ['l'],
  'm': ['m'],
  'n': ['n'],
  'p': ['p'],
  'r': ['r'],
  's': ['s'],
  't': ['t'],
  'v': ['v'],
  'w': ['w'],
  'z': ['z'],
};

/**
 * 将 ARPABET 音标转换为 IPA 音标
 * @param arpabet ARPABET 格式的音标
 * @returns IPA 格式的音标
 */
export function arpabetToIPA(arpabet: string): string {
  if (!arpabet) return arpabet;

  // 转换为小写进行匹配
  const lower = arpabet.toLowerCase().trim();

  // 直接匹配
  if (ARPABET_TO_IPA[lower]) {
    return ARPABET_TO_IPA[lower];
  }

  // 尝试去除数字后缀（ARPABET 有时用数字表示重音）
  const withoutStress = lower.replace(/[0-9]/g, '');
  if (ARPABET_TO_IPA[withoutStress]) {
    return ARPABET_TO_IPA[withoutStress];
  }

  // 无法转换，返回原值
  return arpabet;
}

/**
 * 检查 Azure 返回的音素是否匹配目标 IPA 音素
 * @param azurePhoneme Azure 返回的音素（ARPABET 格式）
 * @param targetIPA 目标音素（IPA 格式）
 * @returns 是否匹配
 */
export function isPhonemeMatch(azurePhoneme: string, targetIPA: string): boolean {
  if (!azurePhoneme || !targetIPA) return false;

  const azureLower = azurePhoneme.toLowerCase().trim().replace(/[0-9]/g, '');
  const targetLower = targetIPA.toLowerCase().trim();

  // 直接匹配
  if (azureLower === targetLower) return true;

  // 转换 Azure 音素为 IPA 后匹配
  const convertedIPA = arpabetToIPA(azureLower);
  if (convertedIPA === targetLower) return true;

  // 检查目标 IPA 对应的 ARPABET 列表
  const possibleArpabets = IPA_TO_ARPABET[targetLower];
  if (possibleArpabets && possibleArpabets.includes(azureLower)) {
    return true;
  }

  return false;
}

/**
 * 批量转换音素数组
 * @param phonemes 音素数组（包含 phoneme 和 accuracyScore）
 * @returns 转换后的音素数组
 */
export function convertPhonemes<T extends { phoneme: string }>(phonemes: T[]): T[] {
  return phonemes.map(p => ({
    ...p,
    phoneme: arpabetToIPA(p.phoneme),
  }));
}

// 多字符 IPA 音素（贪心匹配，长的优先）
const MULTI_CHAR_PHONEMES = [
  'aʊ', 'aɪ', 'eɪ', 'əʊ', 'ɔɪ', 'ɪə', 'eə', 'ʊə',  // 双元音
  'tʃ', 'dʒ',                                             // 塞擦音
  'ɑː', 'iː', 'uː', 'ɜː', 'ɔː',                       // 长元音
];

/**
 * 将 IPA 音标字符串解析为单个音素数组
 * 例如：'/bə\'nɑːnə/' → ['b', 'ə', 'n', 'ɑː', 'n', 'ə']
 */
export function parseIPAToPhonemes(ipa: string): string[] {
  if (!ipa) return [];

  // 去除 /.../ 包裹和重音符号
  let cleaned = ipa.replace(/^\/|\/$/g, '').replace(/[ˈˌ'ʼ]/g, '');

  const phonemes: string[] = [];
  let i = 0;

  while (i < cleaned.length) {
    // 跳过非音素字符（空格、点、连字符等）
    if (/[\s.\-()]/.test(cleaned[i])) {
      i++;
      continue;
    }

    // 贪心匹配：先尝试多字符音素
    let matched = false;
    for (const multi of MULTI_CHAR_PHONEMES) {
      if (cleaned.startsWith(multi, i)) {
        phonemes.push(multi);
        i += multi.length;
        matched = true;
        break;
      }
    }

    if (!matched) {
      // 单字符音素，跳过长度标记 ː（已包含在多字符里）
      const ch = cleaned[i];
      if (ch === 'ː') {
        // 孤立的长度标记，附加到前一个音素
        if (phonemes.length > 0) {
          phonemes[phonemes.length - 1] += 'ː';
        }
      } else {
        phonemes.push(ch);
      }
      i++;
    }
  }

  return phonemes;
}

/**
 * 用解析的 IPA 音素填充 Azure 返回的空音素名称
 * Azure 对 en-GB 等非 en-US 语言返回音素分数但名称为空
 */
export function fillEmptyPhonemes<T extends { phoneme: string }>(
  azurePhonemes: T[],
  wordPhonetic: string,
): T[] {
  // 如果已有名称，直接返回
  if (azurePhonemes.length > 0 && azurePhonemes[0].phoneme) {
    return azurePhonemes;
  }

  const parsed = parseIPAToPhonemes(wordPhonetic);

  return azurePhonemes.map((p, index) => ({
    ...p,
    phoneme: index < parsed.length ? parsed[index] : p.phoneme,
  }));
}
