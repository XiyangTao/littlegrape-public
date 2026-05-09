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
import type { ExamType } from '@/api/modules/exam';
import Icon, { IconNames } from '@/components/Icon';
import { EXAM_TYPE_COLORS } from '@/constants/colors';

const EXAM_ICONS: Record<string, string> = {
  cet4: 'looks-4',
  cet6: 'looks-6',
  kaoyan: 'school',
  ielts: 'language',
  toefl: 'flight',
  tem4: 'workspace-premium',
  tem8: 'military-tech',
};

export default function ExamListScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const { t, effectiveLanguage: locale } = useI18n();
  const styles = createStyles(theme);

  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [stats, setStats] = useState<Record<string, { attempts: number; bestScore: number; lastScore: number }>>({});
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.getExamTypes();
      if (res.success) {
        setExamTypes(res.data.types);
        setStats(res.data.stats);
      }
    } catch (error) {
      console.error('加载考试类型失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExamPress = (examType: ExamType) => {
    navigation.navigate('ExamPractice', { examTypeId: examType.id });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name={IconNames.left} size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('exam.title')}</Text>
        <View style={styles.backButton} />
      </View>

      <Text style={styles.subtitle}>{t('exam.subtitle')}</Text>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
          {examTypes.map(exam => {
            const color = EXAM_TYPE_COLORS[exam.id] || theme.colors.primary;
            const icon = EXAM_ICONS[exam.id] || 'quiz';
            const stat = stats[exam.id];

            return (
              <TouchableOpacity
                key={exam.id}
                style={styles.examCard}
                onPress={() => handleExamPress(exam)}
              >
                <View style={[styles.examIconWrap, { backgroundColor: color + '20' }]}>
                  <Icon name={icon} size={28} color={color} />
                </View>
                <View style={styles.examInfo}>
                  <Text style={styles.examName}>
                    {locale === 'zh-CN' ? exam.nameZh : exam.name}
                  </Text>
                  <Text style={styles.examDesc}>
                    {locale === 'zh-CN' ? exam.descriptionZh : exam.description}
                  </Text>
                  <View style={styles.examMeta}>
                    <Text style={styles.examMetaText}>
                      {exam.questionCount} {t('exam.questions')} · {exam.timeLimit} {t('exam.minutes')}
                    </Text>
                    {stat && (
                      <Text style={[styles.examScore, { color }]}>
                        {t('exam.best')}: {stat.bestScore}%
                      </Text>
                    )}
                  </View>
                </View>
                <Icon name={IconNames.right} size={20} color={theme.colors.text.tertiary} />
              </TouchableOpacity>
            );
          })}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
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
  subtitle: {
    fontSize: theme.typography.fontSize.sm, color: theme.colors.text.secondary,
    paddingHorizontal: theme.spacing.md, marginBottom: theme.spacing.md,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, paddingHorizontal: theme.spacing.md },

  examCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.spacing.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  examIconWrap: {
    width: 48, height: 48, borderRadius: theme.spacing.borderRadius.base,
    justifyContent: 'center', alignItems: 'center',
  },
  examInfo: { flex: 1, marginLeft: theme.spacing.sm },
  examName: {
    fontSize: theme.typography.fontSize.base, fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  examDesc: {
    fontSize: theme.typography.fontSize.xs, color: theme.colors.text.secondary,
    marginTop: 2,
  },
  examMeta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: theme.spacing.xs,
  },
  examMetaText: { fontSize: theme.typography.fontSize.xs, color: theme.colors.text.tertiary },
  examScore: { fontSize: theme.typography.fontSize.xs, fontWeight: theme.typography.fontWeight.semibold },
});
