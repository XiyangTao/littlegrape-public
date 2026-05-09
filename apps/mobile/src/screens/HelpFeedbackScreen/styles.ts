import { StyleSheet } from 'react-native';
import { Theme } from '@/context/ThemeProvider';

export const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
    paddingHorizontal: theme.spacing.lg,
  },
  scrollContent: {
    flex: 1,
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
  section: {
    marginTop: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // FAQ 分组样式
  faqGroup: {
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.spacing.borderRadius.md,
    overflow: 'hidden',
  },
  faqGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
  },
  faqGroupTitle: {
    flex: 1,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  faqGroupRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  faqGroupCount: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
    marginRight: theme.spacing.xs,
  },
  faqGroupContent: {
    paddingHorizontal: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
  },
  // FAQ 条目样式
  faqItem: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.spacing.borderRadius.sm,
    marginBottom: theme.spacing.xs,
    overflow: 'hidden',
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
  },
  faqQuestion: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
    marginRight: theme.spacing.sm,
  },
  faqAnswer: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    lineHeight: 20,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  // 反馈类型样式
  feedbackTypeContainer: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  feedbackTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    marginRight: theme.spacing.sm,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.spacing.borderRadius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  feedbackTypeButtonActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '10',
  },
  feedbackTypeText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginLeft: 6,
  },
  feedbackTypeTextActive: {
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  // 反馈输入样式
  feedbackInputContainer: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.spacing.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  feedbackInput: {
    padding: theme.spacing.md,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.primary,
    minHeight: 120,
  },
  charCount: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.disabled,
    textAlign: 'right',
    paddingRight: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  // 图片上传样式
  imageSection: {
    marginBottom: theme.spacing.md,
  },
  imageList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  imageItem: {
    width: 70,
    height: 70,
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.spacing.borderRadius.sm,
    overflow: 'hidden',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: theme.spacing.borderRadius.sm,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageButton: {
    width: 70,
    height: 70,
    borderRadius: theme.spacing.borderRadius.sm,
    backgroundColor: theme.colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    borderStyle: 'dashed',
  },
  addImageText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.secondary,
    marginTop: 4,
  },
  imageHint: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.disabled,
    marginTop: theme.spacing.xs,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.spacing.borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: theme.colors.text.disabled,
  },
  submitButtonText: {
    color: theme.colors.text.inverse,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  // 联系我们样式
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background.secondary,
    padding: theme.spacing.md,
    borderRadius: theme.spacing.borderRadius.md,
  },
  contactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactIcon: {
    marginRight: theme.spacing.md,
  },
  contactLabel: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
  },
  contactValue: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
});
