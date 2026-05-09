import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const REMINDER_KEY = '@littlegrape/reminder_settings';

export interface ReminderSettings {
  enabled: boolean;
  hour: number;
  minute: number;
}

const DEFAULT_SETTINGS: ReminderSettings = {
  enabled: false,
  hour: 20,
  minute: 0,
};

// 初始化通知配置
export function initNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

// 请求通知权限
export async function requestPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// 设置每日定时提醒
export async function scheduleDailyReminder(hour: number, minute: number): Promise<void> {
  // 先取消已有的提醒
  await cancelAllReminders();

  // 设置 Android channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('daily-reminder', {
      name: '每日学习提醒',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '该学习啦！',
      body: '今天的单词还没复习完哦，来看看吧',
      sound: 'default',
      ...(Platform.OS === 'android' ? { channelId: 'daily-reminder' } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

// 取消所有提醒
export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// 获取提醒设置
export async function getReminderSettings(): Promise<ReminderSettings> {
  try {
    const stored = await AsyncStorage.getItem(REMINDER_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
    return DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

// 保存提醒设置
export async function setReminderSettings(settings: ReminderSettings): Promise<void> {
  await AsyncStorage.setItem(REMINDER_KEY, JSON.stringify(settings));

  if (settings.enabled) {
    const granted = await requestPermission();
    if (granted) {
      await scheduleDailyReminder(settings.hour, settings.minute);
    }
  } else {
    await cancelAllReminders();
  }
}

// 恢复已设置的提醒（应用启动时调用）
export async function restoreReminders(): Promise<void> {
  const settings = await getReminderSettings();
  if (settings.enabled) {
    const granted = await requestPermission();
    if (granted) {
      await scheduleDailyReminder(settings.hour, settings.minute);
    }
  }
}

// ==================== 单词遭遇通知 ====================

const ENCOUNTER_NOTIFICATION_ID = 'encounter-word';

/**
 * 取消之前的遭遇通知
 */
async function cancelEncounterNotification(): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if (n.identifier === ENCOUNTER_NOTIFICATION_ID) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
  } catch (e) {
    console.warn('[NotificationService] 取消遭遇通知失败:', e);
  }
}

/**
 * 调度单词遭遇通知
 * 取消之前的遭遇通知，创建新的每日通知（明天上午 10:00）
 */
export async function scheduleEncounterNotification(wordData: {
  word: string;
  example: string;
}): Promise<void> {
  try {
    // 1. 确保有通知权限
    const granted = await requestPermission();
    if (!granted) {
      console.warn('[NotificationService] 通知权限未授予，跳过遭遇通知');
      return;
    }

    // 2. 取消之前的 encounter 类通知
    await cancelEncounterNotification();

    // 3. 设置 Android channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('encounter-word', {
        name: '单词遭遇提醒',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
      });
    }

    // 4. 构建通知内容
    const title = wordData.example;
    const body = `"${wordData.word}" — 你最近学的词，还记得吗？`;

    // 5. 调度明天上午 10:00 的通知
    await Notifications.scheduleNotificationAsync({
      identifier: ENCOUNTER_NOTIFICATION_ID,
      content: {
        title,
        body,
        sound: 'default',
        ...(Platform.OS === 'android' ? { channelId: 'encounter-word' } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 10,
        minute: 0,
      },
    });

    if (__DEV__) console.log(`[NotificationService] 遭遇通知已调度: "${wordData.word}"`);
  } catch (error) {
    console.warn('[NotificationService] 调度遭遇通知失败:', error);
  }
}

