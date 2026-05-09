import { useRef, useState, useEffect, useCallback } from 'react';
import { ScrollView, NativeSyntheticEvent, NativeScrollEvent, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useI18n } from '@/context/I18nProvider';
import { BANNERS, MOCK_DAILY_WORD, MOCK_RECOMMENDED_USERS, MOCK_WEEKLY_STARS } from './mockData';

export function useDiscover() {
  const navigation = useNavigation<any>();
  const { t } = useI18n();
  const { width: SCREEN_WIDTH } = useWindowDimensions();

  // Banner 轮播状态
  const [activeBanner, setActiveBanner] = useState(0);
  const bannerRef = useRef<ScrollView>(null);
  const autoPlayTimer = useRef<ReturnType<typeof setInterval>>(undefined);

  // 每日一词收藏状态（mock）
  const [isWordFavorited, setIsWordFavorited] = useState(false);

  // 自动轮播
  useEffect(() => {
    autoPlayTimer.current = setInterval(() => {
      setActiveBanner(prev => {
        const next = (prev + 1) % BANNERS.length;
        bannerRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
        return next;
      });
    }, 4000);
    return () => clearInterval(autoPlayTimer.current);
  }, []);

  const handleBannerScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveBanner(idx);
  }, []);

  const toggleFavorite = useCallback(() => {
    setIsWordFavorited(prev => !prev);
  }, []);

  return {
    navigation,
    t,
    activeBanner,
    bannerRef,
    handleBannerScroll,
    dailyWord: MOCK_DAILY_WORD,
    isWordFavorited,
    toggleFavorite,
    recommendedUsers: MOCK_RECOMMENDED_USERS,
    weeklyStars: MOCK_WEEKLY_STARS,
    SCREEN_WIDTH,
  };
}
