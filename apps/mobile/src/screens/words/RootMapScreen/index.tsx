/**
 * 词根图鉴页面
 * 2 列网格卡片，展示词根及学习进度
 */
import React from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '@/components/Icon';
import { useTheme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import { useRootMap } from './useRootMap';
import { createStyles } from './styles';
import type { RootEntry } from '@/db/word';

export default function RootMapScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme);

  const {
    isLoading,
    roots,
    progressMap,
    searchQuery,
    setSearchQuery,
    filterMode,
    setFilterMode,
    totalRoots,
    litCount,
    handleRootPress,
    navigation,
  } = useRootMap();

  const renderRootCard = ({ item }: { item: RootEntry }) => {
    const progress = progressMap.get(item.id);
    const learnedCount = progress?.learnedCount || 0;
    const isLit = progress?.isLit || false;
    const progressPercent = item.wordCount > 0 ? learnedCount / item.wordCount : 0;

    return (
      <TouchableOpacity
        style={[styles.rootCard, isLit && styles.rootCardLit]}
        onPress={() => handleRootPress(item)}
        activeOpacity={0.7}
      >
        {isLit && (
          <Icon name="star" size={16} color={theme.colors.warning} style={styles.litIcon} />
        )}
        <Text style={[styles.rootName, isLit && styles.rootNameLit]}>{item.root}</Text>
        {item.rootMeaning && (
          <Text style={styles.rootMeaning} numberOfLines={1}>{item.rootMeaning}</Text>
        )}
        <View style={styles.rootProgressBar}>
          <View style={[styles.rootProgressFill, { width: `${progressPercent * 100}%` }]} />
        </View>
        <Text style={styles.rootCount}>{learnedCount}/{item.wordCount}</Text>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('wordRoot.title')}</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>{t('wordRoot.buildingIndex')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('wordRoot.title')}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <Text style={styles.statsText}>
          {t('wordRoot.statsTotal', { count: totalRoots })}{'  '}{t('wordRoot.statsLit', { count: litCount })}
        </Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color={theme.colors.text.disabled} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t('wordRoot.searchPlaceholder')}
          placeholderTextColor={theme.colors.text.disabled}
        />
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {(['all', 'lit', 'unlit'] as const).map(mode => (
          <TouchableOpacity
            key={mode}
            style={[styles.filterTab, filterMode === mode && styles.filterTabActive]}
            onPress={() => setFilterMode(mode)}
          >
            <Text style={[styles.filterTabText, filterMode === mode && styles.filterTabTextActive]}>
              {mode === 'all' ? t('wordRoot.filterAll') : mode === 'lit' ? t('wordRoot.filterLit') : t('wordRoot.filterUnlit')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Root Grid */}
      <FlatList
        data={roots}
        renderItem={renderRootCard}
        keyExtractor={item => item.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.gridContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t('wordRoot.empty')}</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
