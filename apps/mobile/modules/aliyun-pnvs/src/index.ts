import { requireNativeModule } from 'expo-modules-core';

export type Carrier = 'CMCC' | 'CUCC' | 'CTCC';

export interface PreLoginResult {
  /** 掩码手机号 138****8888（Android 在 preLogin 阶段为空字符串，UI 需自行处理） */
  maskedPhone: string;
  /** 运营商类型 */
  carrier: Carrier;
}

export interface AuthUITheme {
  /** 主按钮 / 主题色（hex 字符串，如 "#7C5CFC"） */
  themeColor?: string;
  /** Logo 图片在 native 端的资源名 */
  logoName?: string;
  /** App 名称（授权页标题） */
  appName?: string;
  /** 隐藏导航栏 */
  hideNav?: boolean;
}

export interface EventSubscription {
  remove(): void;
}

interface NativeModule {
  /** 用 AUTH_SECRET 初始化 SDK，整 App 生命周期内调一次即可 */
  setAuthSDKInfo(secret: string): Promise<boolean>;

  /** 检查环境是否支持一键登录（4G/5G + SIM 卡） */
  checkEnvAvailable(): Promise<boolean>;

  /**
   * 预取号
   * @param timeoutMs 超时（毫秒）
   * @returns 掩码号 + 运营商
   */
  preLogin(timeoutMs: number): Promise<PreLoginResult>;

  /**
   * 拉起授权页 → 用户同意 → 返回一次性 accessToken
   * @param timeoutMs 超时（毫秒）
   * @param theme 自定义授权页 UI
   */
  getLoginToken(timeoutMs: number, theme: AuthUITheme): Promise<string>;

  /** 关闭授权页（一般用于「切换其他登录方式」回调） */
  dismissLoginPage(): Promise<void>;

  /** 监听 native 事件（expo-modules 内置） */
  addListener(eventName: string, listener: (params: any) => void): EventSubscription;
}

const AliyunPNVS = requireNativeModule<NativeModule>('AliyunPNVS');

/**
 * 监听授权页内"使用微信登录"按钮点击。
 * 用法：mount 时订阅，unmount 时 .remove()
 */
export function onSwitchToWechat(handler: () => void): EventSubscription {
  return AliyunPNVS.addListener('PNVS_SwitchToWechat', handler);
}

export default AliyunPNVS;
