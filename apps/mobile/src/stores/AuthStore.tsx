/**
 * 认证状态 Store
 *
 * 职责收敛：
 *   - 用户信息（user）的状态机与持久化（@user_profile）
 *   - 登录态切换（login / logout / register / 验证码 / 绑定 / 改密）
 *   - 启动期 checkAuthStatus
 *
 * 不再负责：
 *   - Token 流转（hydrate / refresh / clear）—— 完全交给 TokenManager
 *   - WebSocket 关闭 —— SessionContainer.destroy 内部统一处理（PushChannel + 业务 wsRegistry）
 *
 * 失活感知：模块顶层订阅 tokenManager —— refresh 失败时 TokenManager 自动 clear，
 * 订阅回调收到 null + user 仍存在则触发 forceLogout，把状态机推回未登录态。
 *
 * 登录态判断：useSession() != null（与本 store 无关），杜绝半登录中间态幻象。
 */

import React, { useEffect } from 'react';
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '@/api';
import { startSession, endSession } from '@/session/registry';
import { useAppStore } from '@/stores/AppStore';
import { tokenManager } from '@/auth/TokenManager';
import { safe, singleflight, type Singleflight } from '@/utils/concurrency';
import type { User, AuthTokens } from '@/types/auth';
import { getErrorMessage } from '@/utils/errorUtils';

// ==================== 类型定义 ====================

interface AuthState {
  /** 是否正在加载 */
  isLoading: boolean;
  /** 是否正在检查认证状态（启动时） */
  isCheckingAuthStatus: boolean;
  /** 用户信息 */
  user: User | null;
  /** 错误信息 */
  error: string | null;
}

interface AuthActions {
  // ------ 核心操作 ------
  login: (identifier: string, password: string) => Promise<void>;
  loginWithPhone: (phone: string, verifyCode: string) => Promise<void>;
  loginWithWechat: (code: string) => Promise<void>;
  loginWithCarrier: (accessToken: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    username: string,
    verificationToken: string,
    nickname?: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;

  // ------ 验证码操作 ------
  sendEmailVerificationCode: (email: string) => Promise<void>;
  verifyEmailCode: (email: string, code: string) => Promise<string>;
  sendPhoneVerificationCode: (phone: string) => Promise<void>;

  // ------ 密码重置 ------
  requestPasswordReset: (phone: string) => Promise<void>;
  verifyPasswordResetCode: (phone: string, code: string) => Promise<string>;
  completePasswordReset: (resetToken: string, newPassword: string) => Promise<void>;

  // ------ 用户资料 ------
  updateProfile: (data: {
    username?: string;
    nickname?: string;
    avatar?: string;
    gender?: 'male' | 'female' | 'private';
    birthday?: string;
    bio?: string;
  }) => Promise<void>;

  // ------ 绑定操作 ------
  sendBindPhoneCode: (phone: string) => Promise<void>;
  bindPhone: (phone: string, verifyCode: string) => Promise<void>;
  bindWechat: (code: string) => Promise<void>;

  // ------ 密码操作 ------
  setPassword: (newPassword: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;

  // ------ 工具方法 ------
  clearError: () => void;
}

type AuthStore = AuthState & AuthActions;

// ==================== 存储键名 ====================

const STORAGE_KEYS = {
  USER_PROFILE: '@user_profile',
} as const;

// ==================== 默认值 ====================

const initialState: AuthState = {
  isLoading: false,
  isCheckingAuthStatus: true,
  user: null,
  error: null,
};

// ==================== 辅助函数 ====================

async function saveUserProfile(user: User): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(user));
  } catch (error) {
    console.warn('[AuthStore] Failed to save user profile:', error);
  }
}

async function clearUserProfile(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
  } catch (error) {
    console.warn('[AuthStore] Failed to clear user profile:', error);
  }
}

async function loadUserProfile(): Promise<User | null> {
  try {
    const str = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    return str ? (JSON.parse(str) as User) : null;
  } catch (error) {
    console.warn('[AuthStore] Failed to load user profile:', error);
    return null;
  }
}

/**
 * 两组单飞锁：
 *
 * - forceLogoutFlight: 所有"用户失活"路径（手动 logout / refresh fail 触发的 subscribe(null)）
 *   共享同一清理 Promise。
 * - checkAuthStatusFlight: React 18 StrictMode 下 AuthProvider 的 useEffect 跑两次时去重。
 *
 * Token 刷新 singleflight 在 TokenManager 内部 —— 这里不再需要 refreshTokenFlight。
 */
let forceLogoutFlight: Singleflight<void>;
let checkAuthStatusFlight: Singleflight<void>;

