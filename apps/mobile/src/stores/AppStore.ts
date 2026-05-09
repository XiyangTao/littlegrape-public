/**
 * 应用数据 Store
 *
 * 管理与用户账号无关的应用级数据：
 * - 主题设置（浅色/深色/跟随系统）
 * - 语言设置（中文/英文/跟随系统）
 * - 角色列表（声音信息从角色数据派生）
 * - 预定义场景列表
 *
 * 特点：
 * - APP 启动时加载
 * - 不随用户登录/登出变化
 * - 设置项持久化到 AsyncStorage
 * - 资源数据从服务器获取，不持久化
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance, AppState as RNAppState } from 'react-native';
import * as Localization from 'expo-localization';
import axios from 'axios';
import { apiClient } from '@/api';
import { syncPhonemeData } from '@/db/PhonemeDataDB';
import type { ThemeMode } from '@/theme';
import type { Language } from '@/locales';
import type { PredefinedScenario, ScenarioCategory, I18nText, Character, CharacterRole } from '@/types/conversation';

// ==================== 类型定义 ====================

/** TTS 声音信息 */
export interface VoiceInfo {
  id: string;
  name: string;
  gender: 'male' | 'female';
  language: string;
  variant: 'american' | 'british';
  accent: string;
  avatar: string;
  sampleAudio: string;
  description: string;
  voiceEngineId: string;
}

/** 主题设置类型 */
export type ThemeSetting = ThemeMode | 'system';

/** 语言设置类型 */
export type LanguageSetting = Language | 'system';

/** 翻译设置类型 */
export interface TranslationSettings {
  /** 自动播放翻译结果 */
  autoPlay: boolean;
  /** 中文播报角色 ID */
  voiceZh: string;
  /** 英文播报角色 ID */
  voiceEn: string;
  /** 同声传译 TTS 音色（火山 speaker_id），仅 s2s 模式使用 */
  interpretationVoice: string;
}

/** 应用状态（只读数据） */
interface AppState {
  // ------ 设置（持久化） ------
  /** 主题设置 */
  theme: ThemeSetting;
  /** 语言设置 */
  language: LanguageSetting;
  /** 系统主题（用于跟随系统时） */
  systemTheme: ThemeMode;
  /** 系统语言（用于跟随系统时） */
  systemLanguage: Language;
  /** 翻译设置 */
  translationSettings: TranslationSettings;

  // ------ 资源数据（不持久化） ------
  /** 角色列表（声音信息从角色数据派生） */
  characters: Character[];
  /** 角色是否已加载 */
  isCharactersLoaded: boolean;
  /** 预定义场景列表 */
  scenarios: PredefinedScenario[];
  /** 场景是否已加载 */
  isScenariosLoaded: boolean;
}

/** 应用操作（方法） */
interface AppActions {
  // ------ 主题操作 ------
  /** 设置主题 */
  setTheme: (theme: ThemeSetting) => void;
  /** 获取实际生效的主题 */
  getEffectiveTheme: () => ThemeMode;
  /** 更新系统主题（内部使用） */
  updateSystemTheme: (theme: ThemeMode) => void;

  // ------ 语言操作 ------
  /** 设置语言 */
  setLanguage: (language: LanguageSetting) => void;
  /** 获取实际生效的语言 */
  getEffectiveLanguage: () => Language;
  /** 更新系统语言（内部使用） */
  updateSystemLanguage: (language: Language) => void;

  // ------ 设置操作 ------
  /** 重置所有状态（恢复 initialState） */
  reset: () => void;
  /** 重置所有设置（仅重置持久化的设置项，保留向后兼容） */
  resetSettings: () => void;

  // ------ 翻译设置操作 ------
  /** 设置自动播放 */
  setTranslationAutoPlay: (enabled: boolean) => void;
  /** 设置中文音色 */
  setTranslationVoiceZh: (voiceId: string) => void;
  /** 设置英文音色 */
  setTranslationVoiceEn: (voiceId: string) => void;
  /** 设置同传 TTS 音色 */
  setInterpretationVoice: (voiceId: string) => void;

