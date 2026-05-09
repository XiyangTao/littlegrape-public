/**
 * 发音评估工具函数
 * 提取自 pronunciation-assessment.ts 和 streaming-pronunciation-assessment.ts 中的重复代码
 */

import * as sdk from 'microsoft-cognitiveservices-speech-sdk';

// ============================================================================
// 类型定义
// ============================================================================

export type ErrorType =
  | 'None'
  | 'Mispronunciation'
  | 'Omission'
  | 'Insertion'
  | 'UnexpectedBreak'
  | 'MissingBreak'
  | 'Monotone';

export type Granularity = 'word' | 'phoneme' | 'fullText';

// ============================================================================
// 错误类型映射
// ============================================================================

/**
 * 将 Azure SDK 返回的错误类型映射为标准化的错误类型
 */
export function mapErrorType(errorType: string | undefined): ErrorType {
  switch (errorType) {
    case 'Mispronunciation':
      return 'Mispronunciation';
    case 'Omission':
      return 'Omission';
    case 'Insertion':
      return 'Insertion';
    case 'UnexpectedBreak':
      return 'UnexpectedBreak';
    case 'MissingBreak':
      return 'MissingBreak';
    case 'Monotone':
      return 'Monotone';
    default:
      return 'None';
  }
}

// ============================================================================
// 粒度映射
// ============================================================================

/**
 * 将字符串粒度参数映射为 Azure SDK 枚举值
 */
export function getGranularity(granularity?: string): sdk.PronunciationAssessmentGranularity {
  switch (granularity) {
    case 'word':
      return sdk.PronunciationAssessmentGranularity.Word;
    case 'fullText':
      return sdk.PronunciationAssessmentGranularity.FullText;
    case 'phoneme':
    default:
      return sdk.PronunciationAssessmentGranularity.Phoneme;
  }
}

// ============================================================================
// ID 生成
// ============================================================================

/**
 * 生成唯一请求 ID
 * @param prefix ID 前缀，如 'pa' (pronunciation assessment), 'asr', 'tts'
 */
export function generateRequestId(prefix: string = 'req'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// 分数转换
// ============================================================================

/**
 * 讯飞分数（0-5）转换为百分制（0-100）
 */
export function xunfeiScoreToPercent(score: number): number {
  return Math.round(score * 20);
}

/**
 * 百分制分数转换为评级
 */
export function getScoreLevel(score: number): 'excellent' | 'good' | 'poor' {
  if (score >= 85) return 'excellent';
  if (score >= 60) return 'good';
  return 'poor';
}
