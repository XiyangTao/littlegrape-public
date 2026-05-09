import { Client } from '../client';
import { ENDPOINTS } from '../endpoints';

// ===== 题型枚举 =====
export type ExerciseType =
  | 'translation'
  | 'sentence_shuffle'
  | 'dictation'
  | 'listen_choice'
  | 'read_aloud'
  | 'matching_pairs'
  | 'fill_blank'
  | 'meaning_choice'
  | 'complete_translation'
  | 'read_respond'
  // Batch 1
  | 'arrange_words'
  | 'listen_repeat'
  | 'speak_translation'
  | 'listen_fill'
  | 'minimal_pairs'
  | 'flashcard'
  // Batch 2
  | 'dialogue_speaking'
  | 'immersive_fill'
  | 'immersive_dialogue'
  | 'immersive_reading'
  | 'timed_match'
  | 'mistake_review'
  | 'perfect_pronunciation'
  // Batch 3
  | 'story'
  | 'adventure'
  | 'duo_radio';

// ===== 各题型数据结构 =====

export interface TranslationQuestion {
  type: 'translation';
  id: string;
  sentenceCn: string;
  answer: string;
  acceptableAnswers?: string[];
  words?: string[];
}

export interface SentenceShuffleQuestion {
  type: 'sentence_shuffle';
  id: string;
  sentenceCn: string;
  correctWords: string[];
  shuffledWords: string[];
}

export interface DictationQuestion {
  type: 'dictation';
  id: string;
  sentence: string;
  sentenceCn: string;
  words?: string[];
}

export interface ListenChoiceQuestion {
  type: 'listen_choice';
  id: string;
  audio: string;
  options: string[];
  answer: string;
}

export interface ReadAloudQuestion {
  type: 'read_aloud';
  id: string;
  sentence: string;
  sentenceCn: string;
}

export interface MatchingPairsQuestion {
  type: 'matching_pairs';
  id: string;
  pairs: Array<{
    id: string;
    english: string;
    chinese: string;
  }>;
}

export interface FillBlankQuestion {
  type: 'fill_blank';
  id: string;
  sentence: string;
  options: string[];
  answer: string;
  explanation: string;
}

export interface MeaningChoiceQuestion {
  type: 'meaning_choice';
  id: string;
  sentence: string;
  options: string[];
  answer: string;
}

export interface CompleteTranslationQuestion {
  type: 'complete_translation';
  id: string;
  sentenceCn: string;
  sentenceEn: string;
  answer: string;
  hint?: string;
}

export interface ReadRespondQuestion {
  type: 'read_respond';
  id: string;
  sentence: string;
  highlightWord: string;
  options: string[];
  answer: string;
}

// ===== Batch 1 新增题型 =====

export interface ArrangeWordsQuestion {
  type: 'arrange_words';
  id: string;
  hint: string;
  correctWords: string[];
  shuffledWords: string[];
}

export interface ListenRepeatQuestion {
  type: 'listen_repeat';
  id: string;
  sentence: string;
  sentenceCn: string;
}

export interface SpeakTranslationQuestion {
  type: 'speak_translation';
  id: string;
  sentenceCn: string;
  expectedEnglish: string;
  acceptableAnswers?: string[];
}

export interface ListenFillQuestion {
  type: 'listen_fill';
  id: string;
  sentence: string;
  sentenceCn: string;
  blankSentence: string;
  options: string[];
  answer: string;
}

export interface MinimalPairsQuestion {
  type: 'minimal_pairs';
  id: string;
  targetWord: string;
  pairWord: string;
  options: [string, string];
}

export interface FlashcardQuestion {
  type: 'flashcard';
  id: string;
  word: string;
  phonetic: string;
  meaningCn: string;
  exampleSentence: string;
  exampleSentenceCn: string;
}

// ===== Batch 2 新增题型 =====

export interface DialogueSpeakingQuestion {
  type: 'dialogue_speaking';
  id: string;
  title: string;
  lines: Array<{
    speaker: 'ai' | 'user';
    text: string;
    textCn: string;
  }>;
}

