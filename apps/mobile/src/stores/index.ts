/**
 * Stores 统一导出
 *
 * 分层：
 * - App scope（模块级 singleton，跨 user）：AuthStore / AppStore / ToastStore / VersionStore
 * - Session scope（每用户一个实例，由 SessionContainer 持有）：
 *   UserStore / QuotaStore / AchievementStore / AssistantStore / CompanionStore / MessageStore
 *
 * Session scope store 文件保持纯粹（只导出 factory + 类型，不 import `@/session/*`），
 * React hook 集中在 `@/session/storeHooks`，apiClient handler 注册集中在 `@/session/interceptorBridge`。
 *
 * 调用方应统一从 `@/stores` barrel import hook（推荐），或从 `@/session/storeHooks` 直接 import。
 */

// 副作用 import：触发 apiClient handler 注册（成就/quota/toast 等拦截器路由）
// 任何 import `@/stores` 的文件都会自动加载，无需在 App.tsx 手动 import
import '@/session/storeHooks';

// ==================== App scope ====================

export {
  useAuthStore,
  useAuth,
  useCurrentUser,
} from './AuthStore';

export {
  useAppStore,
  useTheme,
  useLanguage,
  useVoices,
  useScenarios,
  useCharacters,
  useTranslationSettings,
  initializeSystemListeners,
  type VoiceInfo,
  type ThemeSetting,
  type LanguageSetting,
} from './AppStore';

export { useToastStore, useToast, toast } from './ToastStore';

export { useVersionStore } from './VersionStore';

// ==================== Session scope ====================
// React hook 来自 storeHooks（store 工厂文件不再 export hook）
export {
  useUserStore,
  getUserStoreState,
  useUserStats,
  useCurrentLibrary,
  useVocabularyTest,
  useQuotaStore,
  getQuotaStoreState,
  useQuota,
  useAchievementStore,
  getAchievementStoreState,
  useAssistantStore,
  getAssistantStoreState,
  useAssistantUnread,
  useCompanionStore,
  useCompanionMessages,
  useCompanionSending,
  useCompanionTyping,
  useMessageStore,
  useSessionMessages,
} from '@/session/storeHooks';

// 类型从 store 工厂文件导出
export type { TodayStats, OverviewStats } from './UserStore';
