import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import en from './en.json';
import zhCN from './zh-CN.json';

export type Language = 'en' | 'zh-CN';

export const languages: Record<Language, string> = {
  en: 'English',
  'zh-CN': '中文',
};

const resources = {
  en: {
    translation: en,
  },
  'zh-CN': {
    translation: zhCN,
  },
};

// 获取设备默认语言
const getDeviceLanguage = (): Language => {
  try {
    const locales = Localization.getLocales();
    const deviceLanguage = locales[0]?.languageTag || 'en';

    // 中文语言映射
    if (deviceLanguage === 'zh' ||
        deviceLanguage === 'zh-CN' ||
        deviceLanguage === 'zh-Hans' ||
        deviceLanguage === 'zh-Hans-CN') {
      return 'zh-CN';
    }

    // 英文语言映射
    if (deviceLanguage === 'en' ||
        deviceLanguage.startsWith('en-')) {
      return 'en';
    }

    // 默认英文
    return 'en';
  } catch (error) {
    console.warn('Failed to detect device language:', error);
    return 'en';
  }
};

// 初始化 i18n
const initLanguage = getDeviceLanguage();

if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: initLanguage,
      supportedLngs: ['en', 'zh-CN', 'zh'],

      // 简化fallback配置
      fallbackLng: {
        'zh': ['zh-CN'],
        'zh-CN': ['zh-CN'],
        'default': ['en']
      },

      interpolation: {
        escapeValue: false, // React已经处理了XSS
      },

      // React Native特定配置
      compatibilityJSON: 'v4',

      // 调试模式（仅开发环境开启）
      debug: __DEV__,

      // 减少警告日志
      saveMissing: false,
      missingKeyHandler: false,

      // 语言加载策略
      load: 'all',
      cleanCode: false,

      // 非严格模式，允许语言代码的变体
      nonExplicitSupportedLngs: true,
    });
}

export default i18n;