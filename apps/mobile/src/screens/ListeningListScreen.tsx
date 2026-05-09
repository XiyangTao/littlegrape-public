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
import type { ListeningMaterialSummary, ListeningProgress } from '@/api/modules/listening';
import Icon, { IconNames } from '@/components/Icon';
import { DIFFICULTY_COLORS } from '@/constants/colors';

const LEVEL_LABELS: Record<string, Record<string, string>> = {
  beginner: { 'zh-CN': '初级', en: 'Beginner' },
  intermediate: { 'zh-CN': '中级', en: 'Intermediate' },
  advanced: { 'zh-CN': '高级', en: 'Advanced' },
};

export default function ListeningListScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const { t, effectiveLanguage: locale } = useI18n();
  const styles = createStyles(theme);
  const lang = locale === 'zh-CN' ? 'zh-CN' : 'en';

  const [materials, setMaterials] = useState<ListeningMaterialSummary[]>([]);
  const [progress, setProgress] = useState<ListeningProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [materialsRes, progressRes] = await Promise.all([
        apiClient.getListeningMaterials(),
        apiClient.getListeningProgress(),
      ]);
      if (materialsRes.success) setMaterials(materialsRes.data);
      if (progressRes.success) setProgress(progressRes.data);
    } catch (error) {
      console.error('加载听力材料失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getMaterialProgress = (materialId: string) => {
    const dictation = progress.find(p => p.materialId === materialId && p.mode === 'dictation');
    const comprehension = progress.find(p => p.materialId === materialId && p.mode === 'comprehension');
    return { dictation, comprehension };
  };

  const formatDuration = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return min > 0 ? `${min}:${sec.toString().padStart(2, '0')}` : `0:${sec.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name={IconNames.left} size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('listening.title')}</Text>
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
        <Text style={styles.headerTitle}>{t('listening.title')}</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>{t('listening.subtitle')}</Text>

        {materials.map((material) => {
          const { dictation, comprehension } = getMaterialProgress(material.id);
          const levelLabel = LEVEL_LABELS[material.level]?.[lang] || material.level;
          const levelColor = DIFFICULTY_COLORS[material.level] || theme.colors.primary;
          const hasDictation = dictation?.dictationScore != null;
          const hasComprehension = comprehension?.quizScore != null;

          return (
            <TouchableOpacity
              key={material.id}
              style={styles.materialCard}
              onPress={() => navigation.navigate('ListeningPractice', { materialId: material.id })}
              activeOpacity={0.7}
            >
              <View style={[styles.materialIcon, { backgroundColor: levelColor + '20' }]}>
                <Icon name="headphones" size={28} color={levelColor} />
              </View>
              <View style={styles.materialContent}>
                <Text style={styles.materialTitle} numberOfLines={1}>
                  {locale === 'zh-CN' && material.titleZh ? material.titleZh : material.title}
                </Text>
                <View style={styles.materialMeta}>
                  <View style={[styles.levelBadge, { backgroundColor: levelColor + '20' }]}>
                    <Text style={[styles.levelText, { color: levelColor }]}>{levelLabel}</Text>
                  </View>
                  <Text style={styles.durationText}>{formatDuration(material.duration)}</Text>
                  {hasDictation && (
                    <View style={styles.scoreBadge}>
                      <Icon name="edit" size={10} color={theme.colors.primary} />
                      <Text style={styles.scoreText}>{dictation!.dictationScore}%</Text>
                    </View>
                  )}
                  {hasComprehension && (
                    <View style={styles.scoreBadge}>
                      <Icon name="quiz" size={10} color={theme.colors.success} />
                      <Text style={[styles.scoreText, { color: theme.colors.success }]}>{comprehension!.quizScore}%</Text>
                    </View>
                  )}
                </View>
              </View>
              <Icon name={IconNames.right} size={20} color={theme.colors.text.tertiary} />
            </TouchableOpacity>
          );
        })}

        {materials.length === 0 && (
          <View style={styles.emptyContainer}>
            <Icon name="headphones" size={48} color={theme.colors.text.disabled} />
            <Text style={styles.emptyText}>{t('listening.noMaterials')}</Text>
          </View>
        )}

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
  subtitle: {
    fontSize: theme.typography.fontSize.sm, color: theme.colors.text.secondary,
    marginBottom: theme.spacing.md,
  },
  materialCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.spacing.borderRadius.md, padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  materialIcon: {
    width: 48, height: 48, borderRadius: theme.spacing.borderRadius.md,
    justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md,
  },
  materialContent: { flex: 1, marginRight: theme.spacing.sm },
  materialTitle: {
    fontSize: theme.typography.fontSize.base, fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary, marginBottom: theme.spacing.xs,
  },
  materialMeta: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  levelBadge: {
    paddingHorizontal: theme.spacing.xs, paddingVertical: 1,
    borderRadius: theme.spacing.borderRadius.sm,
  },
  levelText: { fontSize: theme.typography.fontSize.xxs, fontWeight: theme.typography.fontWeight.medium },
  durationText: { fontSize: theme.typography.fontSize.xxs, color: theme.colors.text.tertiary },
  scoreBadge: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  scoreText: { fontSize: theme.typography.fontSize.xxs, color: theme.colors.primary, fontWeight: theme.typography.fontWeight.medium },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: theme.typography.fontSize.sm, color: theme.colors.text.tertiary, marginTop: theme.spacing.md },
});