/**
 * 强制登出：清状态 → endSession（内部关 PushChannel + 业务 WS + 取消 in-flight 请求）→
 * tokenManager.clear → 清 user_profile。
 *
 * 每步 safe() 包裹：单步失败不阻断后续清理。
 */
async function doForceLogout(set: (state: Partial<AuthState>) => void): Promise<void> {
  set({
    isLoading: false,
    isCheckingAuthStatus: false,
    user: null,
    error: null,
  });

  await safe('AuthStore.endSession', () => endSession());
  await safe('AuthStore.tokenManager.clear', () => tokenManager.clear());
  await safe('AuthStore.clearUserProfile', () => clearUserProfile());
}

async function doCheckAuthStatus(
  set: (state: Partial<AuthState>) => void,
): Promise<void> {
  try {
    set({ isCheckingAuthStatus: true });

    // 并行加载 token + user_profile（独立 KEY，互不依赖）
    await tokenManager.hydrate();
    const user = await loadUserProfile();

    // 任一缺失则视为未登录态。离线启动时 token 仍在内存 —— 后续业务请求若 401 自动 refresh
    if (!user || !tokenManager.peek()) {
      set({ isCheckingAuthStatus: false });
      return;
    }

    // 信任本地 token：业务请求遇到 401 时拦截器走 invalidate → refresh，
    // 失败时 TokenManager 自动 clear → 模块顶层 subscribe 触发 forceLogout
    set({ user, isCheckingAuthStatus: false });
    await startSession(user.id);
    useAppStore.getState().loadAuthenticatedResources();
  } catch (error) {
    console.warn('[AuthStore] Auth status check failed:', error);
    await safe('AuthStore.checkAuthStatus.cleanup', () => clearUserProfile());
    await safe('AuthStore.checkAuthStatus.tokenClear', () => tokenManager.clear());
    set({
      user: null,
      isCheckingAuthStatus: false,
      error: null,
    });
  }
}

/**
 * 处理登录/注册成功后的通用逻辑。
 *
 * 时序关键：tokenManager.setTokens 必须先于 startSession ——
 *   PushChannel 启动时通过 ensureValid() 拿 token，需要内存中已就位。
 *   user 也在 startSession 前 set —— SessionContainer 内部副作用如 SyncManager
 *   不依赖 store user，所以顺序对调亦可，但保持"状态进店再 startSession"更直观。
 */
async function handleAuthSuccess(
  set: (state: Partial<AuthState>) => void,
  response: { success: boolean; data?: { user: User; tokens: AuthTokens }; error?: string },
  fallbackError: string,
): Promise<void> {
  if (response.success && response.data) {
    const { user, tokens } = response.data;

    // 1. token 入内存 + AsyncStorage —— PushChannel subscribe 此时还未挂载，notify 安全
    await tokenManager.setTokens(tokens);
    // 2. user 入 AsyncStorage
    await saveUserProfile(user);

    // 3. 启动新 session（内部 await endSession 清理上一轮，PushChannel.start 通过 ensureValid 拿 token）
    await startSession(user.id);

    // 4. 一次性 set 完最终状态
    set({
      user,
      isLoading: false,
      isCheckingAuthStatus: false,
      error: null,
    });

    // 5. App scope 资源
    useAppStore.getState().loadAuthenticatedResources();
  } else {
    throw new Error(response.error || fallbackError);
  }
}

// ==================== Store 实现 ====================

