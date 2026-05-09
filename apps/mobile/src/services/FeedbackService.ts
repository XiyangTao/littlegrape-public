/**
 * 反馈服务
 * 封装反馈相关的 API 调用
 */
import { apiClient } from '@/api';

/**
 * 上传反馈附件
 */
export async function uploadFeedbackFile(formData: FormData): Promise<any> {
  try {
    return await apiClient.uploadFile(formData);
  } catch (error) {
    console.error('[FeedbackService] 上传附件失败:', error instanceof Error ? error.message : error);
    throw error;
  }
}

/**
 * 提交反馈
 */
export async function submitFeedback(params: {
  type: 'bug' | 'feature' | 'other';
  content: string;
  images?: string[];
  deviceInfo?: {
    platform: string;
    systemVersion: string;
    appVersion: string;
    deviceModel: string;
  };
}) {
  try {
    return await apiClient.submitFeedback(params);
  } catch (error) {
    console.error('[FeedbackService] 提交反馈失败:', error instanceof Error ? error.message : error);
    throw error;
  }
}
