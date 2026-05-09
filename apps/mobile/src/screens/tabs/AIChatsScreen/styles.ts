import { StyleSheet } from 'react-native';
import { Theme } from '@/context/ThemeProvider';

export const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  scrollContent: {
    paddingBottom: theme.spacing['2xl'],
  },

  // ==================== 页面标题 ====================
  pageHeader: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  pageTitle: {
    fontSize: theme.fontScale(28),
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },

  // ==================== Section Header ====================
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },

  // ==================== 故事线封面卡片 ====================
  storyCoverCard: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.sm,
    borderRadius: theme.spacing.borderRadius.lg,
    overflow: 'hidden',
    ...theme.spacing.shadows.sm,
  },
  storyCoverImage: {
    width: '100%',
    height: theme.scale(200),
  },
  storyCoverImageStyle: {
    borderRadius: theme.spacing.borderRadius.lg,
  },
  storyCoverGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: theme.spacing.md,
  },
  storyCoverTagRow: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  storyCoverTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,149,0,0.9)',
    borderRadius: theme.spacing.borderRadius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
  },
  storyCoverTagNew: {
    backgroundColor: 'rgba(255,59,48,0.9)',
  },
  storyCoverTagText: {
    fontSize: theme.typography.fontSize.xxs,
    fontWeight: theme.typography.fontWeight.bold,
    color: '#FFFFFF',
  },
  storyCoverTitle: {
    fontSize: theme.fontScale(24),
    fontWeight: theme.typography.fontWeight.bold,
    color: '#FFFFFF',
    marginBottom: theme.spacing.xs,
  },
  storyCoverSubtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: theme.spacing.md,
  },
  storyCoverBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  storyCoverMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  storyCoverMetaText: {
    fontSize: theme.typography.fontSize.xs,
    color: 'rgba(255,255,255,0.7)',
  },
  storyCoverMetaDot: {
    fontSize: theme.typography.fontSize.xs,
    color: 'rgba(255,255,255,0.4)',
  },
  storyCoverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: theme.spacing.borderRadius.full,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  storyCoverButtonText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: '#FF9500',
  },

  // ==================== 情景学习卡片 ====================
  scenarioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderRadius: theme.spacing.borderRadius.base,
    ...theme.spacing.shadows.sm,
  },
  scenarioIconContainer: {
    width: 48,
    height: 48,
    borderRadius: theme.spacing.borderRadius.base,
    backgroundColor: theme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scenarioInfo: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  scenarioTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  scenarioSubtitle: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
    marginTop: 2,
  },
  scenarioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary + '12',
    borderRadius: theme.spacing.borderRadius.full,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    gap: theme.spacing.xxs,
  },
  scenarioButtonText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
  },

  // ==================== 全部完成状态 ====================
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderRadius: theme.spacing.borderRadius.base,
    gap: theme.spacing.sm,
  },
  completedEmoji: {
    fontSize: theme.fontScale(24),
  },
  completedText: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },

  // ==================== 角色卡片列表 ====================
  characterList: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  characterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.spacing.borderRadius.base,
    padding: theme.spacing.md,
    overflow: 'hidden',
    ...theme.spacing.shadows.sm,
  },
  characterCardLocked: {
    opacity: 0.5,
  },
  characterThemeBar: {
    width: 4,
    height: '100%',
    borderRadius: 2,
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  characterAvatar: {
    width: 48,
    height: 48,
    borderRadius: theme.spacing.borderRadius.full,
    marginLeft: theme.spacing.sm,
  },
  characterAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: theme.spacing.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: theme.spacing.sm,
  },
  characterAvatarEmoji: {
    fontSize: theme.fontScale(24),
  },
  characterInfo: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  characterName: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  characterDescription: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  catchphraseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  catchphraseText: {
    flex: 1,
    fontSize: theme.typography.fontSize.xxs,
    color: theme.colors.text.tertiary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  characterCatchphrase: {
    fontSize: theme.typography.fontSize.xxs,
    color: theme.colors.text.tertiary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  lockIcon: {
    marginLeft: theme.spacing.sm,
    alignItems: 'center',
  },
  unlockCondition: {
    fontSize: theme.typography.fontSize.xxs,
    color: theme.colors.text.disabled,
    marginTop: 2,
    textAlign: 'center',
    maxWidth: 60,
  },
  chevronIcon: {
    marginLeft: theme.spacing.sm,
  },
});
