import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from '@/components/Icon';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import type { VocabularyTestRecord } from '@/types/word';

interface VocabCardProps {
  vocabularyTest: VocabularyTestRecord | null;
  onPress: () => void;
}

export default function VocabCard({ vocabularyTest, onPress }: VocabCardProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme);

  // ==================== 已测试：结果卡片 ====================

  if (vocabularyTest) {

    return (
      <TouchableOpacity style={styles.resultCard} activeOpacity={0.85} onPress={onPress}>
          {/* 头部：图标+标题 | 等级徽章 */}
          <View style={styles.resultHeader}>
            <View style={styles.resultTitleRow}>
              <View style={[styles.resultIconWrap, { backgroundColor: theme.colors.primary + '18' }]}>
                <Icon name="bar-chart" size={16} color={theme.colors.primary} />
              </View>
              <Text style={styles.resultTitle}>{t('words.vocabCard.myVocabulary')}</Text>
            </View>
            <View style={styles.levelBadgeRow}>
              <View style={[styles.levelBadge, { backgroundColor: theme.colors.primary + '20' }]}>
                <Text style={[styles.levelText, { color: theme.colors.primary }]}>
                  {vocabularyTest.level}{vocabularyTest.levelDescription ? ` ${vocabularyTest.levelDescription}` : ''}
                </Text>
              </View>
              <Icon name="chevron-right" size={16} color={theme.colors.primary + '80'} />
            </View>
          </View>

          {/* 主数字 */}
          <View style={styles.resultMain}>
            <Text style={[styles.resultPrefix, { color: theme.colors.primary + 'AA' }]}>{t('words.vocabCard.approx')}</Text>
            <Text style={[styles.resultValue, { color: theme.colors.primaryDark }]}>
              {vocabularyTest.estimatedVocabulary?.toLocaleString()}
            </Text>
            <Text style={[styles.resultUnit, { color: theme.colors.primary + 'AA' }]}>{t('words.vocabCard.wordsUnit')}</Text>
          </View>

          {/* 置信区间 */}
          {vocabularyTest.confidenceLower != null && vocabularyTest.confidenceUpper != null && (
            <View style={styles.confidenceRow}>
              <Text style={styles.infoLabel}>{t('words.vocabCard.confidenceInterval')}</Text>
              <Text style={styles.infoValue}>
                {vocabularyTest.confidenceLower.toLocaleString()} ~ {vocabularyTest.confidenceUpper.toLocaleString()}
              </Text>
            </View>
          )}
      </TouchableOpacity>
    );
  }

  // ==================== 未测试：引导卡片 ====================

  return (
    <TouchableOpacity style={styles.testCard} activeOpacity={0.85} onPress={onPress}>
        {/* 图标 */}
        <View style={[styles.testIconWrap, { backgroundColor: theme.colors.primary + '18' }]}>
          <Icon name="bar-chart" size={28} color={theme.colors.primary} />
        </View>

        {/* 文案 */}
        <Text style={styles.testTitle}>{t('words.vocabCard.testTitle')}</Text>
        <Text style={styles.testDesc}>{t('words.vocabCard.testDesc')}</Text>

        {/* 按钮 */}
        <TouchableOpacity
          style={[styles.testButton, { backgroundColor: theme.colors.primary }]}
          onPress={onPress}
          activeOpacity={0.8}
        >
          <Text style={styles.testButtonText}>{t('words.vocabCard.startTest')}</Text>
          <Icon name="chevron-right" size={18} color={theme.colors.text.inverse} />
        </TouchableOpacity>
    </TouchableOpacity>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    // ==================== 结果卡片 ====================

    resultCard: {
      marginHorizontal: theme.spacing.md,
      marginTop: theme.spacing.sm,
      backgroundColor: theme.colors.card,
      borderRadius: theme.spacing.borderRadius.lg,
      padding: theme.spacing.md,
      ...theme.spacing.shadows.md,
    },

    // 头部
    resultHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.sm,
    },
    resultTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    resultIconWrap: {
      width: 30,
      height: 30,
      borderRadius: theme.spacing.borderRadius.sm,
      justifyContent: 'center',
      alignItems: 'center',
    },
    resultTitle: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
    },
    levelBadgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xxs,
    },
    levelBadge: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xxs,
      borderRadius: theme.spacing.borderRadius.sm,
    },
    levelText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
    },

    // 主数字
    resultMain: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'center',
      paddingVertical: theme.spacing.sm,
      gap: theme.spacing.xs,
    },
    resultPrefix: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    resultValue: {
      fontSize: theme.typography.fontSize['4xl'],
      fontWeight: theme.typography.fontWeight.bold,
    },
    resultUnit: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },

    // 置信区间
    confidenceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.xs,
    },
    infoLabel: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.tertiary,
    },
    infoValue: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
    },

    // ==================== 引导卡片 ====================

    testCard: {
      marginHorizontal: theme.spacing.md,
      marginTop: theme.spacing.sm,
      backgroundColor: theme.colors.card,
      borderRadius: theme.spacing.borderRadius.lg,
      padding: theme.spacing.lg,
      alignItems: 'center',
      ...theme.spacing.shadows.md,
    },
    testIconWrap: {
      width: 56,
      height: 56,
      borderRadius: theme.spacing.borderRadius.lg,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    testTitle: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.xs,
    },
    testDesc: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
      marginBottom: theme.spacing.lg,
    },
    testButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.sm + 2,
      paddingHorizontal: theme.spacing.xl,
      borderRadius: theme.spacing.borderRadius.base,
      gap: theme.spacing.xxs,
    },
    testButtonText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.inverse,
    },
  });
