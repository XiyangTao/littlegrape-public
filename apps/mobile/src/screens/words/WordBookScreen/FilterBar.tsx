import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useI18n } from '@/context/I18nProvider';
import { FILTERS, type FilterType } from './useWordBook';

// 字母表
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

interface FilterBarProps {
  // 字母导航
  selectedLetter: string | null;
  letterCounts: Map<string, number>;
  onLetterPress: (letter: string) => void;
  letterScrollRef: React.RefObject<ScrollView | null>;
  themeColor: string;
  // 当前字母信息
  currentLetterCount: number;
  searchText: string;
  // 过滤标签
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  styles: any;
}

const FilterBar = React.memo(({
  selectedLetter,
  letterCounts,
  onLetterPress,
  letterScrollRef,
  themeColor,
  currentLetterCount,
  searchText,
  activeFilter,
  onFilterChange,
  styles,
}: FilterBarProps) => {
  const { t } = useI18n();
  return (
    <>
      {/* 字母导航栏 */}
      <View style={styles.letterNavContainer}>
        <ScrollView
          ref={letterScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.letterNavContent}
        >
          {ALPHABET.map((letter) => {
            const count = letterCounts.get(letter) || 0;
            const isSelected = selectedLetter === letter;
            const hasWords = count > 0;

            return (
              <TouchableOpacity
                key={letter}
                style={[
                  styles.letterNavItem,
                  isSelected && { backgroundColor: themeColor },
                  !hasWords && styles.letterNavItemDisabled,
                ]}
                onPress={() => onLetterPress(letter)}
                disabled={!hasWords}
              >
                <Text
                  style={[
                    styles.letterNavText,
                    isSelected && styles.letterNavTextSelected,
                    !hasWords && styles.letterNavTextDisabled,
                  ]}
                >
                  {letter}
                </Text>
                {hasWords && (
                  <Text
                    style={[
                      styles.letterNavCount,
                      isSelected && styles.letterNavCountSelected,
                    ]}
                  >
                    {count}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 当前字母信息 */}
      <View style={styles.letterInfoContainer}>
        <Text style={[styles.letterInfoText, { color: themeColor }]}>
          {selectedLetter === null ? t('wordBook.allWords') : t('wordBook.letterPrefix', { letter: selectedLetter })}
        </Text>
        <Text style={styles.letterInfoCount}>
          {searchText.trim()
            ? selectedLetter === null
              ? t('wordBook.searchMatchAll', { text: searchText, count: currentLetterCount })
              : t('wordBook.searchMatchLetter', { letter: selectedLetter, text: searchText, count: currentLetterCount })
            : t('wordBook.totalCount', { count: currentLetterCount })
          }
        </Text>
      </View>

      {/* 过滤标签 */}
      <View style={styles.filterContainer}>
        {FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterTab,
              activeFilter === filter.key && [styles.filterTabActive, { backgroundColor: themeColor }],
            ]}
            onPress={() => onFilterChange(filter.key)}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilter === filter.key && styles.filterTabTextActive,
              ]}
            >
              {t(`wordBook.filter.${filter.key}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );
});

export default FilterBar;
