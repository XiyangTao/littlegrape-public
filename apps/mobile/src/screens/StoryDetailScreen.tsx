import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@react-native-vector-icons/material-icons';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import { CHARACTER_THEME_COLORS } from '@/data/storyMockData';
import { apiClient } from '@/api';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import type { EpisodeConfig, LearningPoint } from '@/types/storyMode';

export default function StoryDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { theme } = useTheme();
  const { t } = useI18n();
  const audioPlayer = useAudioPlayer();

  const { characterId, episodeId, title, titleZh, episodeNumber, imageUrl } = route.params;
  const themeColor = CHARACTER_THEME_COLORS[characterId] || '#7C5CFC';
  const styles = createStyles(theme, themeColor);

  const [learningPoints, setLearningPoints] = useState<LearningPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.getEpisodeConfig(episodeId)
      .then((config: EpisodeConfig) => {
        setLearningPoints(config.learning_points || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [episodeId]);

  const handleStart = () => {
    navigation.replace('StoryChat', {
      characterId,
      episodeId,
    });
  };

  const getCategoryLabel = (category: string) => {
    if (category === 'expression') return t('story.detail.catExpression');
    if (category === 'slang') return t('story.detail.catSlang');
    return t('story.detail.catVocab');
  };

  const getCategoryColor = (category: string) => {
    if (category === 'expression') return '#4A90D9';
    if (category === 'slang') return '#FF9500';
    return '#34C759';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 顶部返回 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 信息区 */}
        <View style={styles.infoSection}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.titleZh}>{titleZh}</Text>
        </View>

        {/* 学习知识点 */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={themeColor} />
          </View>
        ) : learningPoints.length > 0 ? (
          <View style={styles.learningSection}>
            <Text style={styles.sectionTitle}>{t('story.detail.knowledgePoints')}</Text>
            {learningPoints.map(lp => {
              const audioUrl = lp.audioUrl;
              const isPlaying = audioUrl && audioPlayer.isPlaying && audioPlayer.currentUri === audioUrl;

              return (
                <View key={lp.id} style={styles.learningItem}>
                  <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(lp.category) + '20' }]}>
                    <Text style={[styles.categoryText, { color: getCategoryColor(lp.category) }]}>
                      {getCategoryLabel(lp.category)}
                    </Text>
                  </View>
                  <View style={styles.learningContent}>
                    <Text style={styles.learningEn}>{lp.english}</Text>
                    <Text style={styles.learningZh}>{lp.chinese}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      if (audioUrl) { audioPlayer.play(audioUrl); }
                    }}
                    style={styles.ttsButton}
                  >
                    <Ionicons
                      name={isPlaying ? 'volume-high' : 'volume-medium-outline'}
                      size={18}
                      color={isPlaying ? themeColor : theme.colors.text.tertiary}
                    />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        ) : null}
      </ScrollView>

      {/* 底部按钮 */}
      <View style={styles.bottomSection}>
        <TouchableOpacity style={styles.startButton} onPress={handleStart} activeOpacity={0.8}>
          <MaterialIcons name="play-arrow" size={24} color="#FFFFFF" />
          <Text style={styles.startButtonText}>Start Story</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme, themeColor: string) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background.primary,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
    },
    backButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    scrollContent: {
      flex: 1,
    },

    // ==================== 封面图 ====================
    imageWrap: {
      marginHorizontal: theme.spacing.lg,
      borderRadius: theme.spacing.borderRadius.lg,
      overflow: 'hidden',
      ...theme.spacing.shadows.sm,
    },
    coverImage: {
      width: '100%',
      aspectRatio: 16 / 9,
    },
    coverFallback: {
      width: '100%',
      aspectRatio: 16 / 9,
      backgroundColor: themeColor + '15',
      justifyContent: 'center',
      alignItems: 'center',
    },
    coverEmoji: {
      fontSize: theme.fontScale(48),
    },

    // ==================== 信息区 ====================
    infoSection: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
    },
    epLabel: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
      color: themeColor,
      marginBottom: theme.spacing.xs,
    },
    title: {
      fontSize: theme.fontScale(24),
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
      lineHeight: theme.fontScale(32),
    },
    titleZh: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.secondary,
      marginTop: theme.spacing.sm,
    },

    // ==================== 学习知识点 ====================
    loadingWrap: {
      paddingVertical: theme.spacing.lg,
      alignItems: 'center',
    },
    learningSection: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.sm,
    },
    learningItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.spacing.borderRadius.sm,
      marginBottom: theme.spacing.sm,
    },
    categoryBadge: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 2,
      borderRadius: theme.spacing.borderRadius.sm,
    },
    categoryText: {
      fontSize: theme.typography.fontSize.xxs,
      fontWeight: theme.typography.fontWeight.medium,
    },
    learningContent: {
      flex: 1,
    },
    ttsButton: {
      padding: 4,
      justifyContent: 'center',
    },
    learningEn: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.text.primary,
    },
    learningZh: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.tertiary,
      marginTop: 2,
    },

    // ==================== 底部按钮 ====================
    bottomSection: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.lg,
      paddingTop: theme.spacing.sm,
    },
    startButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: themeColor,
      paddingVertical: theme.spacing.sm + 4,
      borderRadius: theme.spacing.borderRadius.base,
      gap: theme.spacing.xs,
    },
    startButtonText: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: '#FFFFFF',
    },
  });
