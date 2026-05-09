/**
 * SessionScope — React Provider 桥
 *
 * 为子树提供"当前 session 的 QueryClient"。
 * - 已登录：使用 SessionContainer.queryClient（整个 cache 跟 session 同生命周期）
 * - 登录前 / 登出态：使用 fallback QueryClient（让 LoginScreen 的 useQuery 仍可工作）
 *
 * 不给 QueryClientProvider 加 key —— client prop 切换已经让所有 useQuery 重新订阅新 client，
 * cache 隔离由 SessionContainer.destroy 内部的 cancelQueries + clear（以及 fallback client 在
 * registry.endSession 后的主动 clear）兜住。加 key 会让整棵子树（AppContent 的局部 state）
 * 在登录瞬间被卸载重挂，导致 splash / initApp 重新跑一遍。
 */

import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { useSession } from './useSession';
import { FALLBACK_QUERY_CLIENT } from './fallbackQueryClient';

export function SessionScope({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const client = session?.queryClient ?? FALLBACK_QUERY_CLIENT;
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
