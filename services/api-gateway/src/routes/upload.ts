import express from 'express';
import multer from 'multer';
import { OSSService } from '@/services/ossService';
import { OSS_CONFIG } from '@/config/oss';
import { moderateImage } from '@/services/moderationService';
import { logger } from '@/utils/logger';

const router = express.Router();

// 根据文件夹类型获取对应的文件大小限制
function getMaxFileSizeForFolder(folder: string): number {
  switch (folder) {
    case 'avatars':
      return OSS_CONFIG.maxFileSize.images;
    case 'audio':
      return OSS_CONFIG.maxFileSize.audio;
    case 'feedback':
    case 'scenarios':
      return OSS_CONFIG.maxFileSize.images;
    default:
      return OSS_CONFIG.maxFileSize.default;
  }
}

// 配置multer - 使用内存存储（使用 default 限制，路由中按 folder 二次校验）
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: OSS_CONFIG.maxFileSize.default,
    files: 10
  },
  fileFilter: (req, file, cb) => {
    // 检查文件类型 (检查所有支持的类型)
    const allAllowedTypes = [
      ...OSS_CONFIG.allowedMimeTypes.images,
      ...OSS_CONFIG.allowedMimeTypes.audio,
      ...OSS_CONFIG.allowedMimeTypes.video,
      ...OSS_CONFIG.allowedMimeTypes.documents
    ];

    if (allAllowedTypes.includes(file.mimetype as any)) {
      return cb(null, true);
    } else {
      return cb(new Error(`不支持的文件类型: ${file.mimetype}`));
    }
  }
});

// 单文件上传
router.post('/single', upload.single('file'), async (req, res): Promise<any> => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '请选择要上传的文件'
      });
    }

    // 文件魔数校验：验证文件真实类型与声明的 MIME 是否匹配
    const { fileTypeFromBuffer } = await import('file-type');
    const typeResult = await fileTypeFromBuffer(req.file.buffer);
    if (typeResult && typeResult.mime !== req.file.mimetype) {
      return res.status(400).json({
        success: false,
        error: `文件类型不匹配：声明为 ${req.file.mimetype}，实际为 ${typeResult.mime}`
      });
    }

    const { folder = 'temp', filename, keepOriginalName } = req.body;

    // 验证folder参数
    if (!Object.keys(OSS_CONFIG.pathPrefixes).includes(folder)) {
      return res.status(400).json({
        success: false,
        error: `无效的文件夹参数: ${folder}。支持的文件夹: ${Object.keys(OSS_CONFIG.pathPrefixes).join(', ')}`
      });
    }

    // 按文件夹类型校验文件大小
    const maxSize = getMaxFileSizeForFolder(folder);
    if (req.file.size > maxSize) {
      return res.status(400).json({
        success: false,
        error: `文件大小超过限制 (${Math.round(maxSize / 1024 / 1024)}MB)`
      });
    }

    // 上传到OSS
    const result = await OSSService.uploadFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      {
        folder: folder as keyof typeof OSS_CONFIG.pathPrefixes,
        filename,
        keepOriginalName: keepOriginalName === 'true'
      }
    );

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    // 头像类图片强制审核：不通过 → 异步清理 OSS 文件（不阻塞响应） + 返回 400
    if (folder === 'avatars' && result.cdnUrl) {
      const userId = (req as any).user?.id as string | undefined;
      const moderation = await moderateImage(result.cdnUrl, 'avatar', userId);
      if (!moderation.pass) {
        logger.info('Avatar moderation blocked, deleting OSS file async', {
          userId,
          ossPath: result.ossPath,
          labels: moderation.labels,
        });
        // 异步删除：不 await，失败只记日志（对象未被引用，仅产生孤儿文件）
        if (result.ossPath) {
          OSSService.deleteFile(result.ossPath).catch(err => {
            logger.warn('删除违规头像失败', { ossPath: result.ossPath, err });
          });
        }
        return res.status(400).json({
          success: false,
          error: moderation.reason || '头像不符合社区规范，请换一张',
          code: 'MODERATION_REJECTED',
        });
      }
    }

    return res.json({
      success: true,
      message: '文件上传成功',
      data: {
        url: result.url,
        cdnUrl: result.cdnUrl,
        ossPath: result.ossPath,
        fileInfo: result.fileInfo
      }
    });

  } catch (error) {
    logger.error('文件上传失败:', error);

    // 处理multer错误
    if (error instanceof multer.MulterError) {
      switch (error.code) {
        case 'LIMIT_FILE_SIZE':
          return res.status(400).json({
            success: false,
            error: `文件大小超过限制 (${Math.round(OSS_CONFIG.maxFileSize.default / 1024 / 1024)}MB)`
          });
        case 'LIMIT_UNEXPECTED_FILE':
          return res.status(400).json({
            success: false,
            error: '意外的文件字段'
          });
        default:
          return res.status(400).json({
            success: false,
            error: error.message
          });
      }
    }

    const message = error instanceof Error ? error.message : '文件上传失败';
    return res.status(500).json({
      success: false,
      error: message
    });
  }
});

