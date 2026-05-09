import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
} from 'react-native';
import type { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';

interface DatePickerProps {
  value: Date;
  onDateChange: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
}

const ITEM_HEIGHT = 50;
const PICKER_HEIGHT = 200;

// 预生成静态数据
const DAYS_28 = Array.from({ length: 28 }, (_, i) => i + 1);
const DAYS_29 = Array.from({ length: 29 }, (_, i) => i + 1);
const DAYS_30 = Array.from({ length: 30 }, (_, i) => i + 1);
const DAYS_31 = Array.from({ length: 31 }, (_, i) => i + 1);

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

export function DatePicker({
  value,
  onDateChange,
  minimumDate = new Date(1950, 0, 1),
  maximumDate = new Date()
}: DatePickerProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const selectedYear = value.getFullYear();
  const selectedMonth = value.getMonth() + 1;
  const selectedDay = value.getDate();

  const years = React.useMemo(() => {
    const startYear = minimumDate.getFullYear();
    const endYear = maximumDate.getFullYear();
    return Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);
  }, [minimumDate, maximumDate]);

  const days = React.useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    switch (daysInMonth) {
      case 28: return DAYS_28;
      case 29: return DAYS_29;
      case 30: return DAYS_30;
      case 31: return DAYS_31;
      default: return Array.from({ length: daysInMonth }, (_, i) => i + 1);
    }
  }, [selectedYear, selectedMonth]);

  const yearFlatListRef = useRef<FlatList>(null);
  const monthFlatListRef = useRef<FlatList>(null);
  const dayFlatListRef = useRef<FlatList>(null);

  const activeScrollRef = useRef<string | null>(null);

  useEffect(() => {
    if (activeScrollRef.current === 'year') return;

    const yearIndex = years.indexOf(selectedYear);
    if (yearIndex >= 0 && yearFlatListRef.current) {
      requestAnimationFrame(() => {
        yearFlatListRef.current?.scrollToOffset({
          offset: yearIndex * ITEM_HEIGHT,
          animated: false
        });
      });
    }
  }, [selectedYear, years]);

  useEffect(() => {
    if (activeScrollRef.current === 'month') return;

    if (monthFlatListRef.current) {
      requestAnimationFrame(() => {
        monthFlatListRef.current?.scrollToOffset({
          offset: (selectedMonth - 1) * ITEM_HEIGHT,
          animated: false
        });
      });
    }
  }, [selectedMonth]);

  useEffect(() => {
    if (activeScrollRef.current === 'day') return;

    if (dayFlatListRef.current) {
      requestAnimationFrame(() => {
        dayFlatListRef.current?.scrollToOffset({
          offset: (selectedDay - 1) * ITEM_HEIGHT,
          animated: false
        });
      });
    }
  }, [selectedDay]);

  const handleScrollBeginDrag = (type: 'year' | 'month' | 'day') => {
    activeScrollRef.current = type;
  };

  const handleYearScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    activeScrollRef.current = null;
    const contentOffsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(contentOffsetY / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(index, years.length - 1));
    const newYear = years[clampedIndex];

    if (newYear !== selectedYear) {
      // 检查是否是2月且日期超出范围
      if (selectedMonth === 2 && selectedDay > 28) {
        const isLeapYear = newYear % 4 === 0 && (newYear % 100 !== 0 || newYear % 400 === 0);
        const maxDay = isLeapYear ? 29 : 28;
        const safeDay = Math.min(selectedDay, maxDay);
        onDateChange(new Date(newYear, selectedMonth - 1, safeDay));
      } else {
        const newDate = new Date(newYear, selectedMonth - 1, selectedDay);
        if (newDate.getMonth() === selectedMonth - 1) {
          onDateChange(newDate);
        } else {
          const lastDay = new Date(newYear, selectedMonth, 0).getDate();
          onDateChange(new Date(newYear, selectedMonth - 1, lastDay));
        }
      }
    }
  };

  const handleMonthScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    activeScrollRef.current = null;
    const contentOffsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(contentOffsetY / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(index, MONTHS.length - 1));
    const newMonth = MONTHS[clampedIndex];

    if (newMonth !== selectedMonth) {
      // 特殊处理2月
      if (newMonth === 2 && selectedDay > 28) {
        const isLeapYear = selectedYear % 4 === 0 && (selectedYear % 100 !== 0 || selectedYear % 400 === 0);
        const maxDay = isLeapYear ? 29 : 28;
        const safeDay = Math.min(selectedDay, maxDay);
        onDateChange(new Date(selectedYear, newMonth - 1, safeDay));
      } else {
        const newDate = new Date(selectedYear, newMonth - 1, selectedDay);
        if (newDate.getMonth() === newMonth - 1) {
          onDateChange(newDate);
        } else {
          const lastDay = new Date(selectedYear, newMonth, 0).getDate();
          onDateChange(new Date(selectedYear, newMonth - 1, lastDay));
        }
      }
    }
  };

  const handleDayScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    activeScrollRef.current = null;
    const contentOffsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(contentOffsetY / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(index, days.length - 1));
    const newDay = days[clampedIndex];

    if (newDay !== selectedDay) {
      const newDate = new Date(selectedYear, selectedMonth - 1, newDay);
      onDateChange(newDate);
    }
  };

  const renderYearItem = React.useCallback(({ item: year }: { item: number }) => {
    return (
      <YearItem year={year} isSelected={year === selectedYear} styles={styles} />
    );
  }, [selectedYear, styles]);

  const renderMonthItem = React.useCallback(({ item: month }: { item: number }) => {
    return (
      <MonthItem month={month} isSelected={month === selectedMonth} styles={styles} />
    );
  }, [selectedMonth, styles]);

  const renderDayItem = React.useCallback(({ item: day }: { item: number }) => {
    return (
      <DayItem day={day} isSelected={day === selectedDay} styles={styles} />
    );
  }, [selectedDay, styles]);

  return (
    <View style={styles.container}>
      <View style={styles.centerLine} />

      <View style={styles.labelsRow}>
        <View style={styles.labelContainer}><Text style={styles.label}>{t('datePicker.year')}</Text></View>
        <View style={styles.labelContainer}><Text style={styles.label}>{t('datePicker.month')}</Text></View>
        <View style={styles.labelContainer}><Text style={styles.label}>{t('datePicker.day')}</Text></View>
      </View>

      <View style={styles.pickersRow}>
        <View style={styles.pickerColumn}>
          <FlatList
            ref={yearFlatListRef}
            data={years}
            keyExtractor={(item) => `year_${item}`}
            style={styles.pickerList}
            contentContainerStyle={styles.pickerContentContainer}
            showsVerticalScrollIndicator={false}
            snapToInterval={ITEM_HEIGHT}
            decelerationRate="fast"
            onScrollBeginDrag={() => handleScrollBeginDrag('year')}
            onMomentumScrollEnd={handleYearScrollEnd}
            getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
            renderItem={renderYearItem}
            removeClippedSubviews={true}
            maxToRenderPerBatch={3}
            windowSize={2}
            initialNumToRender={3}
            extraData={selectedYear}
          />
        </View>

        <View style={styles.pickerColumn}>
          <FlatList
            ref={monthFlatListRef}
            data={MONTHS}
            keyExtractor={(item) => `month_${item}`}
            style={styles.pickerList}
            contentContainerStyle={styles.pickerContentContainer}
            showsVerticalScrollIndicator={false}
            snapToInterval={ITEM_HEIGHT}
            decelerationRate="fast"
            onScrollBeginDrag={() => handleScrollBeginDrag('month')}
            onMomentumScrollEnd={handleMonthScrollEnd}
            getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
            renderItem={renderMonthItem}
            removeClippedSubviews={true}
            maxToRenderPerBatch={3}
            windowSize={2}
            initialNumToRender={3}
            extraData={selectedMonth}
          />
        </View>

        <View style={styles.pickerColumn}>
          <FlatList
            ref={dayFlatListRef}
            data={days}
            keyExtractor={(item) => `day_${item}`}
            style={styles.pickerList}
            contentContainerStyle={styles.pickerContentContainer}
            showsVerticalScrollIndicator={false}
            snapToInterval={ITEM_HEIGHT}
            decelerationRate="fast"
            onScrollBeginDrag={() => handleScrollBeginDrag('day')}
            onMomentumScrollEnd={handleDayScrollEnd}
            getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
            renderItem={renderDayItem}
            removeClippedSubviews={true}
            maxToRenderPerBatch={3}
            windowSize={2}
            initialNumToRender={3}
            extraData={selectedDay}
          />
        </View>
      </View>
    </View>
  );
}

