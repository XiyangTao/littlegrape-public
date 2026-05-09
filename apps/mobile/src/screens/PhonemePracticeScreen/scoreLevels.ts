import { Theme } from '@/context/ThemeProvider';

type TFunc = (key: string, options?: any) => string;

export function getScoreLevel(
  score: number,
  t: TFunc,
): { label: string; emoji: string; color: (theme: Theme) => string } {
  if (score >= 90) return { label: t('phonemePractice.feedback.perfect'), emoji: '✨', color: (th) => th.colors.success };
  if (score >= 75) return { label: t('phonemePractice.feedback.great'), emoji: '👍', color: (th) => th.colors.primary };
  if (score >= 60) return { label: t('phonemePractice.feedback.good'), emoji: '💪', color: (th) => th.colors.info };
  return { label: t('phonemePractice.feedback.keepGoing'), emoji: '🎯', color: (th) => th.colors.warning };
}

export function getTargetFeedbackText(
  phonemeSymbol: string,
  score: number,
  mouthTip: string,
  t: TFunc,
): string {
  if (score >= 90) return t('phonemePractice.feedback.targetStandard', { phoneme: phonemeSymbol });
  if (score >= 75) return t('phonemePractice.feedback.targetClose', { phoneme: phonemeSymbol });
  if (score >= 60) return t('phonemePractice.feedback.targetPractice', { phoneme: phonemeSymbol });
  return t('phonemePractice.feedback.targetTry', { phoneme: phonemeSymbol, tip: mouthTip });
}
