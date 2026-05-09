/**
 * 通用格式化工具函数
 */

import type { I18nText, ScoreLevelKey } from '@/types/conversation';
import { parseUTCTimestamp, getLocalDateString, parseLocalDate } from '@/utils/dateUtils';

// ==================== 日期公共逻辑 ====================

const WEEKDAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

type DateBucket = 'today' | 'yesterday' | 'thisWeek' | 'thisYear' | 'older';

function getDateBucket(date: Date): DateBucket {
  const today = parseLocalDate(getLocalDateString());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 6 * 86400000);
  const yearStart = parseLocalDate(getLocalDateString().slice(0, 4) + '-01-01');

  if (date >= today) return 'today';
  if (date >= yesterday) return 'yesterday';
  if (date >= weekAgo) return 'thisWeek';
  if (date >= yearStart) return 'thisYear';
  return 'older';
}

function formatTimeHHMM(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * 获取本地化文本
 */
export const getLocalizedText = (
  text: I18nText | string | undefined,
  language: string
): string => {
  if (!text) return '';
  if (typeof text === 'string') return text;
  return text[language as keyof I18nText] || text['en'] || '';
};

// parseUTCTimestamp 已迁移到 @/utils/dateUtils，此处 re-export 保持兼容
export { parseUTCTimestamp } from '@/utils/dateUtils';

/**
 * 根据分数返回等级 key
 */
export const getScoreLevelKey = (score: number): ScoreLevelKey => {
  if (score >= 9) return 'excellent';
  if (score >= 7) return 'good';
  if (score >= 5) return 'fine';
  if (score >= 3) return 'needsWork';
  return 'keepTrying';
};

/**
 * 格式化消息时间（微信风格）
 * @param date 日期对象
 * @param t i18n 翻译函数
 */
export const formatMessageTime = (
  date: Date,
  t: (key: string) => string
): string => {
  const timeStr = formatTimeHHMM(date);
  const bucket = getDateBucket(date);

  switch (bucket) {
    case 'today':
      return timeStr;
    case 'yesterday':
      return `${t('conversationList.time.yesterday')} ${timeStr}`;
    case 'thisWeek':
      return `${t(`conversationList.time.weekdays.${WEEKDAY_KEYS[date.getDay()]}`)} ${timeStr}`;
    case 'thisYear':
      return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')} ${timeStr}`;
    case 'older':
      return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')} ${timeStr}`;
  }
};

/**
 * 格式化列表时间（简短格式）
 * @param dateString ISO 日期字符串
 * @param t i18n 翻译函数
 */
export const formatListTime = (
  dateString: string | null,
  t: (key: string) => string
): string => {
  if (!dateString) return '';
  const date = parseUTCTimestamp(dateString);
  const timeStr = formatTimeHHMM(date);
  const bucket = getDateBucket(date);

  switch (bucket) {
    case 'today':
      return timeStr;
    case 'yesterday':
      return `${t('conversationList.time.yesterday')} ${timeStr}`;
    case 'thisWeek':
      return t(`conversationList.time.weekdays.${WEEKDAY_KEYS[date.getDay()]}`);
    case 'thisYear':
    case 'older':
      return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
  }
};

/**
 * 格式化相对时间（"刚刚"/"N分钟前"/"N小时前"/"N天前"）
 * @param timestamp 服务端 ISO 时间字符串
 * @param t i18n 翻译函数
 */
export const formatRelativeTime = (
  timestamp: string,
  t: (key: string) => string
): string => {
  const date = parseUTCTimestamp(timestamp);
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return t('community.justNow');
  if (diff < 3600) return `${Math.floor(diff / 60)}${t('community.minutesAgo')}`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}${t('community.hoursAgo')}`;
  return `${Math.floor(diff / 86400)}${t('community.daysAgo')}`;
};

/**
 * 格式化语音时长（秒）
 */
export const formatVoiceDuration = (durationMs: number): string => {
  return `${Math.ceil(durationMs / 1000)}"`;
};
