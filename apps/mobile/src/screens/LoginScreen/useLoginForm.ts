import { useState, useEffect } from 'react';
import { useAuth } from '@/stores/AuthStore';
import { useCustomAlert } from '@/hooks/useCustomAlert';
import { useI18n } from '@/context/I18nProvider';
import { registerApp, sendAuthRequest, isWechatInstalled } from 'expo-native-wechat';
import { WECHAT_APP_ID } from '@env';

export type LoginStep = 'main' | 'forgot' | 'userAgreement' | 'privacyPolicy';
export type LoginMethod = 'verification' | 'password';

export function useLoginForm() {
  const { loginWithPhone, login, sendPhoneVerificationCode, loginWithWechat } = useAuth();
  const { toast, AlertComponent } = useCustomAlert();
  const { t } = useI18n();

  const [step, setStep] = useState<LoginStep>('main');
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('verification');
  const [phone, setPhone] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isWechatLoading, setIsWechatLoading] = useState(false);
  const [isWechatOverlayVisible, setIsWechatOverlayVisible] = useState(false);

  // 注册微信 SDK
  useEffect(() => {
    if (WECHAT_APP_ID) {
      registerApp({ appid: WECHAT_APP_ID, log: false });
    }
  }, []);

  // 倒计时效果
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 验证手机号格式
  const validatePhone = (phoneNumber: string): boolean => {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phoneNumber);
  };

  // 发送验证码
  const sendVerificationCode = async () => {
    if (isSending) return;

    if (!phone.trim()) {
      toast('', t('auth.login.validation.phoneRequired'), 'error');
      return;
    }

    if (!validatePhone(phone)) {
      toast('', t('auth.login.validation.phoneInvalid'), 'error');
      return;
    }

    setIsSending(true);
    try {
      await sendPhoneVerificationCode(phone);
      setCountdown(60);
      toast('', t('auth.login.messages.codeSent'), 'success');
    } catch (error) {
      let message = t('auth.login.errors.sendCodeFailed');

      if (error instanceof Error) {
        message = error.message;
      } else if (error && typeof error === 'object' && 'message' in error) {
        message = (error as any).message;
      } else if (typeof error === 'string') {
        message = error;
      }

      toast('', message, 'error');
    } finally {
      setIsSending(false);
    }
  };

  // 处理验证码登录
  const handleVerificationLogin = async () => {
    if (!phone.trim()) {
      toast('', t('auth.login.validation.phoneRequired'), 'error');
      return;
    }

    if (!validatePhone(phone)) {
      toast('', t('auth.login.validation.phoneInvalid'), 'error');
      return;
    }

    if (!verifyCode.trim() || verifyCode.length !== 6) {
      toast('', t('auth.login.validation.codeInvalid'), 'error');
      return;
    }

    if (!agreed) {
      toast('', t('auth.login.messages.agreementRequired'), 'error');
      return;
    }

    setIsLoading(true);
    try {
      await loginWithPhone(phone, verifyCode);
    } catch (error) {
      const message = error instanceof Error ? error.message : '登录失败，请重试';
      toast('', message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 处理密码登录
  const handlePasswordLogin = async () => {
    if (!identifier.trim()) {
      toast('', t('auth.login.validation.identifierRequired'), 'error');
      return;
    }

    if (!password.trim()) {
      toast('', t('auth.login.validation.passwordRequired'), 'error');
      return;
    }

    if (password.length < 6) {
      toast('', t('auth.login.validation.passwordMinLength', { length: 6 }), 'error');
      return;
    }

    if (!agreed) {
      toast('', t('auth.login.messages.agreementRequired'), 'error');
      return;
    }

    setIsLoading(true);
    try {
      // 使用标识符(昵称|手机号|邮箱)+密码登录
      await login(identifier, password);
    } catch (error) {
      const message = error instanceof Error ? error.message : '登录失败，请重试';
      toast('', message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 进入忘记密码流程
  const handleForgotPassword = () => {
    // 密码登录模式下，检查identifier是否为手机号格式
    if (!identifier.trim()) {
      toast('', t('auth.login.validation.identifierRequired'), 'error');
      return;
    }

    if (!validatePhone(identifier)) {
      toast('', t('auth.login.validation.forgotPasswordNeedsPhone'), 'error');
      return;
    }

    // 将手机号同步到phone状态用于忘记密码流程
    setPhone(identifier);
    setStep('forgot');
  };

  // 微信登录
  // 移动端只支持 snsapi_userinfo，首次需要用户确认，之后微信会记住授权状态
  const handleWechatLogin = async () => {
    if (isWechatLoading) return;

    // 检查是否同意用户协议
    if (!agreed) {
      toast('', t('auth.login.messages.agreementRequired'), 'error');
      return;
    }

    // 检查是否安装微信
    const installed = await isWechatInstalled();
    if (!installed) {
      toast('', t('auth.login.errors.wechatNotInstalled'), 'error');
      return;
    }

    setIsWechatLoading(true);
    setIsWechatOverlayVisible(true);
    let shouldResetLoading = true;

    try {
      // 发起微信授权请求（移动端只支持 snsapi_userinfo）
      const response = await sendAuthRequest({ scope: 'snsapi_userinfo' });

      if (response.errorCode !== 0) {
        // 用户取消或拒绝授权
        if (response.errorCode === -2 || response.errorCode === -4) {
          shouldResetLoading = false;
          setTimeout(() => setIsWechatLoading(false), 500);
          return;
        }
        throw new Error(response.errorStr || t('auth.login.errors.wechatAuthFailed'));
      }

      const code = response.data?.code;
      if (!code) {
        console.error('[WechatLogin] 微信返回数据中无code, response.data:', response.data);
        throw new Error(t('auth.login.errors.wechatAuthFailed'));
      }

      // 调用后端登录接口（后端会判断用户是否存在，不存在则自动注册）
      await loginWithWechat(code);
      shouldResetLoading = false;
    } catch (error) {
      // 忽略用户取消或拒绝授权的错误
      if (error instanceof Error && (error.message.includes('(-2)') || error.message.includes('(-4)'))) {
        return;
      }
      console.error('[WechatLogin] 微信登录失败:', error);
      const message = error instanceof Error ? error.message : t('auth.login.errors.wechatLoginFailed');
      toast('', message, 'error');
    } finally {
      if (shouldResetLoading) {
        setIsWechatLoading(false);
      }
      // 延迟关闭遮罩，让页面过渡更平滑
      setTimeout(() => setIsWechatOverlayVisible(false), 300);
    }
  };

  // 查看用户协议
  const handleViewUserAgreement = () => {
    setStep('userAgreement');
  };

  // 查看隐私政策
  const handleViewPrivacyPolicy = () => {
    setStep('privacyPolicy');
  };

  // 切换登录方式
  const toggleLoginMethod = () => {
    setLoginMethod(loginMethod === 'verification' ? 'password' : 'verification');
  };

  // 切换协议同意状态
  const toggleAgreed = () => {
    setAgreed(!agreed);
  };

  // 返回主页
  const goBackToMain = () => {
    setStep('main');
  };

  return {
    // 状态
    step,
    loginMethod,
    phone,
    identifier,
    password,
    verifyCode,
    agreed,
    countdown,
    isLoading,
    isSending,
    isWechatLoading,
    isWechatOverlayVisible,
    AlertComponent,
    t,

    // 状态设置
    setPhone,
    setIdentifier,
    setPassword,
    setVerifyCode,

    // 回调
    sendVerificationCode,
    handleVerificationLogin,
    handlePasswordLogin,
    handleForgotPassword,
    handleWechatLogin,
    handleViewUserAgreement,
    handleViewPrivacyPolicy,
    toggleLoginMethod,
    toggleAgreed,
    goBackToMain,
  };
}
