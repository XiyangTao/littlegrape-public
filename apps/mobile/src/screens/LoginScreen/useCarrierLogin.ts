import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@/stores/AuthStore';
import { useCustomAlert } from '@/hooks/useCustomAlert';
import { useI18n } from '@/context/I18nProvider';
import { registerApp, sendAuthRequest, isWechatInstalled } from 'expo-native-wechat';
import { WECHAT_APP_ID } from '@env';
import * as CarrierLoginService from '@/services/CarrierLoginService';
import type { PreLoginResult } from '@/services/CarrierLoginService';

export type CarrierLoginStep = 'main' | 'userAgreement' | 'privacyPolicy';

export function useCarrierLogin() {
  const { loginWithCarrier, loginWithWechat } = useAuth();
  const { toast, AlertComponent } = useCustomAlert();
  const { t } = useI18n();

  const [step, setStep] = useState<CarrierLoginStep>('main');
  // fallback 模式下用户必须勾协议；SDK 授权页有自己的勾选，不用 RN 这边管
  const [agreed, setAgreed] = useState(false);
  const [preLogin, setPreLogin] = useState<PreLoginResult | null>(null);
  const [isPreLoginLoading, setIsPreLoginLoading] = useState(true);
  const [preLoginFailed, setPreLoginFailed] = useState(false);
  const [isCarrierLoading, setIsCarrierLoading] = useState(false);
  const [isWechatLoading, setIsWechatLoading] = useState(false);
  const [isWechatOverlayVisible, setIsWechatOverlayVisible] = useState(false);

  const isMountedRef = useRef(true);
  // SDK 授权页是否正在打开 — 用 ref 而非 state，AppState 回调内同步可读
  const isCarrierBusyRef = useRef(false);
  // 重弹流程标记 — USER_CANCELLED 由 dismissLoginPage 触发时跳过 fallback
  const isRelaunchingRef = useRef(false);

  // 外部依赖通过 ref 中转，让下面的 useCallback 都能保持空依赖、引用稳定
  // → effects 只在挂载时执行一次，不会被 store/i18n 引用变化误触发
  const depsRef = useRef({ loginWithCarrier, loginWithWechat, t, toast });
  depsRef.current = { loginWithCarrier, loginWithWechat, t, toast };

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 注册微信 SDK
  useEffect(() => {
    if (WECHAT_APP_ID) registerApp({ appid: WECHAT_APP_ID, log: false });
  }, []);

  // ============================================================
  // 拉起 SDK 授权页 → 拿 token → 调后端登录
  // 命令式调用，不暴露给 useEffect
  // ============================================================
  const launchAuthPage = useCallback(async () => {
    if (isCarrierBusyRef.current) return;
    isCarrierBusyRef.current = true;
    if (isMountedRef.current) setIsCarrierLoading(true);

    try {
      const accessToken = await CarrierLoginService.getLoginToken();
      console.log('[Login] getLoginToken ok', { tokenLen: accessToken.length });
      await depsRef.current.loginWithCarrier(accessToken);
    } catch (error: any) {
      console.warn('[Login] getLoginToken failed', { code: error?.code, message: error?.message });
      if (error?.code === 'USER_CANCELLED') {
        if (isRelaunchingRef.current) {
          console.log('[Login] dismissed by background-relaunch, skip fallback');
          return;
        }
        // 用户主动关闭 / 切换其他方式 → 进 fallback UI
        if (isMountedRef.current) setPreLoginFailed(true);
        return;
      }
      const { t: tt, toast: tst } = depsRef.current;
      const message =
        error?.code === 'PRE_LOGIN_EXPIRED'
          ? tt('auth.login.carrier.errors.tokenExpired')
          : error instanceof Error
            ? error.message
            : tt('auth.login.carrier.errors.authFailed');
      tst('', message, 'error');
      if (isMountedRef.current) setPreLoginFailed(true);
    } finally {
      isCarrierBusyRef.current = false;
      if (isMountedRef.current) setIsCarrierLoading(false);
    }
  }, []);

  // ============================================================
  // 完整流程：预取号 → 立即拉起授权页（命令式串行）
  //
  // 启动、用户重试、AppState 回前台重弹 —— 全部走这条路径。
  // 不再依赖 useEffect 间接触发，不再依赖 setPreLogin 引用 diff，
  // 不再需要 hasAutoLaunchedRef 防重入（重入由 isCarrierBusyRef 守门）。
  // ============================================================
  const runFlow = useCallback(async () => {
    const t0 = Date.now();
    setIsPreLoginLoading(true);
    setPreLoginFailed(false);

    let result: PreLoginResult;
    try {
      await CarrierLoginService.init();
      result = await CarrierLoginService.preLogin();
      if (!isMountedRef.current) return;
      console.log('[Login] preLogin success', {
        totalMs: Date.now() - t0,
        carrier: result.carrier,
        hasMasked: !!result.maskedPhone,
      });
      setPreLogin(result);
    } catch (e: any) {
      console.warn('[Login] preLogin failed → fallback', {
        totalMs: Date.now() - t0,
        code: e?.code,
        message: e?.message,
        raw: String(e),
      });
      if (!isMountedRef.current) return;
      setPreLogin(null);
      setPreLoginFailed(true);
      return;
    } finally {
      if (isMountedRef.current) setIsPreLoginLoading(false);
    }

    await launchAuthPage();
  }, [launchAuthPage]);

  // 启动时跑一次
  useEffect(() => {
    runFlow();
  }, [runFlow]);

  // ============================================================
  // 微信登录（用户主动点 / SDK 授权页内"使用微信登录"按钮触发）
  // ============================================================
  const handleWechatLogin = useCallback(async (opts: { skipAgreementCheck?: boolean } = {}) => {
    const { loginWithWechat: lw, t: tt, toast: tst } = depsRef.current;

    if (isWechatLoading) return;
    if (!opts.skipAgreementCheck && !agreed) {
      tst('', tt('auth.login.messages.agreementRequired'), 'error');
      return;
    }

    const installed = await isWechatInstalled();
    if (!installed) {
      tst('', tt('auth.login.errors.wechatNotInstalled'), 'error');
      return;
    }

    setIsWechatLoading(true);
    setIsWechatOverlayVisible(true);
    let shouldResetLoading = true;

    try {
      const response = await sendAuthRequest({ scope: 'snsapi_userinfo' });

      if (response.errorCode !== 0) {
        if (response.errorCode === -2 || response.errorCode === -4) {
          shouldResetLoading = false;
          setTimeout(() => setIsWechatLoading(false), 500);
          return;
        }
        throw new Error(response.errorStr || tt('auth.login.errors.wechatAuthFailed'));
      }

      const code = response.data?.code;
      if (!code) throw new Error(tt('auth.login.errors.wechatAuthFailed'));

      await lw(code);
      shouldResetLoading = false;
    } catch (error) {
      if (error instanceof Error && (error.message.includes('(-2)') || error.message.includes('(-4)'))) {
        return;
      }
      const message = error instanceof Error ? error.message : tt('auth.login.errors.wechatLoginFailed');
      tst('', message, 'error');
    } finally {
      if (shouldResetLoading && isMountedRef.current) setIsWechatLoading(false);
      setTimeout(() => {
        if (isMountedRef.current) setIsWechatOverlayVisible(false);
      }, 300);
    }
  }, [agreed, isWechatLoading]);

  // 监听 SDK 授权页内"使用微信登录"按钮点击
  useEffect(() => {
    const sub = CarrierLoginService.onSwitchToWechat(() => {
      console.log('[Login] user picked wechat from SDK auth page');
      // 跳过协议二次校验 — SDK 授权页协议区已合规展示
      handleWechatLogin({ skipAgreementCheck: true });
    });
    return () => sub.remove();
  }, [handleWechatLogin]);

  // ============================================================
  // AppState 监听：App 回前台时立刻重弹 SDK 授权页（叮咚买菜激进派）
  //
  // 问题：getLoginToken 拉起 SDK AuthActivity 后 promise 长 pending；
  //   华为/小米等激进 ROM 后台 kill Activity 后，SDK 不会清理 listener，
  //   promise 永不 settle，UI 卡 bootLoading。
  //
  // 解法：回前台 + 正在拉 SDK → dismiss 旧 + 重跑 runFlow（preLogin 缓存命中
  //   <200ms 几乎无感）。SDK 还活着→被 dismiss + 重弹；已死→直接拉新的。
  //   用户感知："一点 App 就立即看到授权页"。
  //
  // 安全性：PNVS native 已 idempotent — pendingLoginPromise.getAndSet 让旧
  //   promise 安全 reject "E_REPLACED"，不会泄漏。
  // 兜底：launchAuthPage catch 内检查 isRelaunchingRef，跳过 fallback。
  // ============================================================
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      if (!isCarrierBusyRef.current) return;

      console.log('[Login] resumed during SDK loading — relaunch auth page');
      isRelaunchingRef.current = true;

      // 100ms 让 AppState 完全 settle，再 dismiss + 重弹
      setTimeout(async () => {
        if (!isMountedRef.current) {
          isRelaunchingRef.current = false;
          return;
        }
        await CarrierLoginService.dismissLoginPage().catch(() => { /* silent */ });
        // 50ms 让旧 promise 的 catch 跑完（catch 内会因 isRelaunchingRef=true 跳过 fallback）
        setTimeout(() => {
          isRelaunchingRef.current = false;
          if (!isMountedRef.current) return;
          runFlow();
        }, 50);
      }, 100);
    });
    return () => sub.remove();
  }, [runFlow]);

  return {
    step,
    setStep,
    agreed,
    toggleAgreed: () => setAgreed((v) => !v),
    preLogin,
    isPreLoginLoading,
    preLoginFailed,
    // 用户重试 / fallback UI 的"一键登录"按钮 — 语义合一，都走 runFlow
    retryPreLogin: runFlow,
    handleCarrierLogin: runFlow,
    isCarrierLoading,
    isWechatLoading,
    isWechatOverlayVisible,
    handleWechatLogin: () => handleWechatLogin(),
    handleViewUserAgreement: () => setStep('userAgreement'),
    handleViewPrivacyPolicy: () => setStep('privacyPolicy'),
    goBackToMain: () => setStep('main'),
    AlertComponent,
    t,
  };
}
