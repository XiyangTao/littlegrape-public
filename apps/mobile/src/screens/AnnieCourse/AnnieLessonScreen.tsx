import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import { apiClient } from '@/api';
import type { AnnieLessonDetail, AnnieStages } from '@/api/modules/annie';
import Icon, { IconNames } from '@/components/Icon';

type StageDef = {
  id: 'objectives' | 'dialogue' | 'pronunciation' | 'choice' | 'listening' | 'conversation' | 'summary';
  countsForCompletion: boolean;
};

const STAGES: StageDef[] = [
  { id: 'objectives',     countsForCompletion: false },
  { id: 'dialogue',       countsForCompletion: false },
  { id: 'pronunciation',  countsForCompletion: true  },
  { id: 'choice',         countsForCompletion: true  },
  { id: 'listening',      countsForCompletion: true  },
  { id: 'conversation',   countsForCompletion: true  },
  { id: 'summary',        countsForCompletion: false },
];

type RouteParams = { course: string; lessonNumber: number };

export default function AnnieLessonScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const { course, lessonNumber } = route.params;
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme);

  const [lesson, setLesson] = useState<AnnieLessonDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          setIsLoading(true);
          const data = await apiClient.getAnnieLesson(course, lessonNumber);
          if (!cancelled) setLesson(data);
        } catch (e) {
          console.error('加载安妮单课失败:', e);
        } finally {
          if (!cancelled) setIsLoading(false);
        }
      })();
      return () => { cancelled = true; };
    }, [course, lessonNumber])
  );

  const stageStatus = (stageId: StageDef['id'], stages: AnnieStages | null): { done: boolean; subtitle: string } => {
    if (!stages) return { done: false, subtitle: t('annie.stage.notStarted') };
    switch (stageId) {
      case 'pronunciation': {
        const arr = stages.stage3Pronunciation ?? [];
        if (arr.length === 0) return { done: false, subtitle: t('annie.stage.notStarted') };
        const avg = Math.round(arr.reduce((s, p) => s + p.score, 0) / arr.length);
        return { done: arr.length >= 6, subtitle: t('annie.stage.scoreLabel', { score: avg }) };
      }
      case 'choice': {
        const arr = stages.stage4Choice ?? [];
        const correct = arr.filter(c => c.correct).length;
        return { done: arr.length >= 3, subtitle: `${correct}/3` };
      }
      case 'listening': {
        const arr = stages.stage5Listening ?? [];
        const correct = arr.filter(c => c.correct).length;
        return { done: arr.length >= 1, subtitle: `${correct}/1` };
      }
      case 'conversation': {
        const arr = stages.stage6Conversation ?? [];
        return { done: arr.length >= 2, subtitle: `${arr.length}/2` };
      }
      default:
        return { done: false, subtitle: '' };
    }
  };

  const handleStagePress = (stageId: StageDef['id']) => {
    if (!lesson) return;
    navigation.navigate('AnnieStage', { course, lessonNumber, stageId });
  };

  if (isLoading || !lesson) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header onBack={() => navigation.goBack()} title="" theme={theme} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const completedStages = STAGES
    .filter(s => s.countsForCompletion)
    .filter(s => stageStatus(s.id, lesson.stages).done).length;
  const totalRequired = STAGES.filter(s => s.countsForCompletion).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        onBack={() => navigation.goBack()}
        title={t('annie.lesson.headerTitle', { n: lesson.lessonNumber })}
        theme={theme}
      />
      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <Text style={styles.heroSubtitle}>Lesson {lesson.lessonNumber} · {lesson.titleEn}</Text>
          <Text style={styles.heroTitle}>{lesson.titleZh}</Text>
          <Text style={styles.heroDesc}>{lesson.summaryZh}</Text>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFg,
                { width: `${(completedStages / totalRequired) * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {t('annie.lesson.progressLabel', { done: completedStages, total: totalRequired })}
          </Text>
        </View>

        {STAGES.map((s, idx) => {
          const stat = stageStatus(s.id, lesson.stages);
          const stageTitle = t(`annie.stage.${s.id}.title`);
          const stageSubtitle = t(`annie.stage.${s.id}.subtitle`);
          return (
            <TouchableOpacity
              key={s.id}
              style={styles.stageCard}
              onPress={() => handleStagePress(s.id)}
              activeOpacity={0.85}
            >
              <View style={[styles.stageNumberBox, stat.done && styles.stageNumberBoxDone]}>
                {stat.done ? (
                  <Icon name={IconNames.check} size={20} color={theme.colors.text.inverse} />
                ) : (
                  <Text style={styles.stageNumberText}>{idx + 1}</Text>
                )}
              </View>
              <View style={styles.stageBody}>
                <Text style={styles.stageTitle}>{stageTitle}</Text>
                <Text style={styles.stageSubtitle} numberOfLines={1}>
                  {s.countsForCompletion ? stat.subtitle : stageSubtitle}
                </Text>
              </View>
              <Icon name={IconNames.right} size={18} color={theme.colors.text.tertiary} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({ onBack, title, theme }: { onBack: () => void; title: string; theme: Theme }) {
  const styles = createStyles(theme);
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Icon name={IconNames.left} size={24} color={theme.colors.text.primary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
      <View style={styles.backButton} />
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background.primary },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md, height: 56,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border.light,
  },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.text.primary, flex: 1, textAlign: 'center' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1 },
  contentInner: { padding: theme.spacing.md, paddingBottom: theme.spacing.xl },
  heroCard: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.spacing.borderRadius.md,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  heroSubtitle: { fontSize: theme.typography.fontSize.xs, color: theme.colors.text.inverse, opacity: 0.8 },
  heroTitle: { fontSize: theme.typography.fontSize['2xl'], fontWeight: theme.typography.fontWeight.bold, color: theme.colors.text.inverse, marginTop: theme.spacing.xs },
  heroDesc: { fontSize: theme.typography.fontSize.sm, color: theme.colors.text.inverse, opacity: 0.9, marginTop: theme.spacing.sm, lineHeight: 20 },
  progressBarBg: {
    height: 8, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 4, marginTop: theme.spacing.md, overflow: 'hidden',
  },
  progressBarFg: { height: 8, backgroundColor: theme.colors.text.inverse, borderRadius: 4 },
  progressText: { fontSize: theme.typography.fontSize.xs, color: theme.colors.text.inverse, marginTop: theme.spacing.xs },
  stageCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.spacing.borderRadius.base,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  stageNumberBox: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.background.tertiary,
    alignItems: 'center', justifyContent: 'center', marginRight: theme.spacing.md,
  },
  stageNumberBoxDone: { backgroundColor: theme.colors.success },
  stageNumberText: { fontWeight: theme.typography.fontWeight.bold, color: theme.colors.text.secondary },
  stageBody: { flex: 1 },
  stageTitle: { fontSize: theme.typography.fontSize.base, fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.text.primary },
  stageSubtitle: { fontSize: theme.typography.fontSize.xs, color: theme.colors.text.secondary, marginTop: 2 },
});
