import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import { Ionicons } from '@expo/vector-icons';
import type { LearningPoint, AnswerRecord, StoryGrade } from '@/types/storyMode';

interface Props {
  title: string;
  answers: AnswerRecord[];
  learningPoints: LearningPoint[];
  nextEpisodeHook: string;
  characterName: string;
  onBack: () => void;
  onPlayTTS?: (text: string, id: string) => void;
  playingTTSId?: string;
}

function calculateGrade(answers: AnswerRecord[]): { grade: StoryGrade; percentage: number } {
  if (answers.length === 0) return { grade: 'C', percentage: 50 };

  const correctCount = answers.filter(a => a.correct).length;
  const percentage = Math.round((correctCount / answers.length) * 100);

  let grade: StoryGrade;
  if (percentage >= 90) grade = 'S';
  else if (percentage >= 75) grade = 'A';
  else if (percentage >= 60) grade = 'B';
  else if (percentage >= 40) grade = 'C';
  else grade = 'D';

  return { grade, percentage };
}

const GRADE_COLORS: Record<StoryGrade, string> = {
  S: '#FFD700',
  A: '#34C759',
  B: '#4A90D9',
  C: '#FF9500',
  D: '#FF3B30',
};

export default function ReviewCard({ title, answers, learningPoints, nextEpisodeHook, characterName, onBack, onPlayTTS, playingTTSId }: Props) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme);
  const { grade, percentage } = calculateGrade(answers);
  const gradeColor = GRADE_COLORS[grade];

  const conversationAnswers = answers.filter(a => a.questionType === 'conversation');
  const avgScore = conversationAnswers.length > 0
    ? Math.round(conversationAnswers.reduce((sum, a) => sum + (a.score || 0), 0) / conversationAnswers.length * 10) / 10
    : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('story.review.episodeComplete')}</Text>
      <Text style={styles.subtitle}>{title}</Text>

      {/* 评分 */}
      <View style={[styles.gradeBox, { borderColor: gradeColor }]}>
        <Text style={[styles.gradeText, { color: gradeColor }]}>{grade}</Text>
        <Text style={styles.gradePercentage}>{t('story.review.accuracy', { pct: percentage })}</Text>
      </View>

      {/* 答题统计 */}
      <View style={styles.statsBox}>
        <View style={styles.statItem}>
          <Ionicons name="chatbubble" size={16} color={theme.colors.primary} />
          <Text style={styles.statText}>
            {t('story.review.convStat', {
              correct: conversationAnswers.filter(a => a.correct).length,
              total: conversationAnswers.length,
            })}
            {avgScore > 0 && t('story.review.convAvg', { avg: avgScore })}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="checkbox" size={16} color={theme.colors.primary} />
          <Text style={styles.statText}>
            {t('story.review.totalStat', {
              correct: answers.filter(a => a.correct).length,
              total: answers.length,
            })}
          </Text>
        </View>
      </View>

      {/* 下集预告 */}
      {nextEpisodeHook && (
        <View style={styles.hookBox}>
          <Ionicons name="arrow-forward-circle-outline" size={18} color={theme.colors.text.secondary} />
          <Text style={styles.hookText}>{nextEpisodeHook}</Text>
        </View>
      )}

      {/* 返回按钮 */}
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>{t('story.review.backToList')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background.primary,
    },
    content: {
      padding: theme.spacing.lg,
      paddingBottom: theme.spacing['2xl'],
    },
    title: {
      fontSize: theme.fontScale(24),
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.secondary,
      textAlign: 'center',
      marginTop: theme.spacing.xs,
      marginBottom: theme.spacing.lg,
    },
    gradeBox: {
      alignSelf: 'center',
      borderWidth: 3,
      borderRadius: theme.spacing.borderRadius.xl,
      width: theme.scale(100),
      height: theme.scale(100),
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
    },
    gradeText: {
      fontSize: theme.fontScale(36),
      fontWeight: theme.typography.fontWeight.bold,
    },
    gradePercentage: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.secondary,
    },
    statsBox: {
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.spacing.borderRadius.base,
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.lg,
    },
    statItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    statText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.md,
    },
    learningBox: {
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.lg,
    },
    learningItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.spacing.borderRadius.sm,
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
    hookBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.spacing.borderRadius.base,
      marginBottom: theme.spacing.lg,
    },
    hookLabel: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.primary,
      marginBottom: theme.spacing.xxs,
    },
    hookText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
      fontStyle: 'italic',
    },
    backButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.spacing.borderRadius.base,
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
    },
    backButtonText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: '#FFFFFF',
    },
  });
