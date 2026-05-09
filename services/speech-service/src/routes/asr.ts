import express from 'express';
import { z } from 'zod';
import multer from 'multer';
import { asrEngineManager, ASRRequest, AzureSupportedLanguage } from '@/services/asr-engines';
import { logger } from '@/utils/logger';
import { v4 as uuidv4 } from 'uuid';


const router = express.Router();


// 文件上传配置
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB限制
  },
  fileFilter: (_req, file, cb) => {
    // 支持的音频格式
    const allowedMimeTypes = [
      'audio/wav',
      'audio/wave',
      'audio/x-wav',
      'audio/mpeg',
      'audio/mp3',
      'audio/ogg',
      'audio/webm',
      'application/octet-stream' // 允许通用二进制类型，然后检查文件扩展名
    ];

    // 支持的文件扩展名
    const allowedExtensions = ['.wav', '.mp3', '.ogg', '.webm', '.m4a'];

    if (allowedMimeTypes.includes(file.mimetype)) {
      // 如果是application/octet-stream，检查文件扩展名
      if (file.mimetype === 'application/octet-stream') {
        const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
        if (allowedExtensions.includes(fileExtension)) {
          cb(null, true);
        } else {
          cb(new Error('Unsupported audio format'));
        }
      } else {
        cb(null, true);
      }
    } else {
      cb(new Error('Unsupported audio format'));
    }
  }
});

// ASR请求验证schema
const asrRequestSchema = z.object({
  /** ASR引擎选择，目前只支持Azure */
  engine: z.enum(['azure']).optional().default('azure'),

  /** 语音识别语言，支持Azure所有语言或自动检测 */
  language: z.string().optional().default('en-US'),

  /** 是否返回每个词的时间戳信息，用于字幕同步或语音分析 */
  enableWordLevelTimestamps: z.coerce.boolean().optional().default(false),

  /** 是否启用脏话过滤，屏蔽不当词汇 */
  enableProfanityFilter: z.coerce.boolean().optional().default(true),

  /** 自动语言检测的候选语言列表 */
  candidateLanguages: z.array(z.string()).optional().default(['zh-CN', 'en-US'])
});


// 获取可用ASR引擎列表
router.get('/engines', async (_req, res) => {
  try {
    const [available, all] = await Promise.all([
      asrEngineManager.getAvailableEngines(),
      asrEngineManager.getAllEngines()
    ]);

    const result = {
      available,
      all,
      status: Object.fromEntries(
        all.map(engine => [engine, available.includes(engine)])
      )
    };

    return res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Get ASR engines error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get ASR engines'
    });
  }
});

// 语音识别
router.post('/recognize',
  upload.single('audio'),
  async (req, res) => {
    const requestId = uuidv4();
    const startTime = Date.now();

    logger.info('ASR recognition request started', {
      requestId,
      hasFile: !!req.file,
      body: req.body,
      headers: req.headers['content-type']
    });

    try {
      // 验证音频文件
      if (!req.file) {
        logger.error('No audio file provided', { requestId });
        return res.status(400).json({
          success: false,
          error: 'Audio file is required',
          requestId
        });
      }

      // 验证请求参数
      let validatedData;
      try {
        validatedData = asrRequestSchema.parse(req.body);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: error.errors,
            requestId
          });
        }
        throw error;
      }

      const {
        engine,
        language,
        enableWordLevelTimestamps,
        enableProfanityFilter,
        candidateLanguages
      } = validatedData;

      // 判断是否为自动语言检测模式
      const isAutoDetect = language === 'auto' || language === 'auto-detect';

      logger.info('ASR recognition request', {
        requestId,
        engine,
        language,
        isAutoDetect,
        enableWordLevelTimestamps,
        enableProfanityFilter,
        candidateLanguages,
        fileSize: req.file.size,
        mimeType: req.file.mimetype
      });

      // 执行语音识别 - 自动选择短句/长句模式
      const asrRequest: ASRRequest = {
        audioBuffer: req.file.buffer,
        language: language as AzureSupportedLanguage,
        enableWordLevelTimestamps,
        enableProfanityFilter,
        enableAutoLanguageDetection: isAutoDetect,
        candidateLanguages: candidateLanguages as AzureSupportedLanguage[]
      };

      const result = await asrEngineManager.recognizeSpeech(engine as string, asrRequest);

      const duration = Date.now() - startTime;

      logger.info('ASR recognition completed', {
        requestId,
        engine,
        recognizedText: result.text,
        confidence: result.confidence,
        wordCount: result.words?.length || 0,
        duration
      });

      return res.json({
        success: true,
        data: {
          requestId,
          engine,
          recognizedText: result.text,
          confidence: result.confidence,
          duration: result.duration,
          wordCount: result.words?.length || 0,
          words: result.words,
          processingTime: duration
        }
      });

    } catch (error) {
      const duration = Date.now() - startTime;

      // 详细的错误信息记录
      const errorDetails = {
        requestId,
        duration,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : String(error),
        hasFile: !!req.file,
        fileSize: req.file?.size,
      };

      logger.error('ASR recognition failed - 详细错误信息:', errorDetails);

      // 检查具体错误类型
      if (error instanceof Error) {
        console.error('错误堆栈:', error.stack);

        if (error.message.includes('not available')) {
          return res.status(503).json({
            success: false,
            error: 'ASR engine temporarily unavailable',
            requestId,
            details: error.message
          });
        } else if (error.message.includes('not found')) {
          return res.status(404).json({
            success: false,
            error: 'ASR engine not found',
            requestId,
            details: error.message
          });
        } else if (error.message.includes('credentials')) {
          return res.status(500).json({
            success: false,
            error: 'ASR service configuration error',
            requestId,
            details: 'Azure credentials not configured'
          });
        } else {
          return res.status(500).json({
            success: false,
            error: 'Speech recognition failed',
            requestId,
            details: error.message
          });
        }
      } else {
        return res.status(500).json({
          success: false,
          error: 'Unknown error occurred',
          requestId,
          details: String(error)
        });
      }
    }
  }
);


// ASR健康检查
router.get('/health', async (_req, res) => {
  try {
    const engines = await asrEngineManager.getAvailableEngines();

    return res.json({
      success: true,
      data: {
        service: 'asr-service',
        status: 'healthy',
        engines: {
          available: engines,
          total: asrEngineManager.getAllEngines().length
        },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('ASR health check failed:', error);

    return res.status(503).json({
      success: false,
      error: 'ASR service unhealthy',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;