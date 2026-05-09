/**
 * 发音跟读评分 — 参考文本与 Azure 识别结果对齐
 *
 * 业界 ASR 评估标准做法：Levenshtein DP 全局对齐（WER 计算同款算法）。
 *
 * 对比：
 * - 贪心字面匹配：一旦前面错位，后面所有词全错
 * - 按位置对齐：Azure 漏返回 Omission 占位时全错位
 * - Levenshtein DP：全局最优，自愈错位
 */
import type { WordAssessmentResult } from '@/hooks/usePronunciationAssessment';
import type { Theme } from '@/context/ThemeProvider';

/**
 * 跟读评分的配色 — 所有跟读场景统一：
 * - ≥ 85：绿（success）
 * - ≥ 60：黄（warning）
 * - < 60：红（error）
 */
export function getWordScoreColor(score: number, theme: Theme): string {
  if (score >= 85) return theme.colors.success;
  if (score >= 60) return theme.colors.warning;
  return theme.colors.error;
}

export interface AlignedWord {
  /** 原句里的单词（保留大小写） */
  word: string;
  /** 该词准确度分数（0-100），Omission 为 0 */
  accuracyScore: number;
  /** 错误类型 */
  errorType: WordAssessmentResult['errorType'];
}

const WORD_RE = /[\w']+/g;

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z']/g, '');
}

/**
 * 把 Azure 评估结果与参考句子按词对齐。
 *
 * 算法：
 *   1. 参考句按 /[\w']+/g 拆词，过滤 Azure 返回的 Insertion 词。
 *   2. 若过滤后词数 === 参考词数 → 按位置对齐（快路径）。
 *   3. 否则 Levenshtein DP 计算最小编辑距离 + backtrace，得到每个参考词对应的 spoken 索引。
 *   4. 未对齐的参考词标为 Omission（accuracyScore=0）。
 *
 * 复杂度 O(n·m)；50 词句 < 2ms。
 */
export function alignSpokenToReference(
  referenceSentence: string,
  azureWords: WordAssessmentResult[],
): AlignedWord[] {
  const originalWords = referenceSentence.match(WORD_RE) || [];
  const spokenWords = azureWords.filter((w) => w.errorType !== 'Insertion');

  // 快路径：数量相等 → 按位置对齐（信任 Azure 已做过对齐）
  if (spokenWords.length === originalWords.length) {
    return originalWords.map((origWord, i) => {
      const m = spokenWords[i];
      return {
        word: origWord,
        accuracyScore: m.accuracyScore,
        errorType: m.errorType || 'None',
      };
    });
  }

  // DP 对齐
  const n = originalWords.length;
  const m = spokenWords.length;
  const origNorm = originalWords.map(normalize);
  const spokeNorm = spokenWords.map((w) => normalize(w.word));

  type Op = 'match' | 'sub' | 'del' | 'ins' | null;
  const D: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  const op: Op[][] = Array.from({ length: n + 1 }, () => new Array<Op>(m + 1).fill(null));

  for (let i = 0; i <= n; i++) { D[i][0] = i; if (i > 0) op[i][0] = 'del'; }
  for (let j = 0; j <= m; j++) { D[0][j] = j; if (j > 0) op[0][j] = 'ins'; }

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = origNorm[i - 1] === spokeNorm[j - 1] ? 0 : 1;
      const diag = D[i - 1][j - 1] + cost;
      const del = D[i - 1][j] + 1; // 参考词无对应 → Omission
      const ins = D[i][j - 1] + 1; // spoken 多出 → 多读（已过滤，理论不会触达但保留）
      if (diag <= del && diag <= ins) {
        D[i][j] = diag;
        op[i][j] = cost === 0 ? 'match' : 'sub';
      } else if (del <= ins) {
        D[i][j] = del;
        op[i][j] = 'del';
      } else {
        D[i][j] = ins;
        op[i][j] = 'ins';
      }
    }
  }

  // Backtrace：记录每个原词对齐到的 spoken 索引
  const origToSpoken: (number | null)[] = new Array(n).fill(null);
  let i = n, j = m;
  while (i > 0 || j > 0) {
    const cur = op[i][j];
    if (cur === 'match' || cur === 'sub') {
      origToSpoken[i - 1] = j - 1;
      i--; j--;
    } else if (cur === 'del') {
      i--;
    } else if (cur === 'ins') {
      j--;
    } else {
      break; // 防御（正常不触达）
    }
  }

  return originalWords.map((origWord, idx) => {
    const spokenIdx = origToSpoken[idx];
    if (spokenIdx == null) {
      return { word: origWord, accuracyScore: 0, errorType: 'Omission' as const };
    }
    const matched = spokenWords[spokenIdx];
    return {
      word: origWord,
      accuracyScore: matched.accuracyScore,
      errorType: matched.errorType || 'None',
    };
  });
}