  // ------ 角色操作（声音从角色数据派生） ------
  /** 加载角色列表 */
  loadCharacters: () => Promise<void>;
  /** 根据 ID 获取角色 */
  getCharacterById: (id: string) => Character | undefined;
  /** 根据角色类型获取角色列表 */
  getCharactersByRole: (role: CharacterRole) => Character[];
  /** 根据 ID 获取声音（从角色数据派生） */
  getVoiceById: (id: string) => VoiceInfo | undefined;
  /** 根据口音获取声音列表（从角色数据派生） */
  getVoicesByVariant: (variant: 'american' | 'british') => VoiceInfo[];

  // ------ 场景操作 ------
  /** 加载场景列表 */
  loadScenarios: () => Promise<void>;
  /** 刷新场景列表 */
  refreshScenarios: () => Promise<void>;
  /** 根据分类获取场景列表 */
  getScenariosByCategory: (category: ScenarioCategory) => PredefinedScenario[];

  // ------ 全局操作 ------
  /** 加载需要认证的资源（登录后调用） */
  loadAuthenticatedResources: () => Promise<void>;
  /** 刷新所有资源数据 */
  refreshAll: () => Promise<void>;
}

/** 完整的 Store 类型 */
type AppStore = AppState & AppActions;

// ==================== 辅助函数 ====================

/** 获取系统语言 */
const getSystemLanguage = (): Language => {
  try {
    const locales = Localization.getLocales();
    const deviceLanguage = locales[0]?.languageTag || 'zh-CN';

    if (
      deviceLanguage === 'zh' ||
      deviceLanguage === 'zh-CN' ||
      deviceLanguage === 'zh-Hans' ||
      deviceLanguage === 'zh-Hans-CN'
    ) {
      return 'zh-CN';
    }

    if (deviceLanguage === 'en' || deviceLanguage.startsWith('en-')) {
      return 'en';
    }

    return 'zh-CN';
  } catch (error) {
    console.warn('[AppStore] 检测系统语言失败:', error);
    return 'zh-CN';
  }
};

/** 获取系统主题 */
const getSystemTheme = (): ThemeMode => {
  const systemTheme = Appearance.getColorScheme();
  return (systemTheme as ThemeMode) || 'light';
};

// ==================== 辅助函数 ====================

/** 从角色数据派生声音信息 */
const characterToVoice = (c: Character): VoiceInfo => ({
  id: c.id,
  name: c.name,
  gender: c.gender,
  language: c.language,
  variant: c.variant as 'american' | 'british',
  accent: c.accent,
  avatar: c.avatar || '',
  sampleAudio: '',
  description: c.description || '',
  voiceEngineId: c.voiceEngineId,
});

// ==================== 默认值 ====================

const defaultTranslationSettings: TranslationSettings = {
  autoPlay: true,
  voiceZh: 'taozi',  // 桃子老师（reading_teacher 第一个）
  voiceEn: 'mia',    // Mia（conversation 第一个）
  interpretationVoice: '', // 空 = 复刻用户自己的声音（同传 2.0 默认行为）
};

const defaultSettings: Pick<AppState, 'theme' | 'language' | 'systemTheme' | 'systemLanguage' | 'translationSettings'> = {
  theme: 'system',
  language: 'system',
  systemTheme: getSystemTheme(),
  systemLanguage: getSystemLanguage(),
  translationSettings: defaultTranslationSettings,
};

const initialState: AppState = {
  ...defaultSettings,
  characters: [],
  isCharactersLoaded: false,
  scenarios: [],
  isScenariosLoaded: false,
};

