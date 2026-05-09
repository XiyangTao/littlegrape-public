/**
 * 学习建议卡片组件
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import { StarRating } from '@/components/StarRating';
import { CopyableText } from './CopyableText';
import { getScoreLevelKey } from '@/utils/formatters';
import type { ScoreLevelKey } from '@/types/conversation';

interface TipsCardProps {
  /** 提示文本 */
  tips: string;
  /** 分数 (1-10) */
  score?: number;
}

export const TipsCard: React.FC<TipsCardProps> = ({ tips, score }) => {
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme);

  const levelKey: ScoreLevelKey | null =
    score !== undefined && score !== null ? getScoreLevelKey(score) : null;
  const levelColor = levelKey ? theme.colors.scoreLevel[levelKey] : theme.colors.primary;

  return (
    <View style={styles.container}>
      <View style={[styles.card, { borderLeftColor: levelColor }]}>
        {levelKey && (
          <View style={styles.scoreContainer}>
            <Text style={[styles.scoreText, { color: levelColor }]}>
              {t(`common.scoreLevel.${levelKey}`)}
            </Text>
            <StarRating score={score!} size={14} color={levelColor} />
          </View>
        )}
        <CopyableText text={tips} style={styles.tipsText} />
      </View>
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      marginTop: theme.spacing.xs,
    },
    card: {
      backgroundColor: theme.colors.background.primary,
      padding: theme.spacing.sm,
      borderRadius: theme.spacing.borderRadius.sm,
      borderLeftWidth: 3,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    scoreContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.xs,
    },
    scoreText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: '600',
    },
    tipsText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.secondary,
      lineHeight: 18,
    },
  });

export default TipsCard;
