import { StyleSheet } from 'react-native';
import { Theme } from '@/context/ThemeProvider';

export const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.tertiary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  animationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  messageContainer: {
    marginBottom: theme.spacing.xl,
    minHeight: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageText: {
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.text.primary,
    textAlign: 'center',
    fontWeight: theme.typography.fontWeight.medium,
  },
  stageText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  progressContainer: {
    width: '100%',
    marginBottom: theme.spacing.xl,
  },
  progressBar: {
    height: 6,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 3,
  },
  completeContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  completeText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.success,
    marginTop: theme.spacing.xs,
    fontWeight: theme.typography.fontWeight.medium,
  },
  errorContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
  },
  errorTitle: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.error,
    marginTop: theme.spacing.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  errorMessage: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  errorButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing['2xl'],
    paddingVertical: theme.spacing.md,
    borderRadius: theme.spacing.borderRadius.md,
    marginTop: theme.spacing.xl,
    minWidth: 120,
    alignItems: 'center',
  },
  errorButtonText: {
    color: theme.colors.text.inverse,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  errorHint: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
    marginTop: theme.spacing.sm,
  },
  configPreview: {
    backgroundColor: theme.colors.background.primary,
    padding: theme.spacing.lg,
    borderRadius: theme.spacing.borderRadius.lg,
    width: '100%',
    maxWidth: 300,
  },
  configTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  configItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  configLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    flex: 1,
  },
  configValue: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.primary,
    fontWeight: theme.typography.fontWeight.medium,
    flex: 2,
    textAlign: 'right',
  },
});
