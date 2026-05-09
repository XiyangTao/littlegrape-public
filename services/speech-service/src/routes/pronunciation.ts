import express from 'express';
import { z } from 'zod';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { pronunciationAssessmentEngine } from '@/services/pronunciation-assessment';
import { logger } from '@/utils/logger';

const router = express.Router();

// 文件上传配置
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB 限制
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = [
      'audio/wav',
      'audio/wave',
      'audio/x-wav',
      'application/octet-stream'
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only WAV format is supported for pronunciation assessment'));
    }
  }
});

// 发音评估请求验证 schema
const assessRequestSchema = z.object({
  /** 参考文本（用户应该读的内容） */
  referenceText: z.string().min(1, 'referenceText is required'),

  /** 练习类型 */
  practiceType: z.enum(['phoneme', 'word', 'sentence', 'dialogue']).optional().default('word'),

  /** 语言 */
  language: z.string().optional().default('en-US'),

  /** 评估粒度 */
  granularity: z.enum(['phoneme', 'word', 'fullText']).optional().default('phoneme'),

  /** 是否启用韵律评估 */
  enableProsody: z.coerce.boolean().optional().default(true),

  /** 是否启用错误检测 */
  enableMiscue: z.coerce.boolean().optional().default(true)
});

/**
 * POST /assess
 * 发音评估（一次性模式）
 */
router.post('/assess',
  upload.single('audio'),
  async (req, res) => {
    const requestId = uuidv4();
    const startTime = Date.now();

    logger.info('Pronunciation assessment request started', {
      requestId,
      hasFile: !!req.file,
      body: req.body
    });

    try {
      // 验证音频文件
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'Audio file is required',
          requestId
        });
      }

      // 验证请求参数
      let validatedData;
      try {
        validatedData = assessRequestSchema.parse(req.body);
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
        referenceText,
        practiceType,
        language,
        granularity,
        enableProsody,
        enableMiscue
      } = validatedData;

      logger.info('Pronunciation assessment request', {
        requestId,
        referenceText,
        practiceType,
        language,
        granularity,
        enableProsody,
        enableMiscue,
        fileSize: req.file.size
      });

      // 执行发音评估
      const result = await pronunciationAssessmentEngine.assess({
        audioBuffer: req.file.buffer,
        referenceText,
        practiceType,
        language,
        granularity,
        enableProsody,
        enableMiscue
      });

      const duration = Date.now() - startTime;

      logger.info('Pronunciation assessment completed', {
        requestId,
        pronunciationScore: result.pronunciationScore,
        accuracyScore: result.accuracyScore,
        fluencyScore: result.fluencyScore,
        completenessScore: result.completenessScore,
        prosodyScore: result.prosodyScore,
        wordsCount: result.words.length,
        processingTime: duration
      });

      return res.json({
        success: true,
        data: {
          requestId,
          referenceText,
          recognizedText: result.recognizedText,
          pronunciationScore: result.pronunciationScore,
          accuracyScore: result.accuracyScore,
          fluencyScore: result.fluencyScore,
          completenessScore: result.completenessScore,
          prosodyScore: result.prosodyScore,
          words: result.words,
          duration: result.duration,
          processingTime: duration
        }
      });

    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error('Pronunciation assessment failed', {
        requestId,
        duration,
        error: error instanceof Error ? error.message : String(error)
      });

      if (error instanceof Error) {
        if (error.message.includes('No speech detected')) {
          return res.status(400).json({
            success: false,
            error: 'No speech detected. Please speak clearly and try again.',
            requestId
          });
        }

        return res.status(500).json({
          success: false,
          error: 'Pronunciation assessment failed',
          details: error.message,
          requestId
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Unknown error occurred',
        requestId
      });
    }
  }
);

/**
 * GET /health
 * 发音评估服务健康检查
 */
router.get('/health', async (_req, res) => {
  try {
    const isAvailable = await pronunciationAssessmentEngine.isAvailable();

    return res.json({
      success: true,
      data: {
        service: 'pronunciation-assessment',
        status: isAvailable ? 'healthy' : 'unavailable',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Pronunciation assessment health check failed', { error });

    return res.status(503).json({
      success: false,
      error: 'Pronunciation assessment service unhealthy',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
