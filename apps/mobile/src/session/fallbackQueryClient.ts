/**
 * Fallback QueryClient —— 登录前 / 登出态使用。
 *
 * 模块级单例：登录页等浅层页面的 useQuery 没有 SessionContainer.queryClient 可用，
 * 退化到这个 client 上。同一进程内永久存活，只在 endSession 时主动 clear()
 * 防止跨 session cache 串读（用户登出后切回登录页又登录另一账号的场景）。
 */

import { QueryClient } from '@tanstack/react-query';

export const FALLBACK_QUERY_CLIENT = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
