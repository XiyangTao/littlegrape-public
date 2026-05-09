// API 相关类型定义

export interface HealthResponse {
  status: 'healthy' | 'unhealthy' | 'error';
  timestamp: string;
  uptime?: number;
  services?: {
    [serviceName: string]: 'running' | 'available' | 'healthy' | 'unhealthy' | 'error';
  };
}

/** 所有 API 模块方法的标准响应格式（axios 拦截器自动解包 response.data 后的结构） */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
}