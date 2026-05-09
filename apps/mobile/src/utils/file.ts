import { File } from 'expo-file-system';

export class FileUtils {
  // 获取文件信息（用于调试）
  static async getFileInfo(uri: string) {
    try {
      // 确保路径以file://开头（expo-file-system要求）
      const normalizedUri = uri.startsWith('file://') ? uri : `file://${uri}`;
      const file = new File(normalizedUri);
      const fileInfo = await file.info();
      return fileInfo;
    } catch (error) {
      console.error('获取文件信息失败:', error);
      return null;
    }
  }

  // 验证音频文件格式
  static async validateAudioFile(uri: string): Promise<{
    isValid: boolean;
    error?: string;
    info?: any;
  }> {
    try {
      const fileInfo = await this.getFileInfo(uri);

      if (!fileInfo) {
        return { isValid: false, error: '无法获取文件信息' };
      }

      // 检查文件大小（不能为空）
      if (fileInfo.size === 0) {
        return { isValid: false, error: '文件大小为0' };
      }

      // 检查文件扩展名
      const validExtensions = ['.wav', '.mp3', '.m4a', '.mp4'];
      const hasValidExtension = validExtensions.some(ext => uri.toLowerCase().endsWith(ext));

      if (!hasValidExtension) {
        return {
          isValid: false,
          error: `不支持的文件格式，支持的格式：${validExtensions.join(', ')}`
        };
      }

      return {
        isValid: true,
        info: fileInfo
      };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : '文件验证失败'
      };
    }
  }

  // 格式化文件大小
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // 格式化时长
  static formatDuration(ms: number): string {
    return (ms / 1000).toFixed(1) + 's';
  }
}