// 核心优化：自定义 areEqual 函数
// 只有当 item 的选中状态发生改变时，才允许重新渲染
const YearItem = ({ year, isSelected, styles }: {
  year: number;
  isSelected: boolean;
  styles: any;
}) => (
  <View style={styles.pickerItem}>
    <Text style={isSelected ? styles.pickerItemTextSelected : styles.pickerItemText}>
      {year}
    </Text>
  </View>
);

const MonthItem = ({ month, isSelected, styles }: {
  month: number;
  isSelected: boolean;
  styles: any;
}) => (
  <View style={styles.pickerItem}>
    <Text style={isSelected ? styles.pickerItemTextSelected : styles.pickerItemText}>
      {month}
    </Text>
  </View>
);

const DayItem = ({ day, isSelected, styles }: {
  day: number;
  isSelected: boolean;
  styles: any;
}) => (
  <View style={styles.pickerItem}>
    <Text style={isSelected ? styles.pickerItemTextSelected : styles.pickerItemText}>
      {day}
    </Text>
  </View>
);

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    height: PICKER_HEIGHT + 40,
    position: 'relative',
  },
  centerLine: {
    position: 'absolute',
    top: PICKER_HEIGHT / 2 - ITEM_HEIGHT / 2 + 40,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border.light,
    backgroundColor: theme.colors.primary + '08',
    zIndex: 1,
    pointerEvents: 'none', // 确保不拦截点击
  },
  labelsRow: {
    flexDirection: 'row',
    height: 40,
    alignItems: 'center',
  },
  labelContainer: {
    flex: 1,
    alignItems: 'center',
  },
  label: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  pickersRow: {
    flexDirection: 'row',
    height: PICKER_HEIGHT,
  },
  pickerColumn: {
    flex: 1,
    alignItems: 'center',
  },
  pickerList: {
    height: PICKER_HEIGHT,
    width: '100%',
  },
  pickerContentContainer: {
    paddingVertical: PICKER_HEIGHT / 2 - ITEM_HEIGHT / 2,
  },
  pickerItem: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  pickerItemText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.primary,
  },
  pickerItemTextSelected: {
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.semibold,
    fontSize: theme.typography.fontSize.lg, // 选中稍微大一点
  },
});
