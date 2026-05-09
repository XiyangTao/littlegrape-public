import { StyleSheet } from 'react-native';
import { Theme } from '@/context/ThemeProvider';

export const createStyles = (theme: Theme) => StyleSheet.create({
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

  scopeRow: {
    flexDirection: 'row', paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm, marginBottom: theme.spacing.sm,
  },
  scopeButton: {
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs + 2,
    borderRadius: theme.spacing.borderRadius.full,
    backgroundColor: theme.colors.background.secondary,
  },
  scopeButtonActive: { backgroundColor: theme.colors.primary },
  scopeText: { fontSize: theme.typography.fontSize.sm, color: theme.colors.text.secondary },
  scopeTextActive: { color: '#fff', fontWeight: theme.typography.fontWeight.semibold },

  tabRow: { paddingHorizontal: theme.spacing.md, marginBottom: theme.spacing.sm, maxHeight: 44 },
  tabItem: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm,
    borderRadius: theme.spacing.borderRadius.md,
    backgroundColor: theme.colors.background.secondary,
    marginRight: theme.spacing.sm,
  },
  tabItemActive: {
    backgroundColor: theme.colors.primary + '15',
    borderWidth: 1, borderColor: theme.colors.primary,
  },
  tabText: { fontSize: theme.typography.fontSize.sm, color: theme.colors.text.secondary },
  tabTextActive: { color: theme.colors.primary, fontWeight: theme.typography.fontWeight.semibold },

  periodRow: {
    flexDirection: 'row', paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm, marginBottom: theme.spacing.sm,
  },
  periodButton: {
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs,
    borderRadius: theme.spacing.borderRadius.sm,
    backgroundColor: theme.colors.background.secondary,
  },
  periodButtonActive: { backgroundColor: theme.colors.primary },
  periodText: { fontSize: theme.typography.fontSize.xs, color: theme.colors.text.secondary },
  periodTextActive: { color: theme.colors.text.inverse, fontWeight: theme.typography.fontWeight.semibold },

  myRankBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginHorizontal: theme.spacing.md, marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.primary + '10',
    borderRadius: theme.spacing.borderRadius.md, padding: theme.spacing.md,
    borderLeftWidth: 3, borderLeftColor: theme.colors.primary,
  },
  myRankLabel: { fontSize: theme.typography.fontSize.sm, color: theme.colors.text.secondary },
  myRankValue: {
    fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
  },

  listContent: { flex: 1, paddingHorizontal: theme.spacing.md },
  entryCard: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.sm,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border.light,
  },
  entryCardMe: {
    backgroundColor: theme.colors.primary + '08',
    borderRadius: theme.spacing.borderRadius.sm,
    borderBottomWidth: 0,
  },
  rankCol: { width: 40, alignItems: 'center' },
  medalBadge: {
    width: 28, height: 28, borderRadius: theme.spacing.borderRadius.base,
    justifyContent: 'center', alignItems: 'center',
  },
  medalText: { fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.bold },
  rankText: { fontSize: theme.typography.fontSize.sm, color: theme.colors.text.tertiary },
  userCol: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: theme.spacing.sm },
  avatarPlaceholder: {
    width: 32, height: 32, borderRadius: theme.spacing.borderRadius.md,
    backgroundColor: theme.colors.border.light,
    justifyContent: 'center', alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  nicknameText: {
    fontSize: theme.typography.fontSize.sm, color: theme.colors.text.primary,
    flex: 1,
  },
  nicknameTextMe: { fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.primary },
  valueText: {
    fontSize: theme.typography.fontSize.sm, color: theme.colors.text.secondary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  valueTextMedal: { color: theme.colors.primary, fontWeight: theme.typography.fontWeight.bold },
  emptyContainer: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: theme.typography.fontSize.sm, color: theme.colors.text.tertiary, marginTop: theme.spacing.md },
});