// ==================== Store 实现 ====================

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ====== 主题操作 ======

      setTheme: (theme) => set({ theme }),

      getEffectiveTheme: () => {
        const { theme, systemTheme } = get();
        return theme === 'system' ? systemTheme : (theme as ThemeMode);
      },

      updateSystemTheme: (newSystemTheme) => set({ systemTheme: newSystemTheme }),

      // ====== 语言操作 ======

      setLanguage: (language) => set({ language }),

      getEffectiveLanguage: () => {
        const { language, systemLanguage } = get();
        return language === 'system' ? systemLanguage : language;
      },

      updateSystemLanguage: (newSystemLanguage) => set({ systemLanguage: newSystemLanguage }),

      // ====== 设置操作 ======

      reset: () => set(initialState),

      resetSettings: () => set(defaultSettings),

      // ====== 翻译设置操作 ======

      setTranslationAutoPlay: (enabled) =>
        set((state) => ({
          translationSettings: { ...state.translationSettings, autoPlay: enabled },
        })),

      setTranslationVoiceZh: (voiceId) =>
        set((state) => ({
          translationSettings: { ...state.translationSettings, voiceZh: voiceId },
        })),

      setTranslationVoiceEn: (voiceId) =>
        set((state) => ({
          translationSettings: { ...state.translationSettings, voiceEn: voiceId },
        })),

      setInterpretationVoice: (voiceId) =>
        set((state) => ({
          translationSettings: { ...state.translationSettings, interpretationVoice: voiceId },
        })),

      // ====== 角色操作（声音从角色数据派生） ======

      loadCharacters: async () => {
        try {
          const response = await apiClient.getCharacters();
          if (response.success && response.data) {
            set({ characters: response.data, isCharactersLoaded: true });
          }
        } catch (error) {
          // 被 SessionContainer.signal abort 取消时（logout 时）不要标 isCharactersLoaded:true，
          // 否则下一个用户登录前 store 会处于「假装已加载但数据为空」的卡死态
          if (axios.isCancel(error)) return;
          console.error('[AppStore] 加载角色列表失败:', error);
          set({ isCharactersLoaded: true });
        }
      },

      getCharacterById: (id: string) => {
        return get().characters.find((c) => c.id === id);
      },

      getCharactersByRole: (role: CharacterRole) => {
        return get().characters.filter((c) => c.roles.includes(role));
      },

      getVoiceById: (id: string) => {
        const c = get().characters.find((ch) => ch.id === id);
        return c ? characterToVoice(c) : undefined;
      },

      getVoicesByVariant: (variant: 'american' | 'british') => {
        return get()
          .characters.filter((c) => c.variant === variant)
          .map(characterToVoice);
      },

      // ====== 场景操作 ======

      loadScenarios: async () => {
        try {
          const response = await apiClient.getScenarios();
          if (response.scenarios) {
            const scenarioList: PredefinedScenario[] = response.scenarios.map((s: Record<string, unknown>) => ({
              id: s.id as string,
              title: s.title as unknown as I18nText,
              category: s.category as ScenarioCategory,
              ai_role: s.ai_role as string,
              scenario: s.scenario as string,
              description: s.description as unknown as I18nText,
              imageUrl: s.image_url as string,
            }));
            set({ scenarios: scenarioList, isScenariosLoaded: true });
          }
        } catch (error) {
          if (axios.isCancel(error)) return;
          console.error('[AppStore] 加载场景列表失败:', error);
          set({ isScenariosLoaded: true });
        }
      },

      refreshScenarios: async () => {
        set({ isScenariosLoaded: false });
        await get().loadScenarios();
      },

      getScenariosByCategory: (category: ScenarioCategory) => {
        return get().scenarios.filter((s) => s.category === category);
      },

      // ====== 全局操作 ======

      loadAuthenticatedResources: async () => {
        // 并行加载需要认证的资源数据
        await Promise.all([
          get().loadCharacters(),
          get().loadScenarios(),
          syncPhonemeData(),
        ]);
      },

      refreshAll: async () => {
        await Promise.all([get().loadCharacters(), get().refreshScenarios()]);
      },
    }),
    {
      name: 'app-store',
      storage: createJSONStorage(() => AsyncStorage),
      // 只持久化设置，不持久化资源数据
      partialize: (state) => ({
        theme: state.theme,
        language: state.language,
        translationSettings: state.translationSettings,
      }),
      version: 2,
      // 深合并：保证新增字段（如 translationSettings.interpretationVoice）
      // 能从 defaults 补齐，旧用户不会因缺字段走到 undefined 分支。
      merge: (persistedState: any, currentState: AppStore): AppStore => ({
        ...currentState,
        ...persistedState,
        translationSettings: {
          ...currentState.translationSettings,
          ...(persistedState?.translationSettings || {}),
        },
      }),
    }
  )
);

// ==================== 系统监听器 ====================

let systemListenersInitialized = false;

