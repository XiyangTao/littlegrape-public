import express from 'express';
import { z } from 'zod';
import { ttsEngineManager } from '@/services/tts-engines';
import { logger } from '@/utils/logger';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// 验证中间件
function validateRequest(schema: z.ZodSchema): express.RequestHandler {
  return (req: express.Request, res: express.Response, next: express.NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors
        });
        return;
      }
      res.status(500).json({
        success: false,
        error: 'Internal validation error'
      });
    }
  };
}

// TTS请求验证schema
const ttsRequestSchema = z.object({
  text: z.string().min(1).max(5000, 'Text must be between 1 and 5000 characters'),
  voice: z.string().min(1),
  speed: z.number().min(0.25).max(4.0).optional().default(1.0),
  format: z.enum(['mp3', 'opus', 'aac', 'wav']).optional().default('mp3'),
  quality: z.enum(['standard', 'premium']).optional().default('standard'),
});

// 流式TTS请求验证schema（长文本，最大10000字符）
const ttsStreamRequestSchema = z.object({
  text: z.string().min(1).max(10000, 'Text must be between 1 and 10000 characters'),
  voice: z.string().min(1),
  speed: z.number().min(0.25).max(4.0).optional().default(1.0),
  format: z.enum(['mp3', 'opus', 'aac', 'wav']).optional().default('mp3'),
});


// 获取可用音色列表（支持按variant筛选：american/british）
router.get('/voices', async (req, res) => {
  try {
    const { variant } = req.query;

    // 从TTS引擎获取音色列表
    const voices = await ttsEngineManager.getVoices(variant as 'american' | 'british' | undefined);

    logger.info('Voices retrieved', {
      variant,
      count: voices.length
    });

    return res.json({
      success: true,
      data: voices
    });

  } catch (error) {
    logger.error('Get voices error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get voices'
    });
  }
});


// 文本转语音
router.post('/synthesize',
  validateRequest(ttsRequestSchema),
  async (req, res) => {
    const requestId = uuidv4();
    const startTime = Date.now();

    try {
      const { text, voice, speed, format, quality } = req.body;

      logger.info('TTS synthesis request', {
        requestId,
        voice,
        textLength: text.length,
        format,
        quality
      });

      // 调用TTS引擎合成
      const audioBuffer = await ttsEngineManager.synthesize({
        text,
        voice,
        speed,
        format,
        quality
      });

      const duration = Date.now() - startTime;

      logger.info('TTS synthesis completed', {
        requestId,
        voice,
        textLength: text.length,
        audioSize: audioBuffer.length,
        duration
      });

      // 设置响应头
      const resolved = ttsEngineManager.resolveVoice(voice);
      res.setHeader('Content-Type', `audio/${format}`);
      res.setHeader('Content-Length', audioBuffer.length);
      res.setHeader('X-TTS-Engine', resolved.engineName);
      res.setHeader('X-TTS-Voice', voice);
      res.setHeader('X-Processing-Time', `${duration}ms`);

      return res.send(audioBuffer);

    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error('TTS synthesis failed:', {
        requestId,
        error: error instanceof Error ? error.message : String(error),
        duration
      });

      if (error instanceof Error && error.message.includes('not available')) {
        return res.status(503).json({
          success: false,
          error: 'TTS engine temporarily unavailable',
          requestId
        });
      } else if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: 'TTS engine not found',
          requestId
        });
      } else {
        return res.status(500).json({
          success: false,
          error: 'Speech synthesis failed',
          requestId
        });
      }
    }
  }
);


// 合成 + WordBoundary 时间戳（用于讲解音频句子定位）
router.post('/synthesize-with-word-boundary',
  async (req, res) => {
    const requestId = uuidv4();
    const startTime = Date.now();

    try {
      const { text, voice, speed = 1.0, format = 'mp3', lang } = req.body;

      if (!text || typeof text !== 'string') {
        res.status(400).json({ success: false, error: 'text is required' });
        return;
      }
      if (!voice || typeof voice !== 'string') {
        res.status(400).json({ success: false, error: 'voice is required' });
        return;
      }

      logger.info('TTS word boundary synthesis request', {
        requestId,
        voice,
        textLength: text.length,
        format,
        lang,
      });

      const result = await ttsEngineManager.synthesizeWithWordBoundary({
        text,
        voice,
        speed,
        format,
        quality: 'premium',
        lang,
      });

      const duration = Date.now() - startTime;

      logger.info('TTS word boundary synthesis completed', {
        requestId,
        audioSize: result.audio.length,
        wordBoundaryCount: result.wordBoundaries.length,
        duration,
      });

      return res.json({
        success: true,
        data: {
          audio: result.audio.toString('base64'),
          wordBoundaries: result.wordBoundaries,
          durationMs: result.durationMs,
        },
      });

    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error('TTS word boundary synthesis failed:', {
        requestId,
        error: error instanceof Error ? error.message : String(error),
        duration,
      });

      return res.status(500).json({
        success: false,
        error: 'Word boundary synthesis failed',
        requestId,
      });
    }
  }
);


