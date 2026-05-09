import type { ApiResponse } from '@/types/api';

/**
 * 将返回 ApiResponse<T> 的 API 调用解包为 T
 * success=false 时抛出 Error，让 React Query 正确设置 isError=true 并触发 retry
 *
 * 用法：queryFn: () => apiQuery(() => apiClient.getGrammarCategories())
 */
export async function apiQuery<T>(apiFn: () => Promise<ApiResponse<T>>): Promise<T> {
  const res = await apiFn();
  if (!res?.success) {
    throw new Error(res?.message ?? '请求失败');
  }
  return res.data;
}

/** 从 Error 中提取可读错误信息 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message || '请求失败';
  return '未知错误';
}
