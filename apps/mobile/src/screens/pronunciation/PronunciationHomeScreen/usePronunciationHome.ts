import { useMemo, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  phonemeCategories,
  totalPhonemeCount,
  PHONEME_AUDIO_URLS,
  type Phoneme,
  type PhonemeCategory,
} from '@/data/phonemes';
import { useFocusLoader } from '@/hooks/useDataLoader';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import { useAuth } from '@/stores/AuthStore';
import { useTTS } from '@/hooks/useTTS';
import { getAllPhonemeProgress, type PhonemeProgressRow } from '@/db/PhonemeProgressDB';

export function usePronunciationHome() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const tts = useTTS();

  // 加载音素进度数据
  const { data: progressMap, reload: reloadProgress } = useFocusLoader(
    async () => {
      if (!user?.id) return new Map<string, PhonemeProgressRow>();
      return getAllPhonemeProgress(user.id);
    },
    [user?.id]
  );

  // 元音分类（短元音、长元音、双元音）
  const vowelCategories = useMemo(
    () => phonemeCategories.filter(cat =>
      ['short-vowels', 'long-vowels', 'diphthongs'].includes(cat.id)
    ),
    []
  );

  // 辅音分类
  const consonantCategories = useMemo(
    () => phonemeCategories.filter(cat =>
      !['short-vowels', 'long-vowels', 'diphthongs'].includes(cat.id)
    ),
    []
  );

  // 所有元音
  const vowels = useMemo(
    () => vowelCategories.flatMap(cat => cat.phonemes),
    [vowelCategories]
  );

  // 所有辅音
  const consonants = useMemo(
    () => consonantCategories.flatMap(cat => cat.phonemes),
    [consonantCategories]
  );


  const pronunciationGate = useFeatureGate('pronunciation');

  const handlePhonemePress = useCallback((phoneme: Phoneme) => {
    if (!pronunciationGate.guard()) return;
    navigation.navigate('PhonemePractice', { phonemeSymbol: phoneme.symbol });
  }, [navigation, pronunciationGate]);

  const handlePhonemePlay = useCallback((phoneme: Phoneme) => {
    const audioUrl = PHONEME_AUDIO_URLS[phoneme.symbol];
    if (!audioUrl) return;
    if (tts.isPlaying) {
      tts.stop();
    } else {
      tts.playUrl(`phoneme_${phoneme.symbol}`, audioUrl);
    }
  }, [tts]);

  const handleCategoryPress = useCallback((category: PhonemeCategory) => {
    if (!pronunciationGate.guard()) return;
    navigation.navigate('PhonemePractice', { categoryId: category.id });
  }, [navigation, pronunciationGate]);

  return {
    navigation,
    vowelCategories,
    consonantCategories,
    vowels,
    consonants,
    totalPhonemes: totalPhonemeCount,
    progressMap: progressMap || new Map<string, PhonemeProgressRow>(),
    tts,
    handlePhonemePress,
    handlePhonemePlay,
    handleCategoryPress,
    pronunciationLocked: pronunciationGate.locked,
  };
}
