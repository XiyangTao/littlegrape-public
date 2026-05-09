/**
 * TokenManager — Token 生命周期统一服务（App scope 单例）
 *
 * 职责：
 *   - 持久化 access/refresh token（独占 AsyncStorage 中的 token KEY）
 *   - 提供同步 peek / 异步 ensureValid / 失效 invalidate / 订阅 subscribe / 清理 clear
 *   - 内部 singleflight 保证多并发 refresh 请求合并
 *   - refresh 用独立 axios 实例（不走业务拦截器，避免 401 端点排除问题）
 *
 * 与 AuthStore 的边界：
 *   - AuthStore 只管 user_profile 持久化与登录态状态机
 *   - TokenManager 只管 token —— refresh 失败自动 clear，AuthStore 通过 subscribe(null)
 *     感知失活并触发 logout
 *
 * 没有 setTokenGetter / setRefreshTokenCallback / AuthBridge —— 直接 import 单例。
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosInstance } from 'axios';
import { API_GATEWAY_URL } from '@env';
import Constants from 'expo-constants';
import { ENDPOINTS } from '@/api/endpoints';
import { singleflight, type Singleflight } from '@/utils/concurrency';
import type { AuthTokens } from '@/types/auth';

const STORAGE_KEYS = {
  ACCESS_TOKEN: '@access_token',
  REFRESH_TOKEN: '@refresh_token',
} as const;

type TokenListener = (token: string | null) => void;

class TokenManager {
  private accessToken: string | null = null;
  private refreshTokenValue: string | null = null;
  private listeners = new Set<TokenListener>();
  private refreshFlight: Singleflight<string>;

  /** 独立 axios 实例 —— 不挂业务拦截器，刷新请求永远不会触发 401 重入 */
  private readonly refreshApi: AxiosInstance;

  constructor() {
    this.refreshFlight = singleflight(() => this.doRefresh());
    this.refreshApi = axios.create({
      baseURL: API_GATEWAY_URL || 'http://localhost:3000',
      timeout: 15_000,
      headers: {
        'Content-Type': 'application/json',
        'x-app-version': Constants.expoConfig?.version ?? '1.0.0',
      },
    });
  }

  // ==================== 启动 / 写入 ====================

  /** 启动时从 AsyncStorage 灌入。不触发 notify（启动期订阅者尚未挂载） */
  async hydrate(): Promise<void> {
    try {
      const [[, accessToken], [, refreshToken]] = await AsyncStorage.multiGet([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
      ]);
      if (accessToken && refreshToken) {
        this.accessToken = accessToken;
        this.refreshTokenValue = refreshToken;
      }
    } catch (e) {
      console.warn('[TokenManager] hydrate failed:', e);
    }
  }

  /** 登录成功 / 显式注入新 token。写内存 + AsyncStorage + notify */
  async setTokens(tokens: AuthTokens): Promise<void> {
    const changed = this.accessToken !== tokens.accessToken;
    this.accessToken = tokens.accessToken;
    this.refreshTokenValue = tokens.refreshToken;
    try {
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken],
        [STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken],
      ]);
    } catch (e) {
      console.warn('[TokenManager] setTokens persist failed:', e);
    }
    if (changed) this.notify();
  }

  // ==================== 读取 ====================

  /** 同步读，给 axios 请求拦截器与 WS 鉴权握手用 */
  peek(): string | null {
    return this.accessToken;
  }

  /**
   * 取一个有效 token：当前有则返回，缺失则等待 refresh（singleflight 合并并发）。
   * 若 refresh token 也缺失，throw —— 用户处于未登录态。
   */
  async ensureValid(): Promise<string> {
    if (this.accessToken) return this.accessToken;
    if (!this.refreshTokenValue) throw new Error('[TokenManager] no refresh token');
    return this.refreshFlight();
  }

  /**
   * 调用方告知 stale token 已被服务端拒绝（HTTP 401 / WS INVALID_TOKEN）。
   * - 若 accessToken 已被换过（其他路径已 refresh），直接返回当前新 token
   * - 否则触发一次 refresh（singleflight 合并并发）
   * 失败时自动 clear，订阅者收到 null 自行处理登出。
   */
  async invalidate(staleToken: string): Promise<string> {
    if (this.accessToken && this.accessToken !== staleToken) {
      return this.accessToken;
    }
    if (!this.refreshTokenValue) throw new Error('[TokenManager] no refresh token');
    return this.refreshFlight();
  }

  // ==================== 订阅 ====================

  /**
   * 订阅 token 变更：
   *   - 设了新值且与旧值不同 → notify(newToken)
   *   - clear → notify(null)
   * 返回 unsubscribe。
   */
  subscribe(fn: TokenListener): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  // ==================== 清理 ====================

  /** logout 时调；清内存 + AsyncStorage + notify(null) */
  async clear(): Promise<void> {
    const had = this.accessToken !== null;
    this.accessToken = null;
    this.refreshTokenValue = null;
    try {
      await AsyncStorage.multiRemove([STORAGE_KEYS.ACCESS_TOKEN, STORAGE_KEYS.REFRESH_TOKEN]);
    } catch (e) {
      console.warn('[TokenManager] clear persist failed:', e);
    }
    if (had) this.notify();
  }

  // ==================== 内部 ====================

  private async doRefresh(): Promise<string> {
    const refreshToken = this.refreshTokenValue;
    if (!refreshToken) throw new Error('[TokenManager] no refresh token at refresh time');

    try {
      const res = await this.refreshApi.post(ENDPOINTS.AUTH_TOKEN_REFRESH, { refreshToken });
      const data = res.data;
      if (!data?.success || !data?.data?.tokens) {
        throw new Error(data?.error || 'refresh failed');
      }
      const tokens = data.data.tokens as AuthTokens;
      await this.setTokens(tokens); // 内部 notify 已处理
      return tokens.accessToken;
    } catch (e) {
      // 刷新失败 → 视为登录态失活：清状态 + notify(null)，让 AuthStore 串成 logout
      await this.clear();
      throw e;
    }
  }

  private notify(): void {
    const snapshot = this.accessToken;
    for (const fn of this.listeners) {
      try {
        fn(snapshot);
      } catch (e) {
        console.error('[TokenManager] listener error:', e);
      }
    }
  }
}

export const tokenManager = new TokenManager();

/**
 * 判断 WS 错误消息是否为 token 失效（业务流式 hooks / PushChannel 用）。
 * 服务端约定：error 消息的 `code === 'INVALID_TOKEN'` 表示需要 refresh。
 */
export function isInvalidTokenWsError(data: unknown): boolean {
  return typeof data === 'object'
    && data !== null
    && (data as { code?: unknown }).code === 'INVALID_TOKEN';
}

