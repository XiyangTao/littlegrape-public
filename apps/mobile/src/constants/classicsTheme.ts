/**
 * 名著精读专属视觉（米白纸张 + serif 衬线 + 深紫金点缀）
 *
 * 和全局 theme 并存：classics 屏在 createStyles 里同时引用 theme（spacing/radius）+ CLASSICS（颜色/字体）
 */

import { Platform } from 'react-native';

export const CLASSICS = {
  colors: {
    /** 米白纸张底色 */
    paper: '#FBF6EE',
    /** 米白纸张（稍深，做 card/分隔） */
    paperDeep: '#F2EBDC',
    /** 墨色正文字 */
    ink: '#2A2320',
    /** 次要墨色（副标题、元信息） */
    inkMuted: '#6E6458',
    /** 更浅的墨（分隔线、弱提示） */
    inkFaint: '#A99E8F',
    /** 深紫（品牌延续 + 加深） */
    accent: '#5B3E9B',
    /** 烫金描边 / 强调 */
    gold: '#B8863A',
    /** 卡片白底（封面下方） */
    cardBg: '#FFFEFB',
    /** 分隔线 */
    divider: '#E3D9C4',
  },
  fontFamily: {
    /** 正文衬线：iOS Georgia，Android fallback 系统 serif */
    serif: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'serif',
    }) as string,
    /** 标题粗衬线 */
    serifBold: Platform.select({
      ios: 'Georgia-Bold',
      android: 'serif',
      default: 'serif',
    }) as string,
  },
  level: {
    beginner: { label: '初级', labelEn: 'Beginner', color: '#4F8F5C' },
    intermediate: { label: '中级', labelEn: 'Intermediate', color: '#C58A2F' },
    advanced: { label: '高级', labelEn: 'Advanced', color: '#B4523A' },
  } as const,
};

export type ClassicsLevel = keyof typeof CLASSICS.level;
