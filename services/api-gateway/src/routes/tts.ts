import { Router } from 'express';
import { speechServiceClient } from '@/clients';
import { logger } from '@/utils/logger';
import { recordUsage } from '@/services/usageService';
import { quotaCheck } from '@/middleware/quotaMiddleware';
import { requireFeature } from '@/middleware/requireFeature';
import axios from 'axios';

const router = Router();

/**
 * GET /api/tts/voices
 * 获取所有可用的TTS声音列表
 * 可选查询参数: variant (american | british)
 */
router.get('/voices', async (req, res) => {
  try {
    const { variant } = req.query;

    logger.info('Fetching TTS voices', { variant });

    const data = await speechServiceClient.getVoices(variant as 'american' | 'british' | undefined);

    res.json(data);

  } catch (error) {
    logger.error('Failed to fetch TTS voices:', error);

    if (axios.isAxiosError(error)) {
      res.status(error.response?.status || 500).json({
        success: false,
        error: error.response?.data?.error || 'Failed to fetch TTS voices'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
});

/**
 * POST /api/tts/translate
 * 文本翻译
 */
router.post('/translate', requireFeature('textTranslation'), quotaCheck, async (req, res): Promise<void> => {
  try {
    const { text, sourceLanguage, targetLanguage } = req.body;

    if (!text || !sourceLanguage || !targetLanguage) {
      res.status(400).json({
        success: false,
        error: 'Missing required parameters: text, sourceLanguage, targetLanguage'
      });
      return;
    }

    logger.info('Translating text', {
      textLength: text.length,
      sourceLanguage,
      targetLanguage
    });

    const data = await speechServiceClient.translateText(text, sourceLanguage, targetLanguage);

    // 记录翻译用量（按字符数）
    const userId = req.user?.id;
    if (userId && text.length > 0) {
      recordUsage(userId, 'text_translation', text.length).catch(err => {
        logger.error('记录翻译用量失败:', err);
      });
    }

    res.json(data);

  } catch (error) {
    logger.error('Failed to translate text:', error);

    if (axios.isAxiosError(error)) {
      res.status(error.response?.status || 500).json({
        success: false,
        error: error.response?.data?.error || 'Failed to translate text'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
});

/**
 * POST /api/tts/synthesize
 * 合成语音
 */
router.post('/synthesize', requireFeature('tts'), quotaCheck, async (req, res) => {
  try {
    const { text } = req.body;
    const textLength = text?.length || 0;

    logger.info('Synthesizing speech', {
      voice: req.body.voice,
      textLength
    });

    const response = await speechServiceClient.synthesizeSpeech(req.body);

    // 记录 TTS 用量（按字符数）
    const userId = req.user?.id;
    if (userId && textLength > 0) {
      recordUsage(userId, 'tts', textLength).catch(err => {
        logger.error('记录TTS用量失败:', err);
      });
    }

    // 设置响应头
    res.set('Content-Type', response.headers['content-type'] || 'audio/mpeg');
    res.send(response.data);

  } catch (error) {
    logger.error('Failed to synthesize speech:', error);

    if (axios.isAxiosError(error)) {
      res.status(error.response?.status || 500).json({
        success: false,
        error: error.response?.data?.error || 'Failed to synthesize speech'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
});

export default router;
