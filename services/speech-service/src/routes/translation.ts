import { Router } from 'express';
import axios from 'axios';
import { config } from '@/config';
import { logger } from '@/utils/logger';

const router = Router();

// Azure Translator API 配置
const AZURE_TRANSLATOR_ENDPOINT = config.azure.translatorEndpoint;
const AZURE_TRANSLATOR_API_VERSION = '3.0';

// 支持的语言映射
const LANGUAGE_MAP: Record<string, string> = {
  'zh-CN': 'zh-Hans',
  'zh-Hans': 'zh-Hans',
  'en-US': 'en',
  'en': 'en',
};

/**
 * POST /api/v1/translation/translate
 * 文本翻译接口
 */
router.post('/translate', async (req, res): Promise<void> => {
  try {
    const { text, sourceLanguage, targetLanguage } = req.body;

    // 参数验证
    if (!text || typeof text !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Missing or invalid text parameter',
      });
      return;
    }

    if (!sourceLanguage || !targetLanguage) {
      res.status(400).json({
        success: false,
        error: 'Missing sourceLanguage or targetLanguage parameter',
      });
      return;
    }

    // 转换语言代码
    const fromLang = LANGUAGE_MAP[sourceLanguage] || sourceLanguage;
    const toLang = LANGUAGE_MAP[targetLanguage] || targetLanguage;

    logger.info('Translating text', {
      textLength: text.length,
      from: fromLang,
      to: toLang,
    });

    // 调用 Azure Translator API
    const response = await axios.post(
      `${AZURE_TRANSLATOR_ENDPOINT}/translate`,
      [{ text }],
      {
        params: {
          'api-version': AZURE_TRANSLATOR_API_VERSION,
          from: fromLang,
          to: toLang,
        },
        headers: {
          'Ocp-Apim-Subscription-Key': config.azure.translatorKey || config.azure.speechKey,
          'Ocp-Apim-Subscription-Region': config.azure.translatorRegion || config.azure.speechRegion,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    // 解析响应
    const translations = response.data;
    if (!translations || !translations[0] || !translations[0].translations || !translations[0].translations[0]) {
      throw new Error('Invalid translation response');
    }

    const translatedText = translations[0].translations[0].text;

    logger.info('Translation successful', {
      originalLength: text.length,
      translatedLength: translatedText.length,
    });

    res.json({
      success: true,
      data: {
        translatedText,
        sourceLanguage,
        targetLanguage,
      },
    });
  } catch (error: any) {
    logger.error('Translation failed:', {
      message: error.message,
      ...(axios.isAxiosError(error) && {
        status: error.response?.status,
        data: error.response?.data,
      }),
    });

    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 500;
      const message = error.response?.data?.error?.message || 'Translation service error';
      res.status(status).json({
        success: false,
        error: message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export default router;
