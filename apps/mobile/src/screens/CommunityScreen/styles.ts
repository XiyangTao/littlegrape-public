import { StyleSheet } from 'react-native';
import type { Theme } from '@/context/ThemeProvider';

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
  tabRow: {
    flexDirection: 'row', paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm, marginBottom: theme.spacing.sm,
  },
  tabItem: {
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs,
    borderRadius: theme.spacing.borderRadius.sm,
    backgroundColor: theme.colors.background.secondary,
  },
  tabItemActive: { backgroundColor: theme.colors.primary },
  tabText: { fontSize: theme.typography.fontSize.sm, color: theme.colors.text.secondary },
  tabTextActive: { color: theme.colors.text.inverse, fontWeight: theme.typography.fontWeight.semibold },
  listContent: { paddingHorizontal: theme.spacing.md },
  postCard: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.spacing.borderRadius.lg,
    padding: theme.spacing.md, marginBottom: theme.spacing.sm,
  },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm },
  postAuthorInfo: { flex: 1, marginLeft: theme.spacing.sm },
  postAuthorName: {
    fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
  },
  postTime: { fontSize: theme.typography.fontSize.xxs, color: theme.colors.text.tertiary },
  typeBadge: {
    paddingHorizontal: theme.spacing.sm, paddingVertical: 2,
    borderRadius: theme.spacing.borderRadius.sm,
  },
  typeBadgeText: { fontSize: theme.typography.fontSize.xxs, fontWeight: theme.typography.fontWeight.medium },
  postContent: {
    fontSize: theme.typography.fontSize.sm, color: theme.colors.text.primary,
    lineHeight: 20, marginBottom: theme.spacing.sm,
  },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs, marginBottom: theme.spacing.sm },
  tagChip: {
    backgroundColor: theme.colors.primary + '10',
    paddingHorizontal: theme.spacing.sm, paddingVertical: 2,
    borderRadius: theme.spacing.borderRadius.sm,
  },
  tagText: { fontSize: theme.typography.fontSize.xxs, color: theme.colors.primary },
  postActions: { flexDirection: 'row', gap: theme.spacing.lg },
  actionButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: theme.typography.fontSize.xs, color: theme.colors.text.tertiary },
  emptyContainer: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: theme.typography.fontSize.sm, color: theme.colors.text.tertiary, marginTop: theme.spacing.md },
  composeOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: theme.colors.overlay, justifyContent: 'flex-end',
  },
  composeContainer: {
    backgroundColor: theme.colors.background.primary,
    borderTopLeftRadius: theme.spacing.borderRadius.xl,
    borderTopRightRadius: theme.spacing.borderRadius.xl,
    padding: theme.spacing.md, minHeight: 300,
  },
  composeHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  composeCancel: { fontSize: theme.typography.fontSize.sm, color: theme.colors.text.secondary },
  composeTitle: {
    fontSize: theme.typography.fontSize.base, fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  composeSubmit: {
    fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
  },
  composeTypeRow: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  composeTypeButton: {
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs,
    borderRadius: theme.spacing.borderRadius.sm,
    borderWidth: 1, borderColor: theme.colors.border.light,
  },
  composeTypeText: { fontSize: theme.typography.fontSize.xs, color: theme.colors.text.secondary },
  composeInput: {
    fontSize: theme.typography.fontSize.base, color: theme.colors.text.primary,
    minHeight: 120, textAlignVertical: 'top',
  },
});
