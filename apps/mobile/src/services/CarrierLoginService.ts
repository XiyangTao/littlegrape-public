/**
 * 运营商一键登录服务（阿里云 PNVS 客户端 SDK 封装）
 *
 * 流程：
 *   1. init()       — App 启动时调用，初始化 SDK
 *   2. preLogin()   — LoginScreen 加载时调用，预取号
 *      → 成功:返回掩码号 + 运营商类型
 *      → 失败:调用方需降级到微信登录
 *   3. getLoginToken() — 用户点击 oneClickLogin 时调用
 *      → SDK 拉起原生授权页(葡萄紫主题) → 用户同意 → 返回一次性 accessToken
 *   4. accessToken → 调后端 /api/auth/login/carrier 换 JWT
 */

import { Platform } from 'react-native';
import AliyunPNVS, { onSwitchToWechat as pnvsOnSwitchToWechat } from 'aliyun-pnvs';
import type { EventSubscription } from 'aliyun-pnvs';
import {
  PNVS_AUTH_SECRET_IOS,
  PNVS_AUTH_SECRET_ANDROID,
  PNVS_AUTH_SECRET_ANDROID_DEBUG,
} from '@env';

export type Carrier = 'CMCC' | 'CUCC' | 'CTCC';

export interface PreLoginResult {
  /** 掩码手机号 138****8888（Android 在 preLogin 阶段为空字符串，UI 需自行处理） */
  maskedPhone: string;
  /** 运营商类型 */
  carrier: Carrier;
  /** 运营商协议链接（动态，根据 carrier 决定） */
  protocolName: string;
  protocolUrl: string;
}

export interface CarrierError extends Error {
  code: string;
}

const PROTOCOLS: Record<Carrier, { name: string; url: string }> = {
  CMCC: {
    name: '中国移动认证服务协议',
    url: 'https://wap.cmpassport.com/resources/html/contract.html',
  },
  CUCC: {
    name: '中国联通认证服务协议',
    url: 'https://opencloud.wostore.cn/authz/resource/html/disclaimer.html?fromsdk=true',
  },
  CTCC: {
    name: '中国电信天翼账号服务与隐私协议',
    url: 'https://e.189.cn/sdk/agreement/detail.do?hidetop=true',
  },
};

export function getCarrierProtocol(carrier: Carrier) {
  return PROTOCOLS[carrier];
}

export function getCarrierDisplayName(carrier: Carrier): string {
  return { CMCC: '中国移动', CUCC: '中国联通', CTCC: '中国电信' }[carrier];
}

// ==================== SDK 调用 ====================

let _initialized = false;
let _initializing: Promise<boolean> | null = null;

function pickAuthSecret(): string {
  if (Platform.OS === 'ios') return PNVS_AUTH_SECRET_IOS;
  // Android: __DEV__ 时用 debug 签名密钥（dev-client/expo run），否则用正式
  return __DEV__ ? PNVS_AUTH_SECRET_ANDROID_DEBUG : PNVS_AUTH_SECRET_ANDROID;
}

export async function init(): Promise<void> {
  if (_initialized) return;
  if (_initializing) {
    await _initializing;
    return;
  }
  const secret = pickAuthSecret();
  if (!secret) {
    console.warn('[PNVS] init failed: AUTH_SECRET 未配置', { platform: Platform.OS, isDev: __DEV__ });
    throw Object.assign(new Error('PNVS AUTH_SECRET 未配置'), { code: 'E_NO_SECRET' });
  }
  const t0 = Date.now();
  console.log('[PNVS] init.start', { platform: Platform.OS, isDev: __DEV__, secretLen: secret.length });
  _initializing = AliyunPNVS.setAuthSDKInfo(secret);
  try {
    await _initializing;
    _initialized = true;
    console.log('[PNVS] init.ok', { ms: Date.now() - t0 });
  } catch (e: any) {
    console.warn('[PNVS] init.fail', { ms: Date.now() - t0, code: e?.code, message: e?.message, raw: String(e) });
    throw e;
  } finally {
    _initializing = null;
  }
}

