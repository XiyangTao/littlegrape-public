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
import { useTheme, Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import { apiClient } from '@/api';
import type { LearningPathData, Recommendation, LearningPhase } from '@/api/modules/learningPath';
import Icon, { IconNames } from '@/components/Icon';

const PHASE_ICONS: Record<LearningPhase, string> = {
  beginner: 'child-care',
  elementary: 'school',
  intermediate: 'trending-up',
  upper_intermediate: 'auto-awesome',
  advanced: 'military-tech',
};

const REC_ICONS: Record<string, string> = {
  word_learn: 'menu-book',
  word_review: 'replay',
  conversation: 'chat',
  reading: 'article',
  listening: 'headphones',
  pronunciation: 'record-voice-over',
  story: 'auto-stories',
  diary: 'edit-note',
  vocabulary_test: 'quiz',
};

export default function LearningPathScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const { t, effectiveLanguage: locale } = useI18n();
  const styles = createStyles(theme);

  const [data, setData] = useState<LearningPathData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.getLearningPath();
      if (res.success) setData(res.data);
    } catch (error) {
      console.error('加载学习路径失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPhaseLabel = (phase: LearningPhase): string => {
    return t(`learningPath.phase.${phase}`);
  };

  const handleRecPress = (rec: Recommendation) => {
    navigation.navigate(rec.targetRoute);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name={IconNames.left} size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('learningPath.title')}</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!data) return null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name={IconNames.left} size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('learningPath.title')}</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
        {/* 学习阶段卡片 */}
        <View style={styles.phaseCard}>
          <View style={styles.phaseHeader}>
            <View style={styles.phaseIconWrap}>
              <Icon name={PHASE_ICONS[data.phase]} size={28} color={theme.colors.primary} />
            </View>
            <View style={styles.phaseInfo}>
              <Text style={styles.phaseLabel}>{t('learningPath.currentPhase')}</Text>
              <Text style={styles.phaseName}>{getPhaseLabel(data.phase)}</Text>
            </View>
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>Lv.{data.level}</Text>
            </View>
          </View>

          {/* 阶段进度条 */}
          <View style={styles.progressSection}>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${data.phaseProgress}%` }]} />
            </View>
            <Text style={styles.progressText}>{data.phaseProgress}%</Text>
          </View>

          {/* 统计数据 */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{data.totalLearned}</Text>
              <Text style={styles.statLabel}>{t('learningPath.totalLearned')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{data.totalMastered}</Text>
              <Text style={styles.statLabel}>{t('learningPath.totalMastered')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{data.streakDays}</Text>
              <Text style={styles.statLabel}>{t('learningPath.streakDays')}</Text>
            </View>
            {data.estimatedVocabulary && (
              <>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{data.estimatedVocabulary}</Text>
                  <Text style={styles.statLabel}>{t('learningPath.vocabulary')}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* 今日目标 */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('learningPath.todayGoal')}</Text>
          <View style={styles.goalRow}>
            <View style={styles.goalItem}>
              <View style={styles.goalProgress}>
                <Text style={styles.goalCurrent}>{data.todayStats.learned}</Text>
                <Text style={styles.goalTarget}>/{data.dailyGoals.newWords}</Text>
              </View>
              <Text style={styles.goalLabel}>{t('learningPath.newWords')}</Text>
              <View style={styles.goalBarBg}>
                <View style={[styles.goalBarFill, { width: `${Math.min((data.todayStats.learned / data.dailyGoals.newWords) * 100, 100)}%` }]} />
              </View>
            </View>
            <View style={styles.goalItem}>
              <View style={styles.goalProgress}>
                <Text style={styles.goalCurrent}>{data.todayStats.reviewed}</Text>
                <Text style={styles.goalTarget}>/{data.dailyGoals.review}</Text>
              </View>
              <Text style={styles.goalLabel}>{t('learningPath.review')}</Text>
              <View style={styles.goalBarBg}>
                <View style={[styles.goalBarFill, styles.goalBarReview, { width: `${Math.min((data.todayStats.reviewed / data.dailyGoals.review) * 100, 100)}%` }]} />
              </View>
            </View>
          </View>
        </View>

        {/* 本周活跃度 */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('learningPath.weeklyActivity')}</Text>
          <View style={styles.activityRow}>
            {data.weeklyActivity.map((count, index) => {
              const maxCount = Math.max(...data.weeklyActivity, 1);
              const height = Math.max((count / maxCount) * 60, 4);
              const dayLabels = locale === 'zh-CN'
                ? [t('learningPath.dayMon'), t('learningPath.dayTue'), t('learningPath.dayWed'), t('learningPath.dayThu'), t('learningPath.dayFri'), t('learningPath.daySat'), t('learningPath.daySun')]
                : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
              return (
                <View key={index} style={styles.activityCol}>
                  <Text style={styles.activityCount}>{count || ''}</Text>
                  <View style={[styles.activityBar, { height, backgroundColor: count > 0 ? theme.colors.primary : theme.colors.border.light }]} />
                  <Text style={styles.activityDay}>{dayLabels[index]}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* AI 推荐 */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('learningPath.recommendations')}</Text>
          {data.recommendations.map((rec, index) => (
            <TouchableOpacity
              key={index}
              style={styles.recItem}
              onPress={() => handleRecPress(rec)}
            >
              <View style={[styles.recIconWrap, index === 0 && styles.recIconWrapPrimary]}>
                <Icon
                  name={REC_ICONS[rec.type] || 'lightbulb'}
                  size={20}
                  color={index === 0 ? theme.colors.text.inverse : theme.colors.primary}
                />
              </View>
              <View style={styles.recContent}>
                <Text style={styles.recReason}>
                  {locale === 'zh-CN' ? rec.reasonZh : rec.reason}
                </Text>
                {rec.meta?.count && (
                  <Text style={styles.recMeta}>
                    {rec.meta.count} {t('learningPath.items')}
                  </Text>
                )}
              </View>
              <Icon name={IconNames.right} size={18} color={theme.colors.text.tertiary} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background.primary },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: {
    fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, paddingHorizontal: theme.spacing.md },

  // 阶段卡片
  phaseCard: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.spacing.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  phaseHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md },
  phaseIconWrap: {
    width: 48, height: 48, borderRadius: theme.spacing.borderRadius.xl,
    backgroundColor: theme.colors.primary + '15',
    justifyContent: 'center', alignItems: 'center',
  },
  phaseInfo: { flex: 1, marginLeft: theme.spacing.sm },
  phaseLabel: { fontSize: theme.typography.fontSize.xs, color: theme.colors.text.secondary },
  phaseName: {
    fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  levelBadge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xxs,
    borderRadius: theme.spacing.borderRadius.sm,
  },
  levelText: {
    fontSize: theme.typography.fontSize.xs, fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.inverse,
  },
  progressSection: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md },
  progressBarBg: {
    flex: 1, height: 8, borderRadius: 4,
    backgroundColor: theme.colors.border.light,
  },
  progressBarFill: {
    height: 8, borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  progressText: {
    marginLeft: theme.spacing.sm,
    fontSize: theme.typography.fontSize.xs, color: theme.colors.text.secondary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statValue: {
    fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  statLabel: { fontSize: theme.typography.fontSize.xxs, color: theme.colors.text.secondary, marginTop: 2 },
  statDivider: { width: 1, height: 24, backgroundColor: theme.colors.border.light },

  // 通用 section
  sectionCard: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.spacing.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.base, fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary, marginBottom: theme.spacing.sm,
  },

  // 今日目标
  goalRow: { flexDirection: 'row', gap: theme.spacing.sm },
  goalItem: { flex: 1 },
  goalProgress: { flexDirection: 'row', alignItems: 'baseline' },
  goalCurrent: {
    fontSize: theme.typography.fontSize.xl, fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
  },
  goalTarget: { fontSize: theme.typography.fontSize.sm, color: theme.colors.text.tertiary },
  goalLabel: { fontSize: theme.typography.fontSize.xs, color: theme.colors.text.secondary, marginTop: 2, marginBottom: theme.spacing.xs },
  goalBarBg: { height: 6, borderRadius: 3, backgroundColor: theme.colors.border.light },
  goalBarFill: { height: 6, borderRadius: 3, backgroundColor: theme.colors.primary },
  goalBarReview: { backgroundColor: theme.colors.success },

  // 本周活跃度
  activityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 100 },
  activityCol: { alignItems: 'center', flex: 1 },
  activityCount: { fontSize: theme.typography.fontSize.xxs, color: theme.colors.text.tertiary, marginBottom: 2 },
  activityBar: { width: 20, borderRadius: 4 },
  activityDay: { fontSize: theme.typography.fontSize.xxs, color: theme.colors.text.secondary, marginTop: 4 },

  // 推荐列表
  recItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border.light,
  },
  recIconWrap: {
    width: 36, height: 36, borderRadius: theme.spacing.borderRadius.lg,
    backgroundColor: theme.colors.primary + '15',
    justifyContent: 'center', alignItems: 'center',
  },
  recIconWrapPrimary: { backgroundColor: theme.colors.primary },
  recContent: { flex: 1, marginLeft: theme.spacing.sm },
  recReason: { fontSize: theme.typography.fontSize.sm, color: theme.colors.text.primary },
  recMeta: { fontSize: theme.typography.fontSize.xs, color: theme.colors.text.tertiary, marginTop: 2 },
});
