// 应用信息
export const APP_INFO = {
  name: '小葡萄',
  slogan: '「会读、会说、会用」的 AI 英语学习应用',
  version: '1.1.5',
  description: '音素级发音纠正 · AI 教练式学习 · 完整学习闭环',
  copyright: `© ${new Date().getFullYear()} CodeRhythm. All rights reserved.`,
};

// 下载链接
export const DOWNLOAD_LINKS = {
  androidApk: 'https://cdn.coderhythm.cn/littlegrape/downloads/littlegrape-1.1.5.apk',
};

// 导航链接
export const NAV_LINKS = [
  { label: '首页', href: '/' },
  { label: '下载', href: '/download' },
];

// 数据亮点
export const STATS = [
  { value: '21,944', label: '精选词库', suffix: '词' },
  { value: '8', label: 'AI 对话角色', suffix: '位' },
  { value: '3', label: '题型覆盖', suffix: '种' },
  { value: '44', label: '音素级评估', suffix: '个音素' },
];

// 截图列表
export const SCREENSHOTS = [
  { src: '/images/screenshots/home.jpg', alt: '首页', label: '精读 & 剧场' },
  { src: '/images/screenshots/chat.jpg', alt: 'AI 对话', label: 'AI 对话伙伴' },
  { src: '/images/screenshots/learn.jpg', alt: '单词学习', label: '智能单词本' },
  { src: '/images/screenshots/pronunciation.jpg', alt: '发音训练', label: '音素发音训练' },
  { src: '/images/screenshots/grammar.jpg', alt: '语法学习', label: '语法体系' },
];
