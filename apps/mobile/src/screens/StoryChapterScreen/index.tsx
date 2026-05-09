import React, { useRef, useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image, Animated,
  ActivityIndicator, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@react-native-vector-icons/material-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeProvider';
import { CHARACTER_THEME_COLORS } from '@/data/storyMockData';
import { createStyles } from './styles';
import { useStoryChapter } from './useStoryChapter';
import type { ChapterNode, ChapterMeta } from './useStoryChapter';

export default function StoryChapterScreen() {
  const { theme } = useTheme();
  const {
    effectiveLanguage,
    storyLine,
    chapters,
    chapterMetas,
    activeChapterNumber,
    character,
    characterId,
    completedCount,
    isLoading,
    pulseAnim,
    handleBack,
    handleEpisodePress,
    handleChapterChange,
    getChapterCover,
  } = useStoryChapter();

  const themeColor = CHARACTER_THEME_COLORS[characterId] || storyLine?.themeColor || '#7C5CFC';
  const styles = createStyles(theme, themeColor);
  const isZh = effectiveLanguage === 'zh-CN';

  const cardMargin = theme.spacing.lg;
  const cardWidth = theme.screen.width - cardMargin * 2;
  const snapInterval = cardWidth + theme.spacing.sm; // card + gap
  const chapterScrollRef = useRef<ScrollView>(null);

  // 滑动章节卡片切换
  const onChapterScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / snapInterval);
    if (idx >= 0 && idx < chapterMetas.length) {
      handleChapterChange(chapterMetas[idx].chapterNumber);
    }
  }, [snapInterval, chapterMetas, handleChapterChange]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColor} />
        </View>
      </SafeAreaView>
    );
  }

  if (!storyLine) return null;

  const totalEpisodes = storyLine.totalEpisodes || 1;

  // 星星
  const renderStars = (stars: number) => (
    <View style={styles.starsRow}>
      {[1, 2, 3].map(i => (
        <MaterialIcons
          key={i}
          name={i <= stars ? 'star' : 'star-border'}
          size={16}
          color={i <= stars ? '#FFB800' : theme.colors.border.medium}
        />
      ))}
    </View>
  );

  // 章节卡片
  const renderChapterCard = (ch: ChapterMeta, index: number) => {
    const coverUrl = getChapterCover(ch);
    const progress = ch.totalCount > 0 ? ch.completedCount / ch.totalCount : 0;

    return (
      <View key={ch.id} style={[styles.chapterCard, { width: cardWidth }]}>
        {/* 封面图 */}
        <View style={styles.chapterCoverWrap}>
          {coverUrl ? (
            <Image source={{ uri: coverUrl }} style={styles.chapterCoverImage} resizeMode="cover" />
          ) : (
            <View style={[styles.chapterCoverPlaceholder, { backgroundColor: themeColor + '20' }]}>
              <Text style={styles.chapterCoverEmoji}>{storyLine.emoji || '📖'}</Text>
            </View>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.chapterCoverGradient}
          >
            <Text style={styles.chapterLabel}>Chapter {ch.chapterNumber}</Text>
          </LinearGradient>
        </View>

        {/* 信息区 */}
        <View style={styles.chapterInfoArea}>
          <Text style={styles.chapterTitleEn} numberOfLines={1}>{ch.title}</Text>
          <Text style={styles.chapterTitleZh} numberOfLines={1}>{ch.titleZh}</Text>

          {/* 进度条 */}
          <View style={styles.chapterProgressRow}>
            <View style={styles.chapterProgressBg}>
              <View style={[styles.chapterProgressFill, {
                width: `${Math.max(progress * 100, 2)}%`,
                backgroundColor: themeColor,
              }]} />
            </View>
            <Text style={styles.chapterProgressText}>{ch.completedCount}/{ch.totalCount}</Text>
          </View>
        </View>
      </View>
    );
  };

  // 剧集行
  const renderEpisodeRow = (episode: ChapterNode) => {
    const isPlayed = episode.status === 'completed';

    return (
      <TouchableOpacity
        key={episode.episodeId}
        style={styles.episodeRow}
        onPress={() => handleEpisodePress(episode)}
        activeOpacity={0.7}
      >
        {/* 状态指示 */}
        <View style={[
          styles.episodeStatusDot,
          isPlayed ? { backgroundColor: themeColor } : { backgroundColor: theme.colors.border.light },
        ]}>
          {isPlayed && <MaterialIcons name="check" size={14} color="#FFF" />}
        </View>

        {/* 标题 */}
        <View style={styles.episodeTitleWrap}>
          <Text style={styles.episodeTitle} numberOfLines={1}>{episode.title}</Text>
          <Text style={styles.episodeTitleZh} numberOfLines={1}>{episode.titleZh}</Text>
        </View>

        {/* 星星 */}
        {isPlayed && renderStars(episode.stars)}
      </TouchableOpacity>
    );
  };

  const activeIdx = chapterMetas.findIndex(c => c.chapterNumber === activeChapterNumber);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 顶部栏 */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <MaterialIcons name="arrow-back" size={22} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle} numberOfLines={1}>{storyLine.title}</Text>
        <Text style={[styles.topBarProgress, { color: themeColor }]}>
          {completedCount}/{totalEpisodes}
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 章节卡片横向滑动 */}
        {chapterMetas.length > 0 && (
          <View style={styles.chapterSection}>
            <ScrollView
              ref={chapterScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onChapterScroll}
              snapToInterval={snapInterval}
              snapToAlignment="start"
              decelerationRate="fast"
              contentContainerStyle={styles.chapterScrollContent}
              contentOffset={{ x: activeIdx * snapInterval, y: 0 }}
            >
              {chapterMetas.map((ch, i) => renderChapterCard(ch, i))}
            </ScrollView>

            {/* 分页圆点 */}
            <View style={styles.dotsRow}>
              {chapterMetas.map((ch, i) => (
                <View
                  key={ch.id}
                  style={[styles.dot, activeIdx === i && [styles.dotActive, { backgroundColor: themeColor }]]}
                />
              ))}
            </View>
          </View>
        )}

        {/* 剧集列表 */}
        <View style={styles.episodeList}>
          {chapters.map(episode => renderEpisodeRow(episode))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
