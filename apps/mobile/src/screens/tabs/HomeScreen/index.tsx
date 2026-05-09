import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@react-native-vector-icons/material-icons';
import { useTheme } from '@/context/ThemeProvider';
import Icon from '@/components/Icon';
import { PremiumBadge } from '@/components/PremiumBadge';
import { DIFFICULTY_COLORS } from '@/constants/colors';
import { CLASSICS } from '@/constants/classicsTheme';
import { useClassicsBooks } from '@/hooks/queries/classicsQueries';
import { createStyles } from './styles';
import { useHome } from './useHome';

export default function HomeScreen() {
  const { theme } = useTheme();
  const bannerWidth = theme.screen.width - theme.spacing.lg * 2;
  const styles = createStyles(theme);
  const [readingIndex, setReadingIndex] = useState(0);
  const [storyIndex, setStoryIndex] = useState(0);

  const onReadingScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / bannerWidth);
    setReadingIndex(idx);
  }, [bannerWidth]);

  const storyCardWidth = bannerWidth;
  const onStoryScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / storyCardWidth);
    setStoryIndex(idx);
  }, [storyCardWidth]);


  const {
    navigation,
    user,
    t,
    greetingText,
    greetingLoading,
    greetingOpacity,
    overviewStats,
    storyLinesWithProgress,
    handleStoryLinePress,
    storyLocked,
    dailyReading,
    effectiveLanguage,
  } = useHome();

  // 名著精读入口卡 — 取前 6 本展示
  const classicsQuery = useClassicsBooks(undefined, 6);
  const classicsPreview = classicsQuery.data?.pages[0]?.books ?? [];
  const lang = effectiveLanguage === 'zh-CN' ? 'zh-CN' : 'en';

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 问候 */}
      <View style={styles.header}>
        <View style={styles.greetingRow}>
          <Text style={styles.greeting} numberOfLines={2}>
            {t('home.greeting', { name: user?.nickname || user?.username || t('home.defaultUser') })}
          </Text>
          {overviewStats.streakDays > 0 && (
            <TouchableOpacity
              style={styles.streakBadge}
              onPress={() => navigation.navigate('StudyStats')}
              activeOpacity={0.7}
            >
              <Text style={styles.streakFire}>🔥</Text>
              <Text style={styles.streakNum}>{overviewStats.streakDays}</Text>
            </TouchableOpacity>
          )}
        </View>
        <Animated.Text style={[styles.subGreeting, { opacity: greetingOpacity }]} numberOfLines={2}>
          {greetingLoading ? '...' : (greetingText || t('home.subtitle'))}
        </Animated.Text>
      </View>

      {/* 每日精读 — 全宽轮播 Banner */}
      {dailyReading && dailyReading.length > 0 && (
        <View style={styles.readingSection}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>{t('home.dailyReading')}</Text>
            <TouchableOpacity
              style={styles.viewAll}
              onPress={() => navigation.navigate('ReadingList')}
              activeOpacity={0.7}
            >
              <Text style={styles.viewAllText}>{t('home.viewAll')}</Text>
              <MaterialIcons name="chevron-right" size={18} color={theme.colors.text.tertiary} />
            </TouchableOpacity>
          </View>

          <View style={styles.bannerWrap}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onReadingScroll}
              contentContainerStyle={styles.bannerScroll}
            >
              {dailyReading.map(item => (
                <TouchableOpacity
                  key={item.article.id}
                  style={[styles.bannerCard, { width: bannerWidth }]}
                  onPress={() => navigation.navigate('IntensiveReading', { articleId: item.article.id })}
                  activeOpacity={0.92}
                >
                  {item.article.imageUrl ? (
                    <Image source={{ uri: item.article.imageUrl }} style={styles.bannerImage} resizeMode="cover" />
                  ) : (
                    <View style={styles.bannerImagePlaceholder}>
                      <Icon name="menu-book" size={40} color={theme.colors.text.disabled} />
                    </View>
                  )}
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.45)', 'rgba(0,0,0,0.88)']}
                    locations={[0.2, 0.55, 1]}
                    style={styles.bannerGradient}
                  >
                    <Text style={styles.bannerTitle} numberOfLines={2}>{item.article.title}</Text>
                    {item.article.titleZh && (
                      <Text style={styles.bannerSubtitle} numberOfLines={1}>{item.article.titleZh}</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* 分页圆点 */}
            {dailyReading.length > 1 && (
              <View style={styles.dotsRow}>
                {dailyReading.map((item, i) => (
                  <View
                    key={item.article.id}
                    style={[styles.dot, i === readingIndex && styles.dotActive]}
                  />
                ))}
              </View>
            )}
          </View>
        </View>
      )}

      {/* 名著精读 — 横滑书架入口 */}
      {classicsPreview.length > 0 && (
        <View style={styles.classicsSection}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>{t('home.classicsReading')}</Text>
            <TouchableOpacity
              style={styles.viewAll}
              onPress={() => navigation.navigate('ClassicsHome')}
              activeOpacity={0.7}
            >
              <Text style={styles.viewAllText}>{t('home.viewAll')}</Text>
              <MaterialIcons name="chevron-right" size={18} color={theme.colors.text.tertiary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.classicsScroll}
          >
            {classicsPreview.map((book) => (
              <TouchableOpacity
                key={book.id}
                style={styles.classicsCard}
                onPress={() => navigation.navigate('ClassicsBookDetail', { slug: book.slug })}
                activeOpacity={0.85}
              >
                {book.coverUrl ? (
                  <Image source={{ uri: book.coverUrl }} style={styles.classicsCover} resizeMode="cover" />
                ) : (
                  <View style={styles.classicsCoverFallback}>
                    <Icon name="menu-book" size={28} color={theme.colors.text.disabled} />
                  </View>
                )}
                <Text style={styles.classicsTitle} numberOfLines={2}>
                  {lang === 'zh-CN' && book.titleZh ? book.titleZh : book.title}
                </Text>
                <Text style={styles.classicsAuthor} numberOfLines={1}>
                  {lang === 'zh-CN' && book.authorZh ? book.authorZh : book.author}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* 互动故事 — 轮播卡片 */}
      {storyLinesWithProgress.length > 0 && (
        <View style={styles.storySection}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>{t('home.interactiveStory')}</Text>
          </View>

          <View style={styles.storyCardsWrap}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onStoryScroll}
            >
              {storyLinesWithProgress.map((line) => {
                const progress = line.publishedCount > 0 ? line.completedCount / line.publishedCount : 0;
                const ctaLabel = line.completedCount > 0 ? t('home.continue') : t('home.startStory');
                const themeColor = line.themeColor || '#7C5CFC';

                return (
                  <TouchableOpacity
                    key={line.id}
                    style={[styles.storyCard, { width: storyCardWidth }]}
                    onPress={() => handleStoryLinePress(line)}
                    activeOpacity={0.85}
                  >
                    {/* 封面图 */}
                    <View style={styles.storyCoverWrap}>
                      {line.imageUrl ? (
                        <Image source={{ uri: line.imageUrl }} style={styles.storyCoverImage} resizeMode="cover" />
                      ) : (
                        <View style={[styles.storyCoverPlaceholder, { backgroundColor: themeColor + '20' }]}>
                          <Text style={styles.storyCoverEmoji}>{line.emoji || '📖'}</Text>
                        </View>
                      )}
                      {/* 角色头像浮层 */}
                      {line.characterAvatar && (
                        <View style={styles.storyAvatarWrap}>
                          <Image source={{ uri: line.characterAvatar }} style={styles.storyAvatar} />
                        </View>
                      )}
                    </View>

                    {storyLocked && (
                      <View style={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
                        <PremiumBadge size="md" />
                      </View>
                    )}

                    {/* 信息区 */}
                    <View style={styles.storyInfoArea}>
                      <Text style={styles.storyCardTitle} numberOfLines={1}>{line.title}</Text>
                      <Text style={styles.storyCardChapter} numberOfLines={1}>
                        {line.description}
                      </Text>

                      {/* 进度条 */}
                      <View style={styles.storyProgressRow}>
                        <View style={styles.storyProgressBarBg}>
                          <View style={[styles.storyProgressBarFill, { width: `${Math.max(progress * 100, 2)}%`, backgroundColor: themeColor }]} />
                        </View>
                        <Text style={styles.storyProgressText}>{line.completedCount}/{line.publishedCount}</Text>
                      </View>

                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* 分页圆点 */}
            {storyLinesWithProgress.length > 1 && (
              <View style={styles.dotsRow}>
                {storyLinesWithProgress.map((line, i) => (
                  <View
                    key={line.id}
                    style={[styles.dot, i === storyIndex && styles.dotActive]}
                  />
                ))}
              </View>
            )}
          </View>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}
