import { StyleSheet } from 'react-native';
import { Theme } from '@/context/ThemeProvider';

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background.primary,
      paddingHorizontal: theme.spacing.lg,
    },
    scrollContent: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.background.primary,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.md,
      backgroundColor: theme.colors.background.primary,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.light,
    },
    headerButton: {
      width: 44,
      height: 44,
      justifyContent: 'center',
      alignItems: 'flex-start',
    },
    headerButtonRight: {
      width: 44,
      height: 44,
      justifyContent: 'center',
      alignItems: 'flex-end',
    },
    headerTitle: {
      flex: 1,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
      textAlign: 'center',
    },
    sectionBlock: {
      marginTop: 16,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    sectionDesc: {
      fontSize: 13,
      color: theme.colors.text.secondary,
    },
    yearSelectorRow: {
      flexDirection: 'row',
      gap: 6,
      marginBottom: 12,
      marginTop: 12,
    },
    title: {
      fontSize: theme.fontScale(24),
      fontWeight: '700',
      color: theme.colors.text.primary,
    },
    yearButton: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: theme.spacing.borderRadius.base,
      backgroundColor: theme.colors.background.secondary,
    },
    yearButtonActive: {
      backgroundColor: theme.colors.info,
    },
    yearText: {
      fontSize: 12,
      color: theme.colors.text.secondary,
      fontWeight: '600',
    },
    yearTextActive: {
      color: theme.colors.text.inverse,
    },
    heatmapCard: {
      marginTop: 12,
      padding: 16,
      borderRadius: theme.spacing.borderRadius.md,
      backgroundColor: theme.colors.background.secondary,
    },
    heatmapScrollContent: {
      paddingRight: 8,
    },
    monthRow: {
      height: 18,
      position: 'relative',
      paddingLeft: 8,
      marginBottom: 8,
    },
    monthLabel: {
      position: 'absolute',
      fontSize: 12,
      color: theme.colors.text.secondary,
    },
    heatmapGrid: {
      flexDirection: 'row',
      gap: 4,
      paddingLeft: 8,
    },
    weekColumn: {
      flexDirection: 'column',
      gap: 4,
    },
    dayCell: {
      width: 12,
      height: 12,
      borderRadius: 3,
      backgroundColor: theme.colors.background.tertiary,
    },
    legendRow: {
      marginTop: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 6,
    },
    legendText: {
      fontSize: 12,
      color: theme.colors.text.secondary,
    },
    legendDots: {
      flexDirection: 'row',
      gap: 4,
    },
    legendDot: {
      width: 10,
      height: 10,
      borderRadius: 2,
    },
    detailOverlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
      justifyContent: 'flex-end',
    },
    detailSheet: {
      backgroundColor: theme.colors.background.primary,
      borderTopLeftRadius: theme.spacing.borderRadius.md,
      borderTopRightRadius: theme.spacing.borderRadius.md,
      padding: 16,
      maxHeight: '70%',
    },
    detailHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    detailTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text.primary,
    },
    detailSubtitle: {
      fontSize: 13,
      color: theme.colors.text.secondary,
      marginBottom: 12,
    },
    detailSection: {
      marginBottom: 12,
    },
    detailSectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text.primary,
      marginBottom: 8,
    },
    listSection: {
      marginTop: 16,
      padding: 16,
      borderRadius: theme.spacing.borderRadius.md,
      backgroundColor: theme.colors.background.secondary,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text.primary,
    },
    chipsWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: theme.colors.primary + '12',
    },
    chipText: {
      fontSize: 12,
      color: theme.colors.primary,
      fontWeight: '600',
    },
    chipMore: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: theme.colors.primary + '12',
    },
    chipMoreText: {
      fontSize: 12,
      color: theme.colors.primary,
      fontWeight: '600',
    },
    emptyHint: {
      fontSize: 13,
      color: theme.colors.text.tertiary,
    },
  });
