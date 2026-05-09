// Mock 数据集中管理 — 后续替换 API 时只改这个文件

// 每日一词
export const MOCK_DAILY_WORD = {
  word: 'resilient',
  phonetic: '/rɪˈzɪliənt/',
  meaning: 'adj. 有弹性的；能复原的；适应力强的',
  example: 'She proved to be remarkably resilient after the setback.',
  exampleTranslation: '她在挫折后表现出了非凡的适应力。',
};

// 推荐关注用户
export const MOCK_RECOMMENDED_USERS = [
  { id: '1', nickname: 'Alice', avatar: null, level: 12, streak: 45 },
  { id: '2', nickname: 'Bob', avatar: null, level: 8, streak: 30 },
  { id: '3', nickname: 'Charlie', avatar: null, level: 15, streak: 60 },
  { id: '4', nickname: 'Diana', avatar: null, level: 10, streak: 22 },
  { id: '5', nickname: 'Eve', avatar: null, level: 6, streak: 14 },
];

// 本周学习之星 Top 3
export const MOCK_WEEKLY_STARS = [
  { rank: 1, nickname: 'Alice', learnedCount: 320, streak: 45 },
  { rank: 2, nickname: 'Bob', learnedCount: 280, streak: 30 },
  { rank: 3, nickname: 'Charlie', learnedCount: 250, streak: 60 },
];

// Banner 轮播数据
export const BANNERS = [
  { icon: 'auto-stories' as const, titleKey: 'discover.storyTitle', descKey: 'discover.storyDesc', gradient: 'featured' as const, route: 'StoryList' },
  { icon: 'headphones' as const, titleKey: 'discover.listeningTitle', descKey: 'discover.bannerListeningDesc', gradient: 'primary' as const, route: 'ListeningList' },
  { icon: 'record-voice-over' as const, titleKey: 'discover.diaryTitle', descKey: 'discover.bannerDiaryDesc', gradient: 'primarySoft' as const, route: 'SpeakingDiary' },
];

// 学习内容 2×2（精读/绘本/口语/语法）
export const CONTENT_ITEMS = [
  { icon: 'menu-book' as const, titleKey: 'discover.readingTitle', descKey: 'discover.readingDesc', color: '#7C5CFC', route: 'ReadingList' },
  { icon: 'auto-stories' as const, titleKey: 'discover.storyTitle', descKey: 'discover.storyBriefDesc', color: '#10B981', route: 'StoryList' },
  { icon: 'record-voice-over' as const, titleKey: 'discover.diaryTitle', descKey: 'discover.diaryDesc', color: '#F59E0B', route: 'SpeakingDiary' },
  { icon: 'school' as const, titleKey: 'discover.grammarTitle', descKey: 'discover.grammarDesc', color: '#3B82F6', route: '' },
];
