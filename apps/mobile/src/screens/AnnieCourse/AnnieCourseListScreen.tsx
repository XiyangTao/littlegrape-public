import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import { apiClient } from '@/api';
import type { AnnieLessonSummary } from '@/api/modules/annie';
import Icon, { IconNames } from '@/components/Icon';

const ANNIE_AVATAR = 'https://cdn.coderhythm.cn/littlegrape/avatars/avatar_annie.jpg';

type CourseId = 'l1' | 'children' | 'l2';

const COURSE_OPTIONS: { id: CourseId; hasContent: boolean }[] = [
  { id: 'l1', hasContent: true },
  { id: 'children', hasContent: false },
  { id: 'l2', hasContent: false },
];

export default function AnnieCourseListScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme);

  const [currentCourse, setCurrentCourse] = useState<CourseId>('l1');
  const [lessons, setLessons] = useState<AnnieLessonSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          setIsLoading(true);
          const data = await apiClient.getAnnieLessons(currentCourse);
          if (!cancelled) setLessons(data);
        } catch (e) {
          console.error('加载安妮课程列表失败:', e);
        } finally {
          if (!cancelled) setIsLoading(false);
        }
      })();
      return () => { cancelled = true; };
    }, [currentCourse])
  );

  const completedCount = lessons.filter(l => !!l.completedAt).length;

  // 推荐"下一课": 第一个未完成的；全部完成时回到第一课（复习）
  const nextLesson = useMemo(() => {
    const sorted = [...lessons].sort((a, b) => a.lessonNumber - b.lessonNumber);
    return sorted.find(l => !l.completedAt) ?? sorted[0];
  }, [lessons]);

  const handleLessonPress = (lesson: AnnieLessonSummary) => {
    navigation.navigate('AnnieLesson', { course: lesson.course, lessonNumber: lesson.lessonNumber });
  };

  const handleContinue = () => {
    if (nextLesson) handleLessonPress(nextLesson);
  };

  // Hero 区状态文案 / CTA
  const isAllDone = completedCount > 0 && completedCount >= lessons.length;
  const isNew = completedCount === 0;
  const heroGreeting = isNew
    ? t('annie.courseList.heroGreetingNew')
    : isAllDone
    ? t('annie.courseList.heroGreetingDone')
    : t('annie.courseList.heroGreetingOngoing', { completed: completedCount });
  const ctaLabel = isNew
    ? t('annie.courseList.startCta')
    : isAllDone
    ? t('annie.courseList.reviewCta')
    : t('annie.courseList.continueCta', { n: nextLesson?.lessonNumber ?? 1 });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name={IconNames.left} size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('annie.courseList.title')}</Text>
        <View style={styles.backButton} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>
          {/* Hero 区 */}
          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <ProgressRing completed={completedCount} total={lessons.length} theme={theme} />
              <View style={styles.heroTextWrap}>
                <Text style={styles.heroGreeting} numberOfLines={2}>{heroGreeting}</Text>
                <Text style={styles.heroProgressText}>
                  {t('annie.courseList.progressLabel', { completed: completedCount, total: lessons.length })}
                </Text>
              </View>
              <Image source={{ uri: ANNIE_AVATAR }} style={styles.heroAvatar} />
            </View>
            {nextLesson && (
              <TouchableOpacity
                style={styles.heroCta}
                onPress={handleContinue}
                activeOpacity={0.85}
              >
                <Text style={styles.heroCtaText} numberOfLines={1}>{ctaLabel}</Text>
                <Icon name={IconNames.right} size={18} color={theme.colors.text.inverse} />
              </TouchableOpacity>
            )}
          </View>

          {/* 班级切换器 */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.classTabsScroll}
          >
            {COURSE_OPTIONS.map(opt => {
              const active = currentCourse === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.classTab, active && styles.classTabActive]}
                  onPress={() => setCurrentCourse(opt.id)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.classTabLabel, active && styles.classTabLabelActive]}>
                    {t(`annie.courseList.classes.${opt.id}`)}
                  </Text>
                  {opt.hasContent ? (
                    active && (
                      <Text style={styles.classTabSubtext}>
                        {t('annie.courseList.progressLabel', { completed: completedCount, total: lessons.length })}
                      </Text>
                    )
                  ) : (
                    <Text style={styles.classTabComing}>{t('annie.courseList.comingSoon')}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {lessons.map(lesson => {
            const done = !!lesson.completedAt;
            const isCurrent = !done && lesson.lessonNumber === nextLesson?.lessonNumber;
            return (
              <TouchableOpacity
                key={`${lesson.course}-${lesson.lessonNumber}`}
                style={[
                  styles.lessonCard,
                  done && styles.lessonCardDone,
                  isCurrent && styles.lessonCardCurrent,
                ]}
                onPress={() => handleLessonPress(lesson)}
                activeOpacity={0.85}
              >
                <View style={[
                  styles.lessonNumberBox,
                  done && styles.lessonNumberBoxDone,
                  isCurrent && styles.lessonNumberBoxCurrent,
                ]}>
                  <Text style={[
                    styles.lessonNumberText,
                    (done || isCurrent) && styles.lessonNumberTextActive,
                  ]}>
                    {lesson.lessonNumber}
                  </Text>
                </View>
                <View style={styles.lessonBody}>
                  <Text style={styles.lessonTitle} numberOfLines={1}>{lesson.titleZh || lesson.titleEn}</Text>
                  <Text style={styles.lessonSubtitle} numberOfLines={2}>{lesson.summaryZh || lesson.titleEn}</Text>
                </View>
                {done && (
                  <View style={styles.doneBadge}>
                    {lesson.totalScore > 0 ? (
                      <Text style={styles.doneScoreText}>{lesson.totalScore}</Text>
                    ) : (
                      <Icon name={IconNames.check} size={16} color={theme.colors.text.inverse} />
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          {lessons.length === 0 && !isLoading && (
            <Text style={styles.emptyText}>
              {COURSE_OPTIONS.find(o => o.id === currentCourse)?.hasContent
                ? t('annie.courseList.empty')
                : t('annie.courseList.emptyComingSoon')}
            </Text>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ==================== 进度环组件 ====================
function ProgressRing({ completed, total, theme }: { completed: number; total: number; theme: Theme }) {
  const size = 56;
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? completed / total : 0;
  const dashOffset = circumference * (1 - progress);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFillObject}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.colors.primary + '22'}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.colors.primary}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={{
        fontSize: theme.typography.fontSize.sm,
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.primary,
      }}>
        {total > 0 ? Math.round(progress * 100) : 0}%
      </Text>
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
  headerTitle: { fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.text.primary },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1 },
  contentInner: { padding: theme.spacing.md, paddingBottom: theme.spacing.xl },

  // ==================== Hero 区 ====================
  heroCard: {
    backgroundColor: theme.colors.primary + '0F',
    borderRadius: theme.spacing.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  heroTextWrap: {
    flex: 1,
  },
  heroGreeting: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    lineHeight: theme.fontScale(22),
  },
  heroProgressText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  heroAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.background.secondary,
  },
  heroCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.spacing.borderRadius.full,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  heroCtaText: {
    color: theme.colors.text.inverse,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
  },

  // ==================== 班级切换器 ====================
  classTabsScroll: {
    paddingVertical: theme.spacing.xs,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  classTab: {
    paddingVertical: theme.spacing.sm + 2,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.spacing.borderRadius.full,
    backgroundColor: theme.colors.background.secondary,
    borderWidth: 1,
    borderColor: 'transparent',
    minWidth: theme.scale(96),
    alignItems: 'center',
    justifyContent: 'center',
  },
  classTabActive: {
    backgroundColor: theme.colors.primary + '0F',
    borderColor: theme.colors.primary,
  },
  classTabLabel: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.secondary,
  },
  classTabLabelActive: {
    color: theme.colors.primary,
  },
  classTabSubtext: {
    fontSize: theme.typography.fontSize.xxs,
    color: theme.colors.text.tertiary,
    marginTop: 2,
  },
  classTabComing: {
    fontSize: theme.typography.fontSize.xxs,
    color: theme.colors.text.tertiary,
    marginTop: 2,
  },

  lessonCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.spacing.borderRadius.base,
    padding: theme.spacing.md, marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  lessonCardDone: {
    backgroundColor: theme.colors.success + '12',
  },
  lessonCardCurrent: {
    backgroundColor: theme.colors.primary + '0F',
    borderColor: theme.colors.primary,
  },
  lessonNumberBox: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: theme.colors.background.tertiary,
    alignItems: 'center', justifyContent: 'center', marginRight: theme.spacing.md,
  },
  lessonNumberBoxDone: {
    backgroundColor: theme.colors.success,
  },
  lessonNumberBoxCurrent: {
    backgroundColor: theme.colors.primary,
  },
  lessonNumberText: {
    color: theme.colors.text.tertiary,
    fontWeight: theme.typography.fontWeight.bold,
    fontSize: theme.typography.fontSize.base,
  },
  lessonNumberTextActive: {
    color: theme.colors.text.inverse,
  },
  lessonBody: { flex: 1 },
  lessonTitle: { fontSize: theme.typography.fontSize.base, fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.text.primary },
  lessonSubtitle: { fontSize: theme.typography.fontSize.xs, color: theme.colors.text.secondary, marginTop: 2 },
  doneBadge: {
    minWidth: 36, height: 28, borderRadius: 14,
    backgroundColor: theme.colors.success,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: theme.spacing.sm,
    marginLeft: theme.spacing.sm,
  },
  doneScoreText: {
    color: theme.colors.text.inverse,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
  },
  emptyText: { textAlign: 'center', color: theme.colors.text.tertiary, marginTop: theme.spacing.xl },
});
