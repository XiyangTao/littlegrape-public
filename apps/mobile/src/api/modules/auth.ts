import { AuthResponse, RefreshTokenResponse, TokenVerifyResponse } from '@/types/auth';
import { Client } from '../client';
import { ENDPOINTS } from '../endpoints';

declare module '../client' {
  interface Client {
    sendEmailVerificationCode(email: string, type?: 'register' | 'password_reset'): Promise<{
      success: boolean;
      message: string;
    }>;
    verifyEmailCode(email: string, code: string, type?: 'register' | 'password_reset'): Promise<{
      success: boolean;
      message: string;
      data?: {
        verificationToken: string;
      };
    }>;
    registerWithEmail(data: {
      email: string;
      password: string;
      username?: string;
      nickname?: string;
      verificationToken: string;
    }): Promise<AuthResponse>;
    loginWithPassword(data: { identifier: string; password: string }): Promise<AuthResponse>;
    sendPhoneVerificationCode(phone: string): Promise<{
      success: boolean;
      message?: string;
      error?: string;
    }>;
    loginWithPhone(data: { phone: string; verifyCode: string }): Promise<AuthResponse>;
    loginWithWechat(code: string): Promise<AuthResponse>;
    loginWithCarrier(accessToken: string): Promise<AuthResponse>;
    requestPasswordReset(phone: string): Promise<{ success: boolean; message: string }>;
    verifyPasswordResetCode(phone: string, code: string): Promise<{ success: boolean; data?: { resetToken: string } }>;
    completePasswordReset(resetToken: string, newPassword: string): Promise<{ success: boolean; message: string }>;
    refreshToken(refreshToken: string): Promise<RefreshTokenResponse>;
    verifyToken(token: string, type?: 'access' | 'refresh'): Promise<TokenVerifyResponse>;
  }
}

// 发送邮箱验证码
Client.prototype.sendEmailVerificationCode = async function(email: string, type: 'register' | 'password_reset' = 'register'): Promise<{
  success: boolean;
  message: string;
}> {
  return this.api.post(ENDPOINTS.AUTH_EMAIL_SEND_CODE, { email, type });
};

// 验证邮箱验证码
Client.prototype.verifyEmailCode = async function(email: string, code: string, type: 'register' | 'password_reset' = 'register'): Promise<{
  success: boolean;
  message: string;
  data?: {
    verificationToken: string;
  };
}> {
  return this.api.post(ENDPOINTS.AUTH_EMAIL_VERIFY_CODE, { email, code, type });
};

// 邮箱注册
Client.prototype.registerWithEmail = async function(data: {
  email: string;
  password: string;
  username?: string;
  nickname?: string;
  verificationToken: string;
}): Promise<AuthResponse> {
  return this.api.post(ENDPOINTS.AUTH_REGISTER_EMAIL, data);
};

// 密码登录 (支持邮箱|昵称|手机号)
Client.prototype.loginWithPassword = async function(data: { identifier: string; password: string }): Promise<AuthResponse> {
  return this.api.post(ENDPOINTS.AUTH_LOGIN_PASSWORD, data);
};

// 发送手机验证码
Client.prototype.sendPhoneVerificationCode = async function(phone: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  return this.api.post(ENDPOINTS.AUTH_PHONE_SEND_CODE, { phone });
};

// 手机号登录
Client.prototype.loginWithPhone = async function(data: { phone: string; verifyCode: string }): Promise<AuthResponse> {
  return this.api.post(ENDPOINTS.AUTH_LOGIN_PHONE, data);
};

// 微信登录
Client.prototype.loginWithWechat = async function(code: string): Promise<AuthResponse> {
  return this.api.post(ENDPOINTS.AUTH_LOGIN_WECHAT, { code });
};

// 一键登录（运营商网关认证）
Client.prototype.loginWithCarrier = async function(accessToken: string): Promise<AuthResponse> {
  return this.api.post(ENDPOINTS.AUTH_LOGIN_CARRIER, { accessToken });
};

// --- Password Reset ---
Client.prototype.requestPasswordReset = async function(phone: string): Promise<{ success: boolean; message: string }> {
  return this.api.post(ENDPOINTS.AUTH_PASSWORD_RESET_REQUEST, { phone });
};

Client.prototype.verifyPasswordResetCode = async function(phone: string, code: string): Promise<{ success: boolean; data?: { resetToken: string } }> {
  return this.api.post(ENDPOINTS.AUTH_PASSWORD_RESET_VERIFY, { phone, code });
};

Client.prototype.completePasswordReset = async function(resetToken: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  return this.api.post(ENDPOINTS.AUTH_PASSWORD_RESET_COMPLETE, { resetToken, newPassword });
};

// 刷新Token
Client.prototype.refreshToken = async function(refreshToken: string): Promise<RefreshTokenResponse> {
  return this.api.post(ENDPOINTS.AUTH_TOKEN_REFRESH, {refreshToken});
};

// 验证Token
// 启动期 checkAuthStatus 调用此方法，离线时不弹「网络错误」toast，
// 配合 AuthStore.verifyExistingToken 的网络错误降级（信任本地 token）一起，
// 让用户离线打开 app 不会被踢回登录页。
Client.prototype.verifyToken = async function(token: string, type: 'access' | 'refresh' = 'access'): Promise<TokenVerifyResponse> {
  return this.api.post(ENDPOINTS.AUTH_TOKEN_VERIFY, {token, type}, {
    metadata: { skipNetworkErrorToast: true },
  } as any);
};
