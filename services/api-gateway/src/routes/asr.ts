import { Router } from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import { config } from '@/config';
import { logger } from '@/utils/logger';
import { recordUsage } from '@/services/usageService';
import { quotaCheck } from '@/middleware/quotaMiddleware';
import { requireFeature } from '@/middleware/requireFeature';

const router = Router();

// 文件上传配置 - 内存存储
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB 限制
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
      'application/octet-stream'
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported audio format'));
    }
  }
});

/**
 * POST /api/asr/recognize
 * 语音识别
 */
router.post('/recognize', requireFeature('asr'), quotaCheck, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Audio file is required'
      });
    }

    logger.info('ASR recognize request', {
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      engine: req.body.engine,
      language: req.body.language
    });

    // 构建转发到 speech-service 的请求
    const formData = new FormData();
    formData.append('audio', req.file.buffer, {
      filename: req.file.originalname || 'recording.wav',
      contentType: req.file.mimetype
    });

    // 转发其他参数
    if (req.body.engine) {
      formData.append('engine', req.body.engine);
    }
    if (req.body.language) {
      formData.append('language', req.body.language);
    }
    if (req.body.enableWordLevelTimestamps) {
      formData.append('enableWordLevelTimestamps', req.body.enableWordLevelTimestamps);
    }

    // 调用 speech-service
    const response = await axios.post(
      `${config.services.speechService.url}/api/v1/asr/recognize`,
      formData,
      {
        headers: {
          ...formData.getHeaders()
        },
        timeout: 30000
      }
    );

    // 记录 ASR 用量（按音频时长毫秒，前端传入 audio_duration_ms）
    const userId = req.user?.id;
    const audioDurationMs = parseInt(req.body.audio_duration_ms, 10) || 0;
    if (userId && audioDurationMs > 0) {
      recordUsage(userId, 'asr', audioDurationMs).catch(err => {
        logger.error('记录ASR用量失败:', err);
      });
    }

    return res.json(response.data);

  } catch (error) {
    logger.error('ASR recognize failed:', error);

    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 500;
      const errorData = error.response?.data || { error: 'Speech recognition failed' };
      return res.status(status).json({
        success: false,
        ...errorData
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
});

/**
 * GET /api/asr/engines
 * 获取可用的 ASR 引擎列表
 */
router.get('/engines', async (_req, res) => {
  try {
    const response = await axios.get(
      `${config.services.speechService.url}/api/v1/asr/engines`,
      { timeout: 10000 }
    );

    res.json(response.data);

  } catch (error) {
    logger.error('Get ASR engines failed:', error);

    if (axios.isAxiosError(error)) {
      res.status(error.response?.status || 500).json({
        success: false,
        error: error.response?.data?.error || 'Failed to get ASR engines'
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
 * GET /api/asr/health
 * ASR 服务健康检查
 */
router.get('/health', async (_req, res) => {
  try {
    const response = await axios.get(
      `${config.services.speechService.url}/api/v1/asr/health`,
      { timeout: 5000 }
    );

    res.json(response.data);

  } catch (error) {
    logger.error('ASR health check failed:', error);
    res.status(503).json({
      success: false,
      error: 'ASR service unhealthy'
    });
  }
});

export default router;