export const useAuthStore = create<AuthStore>()((set, get) => {
  forceLogoutFlight = singleflight(() => doForceLogout(set));
  checkAuthStatusFlight = singleflight(() => doCheckAuthStatus(set));

  return {
    ...initialState,

    // ====== 核心操作 ======

    login: async (identifier, password) => {
      try {
        set({ error: null, isLoading: true });
        const response = await apiClient.loginWithPassword({ identifier, password });
        await handleAuthSuccess(set, response, 'Login failed');
      } catch (error) {
        set({ error: getErrorMessage(error), isLoading: false });
        throw error;
      }
    },

    loginWithPhone: async (phone, verifyCode) => {
      try {
        set({ error: null, isLoading: true });
        const response = await apiClient.loginWithPhone({ phone, verifyCode });
        await handleAuthSuccess(set, response, 'Phone login failed');
      } catch (error) {
        set({ error: getErrorMessage(error), isLoading: false });
        throw error;
      }
    },

    loginWithWechat: async (code) => {
      try {
        set({ error: null, isLoading: true });
        const response = await apiClient.loginWithWechat(code);
        await handleAuthSuccess(set, response, 'WeChat login failed');
      } catch (error) {
        set({ error: getErrorMessage(error), isLoading: false });
        throw error;
      }
    },

    loginWithCarrier: async (accessToken) => {
      try {
        set({ error: null, isLoading: true });
        const response = await apiClient.loginWithCarrier(accessToken);
        await handleAuthSuccess(set, response, 'Carrier login failed');
      } catch (error) {
        set({ error: getErrorMessage(error), isLoading: false });
        throw error;
      }
    },

    register: async (email, password, username, verificationToken, nickname) => {
      try {
        set({ error: null, isLoading: true });
        const response = await apiClient.registerWithEmail({
          email,
          password,
          username,
          nickname,
          verificationToken,
        });
        await handleAuthSuccess(set, response, 'Registration failed');
      } catch (error) {
        set({ error: getErrorMessage(error), isLoading: false });
        throw error;
      }
    },

    logout: async () => {
      try {
        await forceLogoutFlight();
      } catch (error) {
        console.warn('[AuthStore] Logout failed:', error);
      }
    },

    checkAuthStatus: () => checkAuthStatusFlight(),

    // ====== 验证码操作 ======

    sendEmailVerificationCode: async (email) => {
      try {
        set({ error: null, isLoading: true });
        const response = await apiClient.sendEmailVerificationCode(email, 'register');

        if (!response.success) {
          throw new Error(response.message || 'Failed to send verification code');
        }
      } catch (error) {
        set({ error: getErrorMessage(error) });
        throw error;
      } finally {
        set({ isLoading: false });
      }
    },

    verifyEmailCode: async (email, code) => {
      try {
        set({ error: null, isLoading: true });
        const response = await apiClient.verifyEmailCode(email, code, 'register');

        if (response.success && response.data?.verificationToken) {
          return response.data.verificationToken;
        } else {
          throw new Error(response.message || 'Email verification failed');
        }
      } catch (error) {
        set({ error: getErrorMessage(error) });
        throw error;
      } finally {
        set({ isLoading: false });
      }
    },

    sendPhoneVerificationCode: async (phone) => {
      try {
        set({ error: null, isLoading: true });
        const response = await apiClient.sendPhoneVerificationCode(phone);

        if (!response.success) {
          throw new Error(response.error || 'Failed to send verification code');
        }
      } catch (error) {
        set({ error: getErrorMessage(error) });
        throw error;
      } finally {
        set({ isLoading: false });
      }
    },

    // ====== 密码重置 ======

    requestPasswordReset: async (phone) => {
      try {
        await apiClient.requestPasswordReset(phone);
      } catch (error) {
        console.warn('[AuthStore] Request password reset failed:', error instanceof Error ? error.message : 'Unknown error');
        throw error;
      }
    },

    verifyPasswordResetCode: async (phone, code) => {
      try {
        const response = await apiClient.verifyPasswordResetCode(phone, code);
        if (response.success && response.data?.resetToken) {
          return response.data.resetToken;
        }
        throw new Error('Invalid response from server');
      } catch (error) {
        console.warn('[AuthStore] Verify password reset code failed:', error instanceof Error ? error.message : 'Unknown error');
        throw error;
      }
    },

    completePasswordReset: async (resetToken, newPassword) => {
      try {
        await apiClient.completePasswordReset(resetToken, newPassword);
      } catch (error) {
        console.warn('[AuthStore] Complete password reset failed:', error instanceof Error ? error.message : 'Unknown error');
        throw error;
      }
    },

    // ====== 用户资料 ======

    updateProfile: async (data) => {
      try {
        set({ error: null, isLoading: true });
        const response = await apiClient.updateUserProfile(data);

        if (response.success && response.data) {
          const updatedUser = response.data.user;
          await saveUserProfile(updatedUser);
          set({ user: updatedUser });
        } else {
          throw new Error(response.error || 'Profile update failed');
        }
      } catch (error) {
        set({ error: getErrorMessage(error) });
        throw error;
      } finally {
        set({ isLoading: false });
      }
    },

    // ====== 绑定操作 ======

    sendBindPhoneCode: async (phone) => {
      try {
        set({ error: null });
        const response = await apiClient.sendBindPhoneCode(phone);
        if (!response.success) {
          throw new Error(response.error || 'Failed to send verification code');
        }
      } catch (error) {
        set({ error: getErrorMessage(error) });
        throw error;
      }
    },

    bindPhone: async (phone, verifyCode) => {
      try {
        set({ error: null });
        const response = await apiClient.bindPhone(phone, verifyCode);

        if (response.success && response.data) {
          const updatedUser = response.data.user;
          await saveUserProfile(updatedUser);
          set({ user: updatedUser });
        } else {
          throw new Error(response.error || 'Bind phone failed');
        }
      } catch (error) {
        set({ error: getErrorMessage(error) });
        throw error;
      }
    },

    bindWechat: async (code) => {
      try {
        set({ error: null });
        const response = await apiClient.bindWechat(code);

        if (response.success && response.data) {
          const updatedUser = response.data.user;
          await saveUserProfile(updatedUser);
          set({ user: updatedUser });
        } else {
          throw new Error(response.error || 'Bind WeChat failed');
        }
      } catch (error) {
        set({ error: getErrorMessage(error) });
        throw error;
      }
    },

    // ====== 密码操作 ======

    setPassword: async (newPassword) => {
      try {
        set({ error: null });
        const response = await apiClient.setPassword(newPassword);

        if (response.success) {
          const { user } = get();
          if (user) {
            const updatedUser = { ...user, hasPassword: true };
            await saveUserProfile(updatedUser);
            set({ user: updatedUser });
          }
        } else {
          throw new Error(response.error || 'Set password failed');
        }
      } catch (error) {
        set({ error: getErrorMessage(error) });
        throw error;
      }
    },

    changePassword: async (currentPassword, newPassword) => {
      try {
        set({ error: null });
        const response = await apiClient.changePassword(currentPassword, newPassword);

        if (!response.success) {
          throw new Error(response.error || 'Change password failed');
        }
      } catch (error) {
        set({ error: getErrorMessage(error) });
        throw error;
      }
    },

    // ====== 工具方法 ======

    clearError: () => set({ error: null }),
  };
});