// 按句子合成 + Bookmark 时间戳（用于精确句子定位）
router.post('/synthesize-with-bookmarks',
  async (req, res) => {
    const requestId = uuidv4();
    const startTime = Date.now();

    try {
      const { sentences, voice, speed = 1.0, format = 'mp3', lang } = req.body;

      if (!sentences || !Array.isArray(sentences) || sentences.length === 0) {
        res.status(400).json({ success: false, error: 'sentences array is required' });
        return;
      }
      if (!voice || typeof voice !== 'string') {
        res.status(400).json({ success: false, error: 'voice is required' });
        return;
      }

      logger.info('TTS bookmark synthesis request', {
        requestId,
        voice,
        sentenceCount: sentences.length,
        format,
      });

      // 统一走 synthesizeSentencesWithBookmarks（内部自动选引擎）
      const result = await ttsEngineManager.synthesizeSentencesWithBookmarks(
        sentences, voice, speed, format, lang,
      );

      const duration = Date.now() - startTime;

      logger.info('TTS bookmark synthesis completed', {
        requestId,
        audioSize: result.audio.length,
        bookmarkCount: result.bookmarks.length,
        durationMs: result.durationMs,
        duration,
      });

      return res.json({
        success: true,
        data: {
          audio: result.audio.toString('base64'),
          bookmarks: result.bookmarks,
          durationMs: result.durationMs,
        },
      });

    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error('TTS bookmark synthesis failed:', {
        requestId,
        error: error instanceof Error ? error.message : String(error),
        duration,
      });

      return res.status(500).json({
        success: false,
        error: 'Bookmark synthesis failed',
        requestId,
      });
    }
  }
);


// 流式文本转语音（用于长文本）
router.post('/synthesize-stream',
  validateRequest(ttsStreamRequestSchema),
  async (req, res) => {
    const requestId = uuidv4();

    try {
      const { text, voice, speed, format } = req.body;

      logger.info('Stream TTS synthesis request', {
        requestId,
        textLength: text.length
      });

      // 设置SSE响应头
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Request-ID': requestId
      });

      // 将文本分段处理
      const sentences = text.split(/[.!?]+/).filter((s: string) => s.trim().length > 0);
      let processedCount = 0;

      for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i].trim();
        if (!sentence) continue;

        try {
          const audioBuffer = await ttsEngineManager.synthesize({
            text: sentence,
            voice,
            speed,
            format
          });

          // 发送音频数据
          res.write(`data: ${JSON.stringify({
            type: 'audio',
            index: i,
            total: sentences.length,
            audio: audioBuffer.toString('base64'),
            text: sentence.substring(0, 100) + (sentence.length > 100 ? '...' : ''),
            size: audioBuffer.length
          })}\n\n`);

          processedCount++;

          // 发送进度更新
          if (i % 5 === 0) {
            res.write(`data: ${JSON.stringify({
              type: 'progress',
              processed: processedCount,
              total: sentences.length,
              percentage: Math.round((processedCount / sentences.length) * 100)
            })}\n\n`);
          }

        } catch (error) {
          logger.error(`Stream TTS segment ${i} error:`, { requestId, error: error instanceof Error ? error.message : String(error) });

          res.write(`data: ${JSON.stringify({
            type: 'error',
            index: i,
            error: 'Segment synthesis failed',
            text: sentence.substring(0, 100)
          })}\n\n`);
        }
      }

      // 发送完成信号
      res.write(`data: ${JSON.stringify({
        type: 'complete',
        requestId,
        processed: processedCount,
        total: sentences.length
      })}\n\n`);

      logger.info('Stream TTS synthesis completed', {
        requestId,
        processed: processedCount,
        total: sentences.length
      });

      return res.end();


    } catch (error) {
      logger.error('Stream TTS synthesis failed:', { requestId, error: error instanceof Error ? error.message : String(error) });

      res.write(`data: ${JSON.stringify({
        type: 'error',
        error: 'Stream synthesis failed',
        requestId
      })}\n\n`);

      return res.end();
    }
  }
);

// TTS服务健康检查
router.get('/health', async (_req, res) => {
  try {
    const isAvailable = await ttsEngineManager.isAvailable();

    return res.json({
      success: true,
      data: {
        service: 'tts-service',
        status: 'healthy',
        engine: 'azure',
        available: isAvailable,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('TTS health check failed:', error);

    return res.status(503).json({
      success: false,
      error: 'Service unhealthy',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;