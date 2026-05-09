import { StyleSheet } from 'react-native';
import { Theme } from '@/context/ThemeProvider';

export const createStyles = (theme: Theme) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: theme.colors.background.primary,
    borderTopLeftRadius: theme.spacing.borderRadius.xl,
    borderTopRightRadius: theme.spacing.borderRadius.xl,
    height: theme.screen.height * 0.86,
    maxHeight: theme.screen.height * 0.9,
    minHeight: theme.screen.height * 0.6,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  headerHandle: {
    width: 36,
    height: 4,
    backgroundColor: theme.colors.background.tertiary,
    borderRadius: 2,
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    top: 8,
    width: 36,
    height: 36,
    borderRadius: theme.spacing.borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // 测试内容
  quizContent: {
    alignItems: 'center',
  },
  quizTitle: {
    fontSize: theme.fontScale(24),
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  quizSubtitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 24,
  },

  // 匹配题
  matchingContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  matchingColumn: {
    flex: 1,
    gap: 10,
  },
  matchingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.spacing.borderRadius.base,
    padding: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  matchingMeaningItem: {
    minHeight: 60,
  },
  matchingItemSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '10',
  },
  matchingItemMatched: {
    borderColor: theme.colors.success,
    backgroundColor: theme.colors.success + '10',
    opacity: 0.7,
  },
  matchingItemWrong: {
    borderColor: theme.colors.error,
    backgroundColor: theme.colors.error + '10',
  },
  matchingItemText: {
    fontSize: 16,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  matchingMeaningText: {
    fontSize: 14,
    color: theme.colors.text.primary,
    lineHeight: 20,
  },
  matchingItemTextMatched: {
    color: theme.colors.success,
  },

  // 选择题
  questionContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  questionWord: {
    fontSize: theme.fontScale(36),
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  questionPhonetic: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    fontStyle: 'italic',
  },
  optionsContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.spacing.borderRadius.base,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionItemSelected: {
    borderColor: theme.colors.primary,
  },
  optionItemCorrect: {
    borderColor: theme.colors.success,
    backgroundColor: theme.colors.success + '10',
  },
  optionItemWrong: {
    borderColor: theme.colors.error,
    backgroundColor: theme.colors.error + '10',
  },
  optionText: {
    fontSize: 15,
    color: theme.colors.text.primary,
    flex: 1,
    marginRight: 8,
  },
  optionTextCorrect: {
    color: theme.colors.success,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  optionTextWrong: {
    color: theme.colors.error,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.spacing.borderRadius.base,
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 8,
    width: '100%',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.inverse,
  },

  // 进度
  progressInfo: {
    marginTop: 20,
  },
  progressText: {
    fontSize: 14,
    color: theme.colors.text.tertiary,
  },

  // 结果
  resultContent: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  resultEmoji: {
    fontSize: theme.fontScale(64),
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: theme.fontScale(28),
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: 24,
  },
  resultScoreContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  resultScore: {
    fontSize: theme.fontScale(56),
    fontWeight: theme.typography.fontWeight.bold,
  },
  resultDetail: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    marginTop: 4,
  },
  completeButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.spacing.borderRadius.xl,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.inverse,
  },
});
