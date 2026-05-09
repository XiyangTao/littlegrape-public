/**
 * 单词学习状态相关工具函数
 */

import { Theme } from '@/context/ThemeProvider';
import i18n from '@/locales';

export type WordStatus = 'new' | 'learned' | 'mastered';

/**
 * 获取学习状态对应的颜色
 */
export function getStatusColor(status: WordStatus | string | undefined, theme: Theme): string {
  switch (status) {
    case 'learned':
      return theme.colors.warning;
    case 'mastered':
      return theme.colors.success;
    default:
      return theme.colors.text.disabled;
  }
}

/**
 * 获取学习状态对应的文本
 */
export function getStatusText(status: WordStatus | string | undefined): string {
  switch (status) {
    case 'learned':
      return i18n.t('wordStatus.learning');
    case 'mastered':
      return i18n.t('wordStatus.mastered');
    default:
      return i18n.t('wordStatus.notLearned');
  }
}

/**
 * 获取发音评分对应的颜色
 */
export function getScoreColor(score: number, theme: Theme): string {
  if (score >= 85) return theme.colors.pronunciation.excellent;
  if (score >= 60) return theme.colors.pronunciation.good;
  return theme.colors.pronunciation.poor;
}

/**
 * 获取发音评分对应的标签
 */
export function getScoreLabel(score: number): string {
  if (score >= 85) return i18n.t('wordStatus.scoreExcellent');
  if (score >= 60) return i18n.t('wordStatus.scoreGood');
  return i18n.t('wordStatus.scoreNeedsWork');
}
