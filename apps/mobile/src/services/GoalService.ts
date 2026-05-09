import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocalDateString } from '@/utils/dateUtils';

const GOALS_KEY = '@littlegrape/daily_goals';
const CHECKIN_KEY = '@littlegrape/last_checkin_date';

export interface DailyGoals {
  learn: number;    // 新学 N 个单词
  review: number;   // 复习 N 个单词
}

const DEFAULT_GOALS: DailyGoals = {
  learn: 10,
  review: 15,
};

export async function getGoals(): Promise<DailyGoals> {
  try {
    const stored = await AsyncStorage.getItem(GOALS_KEY);
    if (stored) {
      return { ...DEFAULT_GOALS, ...JSON.parse(stored) };
    }
    return DEFAULT_GOALS;
  } catch {
    return DEFAULT_GOALS;
  }
}

export async function setGoals(goals: DailyGoals): Promise<void> {
  await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(goals));
}

export async function hasCheckedInToday(): Promise<boolean> {
  try {
    const lastDate = await AsyncStorage.getItem(CHECKIN_KEY);
    const today = getLocalDateString();
    return lastDate === today;
  } catch {
    return false;
  }
}

export async function markCheckedInToday(): Promise<void> {
  const today = getLocalDateString();
  await AsyncStorage.setItem(CHECKIN_KEY, today);
}
