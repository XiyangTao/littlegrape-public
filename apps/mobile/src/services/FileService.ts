/**
 * 文件服务
 * 封装文件上传相关的 API 调用
 */
import { apiClient } from '@/api';

/**
 * 上传文件
 */
export async function uploadFile(formData: FormData): Promise<any> {
  try {
    return await apiClient.uploadFile(formData);
  } catch (error) {
    console.error('[FileService] 上传文件失败:', error instanceof Error ? error.message : error);
    throw error;
  }
}
