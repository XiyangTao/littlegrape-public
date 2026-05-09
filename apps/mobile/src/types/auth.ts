// 认证相关类型定义（基于后端API实际返回结构）

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface User {
  id: string;
  createdAt?: string; // ISO 时间，用于统计起始年份
  email?: string;
  username?: string;
  nickname?: string;
  avatar?: string;
  phone?: string;
  gender?: 'male' | 'female' | 'private';
  birthday?: string; // YYYY-MM-DD 格式
  bio?: string;
  hasPassword?: boolean;
  hasWechat?: boolean;
  wechatNickname?: string;
  wechatAvatar?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  data?: {
    user: User;
    tokens: AuthTokens;
  };
  error?: string;
}

export interface RefreshTokenResponse {
  success: boolean;
  message?: string;
  data?: {
    tokens: AuthTokens;
  };
  error?: string;
}

export interface TokenVerifyResponse {
  success: boolean;
  message?: string;
  data?: {
    payload: Record<string, unknown>; // JWT解码后的payload数据
  };
  error?: string;
}

export interface AuthState {
  isLoading: boolean;
  isCheckingAuthStatus: boolean;
  user: User | null;
  tokens: AuthTokens | null;
  error: string | null;
}

export interface AuthContextType extends AuthState {
  login: (identifier: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string, verificationToken: string, nickname?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<string>;
  clearError: () => void;
  checkAuthStatus: () => Promise<void>;
  sendEmailVerificationCode: (email: string) => Promise<void>;
  verifyEmailCode: (email: string, code: string) => Promise<string>;
  sendPhoneVerificationCode: (phone: string) => Promise<void>;
  loginWithPhone: (phone: string, verifyCode: string) => Promise<void>;
  // 微信登录
  loginWithWechat: (code: string) => Promise<void>;
  // Password Reset
  requestPasswordReset: (phone: string) => Promise<void>;
  verifyPasswordResetCode: (phone: string, code: string) => Promise<string>;
  completePasswordReset: (resetToken: string, newPassword: string) => Promise<void>;
  // Profile Update
  updateProfile: (data: { username?: string; nickname?: string; avatar?: string; gender?: 'male' | 'female' | 'private'; birthday?: string; bio?: string }) => Promise<void>;
  // Bind Phone
  sendBindPhoneCode: (phone: string) => Promise<void>;
  bindPhone: (phone: string, verifyCode: string) => Promise<void>;
  // Bind WeChat
  bindWechat: (code: string) => Promise<void>;
  // Set Password (首次设置，无需验证)
  setPassword: (newPassword: string) => Promise<void>;
  // Change Password (修改密码，需要旧密码)
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}
