export const lightColors = {
  // 主色调 - 葡萄紫
  primary: '#7C5CFC',           // 沉稳葡萄紫
  primaryDark: '#6B4CE6',       // 深紫色
  primaryLight: '#B8A5FF',      // 浅紫色

  // 辅助色 - 中性灰，不喧宾夺主
  secondary: '#9CA3AF',         // 中性灰
  success: '#10B981',           // 翠绿色
  warning: '#F59E0B',           // 琥珀色
  info: '#60A5FA',              // 天蓝色
  error: '#F43F5E',             // 玫瑰红

  // 扩展颜色 - 亮色主题
  purple: '#7C5CFC',
  green: '#10B981',
  orange: '#F59E0B',
  blue: '#60A5FA',
  red: '#F43F5E',

  // 强调色 - Tips等特殊用途
  accent: {
    yellow: '#fef3c7',
    yellowDark: '#f59e0b',
    yellowBright: '#eab308',
    wechatGreen: '#95ec69',
  },

  // 社交登录品牌色
  social: {
    wechat: '#07C160',    // 微信官方品牌绿色
  },

  // 评分等级颜色（鼓励型配色）
  scoreLevel: {
    excellent: '#F59E0B',  // 金色 - 9-10分 金牌
    good: '#10B981',       // 翠绿 - 7-8分 出色
    fine: '#3B82F6',       // 天蓝 - 5-6分 不错
    needsWork: '#8B5CF6',  // 紫色 - 3-4分 进步中
    keepTrying: '#EC4899', // 粉色 - 1-2分 加油
  },

  // 发音评估颜色
  pronunciation: {
    excellent: '#10B981', // 绿色 85-100
    good: '#F59E0B',      // 橙色 60-84
    poor: '#EF4444',      // 红色 0-59
  },

  // 统计图热力颜色（对齐 GitHub 贡献图）
  statsHeatmap: {
    levels: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
  },

  // 录音组件颜色
  recording: {
    bubble: '#9eea6a',              // 录音气泡（微信绿）
    bubbleInitializing: '#b8e6a0', // 初始化中的气泡（浅绿）
    bubbleCancel: '#ff4d4f',       // 取消时的气泡（红色）
    waveform: '#1aad19',           // 波形颜色（深绿）
    waveformCancel: '#ffffff',     // 取消时波形颜色
    panelBackground: 'rgba(50, 50, 50, 0.95)',     // 底部面板背景
    sendAreaBackground: 'rgba(255, 255, 255, 0.1)', // 发送区域背景
    cancelAreaActive: 'rgba(255, 77, 79, 0.1)',    // 取消区域激活背景
    hintText: 'rgba(255, 255, 255, 0.5)',          // 提示文字颜色
    sendText: '#ffffff',           // 发送文字颜色
    cancelText: '#ff4d4f',         // 取消文字颜色
    overlay: 'rgba(0, 0, 0, 0.6)', // 遮罩层背景
    durationText: 'rgba(255, 255, 255, 0.9)', // 时长文字颜色
  },

  // 背景色 - 通透留白
  background: {
    primary: '#FFFFFF',         // 纯白背景
    secondary: '#F7F8FA',       // 极浅暖灰
    tertiary: '#F2F3F5',       // 浅灰
  },
  surface: '#F7F8FA',
  card: '#FFFFFF',

  // 文字颜色 - 黑白灰为主
  text: {
    primary: '#1A1A1A',         // 纯黑文字
    secondary: '#666666',       // 标准中灰
    tertiary: '#999999',        // 标准浅灰
    disabled: '#CCCCCC',        // 禁用态
    inverse: '#ffffff',
    link: '#7C5CFC',            // 紫色链接
  },

  // 边框颜色 - 更轻，通透感
  border: {
    light: '#F0F0F0',          // 极轻边框
    medium: '#E5E5E5',         // 中等边框
    dark: '#D1D1D1',           // 深边框
  },

  // 阴影
  shadow: '#000000',

  // 渐变色
  gradient: {
    primary: ['#7C5CFC', '#A78BFA'] as [string, string],       // 紫色渐变（深→浅）
    primarySoft: ['#EDE9FE', '#F5F3FF'] as [string, string],   // 极浅紫渐变（卡片背景）
    featured: ['#7C5CFC', '#9F7AFF'] as [string, string],      // Featured 大卡渐变
  },

  // 遮罩层 - 更通透
  overlay: 'rgba(0, 0, 0, 0.4)',
};

