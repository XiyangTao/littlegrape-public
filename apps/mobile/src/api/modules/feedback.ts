import { Client } from '../client';
import { ENDPOINTS } from '../endpoints';

declare module '../client' {
  interface Client {
    submitFeedback(data: {
      type: 'bug' | 'feature' | 'other';
      content: string;
      images?: string[];
      deviceInfo?: {
        platform: string;
        systemVersion: string;
        appVersion: string;
        deviceModel: string;
      };
    }): Promise<{
      success: boolean;
      message: string;
      data?: {
        feedback: {
          id: string;
          type: string;
          content: string;
          images: string[] | null;
          status: string;
          createdAt: string;
        };
      };
      error?: string;
    }>;
  }
}

// 提交反馈
Client.prototype.submitFeedback = async function(data: {
  type: 'bug' | 'feature' | 'other';
  content: string;
  images?: string[];
  deviceInfo?: {
    platform: string;
    systemVersion: string;
    appVersion: string;
    deviceModel: string;
  };
}): Promise<{
  success: boolean;
  message: string;
  data?: {
    feedback: {
      id: string;
      type: string;
      content: string;
      images: string[] | null;
      status: string;
      createdAt: string;
    };
  };
  error?: string;
}> {
  return this.api.post(ENDPOINTS.FEEDBACK, data);
};
