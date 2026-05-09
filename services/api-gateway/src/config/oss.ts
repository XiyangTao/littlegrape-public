import OSS from 'ali-oss';
import { config } from '@/config';

// OSS客户端配置
export const ossClient = new OSS({
  region: config.oss.region,
  accessKeyId: config.oss.accessKeyId,
  accessKeySecret: config.oss.accessKeySecret,
  bucket: config.oss.bucketName,
  timeout: 60000,
  // 启用HTTPS
  secure: true,
});

// OSS配置信息
export const OSS_CONFIG = {
  bucket: config.oss.bucketName,
  region: config.oss.region,
  cdnDomain: config.oss.cdnDomain,
  // 允许的文件类型 (按场景分类)
  allowedMimeTypes: {
    // 图片类型
    images: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'image/heic',
      'image/heif',
      'image/bmp',
      'image/tiff',
      'image/tif',
      'image/avif'
    ],
    // 音频类型
    audio: [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/aac',
      'audio/ogg',
      'audio/webm',
      'audio/m4a'
    ],
    // 视频类型
    video: [
      'video/mp4',
      'video/mpeg',
      'video/quicktime',
      'video/webm',
      'video/avi'
    ],
    // 文档类型
    documents: [
      'application/pdf',
      'text/plain',
      'application/json'
    ]
  },
  // 文件大小限制 (按类型)
  maxFileSize: {
    images: 5 * 1024 * 1024,    // 5MB
    audio: 50 * 1024 * 1024,     // 50MB
    video: 100 * 1024 * 1024,    // 100MB
    documents: 10 * 1024 * 1024, // 10MB
    default: 10 * 1024 * 1024    // 默认10MB
  },
  // 文件路径前缀
  pathPrefixes: {
    scenarios: 'littlegrape/scenarios/',
    avatars: 'littlegrape/avatars/',
    audio: 'littlegrape/audio/',
    images: 'littlegrape/images/',
    feedback: 'littlegrape/feedback/',
    temp: 'littlegrape/temp/'
  }
} as const;