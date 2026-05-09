import * as ImageManipulator from 'expo-image-manipulator';

/**
 * 图片智能压缩
 * 根据文件大小自动选择压缩策略
 * @param uri 图片URI
 * @param maxFileSize 最大文件大小（字节），默认2MB
 * @returns 处理后的图片URI，失败返回null
 */
export async function smartCompressImage(
  uri: string,
  maxFileSize: number = 2 * 1024 * 1024
): Promise<string | null> {
  try {
    // 获取文件信息
    const response = await fetch(uri);
    const blob = await response.blob();
    const fileSize = blob.size;

    // 小于最大尺寸的文件不需要压缩，直接返回
    if (fileSize <= maxFileSize) {
      return uri;
    }

    // 根据文件大小确定压缩策略
    let compress = 0.7; // 默认压缩质量
    let maxWidth = 1000;

    if (fileSize > 10 * 1024 * 1024) {
      // 超过10MB
      compress = 0.5;
      maxWidth = 800;
    } else if (fileSize > 5 * 1024 * 1024) {
      // 5-10MB
      compress = 0.6;
      maxWidth = 900;
    }

    // 执行压缩
    let manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: maxWidth } }],
      {
        compress,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    // 检查压缩后的文件大小
    const compressedResponse = await fetch(manipResult.uri);
    const compressedBlob = await compressedResponse.blob();
    const compressedSize = compressedBlob.size;

    // 如果仍然超过最大尺寸，再次压缩
    if (compressedSize > maxFileSize) {
      manipResult = await ImageManipulator.manipulateAsync(
        manipResult.uri,
        [{ resize: { width: 600 } }],
        {
          compress: 0.5,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

    }

    return manipResult.uri;
  } catch (error) {
    console.error('图片处理失败:', error);
    return null;
  }
}

