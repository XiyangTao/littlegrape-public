import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { MaterialIcons, MaterialIconsIconName } from '@react-native-vector-icons/material-icons';
import { useTheme } from '@/context/ThemeProvider';

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export default function Icon({ name, size = 24, color, style }: IconProps) {
  const { theme } = useTheme();

  return (
    <MaterialIcons
      name={name as MaterialIconsIconName}
      size={size}
      color={color || theme.colors.text.primary}
      style={style}
    />
  );
}

// 常用图标名称的类型安全导出
export const IconNames = {
  // 基础图标
  home: 'home',
  search: 'search',
  settings: 'settings',
  person: 'person',
  book: 'book',

  // 学习相关
  school: 'school',
  library: 'local-library',
  quiz: 'quiz',
  menuBook: 'menu-book',
  translate: 'language',        // 翻译（地球仪图标）
  transcript: 'translate',      // 转文字（文字图标）
  subtitlesOff: 'subtitles-off',  // 关闭字幕/取消转文字
  forum: 'forum',
  theaterComedy: 'theater-comedy',

  // 音频相关
  mic: 'mic',
  graphicEq: 'graphic-eq',  // 声波/波形图标（类似微信语音）
  play: 'play-arrow',
  pause: 'pause',
  stop: 'stop',
  volume: 'volume-up',
  volumeOff: 'volume-off',

  // 练习相关
  fitness: 'fitness-center',
  target: 'gps-fixed',
  star: 'star',
  starBorder: 'star-border',

  // 功能图标
  copy: 'content-copy',
  selectAll: 'select-all',
  edit: 'edit',
  save: 'save',
  delete: 'delete',
  share: 'share',
  favorite: 'favorite',
  favoriteBorder: 'favorite-border',
  bookmark: 'bookmark',
  bookmarkBorder: 'bookmark-border',

  // 导航图标
  back: 'arrow-back',
  forward: 'arrow-forward',
  next: 'arrow-forward',
  up: 'keyboard-arrow-up',
  down: 'keyboard-arrow-down',
  left: 'keyboard-arrow-left',
  right: 'keyboard-arrow-right',
  close: 'close',
  menu: 'menu',

  // 状态图标
  check: 'check',
  checkCircle: 'check-circle',
  clear: 'clear',
  error: 'error',
  rocketLaunch: 'rocket-launch',
  warning: 'warning',
  info: 'info',
  help: 'help',

  // 媒体图标
  camera: 'camera-alt',
  image: 'image',
  video: 'videocam',

  // 其他常用
  add: 'add',
  remove: 'remove',
  refresh: 'refresh',
  download: 'download',
  upload: 'upload',
  send: 'send',
  autoFix: 'auto-fix-high',
  aiGenerate: 'auto-awesome',
  lightbulb: 'lightbulb',
  psychology: 'psychology',
  history: 'history',
  signal: 'signal-cellular-alt',
  language: 'language',
  chat: 'chat',

  // 英语变体和对话风格
  public: 'public',
  work: 'work',
  groups: 'groups',
  recordVoiceOver: 'record-voice-over',

  // 场景分类
  apps: 'apps',
  flightTakeoff: 'flight-takeoff',
  restaurant: 'restaurant',
  localHospital: 'local-hospital',
  inbox: 'inbox',
} as const;