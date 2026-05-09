import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import { useAuth } from '@/stores/AuthStore';
import { getLocalDateString } from '@/utils/dateUtils';
import { getDailyStatsRange, DailyStats } from '@/services/StatsService';
import Icon from '@/components/Icon';

interface Props {
  theme: Theme;
  expanded: boolean;
  onToggle: () => void;
}

const CELL_SIZE = 12;
const CELL_GAP = 2;
const WEEKS_TO_SHOW = 12; // 展示最近12周

export default function StreakCalendar({ theme, expanded, onToggle }: Props) {
  const { t } = useI18n();
  const { user } = useAuth();
  const styles = createStyles(theme);
  const [dailyStats, setDailyStats] = useState<Map<string, DailyStats>>(new Map());

  useEffect(() => {
    if (!user?.id || !expanded) return;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - WEEKS_TO_SHOW * 7);

    getDailyStatsRange(user.id, startDate, endDate).then(stats => {
      const map = new Map<string, DailyStats>();
      stats.forEach(s => map.set(s.date, s));
      setDailyStats(map);
    });
  }, [user?.id, expanded]);

  // 生成日期网格
  const generateGrid = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun
    const weeks: string[][] = [];

    // 从最近的周日开始往前推
    const endOffset = 6 - dayOfWeek; // 补齐到周六
    const totalDays = WEEKS_TO_SHOW * 7;

    for (let w = 0; w < WEEKS_TO_SHOW; w++) {
      const week: string[] = [];
      for (let d = 0; d < 7; d++) {
        const daysAgo = totalDays - (w * 7 + d) - 1 - endOffset;
        if (daysAgo < 0) {
          // 未来日期
          week.push('');
        } else {
          const date = new Date(today);
          date.setDate(today.getDate() - daysAgo);
          week.push(getLocalDateString(date.getTime()));
        }
      }
      weeks.push(week);
    }
    return weeks;
  };

  const getColor = (dateStr: string) => {
    if (!dateStr) return 'transparent';
    const stats = dailyStats.get(dateStr);
    if (!stats) return theme.colors.border.light;
    const total = stats.learnedCount + stats.masteredCount + stats.reviewedCount;
    if (total === 0) return theme.colors.border.light;
    if (total < 3) return theme.colors.primary + '30';
    if (total < 6) return theme.colors.primary + '60';
    if (total < 10) return theme.colors.primary + '90';
    return theme.colors.primary;
  };

  const weeks = expanded ? generateGrid() : [];

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.header} onPress={onToggle} activeOpacity={0.7}>
        <Text style={styles.headerTitle}>{t('wordHome.streakCalendarTitle')}</Text>
        <Icon
          name={expanded ? 'expand-less' : 'expand-more'}
          size={22}
          color={theme.colors.text.tertiary}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.grid}>
          {/* 周标签 */}
          <View style={styles.weekLabels}>
            {[t('wordHome.weekSun'), t('wordHome.weekMon'), '', t('wordHome.weekWed'), '', t('wordHome.weekFri'), ''].map((label, i) => (
              <Text key={i} style={styles.weekLabel}>{label}</Text>
            ))}
          </View>

          {/* 热力图 */}
          <View style={styles.heatmap}>
            {weeks.map((week, wi) => (
              <View key={wi} style={styles.weekColumn}>
                {week.map((dateStr, di) => (
                  <View
                    key={di}
                    style={[
                      styles.cell,
                      { backgroundColor: getColor(dateStr) },
                    ]}
                  />
                ))}
              </View>
            ))}
          </View>

          {/* 图例 */}
          <View style={styles.legend}>
            <Text style={styles.legendLabel}>{t('wordHome.legendLess')}</Text>
            {[theme.colors.border.light, theme.colors.primary + '30', theme.colors.primary + '60', theme.colors.primary + '90', theme.colors.primary].map((color, i) => (
              <View key={i} style={[styles.legendCell, { backgroundColor: color }]} />
            ))}
            <Text style={styles.legendLabel}>{t('wordHome.legendMore')}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: theme.colors.card,
    borderRadius: theme.spacing.borderRadius.base,
    overflow: 'hidden',
    ...theme.spacing.shadows.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  grid: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  weekLabels: {
    position: 'absolute',
    left: 14,
    top: 0,
  },
  weekLabel: {
    fontSize: 10,
    color: theme.colors.text.tertiary,
    height: CELL_SIZE + CELL_GAP,
    lineHeight: CELL_SIZE + CELL_GAP,
  },
  heatmap: {
    flexDirection: 'row',
    marginLeft: 20,
    gap: CELL_GAP,
  },
  weekColumn: {
    gap: CELL_GAP,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 2,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 3,
  },
  legendLabel: {
    fontSize: 10,
    color: theme.colors.text.tertiary,
    marginHorizontal: 2,
  },
  legendCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 2,
  },
});