export const darkColors: typeof lightColors = {
  // 主色调 - 葡萄紫暗色模式
  primary: '#B8A5FF',
  primaryDark: '#7C5CFC',
  primaryLight: '#D4CCFF',

  // 辅助色 - 暗色模式适配
  secondary: '#6B7280',         // 中性灰
  success: '#34D399',           // 翡翠绿
  warning: '#FBBF24',           // 亮琥珀
  info: '#93C5FD',              // 浅天蓝
  error: '#FB7185',             // 浅玫瑰红

  // 扩展颜色 - 暗色主题
  purple: '#B8A5FF',
  green: '#34D399',
  orange: '#FBBF24',
  blue: '#93C5FD',
  red: '#FB7185',

  // 强调色 - Tips等特殊用途
  accent: {
    yellow: '#451a03',
    yellowDark: '#f59e0b',
    yellowBright: '#eab308',
    wechatGreen: '#95ec69',
  },

  // 社交登录品牌色
  social: {
    wechat: '#07C160',    // 微信官方品牌绿色
  },

  // 评分等级颜色（鼓励型配色 - 暗色模式适配）
  scoreLevel: {
    excellent: '#FBBF24',  // 亮金色 - 9-10分 金牌
    good: '#34D399',       // 翡翠绿 - 7-8分 出色
    fine: '#60A5FA',       // 天蓝色 - 5-6分 不错
    needsWork: '#A78BFA',  // 浅紫色 - 3-4分 进步中
    keepTrying: '#F9A8D4', // 浅粉色 - 1-2分 加油
  },

  // 发音评估颜色（暗色模式）
  pronunciation: {
    excellent: '#34D399', // 翡翠绿 85-100
    good: '#FBBF24',      // 亮琥珀 60-84
    poor: '#FB7185',      // 浅玫瑰红 0-59
  },

  // 统计图热力颜色（暗色模式，保持可读性）
  statsHeatmap: {
    levels: ['#1f2937', '#0e4429', '#006d32', '#26a641', '#39d353'],
  },

  // 录音组件颜色（暗色模式）
  recording: {
    bubble: '#9eea6a',              // 录音气泡（微信绿）
    bubbleInitializing: '#b8e6a0', // 初始化中的气泡（浅绿）
    bubbleCancel: '#ff4d4f',       // 取消时的气泡（红色）
    waveform: '#1aad19',           // 波形颜色（深绿）
    waveformCancel: '#ffffff',     // 取消时波形颜色
    panelBackground: 'rgba(50, 50, 50, 0.95)',     // 底部面板背景
    sendAreaBackground: 'rgba(255, 255, 255, 0.1)', // 发送区域背景
    cancelAreaActive: 'rgba(255, 77, 79, 0.1)',    // 取消区域激活背景
    hintText: 'rgba(255, 255, 255, 0.5)',          // 提示文字颜色
    sendText: '#ffffff',           // 发送文字颜色
    cancelText: '#ff4d4f',         // 取消文字颜色
    overlay: 'rgba(0, 0, 0, 0.6)', // 遮罩层背景
    durationText: 'rgba(255, 255, 255, 0.9)', // 时长文字颜色
  },

  // 背景色 - 现代深色系
  background: {
    primary: '#0A0A0A',
    secondary: '#161616',
    tertiary: '#222222',
  },
  surface: '#161616',
  card: '#222222',

  // 文字颜色
  text: {
    primary: '#f9fafb',
    secondary: '#d1d5db',
    tertiary: '#9ca3af',        // 第三级灰色文字
    disabled: '#6b7280',
    inverse: '#111827',
    link: '#B8A5FF',            // 紫色链接
  },

  // 边框颜色
  border: {
    light: '#374151',
    medium: '#4b5563',
    dark: '#6b7280',
  },

  // 阴影
  shadow: '#000000',

  // 渐变色
  gradient: {
    primary: ['#B8A5FF', '#7C5CFC'] as [string, string],
    primarySoft: ['#2D2640', '#1E1A2E'] as [string, string],
    featured: ['#7C5CFC', '#6B4CE6'] as [string, string],
  },

  // 遮罩层
  overlay: 'rgba(0, 0, 0, 0.4)',
};

export type Colors = typeof lightColors;