// 多文件上传
router.post('/multiple', upload.array('files', 10), async (req, res): Promise<any> => {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: '请选择要上传的文件'
      });
    }

    const { folder = 'temp', keepOriginalName } = req.body;

    // 验证folder参数
    if (!Object.keys(OSS_CONFIG.pathPrefixes).includes(folder)) {
      return res.status(400).json({
        success: false,
        error: `无效的文件夹参数: ${folder}`
      });
    }

    // 文件魔数校验
    const { fileTypeFromBuffer } = await import('file-type');
    for (const file of files) {
      const typeResult = await fileTypeFromBuffer(file.buffer);
      if (typeResult && typeResult.mime !== file.mimetype) {
        return res.status(400).json({
          success: false,
          error: `文件 ${file.originalname} 类型不匹配：声明为 ${file.mimetype}，实际为 ${typeResult.mime}`
        });
      }
    }

    // 批量上传
    const results = await OSSService.uploadMultipleFiles(
      files.map(file => ({
        buffer: file.buffer,
        originalName: file.originalname,
        mimeType: file.mimetype
      })),
      {
        folder: folder as keyof typeof OSS_CONFIG.pathPrefixes,
        keepOriginalName: keepOriginalName === 'true'
      }
    );

    // 统计上传结果
    const successCount = results.filter(r => r.success).length;
    const failedCount = results.length - successCount;

    return res.json({
      success: failedCount === 0,
      message: `上传完成: 成功 ${successCount} 个，失败 ${failedCount} 个`,
      data: {
        results,
        summary: {
          total: results.length,
          success: successCount,
          failed: failedCount
        }
      }
    });

  } catch (error) {
    logger.error('批量文件上传失败:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '批量文件上传失败'
    });
  }
});

// 删除文件
router.delete('/file', async (req, res): Promise<any> => {
  try {
    const { ossPath } = req.body;

    if (!ossPath) {
      return res.status(400).json({
        success: false,
        error: '请提供要删除的文件路径'
      });
    }

    const result = await OSSService.deleteFile(ossPath);

    if (result.success) {
      return res.json({
        success: true,
        message: '文件删除成功'
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    logger.error('文件删除失败:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '文件删除失败'
    });
  }
});

// 获取文件信息
router.get('/info', async (req, res): Promise<any> => {
  try {
    const { ossPath } = req.query;

    if (!ossPath || typeof ossPath !== 'string') {
      return res.status(400).json({
        success: false,
        error: '请提供文件路径'
      });
    }

    const result = await OSSService.getFileInfo(ossPath);

    if (result.success) {
      return res.json({
        success: true,
        data: result
      });
    } else {
      return res.status(404).json({
        success: false,
        error: result.error || '文件不存在'
      });
    }

  } catch (error) {
    logger.error('获取文件信息失败:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取文件信息失败'
    });
  }
});

// 获取文件签名URL
router.get('/signed-url', async (req, res): Promise<any> => {
  try {
    const { ossPath, expires } = req.query;

    if (!ossPath || typeof ossPath !== 'string') {
      return res.status(400).json({
        success: false,
        error: '请提供文件路径'
      });
    }

    const expiresNum = expires ? parseInt(expires as string, 10) : 3600;
    const url = await OSSService.getSignedUrl(ossPath, expiresNum);

    return res.json({
      success: true,
      data: {
        signedUrl: url,
        expires: expiresNum
      }
    });

  } catch (error) {
    logger.error('获取签名URL失败:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取签名URL失败'
    });
  }
});

// OSS配置信息（前端可用于验证）
router.get('/config', (req, res) => {
  res.json({
    success: true,
    data: {
      allowedMimeTypes: OSS_CONFIG.allowedMimeTypes,
      maxFileSize: OSS_CONFIG.maxFileSize,
      pathPrefixes: Object.keys(OSS_CONFIG.pathPrefixes),
      cdnDomain: OSS_CONFIG.cdnDomain
    }
  });
});

export default router;