// ==================== TokenManager 失活桥接 ====================

/**
 * 监听 TokenManager 的 token 变更：refresh 失败时 TokenManager 自动 clear → notify(null)。
 * 此时 store 中 user 仍存在，需要把状态机推回未登录态（清 user_profile + endSession）。
 *
 * 反应式取代显式注入 onAuthFailure handler：单一真理之源、订阅自然解耦。
 */
tokenManager.subscribe((token) => {
  if (token === null && useAuthStore.getState().user) {
    forceLogoutFlight().catch((e) => {
      console.warn('[AuthStore] forceLogout via tokenManager subscribe failed:', e);
    });
  }
});

// ==================== 便捷 Hooks ====================

/** 获取认证状态
 *
 * 注意：登录态请用 useSession() != null 判断，本 hook 不再返回 isAuthenticated / tokens / refreshToken。
 */
export function useAuth() {
  const isLoading = useAuthStore((s) => s.isLoading);
  const isCheckingAuthStatus = useAuthStore((s) => s.isCheckingAuthStatus);
  const user = useAuthStore((s) => s.user);
  const error = useAuthStore((s) => s.error);

  const login = useAuthStore((s) => s.login);
  const loginWithPhone = useAuthStore((s) => s.loginWithPhone);
  const loginWithWechat = useAuthStore((s) => s.loginWithWechat);
  const loginWithCarrier = useAuthStore((s) => s.loginWithCarrier);
  const register = useAuthStore((s) => s.register);
  const logout = useAuthStore((s) => s.logout);
  const clearError = useAuthStore((s) => s.clearError);
  const checkAuthStatus = useAuthStore((s) => s.checkAuthStatus);

  const sendEmailVerificationCode = useAuthStore((s) => s.sendEmailVerificationCode);
  const verifyEmailCode = useAuthStore((s) => s.verifyEmailCode);
  const sendPhoneVerificationCode = useAuthStore((s) => s.sendPhoneVerificationCode);

  const requestPasswordReset = useAuthStore((s) => s.requestPasswordReset);
  const verifyPasswordResetCode = useAuthStore((s) => s.verifyPasswordResetCode);
  const completePasswordReset = useAuthStore((s) => s.completePasswordReset);

  const updateProfile = useAuthStore((s) => s.updateProfile);

  const sendBindPhoneCode = useAuthStore((s) => s.sendBindPhoneCode);
  const bindPhone = useAuthStore((s) => s.bindPhone);
  const bindWechat = useAuthStore((s) => s.bindWechat);

  const setPassword = useAuthStore((s) => s.setPassword);
  const changePassword = useAuthStore((s) => s.changePassword);

  return {
    // 状态
    isLoading,
    isCheckingAuthStatus,
    user,
    error,

    // 操作
    login,
    loginWithPhone,
    loginWithWechat,
    loginWithCarrier,
    register,
    logout,
    clearError,
    checkAuthStatus,

    sendEmailVerificationCode,
    verifyEmailCode,
    sendPhoneVerificationCode,

    requestPasswordReset,
    verifyPasswordResetCode,
    completePasswordReset,

    updateProfile,

    sendBindPhoneCode,
    bindPhone,
    bindWechat,

    setPassword,
    changePassword,
  };
}

/** 获取用户信息 */
export function useCurrentUser() {
  return useAuthStore((s) => s.user);
}

/** 认证 Provider - 启动时检查认证状态 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const checkAuthStatus = useAuthStore((s) => s.checkAuthStatus);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  return <>{children}</>;
}
