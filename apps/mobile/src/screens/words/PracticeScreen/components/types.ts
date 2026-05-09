/**
 * 复习题型组件通用 Props
 */

import type { Theme } from '@/context/ThemeProvider';

export interface PracticeViewProps {
  question: any;
  isAnswered: boolean;
  /** 本题是否答对（由 session 提供，回看时可靠） */
  isCorrect: boolean;
  onAnswer: (correct: boolean) => void;
  styles: any;
  theme: Theme;
  submitRef?: React.MutableRefObject<(() => void) | null>;
  onSubmitReady?: (ready: boolean) => void;
}
