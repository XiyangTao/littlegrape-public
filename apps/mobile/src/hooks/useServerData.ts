import { useState, useEffect, useCallback, useMemo } from 'react';
import { useI18n } from '@/context/I18nProvider';
import { apiClient } from '@/api';
import { Language } from '@/locales';

// 通用的多语言数据类型
interface MultiLanguageData<T> {
  'zh-CN': T;
  'en-US': T;
}

interface ServerDataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * 通用的多语言服务端数据Hook
 * @param fetcher 数据获取函数
 */
function useServerData<T>(
  fetcher: () => Promise<{ success: boolean; data: MultiLanguageData<T> }>
): ServerDataState<T> {
  const { effectiveLanguage } = useI18n();
  const [multiLangData, setMultiLangData] = useState<MultiLanguageData<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 从多语言数据中获取当前语言的数据
  const data = useMemo((): T | null => {
    if (!multiLangData) return null;

    const getLanguageKey = (lang: Language): keyof MultiLanguageData<T> => {
      switch (lang) {
        case 'zh-CN':
          return 'zh-CN';
        case 'en':
        default:
          return 'en-US';
      }
    };

    const currentLanguageKey = getLanguageKey(effectiveLanguage);
    return multiLangData[currentLanguageKey] || multiLangData['en-US'];
  }, [multiLangData, effectiveLanguage]);

  // 获取数据
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetcher();

      if (response.success && response.data) {
        setMultiLangData(response.data);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.warn('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

  // 组件挂载时获取数据
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return useMemo(() => ({
    data,
    loading,
    error,
    refresh: fetchData,
  }), [data, loading, error, fetchData]);
}

// 具体的数据Hook

// 创建稳定的fetcher函数，避免每次render重新创建
const dailyGreetingFetcher = () => apiClient.getDailyGreeting().then(response => ({
  success: response.success,
  data: {
    'zh-CN': response.data?.greetings['zh-CN'] || '',
    'en-US': response.data?.greetings['en-US'] || ''
  } as MultiLanguageData<string>
}));

// 每日欢迎语Hook（返回双语数据，用于交替显示）
export function useDailyGreeting() {
  const [greetings, setGreetings] = useState<{ zhCN: string; enUS: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dailyGreetingFetcher()
      .then(response => {
        if (response.success && response.data) {
          setGreetings({
            zhCN: response.data['zh-CN'],
            enUS: response.data['en-US'],
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { greetings, loading };
}
