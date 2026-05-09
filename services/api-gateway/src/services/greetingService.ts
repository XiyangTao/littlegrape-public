import { logger } from '@/utils/logger';
import { formatDateCN, getTomorrowStartCN } from '@/utils/dateUtils';
import * as greetingsData from '@/config/greetings.json';

interface DailyGreetingResponse {
  date: string;
  greetings: Record<string, string>;
  expires_at: string;
  version: string;
}

interface GreetingItem {
  'zh-CN': string;
  'en-US': string;
}

class GreetingService {
  /**
   * 获取每日欢迎语 - 从100句名言中随机选择
   */
  async getDailyGreeting(userId : String): Promise<DailyGreetingResponse> {
    const today = new Date();
    const dateStr = this.formatDate(today);

    logger.info(`Generating daily greeting for ${dateStr}`);

    // 从配置文件中随机选择一句名言
    const greetings = this.getRandomGreeting(dateStr + '_' + userId);

    return {
      date: dateStr,
      greetings,
      expires_at: this.getTomorrowTimestamp(),
      version: '1.1'
    };
  }

  /**
   * 根据日期获取随机欢迎语（同一天返回相同的句子）
   */
  private getRandomGreeting(dateStr: string): Record<string, string> {
    const greetingsList = greetingsData as GreetingItem[];

    if (!greetingsList || greetingsList.length === 0) {
      // 如果配置文件有问题，返回默认欢迎语
      logger.warn('Greetings configuration file is empty or invalid, using default greeting');
      return {
        'zh-CN': '今天也要努力学习哦 💪',
        'en-US': 'Let\'s study hard today! 💪'
      };
    }

    // 使用日期作为种子，确保同一天返回相同的句子
    const seed = this.hashDate(dateStr);
    const index = seed % greetingsList.length;

    const selectedGreeting = greetingsList[index];

    logger.info(`Selected greeting index: ${index}, content: "${selectedGreeting['zh-CN']}"`);

    return {
      'zh-CN': selectedGreeting['zh-CN'],
      'en-US': selectedGreeting['en-US']
    };
  }

  /**
   * 将日期字符串转换为数字种子
   */
  private hashDate(dateStr: string): number {
    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) {
      const char = dateStr.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash);
  }

  /**
   * 格式化日期为 YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    return formatDateCN(date);
  }

  /**
   * 获取北京时间明天0点的时间戳
   */
  private getTomorrowTimestamp(): string {
    return getTomorrowStartCN().toISOString();
  }
}

export const greetingService = new GreetingService();