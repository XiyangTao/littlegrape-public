import { type Phoneme, type PhonemeWord } from '@/data/phonemes';

// ============================================================================
// 类型定义
// ============================================================================

export type RootStackParamList = {
  PhonemePractice: {
    phonemeSymbol?: string;
    categoryId?: string;
  };
};

export type PageMode = 'intro' | 'session' | 'summary';

export interface IntroState {
  targetPhoneme: Phoneme;
  confusablePhoneme: Phoneme | null;
}

// ---------- 题型 ----------

export type DrillType = 'listen_identify' | 'same_different' | 'speak';

export interface ListenIdentifyDrill {
  type: 'listen_identify';
  /** TTS 播放的词 */
  playWord: PhonemeWord;
  /** 该词所属音素符号 */
  playPhoneme: string;
  /** 2 个选项 */
  options: { word: string; phonetic: string; phonemeSymbol: string }[];
  /** 正确选项的索引 */
  correctIndex: number;
}

export interface SameDifferentDrill {
  type: 'same_different';
  /** 第一个播放的词 */
  word1: PhonemeWord;
  /** 第二个播放的词（same 时与 word1 相同） */
  word2: PhonemeWord;
  /** 正确答案 */
  isSame: boolean;
  /** 对比音素信息，用于 feedback 展示 */
  contrastInfo: {
    phoneme1: string;
    phoneme2: string;
  };
  /** 词1 的音色 */
  voice1: 'sonia' | 'ryan';
  /** 词2 的音色（与 voice1 不同） */
  voice2: 'sonia' | 'ryan';
}

export interface SpeakDrill {
  type: 'speak';
  word: PhonemeWord;
}

export type SessionDrill = {
  id: string;
  targetPhoneme: Phoneme;
  confusablePhoneme: Phoneme | null;
} & (ListenIdentifyDrill | SameDifferentDrill | SpeakDrill);

// ---------- 结果 ----------

export interface ListenDrillResult {
  drillType: 'listen_identify' | 'same_different';
  correct: boolean;
}

export interface SpeakDrillResult {
  drillType: 'speak';
  word: PhonemeWord;
  accuracyScore: number;
  targetPhonemeScore: number | null;
  allPhonemes: { phoneme: string; accuracyScore: number }[];
  recordingUri: string | null;
}

export type DrillResult = ListenDrillResult | SpeakDrillResult;

// ---------- Session ----------

export interface SessionState {
  targetPhoneme: Phoneme;
  confusablePhoneme: Phoneme | null;
  drills: SessionDrill[];
  currentIndex: number;
  results: DrillResult[];
}

// ---------- 步骤 ----------

export type ListenStep = 'playing' | 'choosing' | 'feedback';
export type SameDifferentStep = 'playing_first' | 'playing_second' | 'choosing' | 'feedback';
export type SpeakStep = 'listen' | 'record' | 'assessing' | 'feedback';
export type DrillStep = ListenStep | SameDifferentStep | SpeakStep;
