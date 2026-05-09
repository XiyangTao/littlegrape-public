import axios, { AxiosInstance, AxiosError } from 'axios';
import i18n from '@/locales';
import { HealthResponse } from '@/types/api';
import { ASROptions, ASRResponse } from '@/types/speech';
import { API_GATEWAY_URL } from '@env';
import Constants from 'expo-constants';
import { ENDPOINTS } from './endpoints';
import { tokenManager } from '@/auth/TokenManager';
import type { AchievementEventResult } from './modules/achievement';

// 用户切换语义已交给 SessionContainer 接管 —— 拦截器内不再做 userId snapshot/校验。
// 各 piggyback handler 内部用 tryGetSession() 路由到当前 session 的 store，
// 未登录态自然 noop。
//
// Token 流转完全由 TokenManager 负责：拦截器只做 peek（请求时）和 invalidate（401 时）。
// 不再有 isRefreshing / failedQueue / setTokenGetter / setRefreshTokenCallback ——
// 多请求并发 401 时 invalidate 内部 singleflight 自然合并。

// ==================== 类型定义 ====================

interface Logger {
  log(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

interface ApiErrorResponse {
  error?: string;
  message?: string;
  quotaExceeded?: boolean;
}

type RequestConfig = NonNullable<AxiosError['config']>;
interface RetryableRequestConfig extends RequestConfig {
  _retry?: boolean;
  /** 请求时挂载的 access token —— invalidate 时传给 TokenManager 区分 stale */
  _tokenUsed?: string | null;
}

export class Client {
  public api: AxiosInstance;
  public baseUrl: string;
  public logger: Logger;

  // App版本号
  private appVersion = Constants.expoConfig?.version ?? '1.0.0';

  // 回调注册（替代 require 循环依赖）
  private onAchievementEvent?: (event: AchievementEventResult) => void;
  private onQuotaExceeded?: (skipPrompt: boolean) => void;
  private onUsagePiggyback?: (usage: { quotaStatus: string; usagePercentage: number; costConsumed: number }) => void;
  private onToast?: (message: string, type: 'error' | 'warning') => void;
  private getSessionSignal?: () => AbortSignal | undefined;

  constructor(baseUrl: string = API_GATEWAY_URL || 'http://localhost:3000', timeout: number = 60000) {
    this.baseUrl = baseUrl;
    this.logger = console;

    this.api = axios.create({
      baseURL: baseUrl,
      timeout: timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // 请求拦截器
    this.api.interceptors.request.use(
      (config) => {
        const token = tokenManager.peek();
        const retryableConfig = config as RetryableRequestConfig;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        // 记下本次请求用的 token —— 401 时给 invalidate 用，区分"是这个 token 失效"还是"已被换过"
        retryableConfig._tokenUsed = token;

        config.headers['x-app-version'] = this.appVersion;
        config.headers['x-app-language'] = i18n.language || 'en';

        // 挂载会话级 abort signal —— SessionContainer.destroy 时一次性级联取消所有 in-flight 请求。
        // signal provider 由 session/interceptorBridge 反向注入，避免 client 直接 import session 模块。
        if (!config.signal) {
          const sessionSignal = this.getSessionSignal?.();
          if (sessionSignal) {
            config.signal = sessionSignal;
          }
        }

        return config;
      },
      (error) => Promise.reject(error),
    );

    // 响应拦截器
    this.api.interceptors.response.use(
      (response) => {
        // 提取成就事件
        const event = response.data?.achievementEvent;
        if (event && typeof event === 'object' && Array.isArray(event.newAchievements)) {
          this.onAchievementEvent?.(event);
        }
        // 提取并剥离用量 piggyback（仅用量维度，不含会员字段）
        if (response.data?._usage) {
          const usage = response.data._usage;
          if (typeof usage === 'object' && usage.quotaStatus) {
            this.onUsagePiggyback?.(usage);
          }
          delete response.data._usage;
        }
        return response.data;
      },
      async (error: AxiosError) => {
        // 会话级取消（logout / 用户切换）：静默 reject，跳过所有副作用
        if (axios.isCancel(error)) {
          return Promise.reject(error);
        }

        const originalRequest = error.config as RetryableRequestConfig;

        // 401 → 让 TokenManager 决定是否刷新；同请求只重试一次
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          const stale = originalRequest._tokenUsed ?? '';
          try {
            await tokenManager.invalidate(stale);
            // 重发：拦截器自动注入新 token（peek 取到 refresh 后的值）
            return this.api.request(originalRequest);
          } catch (refreshError) {
            // refresh 失败时 TokenManager 已自动 clear，AuthStore 通过 subscribe 触发 logout
            return Promise.reject(refreshError);
          }
        }

        // 配额超限处理
        if (error.response?.status === 429) {
          const data = error.response.data as ApiErrorResponse;
          if (data?.quotaExceeded) {
            const skipPrompt = (originalRequest as any)?.metadata?.skipQuotaPrompt === true;
            this.onQuotaExceeded?.(skipPrompt);

            const quotaError = Object.assign(
              new Error(data.error || i18n.t('quota.exceededShort')),
              { quotaExceeded: true }
            );
            return Promise.reject(quotaError);
          }
        }

        // 其他错误处理
        if (error.response) {
          const status = error.response.status;
          console.error('[ApiClient] 服务器返回错误:', {
            status,
            url: error.config?.url,
            data: JSON.stringify(error.response.data).substring(0, 500),
          });
          if (error.response.data) {
            if (typeof error.response.data === 'string') {
              error.message = error.response.data;
            } else if (typeof error.response.data === 'object') {
              const data = error.response.data as ApiErrorResponse;
              error.message = data.error || data.message || JSON.stringify(data);
            }
          }
          const skipServerToast = (originalRequest as any)?.metadata?.skipErrorToast === true;
          if (status >= 500 && !skipServerToast) {
            this.onToast?.(i18n.t('common.serverError'), 'error');
          }
        } else if (error.request) {
          console.error('[ApiClient] 网络请求无响应:', {
            url: error.config?.url,
            baseURL: error.config?.baseURL,
            method: error.config?.method,
            timeout: error.config?.timeout,
            code: error.code,
            message: error.message,
          });
          error.message = i18n.t('common.networkError');
          Object.assign(error, { isNetworkError: true });
          const meta = (originalRequest as any)?.metadata;
          const skipNetworkToast =
            meta?.skipNetworkErrorToast === true || meta?.skipErrorToast === true;
          if (!skipNetworkToast) {
            this.onToast?.(i18n.t('common.networkError'), 'error');
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // 健康检查
  health(): Promise<HealthResponse> {
    return this.api.get(ENDPOINTS.HEALTH);
  }

  // 语音识别
  speechRecognize(audioUri: string, options: ASROptions = {}): Promise<ASRResponse> {
    const formData = new FormData();

    const normalizedUri = audioUri.startsWith('file://') ? audioUri : `file://${audioUri}`;

    formData.append('audio', {
      uri: normalizedUri,
      type: 'audio/wav',
      name: 'recording.wav',
    } as any);

    formData.append('engine', options.engine || 'azure');
    formData.append('language', options.language || 'en-US');
    if (options.enableWordLevelTimestamps) {
      formData.append('enableWordLevelTimestamps', 'true');
    }

    return this.api.post(ENDPOINTS.SPEECH_ASR, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    });
  }

  // 设置成就事件 handler（覆盖式：模块顶层注册一次，handler 内部 tryGetSession 路由到当前 session）
  setAchievementHandler(handler: (event: AchievementEventResult) => void) {
    this.onAchievementEvent = handler;
  }

  // 设置配额超限 handler。handler 接收 skipPrompt：true 时调用方应仅刷新状态不弹 modal。
  setQuotaHandler(handler: (skipPrompt: boolean) => void) {
    this.onQuotaExceeded = handler;
  }

  // 设置用量 piggyback handler（只更新用量字段，会员字段由 fetchQuota / WS 推送独立维护）
  setUsagePiggybackHandler(handler: (usage: { quotaStatus: string; usagePercentage: number; costConsumed: number }) => void) {
    this.onUsagePiggyback = handler;
  }

  // 设置 Toast handler
  setToastHandler(handler: (message: string, type: 'error' | 'warning') => void) {
    this.onToast = handler;
  }

  // 反向注入 session abort signal provider —— 让 client 不直接 import session 模块，
  // 与上面 4 个 handler 同模式。由 session/interceptorBridge 在启动期注册。
  setSessionSignalProvider(provider: () => AbortSignal | undefined) {
    this.getSessionSignal = provider;
  }

  // 测试连接 - 兼容旧API
  async testConnection(): Promise<boolean> {
    const health = await this.health();
    return health.status === 'healthy';
  }
}
