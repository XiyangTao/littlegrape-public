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
    // 发音评估只支持 WAV 格式
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

/**
 * POST /api/pronunciation/assess
 * 发音评估（一次性模式）
 */
router.post('/assess', requireFeature('pronunciation'), quotaCheck, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Audio file is required'
      });
    }

    if (!req.body.referenceText) {
      return res.status(400).json({
        success: false,
        error: 'referenceText is required'
      });
    }

    logger.info('Pronunciation assess request', {
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      referenceText: req.body.referenceText,
      practiceType: req.body.practiceType,
      language: req.body.language
    });

    // 构建转发到 speech-service 的请求
    const formData = new FormData();
    formData.append('audio', req.file.buffer, {
      filename: req.file.originalname || 'recording.wav',
      contentType: req.file.mimetype
    });

    // 转发参数
    formData.append('referenceText', req.body.referenceText);

    if (req.body.practiceType) {
      formData.append('practiceType', req.body.practiceType);
    }
    if (req.body.language) {
      formData.append('language', req.body.language);
    }
    if (req.body.granularity) {
      formData.append('granularity', req.body.granularity);
    }
    if (req.body.enableProsody !== undefined) {
      formData.append('enableProsody', req.body.enableProsody);
    }
    if (req.body.enableMiscue !== undefined) {
      formData.append('enableMiscue', req.body.enableMiscue);
    }

    // 调用 speech-service
    const response = await axios.post(
      `${config.services.speechService.url}/api/v1/pronunciation/assess`,
      formData,
      {
        headers: {
          ...formData.getHeaders()
        },
        timeout: 30000
      }
    );

    // 记录发音评估用量（按音频时长毫秒）
    const userId = req.user?.id;
    const audioDurationMs = parseInt(req.body.audio_duration_ms, 10) || response.data?.data?.duration || 0;
    if (userId && audioDurationMs > 0) {
      recordUsage(userId, 'pronunciation', audioDurationMs).catch(err => {
        logger.error('记录发音评估用量失败:', err);
      });
    }

    return res.json(response.data);

  } catch (error) {
    logger.error('Pronunciation assess failed:', error);

    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 500;
      const errorData = error.response?.data || { error: 'Pronunciation assessment failed' };
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
 * GET /api/pronunciation/health
 * 发音评估服务健康检查
 */
router.get('/health', async (_req, res) => {
  try {
    const response = await axios.get(
      `${config.services.speechService.url}/api/v1/pronunciation/health`,
      { timeout: 5000 }
    );

    res.json(response.data);

  } catch (error) {
    logger.error('Pronunciation health check failed:', error);
    res.status(503).json({
      success: false,
      error: 'Pronunciation assessment service unhealthy'
    });
  }
});

export default router;
