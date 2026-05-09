import { StyleSheet } from 'react-native';
import { Theme } from '@/theme';

export const createStyles = (theme: Theme) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  keyboardView: {
    flex: 1,
  },
  container: {
    flex: 1,
  },

  // 顶部区域样式
  topSection: {
    height: theme.screen.height * 0.25,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background.primary,
    paddingTop: theme.scale(40),
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoCircle: {
    width: theme.scale(80),
    height: theme.scale(80),
    borderRadius: theme.scale(40),
    backgroundColor: theme.colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  logoImage: {
    width: theme.scale(56),
    height: theme.scale(56),
  },
  titleSection: {
    marginTop: 12,
    alignItems: 'center',
  },
  loginTitle: {
    fontSize: 18,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  loginSubtitle: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },

  // 主内容区域
  mainContent: {
    flex: 1,
    paddingHorizontal: theme.scale(24),
    paddingTop: 16,
    paddingBottom: 16,
    justifyContent: 'space-between',
  },

  // 表单区域
  formSection: {
    flex: 1,
  },
  accountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.primary,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    borderRadius: theme.spacing.borderRadius.base,
    paddingHorizontal: 16,
    height: 46,
    marginBottom: 12,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  accountInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text.primary,
    fontWeight: theme.typography.fontWeight.medium,
    marginLeft: 12,
  },

  // 输入区域 - 固定高度确保切换时不变化
  inputSection: {
    height: theme.scale(90),
    marginBottom: 12,
  },
  codeInputWrapper: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  codeInput: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    borderRadius: theme.spacing.borderRadius.base,
    paddingHorizontal: 16,
    fontSize: 16,
    color: theme.colors.text.primary,
    marginRight: 12,
    fontWeight: theme.typography.fontWeight.medium,
    height: 46,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sendCodeButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.spacing.borderRadius.base,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: theme.scale(90),
    height: 46,
  },
  sendCodeButtonDisabled: {
    backgroundColor: theme.colors.text.disabled,
  },
  sendCodeText: {
    color: theme.colors.text.inverse,
    fontSize: 14,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  sendCodeTextDisabled: {
    color: theme.colors.text.inverse,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    height: theme.scale(36), // 减小固定高度
  },

  // 密码输入框样式
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.primary,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    borderRadius: theme.spacing.borderRadius.base,
    paddingHorizontal: 16,
    height: 46,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text.primary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  eyeButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchMethodLink: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  switchMethodLinkText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: theme.typography.fontWeight.medium,
  },
  forgotPasswordLink: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  forgotPasswordText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: theme.typography.fontWeight.medium,
  },

  // 登录按钮
  loginButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.spacing.borderRadius.base,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loginButtonDisabled: {
    backgroundColor: theme.colors.text.disabled,
    shadowOpacity: 0,
    elevation: 0,
  },
  loginButtonText: {
    color: theme.colors.text.inverse,
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginLeft: 8,
    color: theme.colors.text.inverse,
    fontSize: 16,
    fontWeight: theme.typography.fontWeight.semibold,
  },

  // 分割线
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.scale(20),
    marginBottom: theme.scale(32),
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border.light,
  },
  dividerText: {
    marginHorizontal: 16,
    color: theme.colors.text.secondary,
    fontSize: 14,
  },

  // 微信登录按钮
  wechatButton: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.spacing.borderRadius.base,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  wechatButtonDisabled: {
    opacity: 0.6,
  },
  wechatIcon: {
    marginRight: 8,
  },
  wechatButtonText: {
    color: theme.colors.text.primary,
    fontSize: 16,
    fontWeight: theme.typography.fontWeight.semibold,
  },

  // 微信登录返回时的遮罩
  wechatOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  // 等待 SDK 授权页拉起时的全屏 loading（避免闪一下中间页）
  bootLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background.primary,
  },
});

// ============================================================
// 一键登录页样式（业界级 UI/UX）
// ============================================================
export const createCarrierStyles = (theme: Theme) => StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: theme.scale(28),
    paddingTop: theme.scale(24),
    paddingBottom: theme.scale(20),
    backgroundColor: theme.colors.background.primary,
  },

  // ===== 顶部品牌区 =====
  brandSection: {
    alignItems: 'center',
    marginTop: theme.scale(8),
  },
  logoWrap: {
    width: theme.scale(72),
    height: theme.scale(72),
    borderRadius: theme.scale(20),
    overflow: 'hidden',
    backgroundColor: theme.colors.background.primary,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: theme.fontScale(22),
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginTop: theme.scale(18),
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: theme.fontScale(13),
    color: theme.colors.text.tertiary,
    marginTop: theme.scale(6),
    letterSpacing: 0.4,
  },

  // ===== 中间号码展示区（紧贴品牌区下方） =====
  phoneSection: {
    alignItems: 'center',
    marginTop: theme.scale(56),
    minHeight: theme.scale(100),
    justifyContent: 'center',
  },
  maskedPhone: {
    fontSize: theme.fontScale(30),
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    letterSpacing: 1,
    marginBottom: theme.scale(8),
    fontVariant: ['tabular-nums'],
  },
  // Android 专用：preLogin 不返回掩码号时的友好替代展示
  androidReadyTitle: {
    fontSize: theme.fontScale(20),
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.scale(8),
    letterSpacing: 0.3,
  },
  providedBy: {
    fontSize: theme.fontScale(12),
    color: theme.colors.text.tertiary,
    letterSpacing: 0.3,
  },

  // 加载态
  phoneLoadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phoneLoadingText: {
    fontSize: theme.fontScale(14),
    color: theme.colors.text.tertiary,
    marginLeft: 10,
  },

  // 降级态
  fallbackWrap: {
    alignItems: 'center',
    paddingHorizontal: theme.scale(20),
  },
  fallbackIconWrap: {
    width: theme.scale(56),
    height: theme.scale(56),
    borderRadius: theme.scale(28),
    backgroundColor: theme.colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.scale(12),
  },
  fallbackTitle: {
    fontSize: theme.fontScale(16),
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.scale(6),
  },
  fallbackHint: {
    fontSize: theme.fontScale(13),
    color: theme.colors.text.tertiary,
    textAlign: 'center',
    lineHeight: theme.fontScale(20),
  },

  // ===== 操作按钮区（推到下方） =====
  actionsSection: {
    marginTop: 'auto',
  },
  primaryButton: {
    height: theme.scale(52),
    borderRadius: theme.scale(26),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: theme.fontScale(16),
    fontWeight: theme.typography.fontWeight.semibold,
    color: '#FFF',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    height: theme.scale(52),
    borderRadius: theme.scale(26),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background.primary,
    borderWidth: 1,
    borderColor: theme.colors.border.medium,
    marginTop: theme.scale(14),
  },
  secondaryButtonText: {
    fontSize: theme.fontScale(15),
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
  },
  tertiaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.scale(16),
    paddingVertical: theme.scale(10),
  },
  tertiaryButtonText: {
    fontSize: theme.fontScale(14),
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  buttonDisabled: {
    opacity: 0.6,
  },

  // ===== 协议区 =====
  agreementSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: theme.scale(20),
    paddingHorizontal: theme.scale(4),
  },
  checkbox: {
    paddingTop: 2,
    marginRight: 8,
  },
  checkboxBox: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.2,
    borderColor: theme.colors.border.dark,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  checkboxBoxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  agreementText: {
    flex: 1,
    fontSize: theme.fontScale(11),
    color: theme.colors.text.tertiary,
    lineHeight: theme.fontScale(18),
  },
  agreementLink: {
    color: theme.colors.primary,
  },
});
