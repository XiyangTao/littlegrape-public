import { useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';

/**
 * 页面聚焦时触发 React Query 后台刷新
 * 跳过首次挂载（首次由 useQuery 自动发起），之后每次聚焦调用 refetch
 * React Query 会判断 staleTime：未过期则忽略，过期则后台静默刷新（不闪烁）
 */
export function useRefreshOnFocus(refetch: () => void) {
  const firstTimeRef = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (firstTimeRef.current) {
        firstTimeRef.current = false;
        return;
      }
      refetch();
    }, [refetch]),
  );
}
