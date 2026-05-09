import { Client } from '../client';
import { ENDPOINTS } from '../endpoints';

declare module '../client' {
  interface Client {
    getDailyGreeting(): Promise<{
      success: boolean;
      data: {
        date: string;
        greetings: Record<string, string>;
        expires_at: string;
        version: string;
      };
    }>;
    uploadFile(formData: FormData): Promise<{
      success: boolean;
      data?: { url: string; cdnUrl: string; ossPath: string; fileInfo: any };
      error?: string;
    }>;
    updateUserProfile(data: {
      username?: string; nickname?: string; avatar?:
      string; gender?: 'male' | 'female' | 'private';
      birthday?: string; bio?: string;
    }): Promise<{ success: boolean; data?: { user: any }; error?: string }>;
    sendBindPhoneCode(phone: string): Promise<{ success: boolean; message?: string; error?: string }>;
    bindPhone(phone: string, verifyCode: string): Promise<{ success: boolean; data?: { user: any }; error?: string }>;
    bindWechat(code: string): Promise<{ success: boolean; data?: { user: any }; error?: string }>;
    setPassword(newPassword: string): Promise<{ success: boolean; error?: string }>;
    changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }>;
  }
}

// 获取每日欢迎语
Client.prototype.getDailyGreeting = async function(): Promise<{
  success: boolean;
  data: {
    date: string;
    greetings: Record<string, string>;
    expires_at: string;
    version: string;
  };
}> {
  return this.api.get(ENDPOINTS.GREETING_DAILY);
};

// 上传文件
Client.prototype.uploadFile = async function(formData: FormData): Promise<{
  success: boolean;
  data?: { url: string; cdnUrl: string; ossPath: string; fileInfo: any };
  error?: string;
}> {
  return this.api.post(ENDPOINTS.UPLOAD_SINGLE, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

// 更新用户资料
Client.prototype.updateUserProfile = async function(data: {
  username?: string; nickname?: string; avatar?:
  string; gender?: 'male' | 'female' | 'private';
  birthday?: string; bio?: string;
}): Promise<{ success: boolean; data?: { user: any }; error?: string }> {
  return this.api.put(ENDPOINTS.USER_PROFILE, data);
};

// 发送绑定手机号验证码
Client.prototype.sendBindPhoneCode = async function(phone: string): Promise<{ success: boolean; message?: string; error?: string }> {
  return this.api.post(ENDPOINTS.USER_BIND_PHONE_SEND_CODE, { phone });
};

// 绑定手机号
Client.prototype.bindPhone = async function(phone: string, verifyCode: string): Promise<{ success: boolean; data?: { user: any }; error?: string }> {
  return this.api.post(ENDPOINTS.USER_BIND_PHONE, { phone, verifyCode });
};

// 绑定微信
Client.prototype.bindWechat = async function(code: string): Promise<{ success: boolean; data?: { user: any }; error?: string }> {
  return this.api.post(ENDPOINTS.USER_BIND_WECHAT, { code });
};

// 首次设置密码（无需验证）
Client.prototype.setPassword = async function(newPassword: string): Promise<{ success: boolean; error?: string }> {
  return this.api.post(ENDPOINTS.USER_SET_PASSWORD, { newPassword });
};

// 修改密码（需要旧密码验证）
Client.prototype.changePassword = async function(currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  return this.api.post(ENDPOINTS.USER_CHANGE_PASSWORD, { currentPassword, newPassword });
};