export interface ImmersiveFillQuestion {
  type: 'immersive_fill';
  id: string;
  passage: string;
  blankSentence: string;
  options: string[];
  answer: string;
  explanation: string;
}

export interface ImmersiveDialogueQuestion {
  type: 'immersive_dialogue';
  id: string;
  context: string;
  dialogue: Array<{
    speaker: string;
    text: string;
  }>;
  blankLineIndex: number;
  options: string[];
  answer: string;
}

export interface ImmersiveReadingQuestion {
  type: 'immersive_reading';
  id: string;
  passage: string;
  questionText: string;
  options: string[];
  answer: string;
  explanation: string;
}

export interface TimedMatchQuestion {
  type: 'timed_match';
  id: string;
  rounds: Array<{
    pairs: Array<{ id: string; english: string; chinese: string }>;
  }>;
}

export interface PerfectPronunciationQuestion {
  type: 'perfect_pronunciation';
  id: string;
  targetWord: string;
  phonetic: string;
  weakPhonemes: string[];
  exampleSentence: string;
  tips: string;
}

// ===== Batch 3 新增题型 =====

export interface StoryDialogueElement {
  elementType: 'dialogue';
  speaker: string;
  text: string;
  textCn?: string;
}

export interface StoryExerciseElement {
  elementType: 'exercise';
  exerciseType: 'true_false' | 'fill_blank' | 'comprehension' | 'meaning';
  question: string;
  options?: string[];
  answer: string | boolean;
  explanation?: string;
}

export interface StoryQuestion {
  type: 'story';
  id: string;
  title: string;
  storyElements: Array<StoryDialogueElement | StoryExerciseElement>;
}

export interface AdventureQuestion {
  type: 'adventure';
  id: string;
  scenarioTitle: string;
  scenarioDescription: string;
  character: string;
  objectives: string[];
  openingLine: string;
}

export interface DuoRadioQuestion {
  type: 'duo_radio';
  id: string;
  title: string;
  transcript: string;
  transcriptCn: string;
  comprehensionQuestions: Array<{
    question: string;
    options: string[];
    answer: string;
  }>;
}

export type ExerciseQuestion =
  | TranslationQuestion
  | SentenceShuffleQuestion
  | DictationQuestion
  | ListenChoiceQuestion
  | ReadAloudQuestion
  | MatchingPairsQuestion
  | FillBlankQuestion
  | MeaningChoiceQuestion
  | CompleteTranslationQuestion
  | ReadRespondQuestion
  // Batch 1
  | ArrangeWordsQuestion
  | ListenRepeatQuestion
  | SpeakTranslationQuestion
  | ListenFillQuestion
  | MinimalPairsQuestion
  | FlashcardQuestion
  // Batch 2
  | DialogueSpeakingQuestion
  | ImmersiveFillQuestion
  | ImmersiveDialogueQuestion
  | ImmersiveReadingQuestion
  | TimedMatchQuestion
  | PerfectPronunciationQuestion
  // Batch 3
  | StoryQuestion
  | AdventureQuestion
  | DuoRadioQuestion;

// ===== Client 扩展 =====

declare module '../client' {
  interface Client {
    generateExercise(request: {
      exerciseType: ExerciseType;
      topic?: string;
      difficulty?: 'easy' | 'medium' | 'hard';
      count?: number;
    }): Promise<{
      success: boolean;
      data: { questions: ExerciseQuestion[] };
    }>;
  }
}

Client.prototype.generateExercise = async function (request) {
  return this.api.post(ENDPOINTS.EXERCISE_GENERATE, request);
};

declare module '../client' {
  interface Client {
    explainExercise(request: {
      question: ExerciseQuestion;
      isCorrect: boolean;
    }): Promise<{
      success: boolean;
      data: { explanation: string };
    }>;
  }
}

Client.prototype.explainExercise = async function (request) {
  return this.api.post(ENDPOINTS.EXERCISE_EXPLAIN, request);
};
