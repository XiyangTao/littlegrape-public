import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeProvider';
import AppIcon from '@/components/Icon';
import { LoadingView } from '@/components/common';
import type { LocalWord } from '@/types/word';
import { formatDateDisplay } from '@/utils/dateUtils';
import { createStyles } from './styles';
import { useStudyStats } from './useStudyStats';

export default function StudyStatsScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const {
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
  } = useStudyStats();

  const renderWordChips = (words: LocalWord[]) => {
    if (words.length === 0) {
      return <Text style={styles.emptyHint}>{t('studyStats.noRecords')}</Text>;
    }
    // 限制显示数量，大约 4 行（每行约 4-5 个单词）
    const MAX_DISPLAY = 16;
    const displayWords = words.slice(0, MAX_DISPLAY);
    const hasMore = words.length > MAX_DISPLAY;
    const moreCount = words.length - MAX_DISPLAY;

    return (
      <View style={styles.chipsWrap}>
        {displayWords.map(word => (
          <View key={word.id} style={styles.chip}>
            <Text style={styles.chipText}>{word.word}</Text>
          </View>
        ))}
        {hasMore && (
          <View style={styles.chipMore}>
            <Text style={styles.chipMoreText}>+{moreCount} ...</Text>
          </View>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'bottom']}>
        <LoadingView />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* 导航栏 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <AppIcon name="chevron-left" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.studyStats')}</Text>
        <View style={styles.headerButtonRight} />
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>

      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{t('studyStats.heatmapTitle')}</Text>
        </View>
        <Text style={styles.sectionDesc}>{t('studyStats.heatmapDesc')}</Text>
      </View>

      <View style={styles.yearSelectorRow}>
        {availableYears.map((year) => (
          <TouchableOpacity
            key={year}
            style={[styles.yearButton, selectedYear === year && styles.yearButtonActive]}
            onPress={() => setSelectedYear(year)}
          >
            <Text style={[styles.yearText, selectedYear === year && styles.yearTextActive]}>{year}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.heatmapCard}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.heatmapScrollContent}>
            <View style={styles.monthRow}>
              {monthLabels.map((m, idx) => (
                <Text key={idx} style={[styles.monthLabel, { left: m.left }]}>{m.label}</Text>
              ))}
            </View>
            <View style={styles.heatmapGrid}>
              {heatmapData.map((week, index) => (
                <View key={`week-${index}`} style={styles.weekColumn}>
                  {week.map((day, row) => (
                    <TouchableOpacity
                      key={`day-${index}-${row}`}
                      activeOpacity={0.7}
                      onPress={() => day?.date && openDayDetail(day.date)}
                    >
                      <View
                        style={[
                          styles.dayCell,
                          { backgroundColor: getLevelColor(day?.count || 0, theme) },
                        ]}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
        <View style={styles.legendRow}>
          <Text style={styles.legendText}>{t('profile.statsLess')}</Text>
          <View style={styles.legendDots}>
            {[0, 2, 4, 7, 9].map((count, idx) => (
              <View key={idx} style={[styles.legendDot, { backgroundColor: getLevelColor(count, theme) }]} />
            ))}
          </View>
          <Text style={styles.legendText}>{t('profile.statsMore')}</Text>
        </View>
      </View>

      <View style={{ height: 32 }} />
      </ScrollView>

      <Modal visible={isDetailVisible} transparent animationType="slide" onRequestClose={closeDayDetail}>
        <View style={styles.detailOverlay}>
          <View style={styles.detailSheet}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailTitle}>
                {selectedDate ? formatDateDisplay(selectedDate) : ''}
              </Text>
              <TouchableOpacity onPress={closeDayDetail}>
                <AppIcon name="close" size={20} color={theme.colors.text.secondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.detailSubtitle}>{t('studyStats.detailSubtitle', { learned: selectedLearned.length, mastered: selectedMastered.length })}</Text>
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>{t('studyStats.newWords')}</Text>
              {renderWordChips(selectedLearned)}
            </View>
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>{t('studyStats.masteredWords')}</Text>
              {renderWordChips(selectedMastered)}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