export const initializeSystemListeners = () => {
  if (systemListenersInitialized) return;

  // 监听系统主题变化
  const themeSubscription = Appearance.addChangeListener(({ colorScheme }) => {
    const newSystemTheme = (colorScheme as ThemeMode) || 'light';
    useAppStore.getState().updateSystemTheme(newSystemTheme);
  });

  // 监听应用前后台切换，检测系统语言变化
  const appStateSubscription = RNAppState.addEventListener('change', (nextAppState) => {
    if (nextAppState === 'active') {
      const currentSystemLanguage = getSystemLanguage();
      const storedSystemLanguage = useAppStore.getState().systemLanguage;

      if (currentSystemLanguage !== storedSystemLanguage) {
        useAppStore.getState().updateSystemLanguage(currentSystemLanguage);
      }
    }
  });

  systemListenersInitialized = true;

  return () => {
    themeSubscription?.remove();
    appStateSubscription?.remove();
    systemListenersInitialized = false;
  };
};

// 自动初始化监听器
initializeSystemListeners();

// ==================== 便捷 Hooks ====================

/** 获取主题设置 */
export const useTheme = () => {
  const theme = useAppStore((state) => state.theme);
  const systemTheme = useAppStore((state) => state.systemTheme);
  const setTheme = useAppStore((state) => state.setTheme);

  const effectiveMode = theme === 'system' ? systemTheme : (theme as ThemeMode);

  return {
    setting: theme,
    effectiveMode,
    isDark: effectiveMode === 'dark',
    isLight: effectiveMode === 'light',
    isSystem: theme === 'system',
    setTheme,
  };
};

/** 获取语言设置 */
export const useLanguage = () => {
  const language = useAppStore((state) => state.language);
  const systemLanguage = useAppStore((state) => state.systemLanguage);
  const setLanguage = useAppStore((state) => state.setLanguage);

  const effectiveLanguage = language === 'system' ? systemLanguage : language;

  return {
    setting: language,
    effectiveLanguage,
    isSystem: language === 'system',
    setLanguage,
  };
};

/** 获取声音数据（从角色数据派生） */
export const useVoices = () => {
  const characters = useAppStore((state) => state.characters);
  const isCharactersLoaded = useAppStore((state) => state.isCharactersLoaded);
  const getVoiceById = useAppStore((state) => state.getVoiceById);
  const getVoicesByVariant = useAppStore((state) => state.getVoicesByVariant);
  const loadCharacters = useAppStore((state) => state.loadCharacters);

  const voiceAvatars = characters.reduce(
    (map, c) => {
      if (c.id && c.avatar) map[c.id] = c.avatar;
      return map;
    },
    {} as Record<string, string>,
  );

  return {
    voices: characters.map(characterToVoice),
    voiceAvatars,
    isVoicesLoaded: isCharactersLoaded,
    getVoiceById,
    getVoicesByVariant,
    refreshVoices: loadCharacters,
  };
};

/** 获取场景数据 */
export const useScenarios = () => {
  const scenarios = useAppStore((state) => state.scenarios);
  const isScenariosLoaded = useAppStore((state) => state.isScenariosLoaded);
  const getScenariosByCategory = useAppStore((state) => state.getScenariosByCategory);
  const refreshScenarios = useAppStore((state) => state.refreshScenarios);

  return {
    scenarios,
    isScenariosLoaded,
    getScenariosByCategory,
    refreshScenarios,
  };
};

/** 获取角色数据 */
export const useCharacters = () => {
  const characters = useAppStore((state) => state.characters);
  const isCharactersLoaded = useAppStore((state) => state.isCharactersLoaded);
  const getCharacterById = useAppStore((state) => state.getCharacterById);
  const getCharactersByRole = useAppStore((state) => state.getCharactersByRole);

  return {
    characters,
    isCharactersLoaded,
    getCharacterById,
    getCharactersByRole,
  };
};

/** 获取翻译设置 */
export const useTranslationSettings = () => {
  const translationSettings = useAppStore((state) => state.translationSettings);
  const setTranslationAutoPlay = useAppStore((state) => state.setTranslationAutoPlay);
  const setTranslationVoiceZh = useAppStore((state) => state.setTranslationVoiceZh);
  const setTranslationVoiceEn = useAppStore((state) => state.setTranslationVoiceEn);
  const setInterpretationVoice = useAppStore((state) => state.setInterpretationVoice);

  return {
    ...translationSettings,
    setAutoPlay: setTranslationAutoPlay,
    setVoiceZh: setTranslationVoiceZh,
    setVoiceEn: setTranslationVoiceEn,
    setInterpretationVoice,
  };
};
