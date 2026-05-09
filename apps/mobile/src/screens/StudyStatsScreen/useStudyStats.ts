import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/stores/AuthStore';
import { useI18n } from '@/context/I18nProvider';
import { getDailyStatsRange, getLearningWordsByDate } from '@/services/StatsService';
import type { LocalWord } from '@/types/word';
import { useFocusLoader } from '@/hooks/useDataLoader';
import { Theme } from '@/context/ThemeProvider';

export function useStudyStats() {
  const auth = useAuth();
  const user = auth?.user ?? null;
  const { t } = useI18n();
  const navigation = useNavigation();

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedLearned, setSelectedLearned] = useState<LocalWord[]>([]);
  const [selectedMastered, setSelectedMastered] = useState<LocalWord[]>([]);
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  const { data: dailyCounts, isLoading } = useFocusLoader(
    async () => {
      if (!user?.id) return [];
      const yearStart = new Date(selectedYear, 0, 1);
      const yearEnd = new Date(selectedYear, 11, 31);
      return getDailyStatsRange(user.id, yearStart, yearEnd);
    },
    [user?.id, selectedYear],
  );

  const dateKey = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const countMap = useMemo(() => {
    const map = new Map<string, { learned: number; mastered: number }>();
    (dailyCounts || []).forEach(item => {
      map.set(item.date, {
        learned: item.learnedCount || 0,
        mastered: item.masteredCount || 0,
      });
    });
    return map;
  }, [dailyCounts]);

  const yearDays = useMemo(() => {
    const days: Date[] = [];
    const start = new Date(selectedYear, 0, 1);
    const end = new Date(selectedYear, 11, 31);
    const current = new Date(start);
    while (current <= end) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return days;
  }, [selectedYear]);

  const heatmapData = useMemo(() => {
    const weeks: Array<Array<{ date: Date; count: number }>> = [];
    let currentWeek: Array<{ date: Date; count: number }> = new Array(7).fill(null as any);

    yearDays.forEach((date, index) => {
      const weekday = (date.getDay() + 6) % 7; // Monday = 0
      if (index === 0 && weekday !== 0) {
        // 填充前置空位
        for (let i = 0; i < weekday; i++) {
          currentWeek[i] = { date: new Date(date.getTime()), count: 0 };
        }
      }

      const key = dateKey(date);
      const entry = countMap.get(key);
      const count = (entry?.learned || 0) + (entry?.mastered || 0);
      currentWeek[weekday] = { date, count };

      if (weekday === 6 || index === yearDays.length - 1) {
        weeks.push(currentWeek);
        currentWeek = new Array(7).fill(null as any);
      }
    });

    return weeks;
  }, [yearDays, countMap]);

  const monthLabels = useMemo(() => {
    const monthNames = (t('profile.statsMonthsShort', { returnObjects: true }) as unknown as string[]) || [];
    const labels: Array<{ label: string; left: number }> = [];
    let lastMonth = -1;
    yearDays.forEach((date, index) => {
      const month = date.getMonth();
      if (month !== lastMonth) {
        lastMonth = month;
        const weekIndex = Math.floor(index / 7);
        const weekWidth = 16;
        labels.push({
          label: monthNames[month],
          left: weekIndex * weekWidth,
        });
      }
    });
    return labels;
  }, [yearDays, t]);

  const availableYears = useMemo(() => {
    let startYear = currentYear;
    if (user?.createdAt) {
      const parsed = new Date(user.createdAt);
      if (!Number.isNaN(parsed.getTime())) {
        startYear = parsed.getFullYear();
      }
    } else if ((dailyCounts || []).length > 0) {
      const minDate = (dailyCounts || [])[0].date;
      const minYear = Number(minDate.split('-')[0]);
      if (!Number.isNaN(minYear)) {
        startYear = minYear;
      }
    }
    const years: number[] = [];
    for (let y = startYear; y <= currentYear; y++) {
      years.push(y);
    }
    return years.reverse();
  }, [user?.createdAt, dailyCounts, currentYear]);

  useEffect(() => {
    if (!availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0] || currentYear);
    }
  }, [availableYears, selectedYear, currentYear]);

  const getLevelColor = (count: number, theme: Theme) => {
    const levels = theme.colors.statsHeatmap.levels;
    if (count <= 0) return levels[0];
    if (count <= 2) return levels[1];
    if (count <= 4) return levels[2];
    if (count <= 7) return levels[3];
    return levels[4];
  };

  const openDayDetail = useCallback(async (date: Date) => {
    if (!user?.id) return;
    try {
      const [learned, mastered] = await Promise.all([
        getLearningWordsByDate(user.id, date, 'word_learned'),
        getLearningWordsByDate(user.id, date, 'word_mastered'),
      ]);
      setSelectedDate(date);
      setSelectedLearned(learned);
      setSelectedMastered(mastered);
      setIsDetailVisible(true);
    } catch (error) {
      console.error('[StudyStats] Load day detail failed:', error);
    }
  }, [user?.id]);

  const closeDayDetail = useCallback(() => {
    setIsDetailVisible(false);
  }, []);

  return {
    navigation,
    t,
    isLoading,
    selectedDate,
    selectedYear,
    setSelectedYear,
    selectedLearned,
    selectedMastered,
    isDetailVisible,
    heatmapData,
    monthLabels,
    availableYears,
    getLevelColor,
    openDayDetail,
    closeDayDetail,
  };
}
