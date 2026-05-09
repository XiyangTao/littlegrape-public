// 词库配置 - 统一管理所有词库的颜色、图标等配置

// 词库颜色映射
export const LIBRARY_COLORS: Record<string, string> = {
  '全部': '#6B7280',
  '小学': '#10B981',
  '初中': '#3B82F6',
  '高中': '#8B5CF6',
  '四级': '#F59E0B',
  '六级': '#EC4899',
  '考研': '#EF4444',
  '专四': '#06B6D4',
  '专八': '#6366F1',
  'BEC': '#0EA5E9',
  'GRE': '#14B8A6',
  'GMAT': '#7C3AED',
  '托福': '#F97316',
  '雅思': '#84CC16',
  'SAT': '#A855F7',
  'COCA': '#DC2626',
};

// 词库图标映射（使用 MaterialIcons 图标名）
export const LIBRARY_ICONS: Record<string, string> = {
  '全部': 'folder',
  '小学': 'auto-stories',
  '初中': 'menu-book',
  '高中': 'import-contacts',
  '四级': 'looks-4',
  '六级': 'looks-6',
  '考研': 'school',
  '专四': 'workspace-premium',
  '专八': 'military-tech',
  'BEC': 'business-center',
  'GRE': 'public',
  'GMAT': 'account-balance',
  '托福': 'flight',
  '雅思': 'language',
  'SAT': 'star',
  'COCA': 'library-books',
};

// 词库分类
export const LIBRARY_CATEGORIES = [
  { id: 'basic', name: '基础词汇', tags: ['小学', '初中', '高中'] },
  { id: 'college', name: '大学考试', tags: ['四级', '六级', '考研'] },
  { id: 'professional', name: '专业英语', tags: ['专四', '专八'] },
  { id: 'abroad', name: '出国考试', tags: ['BEC', 'GRE', 'GMAT', '托福', '雅思', 'SAT'] },
  { id: 'corpus', name: '美国当代英语语料库', tags: ['COCA'] },
];

// 获取词库颜色（带默认值）
export function getLibraryColor(tag: string, defaultColor: string = '#6B7280'): string {
  return LIBRARY_COLORS[tag] || defaultColor;
}

// 获取词库图标（带默认值）
export function getLibraryIcon(tag: string, defaultIcon: string = 'menu-book'): string {
  return LIBRARY_ICONS[tag] || defaultIcon;
}
