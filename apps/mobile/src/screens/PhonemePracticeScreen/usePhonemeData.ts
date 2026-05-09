import { useState, useEffect, useCallback } from 'react';
import {
  allPhonemes as hardcodedPhonemes,
  type Phoneme,
} from '@/data/phonemes';
import { getCachedPhonemeData } from '@/db/PhonemeDataDB';

/**
 * 读取音素数据 Hook
 *
 * 加载优先级：
 * 1. 立即使用前端硬编码数据（无 loading 阻塞）
 * 2. 异步读取 SQLite 缓存 → 如命中则替换
 * 3. 如果缓存为空，保持使用硬编码数据
 */
export function usePhonemeData() {
  const [allPhonemes, setAllPhonemes] = useState<Phoneme[]>(hardcodedPhonemes);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const cached = await getCachedPhonemeData();
        if (cancelled) return;
        if (cached && cached.categories.length > 0) {
          const phonemes = cached.categories.flatMap(cat => cat.phonemes);
          if (phonemes.length > 0) {
            setAllPhonemes(phonemes);
          }
        }
      } catch (error) {
        console.error('[usePhonemeData] 读取缓存失败:', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const getPhonemeBySymbol = useCallback(
    (symbol: string): Phoneme | undefined => {
      return allPhonemes.find(p => p.symbol === symbol);
    },
    [allPhonemes]
  );

  return { allPhonemes, getPhonemeBySymbol };
}
