import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import i18n, { Language, languages } from '@/locales';
import { useLanguage as useLanguageFromStore } from '@/stores';

// Context 类型定义
interface I18nContextType {
  setting: Language | 'system';
  effectiveLanguage: Language;
  availableLanguages: Record<Language, string>;
  setLanguage: (language: 'zh-CN' | 'en' | 'system') => void;
  t: (key: string, options?: any) => string;
  isReady: boolean;
  isSystem: boolean;
}

// Context 配置
const I18nContext = createContext<I18nContextType | undefined>(undefined);

interface I18nProviderProps {
  children: ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const { setting, effectiveLanguage, setLanguage, isSystem } = useLanguageFromStore();
  const [isReady, setIsReady] = React.useState(false);

  // 翻译函数
  const t = (key: string, options?: any): string => {
    return i18n.t(key, { ...options, lng: effectiveLanguage }) as string;
  };

  // 初始化和监听语言变化
  useEffect(() => {
    setIsReady(false); // 语言切换时重置

    const changeLanguage = async () => {
      // 只在语言真正变化时才切换
      if (i18n.language !== effectiveLanguage) {
        try {
          await i18n.changeLanguage(effectiveLanguage);
        } catch (error) {
          console.warn('Language change failed:', error);
        }
      }
      setIsReady(true);
    };

    changeLanguage();
  }, [effectiveLanguage]);

  const value: I18nContextType = {
    setting,
    effectiveLanguage,
    availableLanguages: languages,
    setLanguage,
    t,
    isReady,
    isSystem,
  };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextType {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}