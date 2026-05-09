import { useState, useCallback, type DependencyList } from 'react';
import { useFocusEffect } from '@react-navigation/native';

interface DataLoaderResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

/**
 * 通用数据加载 Hook
 * 在组件挂载时自动加载数据，提供 loading/error 状态和 reload 函数
 */
export function useDataLoader<T>(
  loader: () => Promise<T>,
  deps: DependencyList = [],
): DataLoaderResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await loader();
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, isLoading, error, reload };
}

/**
 * 带页面聚焦自动刷新的数据加载 Hook
 * 每次页面获得焦点时自动重新加载数据
 */
export function useFocusLoader<T>(
  loader: () => Promise<T>,
  deps: DependencyList = [],
): DataLoaderResult<T> {
  const result = useDataLoader(loader, deps);

  useFocusEffect(
    useCallback(() => {
      result.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [result.reload])
  );

  return result;
}
