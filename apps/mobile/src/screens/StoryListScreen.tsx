import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@react-native-vector-icons/material-icons';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import { apiClient } from '@/api';
import type { StoryLineSummary, StoryProgressMap, EpisodeProgress, StoryEpisodeSummary } from '@/api/modules/story';
import Icon, { IconNames } from '@/components/Icon';
import { CHARACTER_THEME_COLORS, CHARACTER_EMOJIS } from '@/data/storyMockData';
import { STAR_GOLD } from '@/constants/colors';

const DIFFICULTY_KEYS: Record<string, string> = {
  elementary: 'story.difficulty.elementary',
  cet4: 'story.difficulty.cet4',
  cet6: 'story.difficulty.cet6',
};

export default function StoryListScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const { t, effectiveLanguage: locale } = useI18n();
  const styles = createStyles(theme);

  const [stories, setStories] = useState<StoryLineSummary[]>([]);
  const [progress, setProgress] = useState<StoryProgressMap>({});
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [storiesRes, progressRes] = await Promise.all([
        apiClient.getStoryList(),
        apiClient.getStoryProgress().catch(() => ({} as StoryProgressMap)),
      ]);
      setStories(storiesRes);
      setProgress(progressRes);
    } catch (error) {
      console.error('加载剧情数据失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStoryProgress = (storyId: string, totalEpisodes: number) => {
    const storyProgress = progress[storyId] || [];
    const completed = storyProgress.filter(p => p.status === 'completed').length;
    const totalStars = storyProgress.reduce((sum, p) => sum + p.stars, 0);
    return { completed, total: totalEpisodes, totalStars, maxStars: totalEpisodes * 3 };
  };

  // 找到当前正在进行或下一个未完成的剧集
  const getCurrentEpisode = (story: StoryLineSummary) => {
    const storyProgress = progress[story.id] || [];
    const progressMap = new Map<string, EpisodeProgress>();
    storyProgress.forEach(p => progressMap.set(p.episodeId, p));

    const episodes: StoryEpisodeSummary[] = story.episodes || [];
    // 找第一个 in_progress 的
    const inProgress = episodes.find(ep => {
      const p = progressMap.get(ep.episodeId);
      return p && p.status === 'in_progress';
    });
    if (inProgress) return inProgress;

    // 否则找第一个未完成的
    const nextUnlocked = episodes.find(ep => {
      const p = progressMap.get(ep.episodeId);
      return !p || p.status !== 'completed';
    });
    return nextUnlocked || null;
  };

  const handleStoryPress = (story: StoryLineSummary) => {
    navigation.navigate('StoryChapter', {
      characterId: story.characterId,
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name={IconNames.left} size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('story.title')}</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name={IconNames.left} size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('story.title')}</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>{t('story.subtitle')}</Text>

        {stories.map((story) => {
          const { completed, total, totalStars, maxStars } = getStoryProgress(story.id, story.totalEpisodes);
          const diffLabel = DIFFICULTY_KEYS[story.difficulty] ? t(DIFFICULTY_KEYS[story.difficulty]) : story.difficulty;
          const themeColor = CHARACTER_THEME_COLORS[story.characterId] || story.themeColor || theme.colors.primary;
          const emoji = CHARACTER_EMOJIS[story.characterId] || story.emoji || '📖';
          const currentEp = getCurrentEpisode(story);
          const progressPercent = total > 0 ? (completed / total) * 100 : 0;
          const episodeCount = story.totalEpisodes;

          return (
            <TouchableOpacity
              key={story.id}
              style={styles.storyCard}
              onPress={() => handleStoryPress(story)}
              activeOpacity={0.85}
            >
              {/* 彩色头部区域 */}
              <View style={[styles.cardHeader, { backgroundColor: themeColor }]}>
                {/* 装饰圆圈 */}
                <View style={[styles.decorCircle1, { backgroundColor: '#FFFFFF15' }]} />
                <View style={[styles.decorCircle2, { backgroundColor: '#FFFFFF10' }]} />

                {/* 难度标签 */}
                <View style={styles.diffBadge}>
                  <Text style={styles.diffText}>{diffLabel}</Text>
                </View>

                {/* 大 Emoji */}
                <Text style={styles.cardEmoji}>{emoji}</Text>

                {/* 标题区 */}
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {story.title}
                </Text>
                <Text style={styles.cardMeta}>
                  {t('story.episodes', { count: episodeCount })}
                </Text>
              </View>

              {/* 内容区 */}
              <View style={styles.cardBody}>
                {/* 描述文字 */}
                <Text style={styles.cardDesc} numberOfLines={2}>
                  {story.description}
                </Text>

                {/* 进度条 */}
                <View style={styles.progressSection}>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressLabel}>
                      {t('story.progress', { completed, total })}
                    </Text>
                    <View style={styles.starsContainer}>
                      <MaterialIcons
                        name="star"
                        size={14}
                        color={totalStars > 0 ? STAR_GOLD : theme.colors.border.medium}
                      />
                      <Text style={[styles.starsText, totalStars > 0 && { color: theme.colors.text.primary }]}>
                        {totalStars}/{maxStars}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${progressPercent}%`,
                          backgroundColor: themeColor,
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* 续播提示 / 开始按钮 */}
                <View style={[styles.continueRow, { backgroundColor: themeColor + '0C' }]}>
                  {currentEp && completed > 0 ? (
                    <>
                      <MaterialIcons name="play-circle-filled" size={18} color={themeColor} />
                      <Text style={[styles.continueText, { color: themeColor }]} numberOfLines={1}>
                        {t('story.continueEpisode', { num: currentEp.episodeNumber })} · {currentEp.title}
                      </Text>
                    </>
                  ) : (
                    <>
                      <MaterialIcons name="play-arrow" size={18} color={themeColor} />
                      <Text style={[styles.continueText, { color: themeColor }]}>
                        {t('story.startLearning')}
                      </Text>
                    </>
                  )}
                  <MaterialIcons name="chevron-right" size={20} color={themeColor + '80'} />
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.lg,
  },

  // ==================== 故事卡片 ====================
  storyCard: {
    borderRadius: theme.spacing.borderRadius.lg,
    overflow: 'hidden',
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.background.secondary,
    ...theme.spacing.shadows.sm,
  },

  // ==================== 卡片头部（彩色区域） ====================
  cardHeader: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  decorCircle1: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    top: -30,
    right: -20,
  },
  decorCircle2: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    bottom: -20,
    right: 50,
  },
  diffBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xxs,
    borderRadius: theme.spacing.borderRadius.full,
    backgroundColor: '#FFFFFF30',
    marginBottom: theme.spacing.sm,
  },
  diffText: {
    fontSize: theme.typography.fontSize.xxs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: '#FFFFFF',
  },
  cardEmoji: {
    fontSize: theme.fontScale(40),
    marginBottom: theme.spacing.sm,
  },
  cardTitle: {
    fontSize: theme.fontScale(20),
    fontWeight: theme.typography.fontWeight.bold,
    color: '#FFFFFF',
    marginBottom: theme.spacing.xxs,
  },
  cardMeta: {
    fontSize: theme.typography.fontSize.xs,
    color: '#FFFFFFB0',
    fontWeight: theme.typography.fontWeight.medium,
  },

  // ==================== 卡片内容区 ====================
  cardBody: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: 0,
  },
  cardDesc: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    lineHeight: theme.typography.fontSize.sm * 1.6,
    marginBottom: theme.spacing.md,
  },

  // ==================== 进度区 ====================
  progressSection: {
    marginBottom: theme.spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  progressLabel: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  starsText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: theme.colors.border.light,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },

  // ==================== 续播提示 ====================
  continueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm + 2,
    paddingHorizontal: theme.spacing.md,
    marginHorizontal: -theme.spacing.md,
    gap: theme.spacing.xs,
  },
  continueText: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
  },
});
