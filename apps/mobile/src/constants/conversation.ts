/**
 * 对话设置相关常量
 */

import {
  DifficultyLevel,
  EnglishVariant,
  ConversationStyle,
} from '@/types/conversation';
import { CEFR_LEVEL_COLORS } from './colors';

// 难度等级配置 (文本通过 i18n 获取)
export const DIFFICULTY_LEVELS: Array<{
  value: DifficultyLevel;
  cefr: string;
  vocab: string;
  color: string;
}> = [
  { value: 'starter', cefr: 'A1', vocab: '500-1000', color: CEFR_LEVEL_COLORS.A1 },
  { value: 'elementary', cefr: 'A2', vocab: '2k-3k', color: CEFR_LEVEL_COLORS.A2 },
  { value: 'cet4', cefr: 'B1', vocab: '4k-5k', color: CEFR_LEVEL_COLORS.B1 },
  { value: 'cet6', cefr: 'B2', vocab: '5.5k-6.5k', color: CEFR_LEVEL_COLORS.B2 },
  { value: 'ielts7_tem8', cefr: 'C1', vocab: '8k-10k', color: CEFR_LEVEL_COLORS.C1 },
  { value: 'native', cefr: 'C2', vocab: '10k+', color: CEFR_LEVEL_COLORS.C2 },
];

// 英语变体配置 (文本通过 i18n 获取)
export const ENGLISH_VARIANTS: Array<{
  value: EnglishVariant;
  iconName?: string;
  flagCode?: string;
}> = [
  { value: 'american', flagCode: 'US' },
  { value: 'british', flagCode: 'GB' },
];

// 对话风格配置 (文本通过 i18n 获取)
export const CONVERSATION_STYLES: Array<{
  value: ConversationStyle;
  iconName: string;
}> = [
  { value: 'formal', iconName: 'work' },
  { value: 'casual', iconName: 'groups' },
  { value: 'slang', iconName: 'record-voice-over' },
];

// 声音选项已从API动态获取，不再使用硬编码数据
// 请使用 apiClient.getTTSVoices(variant) 获取声音列表
