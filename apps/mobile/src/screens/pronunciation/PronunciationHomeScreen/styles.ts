import { StyleSheet } from 'react-native';
import { Theme } from '@/context/ThemeProvider';

export const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },

  // 顶部进度卡片
  headerCard: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: theme.spacing.borderRadius.md,
    padding: 20,
    overflow: 'hidden',
  },
  headerTitle: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.inverse,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 16,
  },
  headerStatsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  headerStat: {
    alignItems: 'center',
  },
  headerStatValue: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.inverse,
  },
  headerStatLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },

  // Section 标题
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  sectionCount: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
  },

  // 音素网格
  phonemeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
  },
  phonemeCard: {
    width: (theme.screen.width - 32 - 10) / 2,
    backgroundColor: theme.colors.card,
    borderRadius: theme.spacing.borderRadius.base,
    padding: 14,
    ...theme.spacing.shadows.sm,
  },
  phonemeSymbol: {
    fontSize: theme.fontScale(24),
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
    marginBottom: 2,
  },
  phonemeName: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  phonemeWord: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  phonemeSubInfo: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  phonemeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardPlayBtn: {
    width: theme.scale(28),
    height: theme.scale(28),
    borderRadius: theme.scale(14),
    backgroundColor: theme.colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phonemeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  phonemeDifficulty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  masteryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  phonemeScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  phonemeScoreText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
  },
  phonemeMasteryText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
  },
  // 分类卡片
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: theme.colors.card,
    borderRadius: theme.spacing.borderRadius.base,
    padding: 14,
    ...theme.spacing.shadows.sm,
  },
  categoryIconWrap: {
    width: 44,
    height: 44,
    borderRadius: theme.spacing.borderRadius.base,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  categoryContent: {
    flex: 1,
  },
  categoryName: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  categoryDesc: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.secondary,
  },
});
