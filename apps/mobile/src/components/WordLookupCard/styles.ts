import { StyleSheet } from 'react-native';
import { Theme } from '@/context/ThemeProvider';
import { CLASSICS } from '@/constants/classicsTheme';

export type WordLookupCardVariant = 'default' | 'classics';

/** 根据变体返回一组样式：
 *  - default: 全局主题（紫色 primary、sans 字体），文章精读使用
 *  - classics: 米白纸张 + serif 衬线 + 深紫点缀，名著精读使用 */
export const createStyles = (theme: Theme, variant: WordLookupCardVariant) => {
  const isClassics = variant === 'classics';

  const bgColor = isClassics ? CLASSICS.colors.paperDeep : theme.colors.background.secondary;
  const wordColor = isClassics ? CLASSICS.colors.ink : theme.colors.text.primary;
  const phoneticColor = isClassics ? CLASSICS.colors.inkMuted : theme.colors.text.tertiary;
  const meaningColor = isClassics ? CLASSICS.colors.ink : theme.colors.text.secondary;
  const notesColor = isClassics ? CLASSICS.colors.inkMuted : theme.colors.text.tertiary;
  const closeIconColor = isClassics ? CLASSICS.colors.inkMuted : theme.colors.text.tertiary;
  // 名著按钮配色走金色系（与顶边金线、章节金线呼应），避免紫色在米色上发冷
  const accentColor = isClassics ? CLASSICS.colors.accent : theme.colors.primary;
  const buttonColor = isClassics ? CLASSICS.colors.gold : theme.colors.primary;
  const playInverseColor = isClassics ? CLASSICS.colors.paper : theme.colors.text.inverse;

  const fontFamilyBold = isClassics ? CLASSICS.fontFamily.serifBold : undefined;
  const fontFamilySerif = isClassics ? CLASSICS.fontFamily.serif : undefined;

  return {
    colors: {
      accent: accentColor,
      button: buttonColor,
      playInverse: playInverseColor,
      closeIcon: closeIconColor,
    },
    styles: StyleSheet.create({
      card: {
        backgroundColor: bgColor,
        // 上圆角（贴底时保留圆角营造浮层感）；default 四角都有小圆角
        borderTopLeftRadius: isClassics ? theme.spacing.borderRadius.lg : theme.spacing.borderRadius.sm,
        borderTopRightRadius: isClassics ? theme.spacing.borderRadius.lg : theme.spacing.borderRadius.sm,
        borderBottomLeftRadius: isClassics ? 0 : theme.spacing.borderRadius.sm,
        borderBottomRightRadius: isClassics ? 0 : theme.spacing.borderRadius.sm,
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.md,
        paddingBottom: theme.spacing.md,
        marginBottom: isClassics ? 0 : theme.spacing.sm,
        // 名著卡片靠阴影 + 圆角 + 拖拽条分层，不加顶边（避免与章节进度金线重叠）
        ...(isClassics
          ? {
              shadowColor: CLASSICS.colors.ink,
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.14,
              shadowRadius: 14,
              elevation: 12,
            }
          : {}),
      },
      header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.spacing.sm,
      },
      headerLeft: {
        flexDirection: 'row',
        alignItems: 'baseline',
        flex: 1,
        flexWrap: 'wrap',
      },
      word: {
        fontFamily: fontFamilyBold,
        fontSize: isClassics ? theme.typography.fontSize.xl : theme.typography.fontSize.lg,
        fontWeight: isClassics ? undefined : theme.typography.fontWeight.bold,
        color: wordColor,
        letterSpacing: isClassics ? 0.3 : 0,
      },
      phonetic: {
        fontFamily: fontFamilySerif,
        fontSize: theme.typography.fontSize.sm,
        color: phoneticColor,
        marginLeft: theme.spacing.sm,
        fontStyle: isClassics ? 'italic' : 'normal',
      },
      close: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
      },
      playButton: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: buttonColor + (isClassics ? '22' : '12'),
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: isClassics ? StyleSheet.hairlineWidth : 0,
        borderColor: isClassics ? buttonColor + '40' : 'transparent',
      },
      playButtonActive: {
        backgroundColor: buttonColor,
        borderColor: buttonColor,
      },
      meaning: {
        fontFamily: fontFamilySerif,
        fontSize: isClassics ? theme.typography.fontSize.base : theme.typography.fontSize.sm,
        color: meaningColor,
        lineHeight: theme.fontScale(isClassics ? 24 : 20),
        marginTop: theme.spacing.sm,
        fontWeight: isClassics ? undefined : theme.typography.fontWeight.medium,
      },
      // notes 与主释义间加极淡分隔线（仅 classics），让变形说明视觉下沉为辅助信息
      notesDivider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: CLASSICS.colors.divider,
        marginTop: theme.spacing.sm,
        marginBottom: theme.spacing.xs,
        opacity: 0.6,
      },
      notes: {
        fontFamily: fontFamilySerif,
        fontSize: theme.typography.fontSize.xs,
        color: notesColor,
        marginTop: isClassics ? 0 : 4,
        fontStyle: 'italic',
      },
    }),
  };
};
