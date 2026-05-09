/**
 * 翻译服务
 * 封装翻译相关的 API 调用
 */
import { apiClient } from '@/api';

/**
 * 双向翻译
 */
export async function translateBidirectional(
  text: string,
  sourceLang: 'zh-CN' | 'en-US',
  targetLang: 'zh-CN' | 'en-US'
) {
  try {
    return await apiClient.translateBidirectional(text, sourceLang, targetLang);
  } catch (error) {
    console.error('[TranslationService] 翻译失败:', error instanceof Error ? error.message : error);
    throw error;
  }
}
