import { ossClient, OSS_CONFIG } from '@/config/oss';
import { logger } from '@/utils/logger';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

interface UploadOptions {
  folder: keyof typeof OSS_CONFIG.pathPrefixes;
  filename?: string;
  keepOriginalName?: boolean;
}

interface UploadResult {
  success: boolean;
  url?: string;
  cdnUrl?: string;
  ossPath?: string;
  error?: string;
  fileInfo?: {
    originalName: string;
    size: number;
    mimeType: string;
  };
}

export class OSSService {
  /**
   * 上传文件到OSS
   * @param file 文件Buffer或本地文件路径
   * @param options 上传选项
   * @returns 上传结果
   */
  static async uploadFile(
    file: Buffer | string,
    originalName: string,
    mimeType: string,
    options: UploadOptions
  ): Promise<UploadResult> {
    try {
      // 验证文件类型
      const allAllowedTypes = [
        ...OSS_CONFIG.allowedMimeTypes.images,
        ...OSS_CONFIG.allowedMimeTypes.audio,
        ...OSS_CONFIG.allowedMimeTypes.video,
        ...OSS_CONFIG.allowedMimeTypes.documents
      ];

      if (!allAllowedTypes.includes(mimeType as any)) {
        return {
          success: false,
          error: `不支持的文件类型: ${mimeType}`
        };
      }

      // 根据文件类型获取大小限制
      const getFileSizeLimit = (mimeType: string): number => {
        if (OSS_CONFIG.allowedMimeTypes.images.includes(mimeType as any)) {
          return OSS_CONFIG.maxFileSize.images;
        }
        if (OSS_CONFIG.allowedMimeTypes.audio.includes(mimeType as any)) {
          return OSS_CONFIG.maxFileSize.audio;
        }
        if (OSS_CONFIG.allowedMimeTypes.video.includes(mimeType as any)) {
          return OSS_CONFIG.maxFileSize.video;
        }
        if (OSS_CONFIG.allowedMimeTypes.documents.includes(mimeType as any)) {
          return OSS_CONFIG.maxFileSize.documents;
        }
        return OSS_CONFIG.maxFileSize.default;
      };

      // 验证文件大小（如果是Buffer）
      const fileSizeLimit = getFileSizeLimit(mimeType);
      if (Buffer.isBuffer(file) && file.length > fileSizeLimit) {
        return {
          success: false,
          error: `文件大小超过限制 (${fileSizeLimit / 1024 / 1024}MB)`
        };
      }

      // 生成文件路径
      const ossPath = this.generateOSSPath(originalName, options);

      // 执行上传
      const result = Buffer.isBuffer(file)
        ? await ossClient.put(ossPath, file)
        : await ossClient.put(ossPath, file);

      logger.info('文件上传成功', {
        ossPath,
        originalName,
        size: Buffer.isBuffer(file) ? file.length : 'unknown',
        mimeType
      });

      // 生成CDN URL
      const cdnUrl = `${OSS_CONFIG.cdnDomain}/${ossPath}`;

      return {
        success: true,
        url: result.url,
        cdnUrl,
        ossPath,
        fileInfo: {
          originalName,
          size: Buffer.isBuffer(file) ? file.length : 0,
          mimeType
        }
      };

    } catch (error) {
      const err = error as any;
      logger.error('OSS文件上传失败', {
        originalName,
        mimeType,
        message: err?.message ?? String(error),
        name: err?.name,
        code: err?.code,
        status: err?.status,
        requestId: err?.requestId,
        hostId: err?.hostId,
        params: err?.params,
        stack: err?.stack,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown upload error'
      };
    }
  }

  /**
   * 删除OSS文件
   * @param ossPath OSS文件路径
   */
  static async deleteFile(ossPath: string): Promise<{ success: boolean; error?: string }> {
    try {
      await ossClient.delete(ossPath);
      logger.info('文件删除成功', { ossPath });
      return { success: true };
    } catch (error) {
      logger.error('OSS文件删除失败', {
        error: error instanceof Error ? error.message : String(error),
        ossPath
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown delete error'
      };
    }
  }

  /**
   * 批量上传文件
   * @param files 文件列表
   * @param options 上传选项
   */
  static async uploadMultipleFiles(
    files: Array<{
      buffer: Buffer;
      originalName: string;
      mimeType: string;
    }>,
    options: UploadOptions
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = [];

    for (const file of files) {
      const result = await this.uploadFile(
        file.buffer,
        file.originalName,
        file.mimeType,
        options
      );
      results.push(result);
    }

    return results;
  }

  /**
   * 生成OSS文件路径
   * @param originalName 原始文件名
   * @param options 上传选项
   */
  private static generateOSSPath(originalName: string, options: UploadOptions): string {
    const folder = OSS_CONFIG.pathPrefixes[options.folder];
    const ext = path.extname(originalName);

    let filename: string;

    if (options.keepOriginalName) {
      // 保持原文件名，但添加时间戳避免重名
      const nameWithoutExt = path.basename(originalName, ext);
      filename = `${nameWithoutExt}_${Date.now()}${ext}`;
    } else if (options.filename) {
      // 使用指定文件名
      filename = options.filename.endsWith(ext) ? options.filename : `${options.filename}${ext}`;
    } else {
      // 生成UUID文件名
      filename = `${uuidv4()}${ext}`;
    }

    return `${folder}${filename}`;
  }

  /**
   * 获取文件签名URL（用于私有文件访问）
   * @param ossPath OSS文件路径
   * @param expires 过期时间（秒），默认3600秒
   */
  static async getSignedUrl(ossPath: string, expires: number = 3600): Promise<string> {
    try {
      const url = ossClient.signatureUrl(ossPath, { expires });
      return url;
    } catch (error) {
      logger.error('获取签名URL失败', {
        error: error instanceof Error ? error.message : String(error),
        ossPath
      });
      throw error;
    }
  }

  /**
   * 检查文件是否存在
   * @param ossPath OSS文件路径
   */
  static async fileExists(ossPath: string): Promise<boolean> {
    try {
      await ossClient.head(ossPath);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取文件信息
   * @param ossPath OSS文件路径
   */
  static async getFileInfo(ossPath: string) {
    try {
      const result = await ossClient.head(ossPath);
      return {
        success: true,
        size: parseInt((result.res.headers as any)['content-length'] || '0'),
        lastModified: (result.res.headers as any)['last-modified'],
        etag: (result.res.headers as any).etag,
        contentType: (result.res.headers as any)['content-type']
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export default OSSService;