/**
 * 预取号 — 带缓存（默认 60s 内的成功结果会被复用）。
 * 调用方典型链路：
 *   App.tsx splash 阶段 prefetch() 触发 → 60s 内 LoginScreen mount 时 preLogin() 直接命中缓存
 *
 * 失败不缓存（让重试能再调真实 SDK）。
 */
let _preLoginCache: Promise<PreLoginResult> | null = null;
let _preLoginCacheTime = 0;
const PRELOGIN_CACHE_TTL_MS = 60 * 1000;

export async function preLogin(): Promise<PreLoginResult> {
  // 缓存命中（含 inflight — 多次并发调用复用同一个请求）
  if (_preLoginCache && Date.now() - _preLoginCacheTime < PRELOGIN_CACHE_TTL_MS) {
    console.log('[PNVS] preLogin.cacheHit', { ageMs: Date.now() - _preLoginCacheTime });
    return _preLoginCache;
  }

  const tInit = Date.now();
  const promise = (async () => {
    await init();
    const tPre = Date.now();
    console.log('[PNVS] preLogin.start', { initMs: tPre - tInit, timeoutMs: 5000 });
    const result = await AliyunPNVS.preLogin(5000);
    const ms = Date.now() - tPre;
    const carrier = (result.carrier as Carrier) || 'CMCC';
    const protocol = PROTOCOLS[carrier];
    console.log('[PNVS] preLogin.ok', {
      ms,
      carrier,
      hasMaskedPhone: !!result.maskedPhone,
      maskedPhonePreview: result.maskedPhone ? `${result.maskedPhone.slice(0, 3)}***${result.maskedPhone.slice(-2)}` : null,
    });
    return {
      maskedPhone: result.maskedPhone || '',
      carrier,
      protocolName: protocol.name,
      protocolUrl: protocol.url,
    };
  })();

  _preLoginCache = promise;
  _preLoginCacheTime = Date.now();

  // 失败副作用与主流程分离：清缓存让 retry 能重新调真实 SDK，并打日志
  // 不 swallow rejection — 调用方 await 时仍会抛出原始错误
  promise.catch((e: any) => {
    const ms = Date.now() - tInit;
    console.warn('[PNVS] preLogin.fail', {
      ms,
      timedOut: ms >= 4900,
      code: e?.code,
      message: e?.message,
      raw: String(e),
    });
    if (_preLoginCache === promise) {
      _preLoginCache = null;
      _preLoginCacheTime = 0;
    }
  });

  return promise;
}

/**
 * App 启动时预热（不阻塞）— 在 splash 阶段调用，让 LoginScreen mount 时
 * 直接命中缓存，省掉 1-3 秒等运营商网关的时间。
 *
 * 失败静默（用户可能没插 SIM 卡 / 关了移动数据，正常情况）。
 */
export function prefetch(): void {
  preLogin().catch(() => { /* silent */ });
}

/** 强制清缓存（如用户换卡 / 切运营商场景） */
export function clearPreLoginCache(): void {
  _preLoginCache = null;
  _preLoginCacheTime = 0;
}

/**
 * 拉起授权页 → 用户同意 → 返回一次性 accessToken
 *
 * 错误 code:
 *   USER_CANCELLED — 用户点了"返回"或"切换其他登录方式"
 *   E_GET_TOKEN — 运营商认证失败
 */
export async function getLoginToken(): Promise<string> {
  return AliyunPNVS.getLoginToken(5000, {
    themeColor: '#7C5CFC',
    appName: '小葡萄',
    hideNav: false,
  });
}

/** 关闭 SDK 拉起的授权页 */
export async function dismissLoginPage(): Promise<void> {
  await AliyunPNVS.dismissLoginPage();
}

/** 当前是否运行在支持一键登录的环境（iOS / Android 真机） */
export function isPlatformSupported(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

/**
 * 监听授权页内"使用微信登录"按钮点击。
 * mount 时订阅，unmount 时 .remove()
 */
export function onSwitchToWechat(handler: () => void): EventSubscription {
  return pnvsOnSwitchToWechat(handler);
}
