import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import Icon, { IconNames } from '@/components/Icon';
import { DIFFICULTY_COLORS } from '@/constants/colors';
import { getLocalDateString } from '@/utils/dateUtils';
import { createStyles } from './styles';
import { useReadingList, MonthSection, MonthInfo } from './useReadingList';
import type { ArticleSummary, ReadingProgress } from '@/api/modules/reading';

const LEVEL_LABELS: Record<string, { 'zh-CN': string; en: string }> = {
  beginner: { 'zh-CN': '初级', en: 'Beginner' },
  intermediate: { 'zh-CN': '中级', en: 'Intermediate' },
  advanced: { 'zh-CN': '高级', en: 'Advanced' },
};

const CATEGORY_KEYS: Record<string, string> = {
  science: 'intensiveReading.categoryScience',
  culture: 'intensiveReading.categoryCulture',
  travel: 'intensiveReading.categoryTravel',
  food: 'intensiveReading.categoryFood',
  health: 'intensiveReading.categoryHealth',
  education: 'intensiveReading.categoryEducation',
  general: 'intensiveReading.categoryGeneral',
};

const MONTH_NAMES_ZH = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
const MONTH_NAMES_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const TOTAL_STEPS = 3;
const READING_WPM = 60;

export default function ReadingListScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const { t, effectiveLanguage } = useI18n();
  const styles = createStyles(theme);
  const lang = effectiveLanguage === 'zh-CN' ? 'zh-CN' : 'en';

  const {
    selectedLevel, setSelectedLevel,
    selectedCategory, setSelectedCategory,
    selectedMonth, setSelectedMonth,
    levels, categories, monthsData,
    flatData,
    isLoading,
    isFetchingMore,
    hasMore,
    loadMore,
    handleArticlePress,
  } = useReadingList();

  const [showMonthPicker, setShowMonthPicker] = useState(false);

  // ==================== 工具函数 ====================

  const getLevelLabel = (level: string) =>
    LEVEL_LABELS[level]?.[lang] || level;

  const getCategoryLabel = (category: string) =>
    CATEGORY_KEYS[category] ? t(CATEGORY_KEYS[category]) : category;

  const formatDate = (dateStr: string | null, createdAt: string) => {
    const ymd = dateStr ?? getLocalDateString(new Date(createdAt).getTime());
    const [, m, d] = ymd.split('-').map(Number);
    return lang === 'zh-CN' ? `${m}月${d}日` : `${MONTH_NAMES_EN[m - 1]} ${d}`;
  };

  const formatMonthTitle = (year: number, month: number) => {
    if (lang === 'zh-CN') return `${year}年${month}月`;
    const monthName = new Date(year, month - 1).toLocaleString('en', { month: 'long' });
    return `${monthName} ${year}`;
  };

  const getReadTime = (wordCount: number) => {
    const min = Math.max(1, Math.ceil(wordCount / READING_WPM));
    return t('reading.readTimeValue', { min });
  };

  /** 统计当前筛选后的文章总数 */
  const articleCount = useMemo(() =>
    flatData.filter(item => item.type === 'article' || item.type === 'featured').length,
    [flatData]
  );

  // ==================== 年月选择器数据 ====================

  const monthCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of monthsData) {
      map.set(m.month, m.count);
    }
    return map;
  }, [monthsData]);

  const yearMonthMap = useMemo(() => {
    const map = new Map<number, Set<number>>();
    for (const m of monthsData) {
      const [y, mo] = m.month.split('-').map(Number);
      if (!map.has(y)) map.set(y, new Set());
      map.get(y)!.add(mo);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([year, monthSet]) => ({ year, months: monthSet }));
  }, [monthsData]);

  const dateButtonLabel = useMemo(() => {
    if (!selectedMonth) return t('reading.allTime');
    const [y, m] = selectedMonth.split('-').map(Number);
    if (lang === 'zh-CN') return `${y}年${m}月`;
    return `${MONTH_NAMES_EN[m - 1]} ${y}`;
  }, [selectedMonth, lang]);

  const currentYearMonth = useMemo(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }, []);

  const handleSelectMonth = (year: number, month: number) => {
    const key = `${year}-${String(month).padStart(2, '0')}`;
    setSelectedMonth(key);
    setShowMonthPicker(false);
  };

  const handleSelectAll = () => {
    setSelectedMonth('');
    setShowMonthPicker(false);
  };

  const openMonthPicker = () => {
    setShowMonthPicker(true);
  };

  // ==================== 筛选区 ====================

  const renderFilters = () => (
    <View style={styles.filterSection}>
      {/* Row 1: 难度级别 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterLevelRow}
      >
        {levels.map((level) => {
          const isActive = selectedLevel === level;
          return (
            <TouchableOpacity
              key={level || 'all'}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setSelectedLevel(level)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                {level ? getLevelLabel(level) : t('reading.allLevels')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Row 2: 分类 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScrollContent}
      >
        {categories.map((cat) => {
          const isActive = selectedCategory === cat;
          return (
            <TouchableOpacity
              key={cat || 'all'}
              style={[styles.categoryChip, isActive && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(cat)}
              activeOpacity={0.7}
            >
              <Text style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}>
                {cat ? getCategoryLabel(cat) : t('reading.allCategories')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  // ==================== 年月选择器弹窗（垂直布局） ====================

  const renderMonthPicker = () => {
    const monthNames = lang === 'zh-CN' ? MONTH_NAMES_ZH : MONTH_NAMES_EN;

    return (
      <Modal
        visible={showMonthPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMonthPicker(false)}
      >
        <Pressable style={styles.pickerOverlay} onPress={() => setShowMonthPicker(false)}>
          <Pressable style={styles.pickerSheet} onPress={() => {}}>
            <View style={styles.pickerHandle} />

            {/* 标题行 */}
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>
                {t('reading.selectDate')}
              </Text>
              <TouchableOpacity onPress={() => setShowMonthPicker(false)} activeOpacity={0.7}>
                <Icon name="close" size={20} color={theme.colors.text.tertiary} />
              </TouchableOpacity>
            </View>

            {/* "全部时间"行 */}
            <TouchableOpacity
              style={[styles.pickerAllRow, selectedMonth === '' && styles.pickerAllRowActive]}
              onPress={handleSelectAll}
              activeOpacity={0.7}
            >
              <Text style={[styles.pickerAllText, selectedMonth === '' && styles.pickerAllTextActive]}>
                {t('reading.allTime')}
              </Text>
              {selectedMonth === '' && (
                <Icon name="check" size={16} color={theme.colors.primary} />
              )}
            </TouchableOpacity>

            {/* 按年份纵向排列 */}
            <ScrollView showsVerticalScrollIndicator={false}>
              {yearMonthMap.map(({ year, months: availableMonths }) => (
                <View key={year}>
                  {/* 年份标题 */}
                  <View style={styles.pickerYearHeader}>
                    <View style={styles.pickerYearBar} />
                    <Text style={styles.pickerYearTitle}>{year}</Text>
                  </View>

                  {/* 月份网格 */}
                  <View style={styles.pickerMonthGrid}>
                    {monthNames.map((name, i) => {
                      const monthNum = i + 1;
                      const isAvailable = availableMonths.has(monthNum);
                      const monthKey = `${year}-${String(monthNum).padStart(2, '0')}`;
                      const isSelected = selectedMonth === monthKey;
                      const isCurrent = year === currentYearMonth.year && monthNum === currentYearMonth.month;
                      const count = monthCountMap.get(monthKey) || 0;

                      return (
                        <TouchableOpacity
                          key={monthNum}
                          style={[
                            styles.pickerMonthCell,
                            isSelected && styles.pickerMonthCellSelected,
                            isCurrent && !isSelected && styles.pickerMonthCellCurrent,
                            !isAvailable && styles.pickerMonthCellDisabled,
                          ]}
                          onPress={() => isAvailable && handleSelectMonth(year, monthNum)}
                          disabled={!isAvailable}
                          activeOpacity={0.7}
                        >
                          <Text style={[
                            styles.pickerMonthName,
                            isSelected && styles.pickerMonthNameSelected,
                            !isAvailable && styles.pickerMonthNameDisabled,
                          ]}>
                            {name}
                          </Text>
                          {isAvailable && count > 0 && (
                            <Text style={[
                              styles.pickerMonthCount,
                              isSelected && styles.pickerMonthCountSelected,
                            ]}>
                              {t('reading.articleCount', { count })}
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    );
  };

  // ==================== 月份分组标题 ====================

  const renderSectionHeader = (section: MonthSection) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionBar} />
      <Text style={styles.sectionTitle}>
        {formatMonthTitle(section.year, section.month)}
      </Text>
      <View style={styles.sectionLine} />
      <Text style={styles.sectionCount}>
        {t('reading.articleCount', { count: section.data.length })}
      </Text>
    </View>
  );

  // ==================== 进度状态 ====================

  const renderProgress = (progress: ReadingProgress | null) => {
    if (!progress) return null;

    // 已完成状态在 renderArticleCard 中单独处理底部
    if (progress.status === 'completed') return null;

    if (progress.currentStep > 0) {
      const pct = Math.round((progress.currentStep / TOTAL_STEPS) * 100);
      return (
        <View style={styles.progressBarWrap}>
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${pct}%` }]} />
          </View>
          <Text style={styles.progressBarText}>{pct}%</Text>
        </View>
      );
    }

    return null;
  };

  /** 根据分数获取完成状态配置 */
  const getCompletedStatus = (score: number) => {
    if (score >= 80) {
      return { color: theme.colors.success, label: t('reading.completed') };
    }
    if (score >= 60) {
      return { color: theme.colors.warning, label: t('reading.completed') };
    }
    return { color: theme.colors.error, label: t('reading.needsReview') };
  };

  /** 封面图下方的完成角标 */
  const renderCompletedBadge = (progress: ReadingProgress) => {
    const score = progress.quizScore ?? 0;
    const { color, label } = getCompletedStatus(score);
    return (
      <View style={[styles.completedBadge, { backgroundColor: color + '15' }]}>
        <Icon name={IconNames.check} size={10} color={color} />
        <Text style={[styles.completedBadgeText, { color }]}>
          {label} {t('reading.scoreSuffix', { score })}
        </Text>
      </View>
    );
  };

  // ==================== 今日精选卡片 ====================

  const renderFeaturedCard = (article: ArticleSummary & { progress: ReadingProgress | null }) => {
    const levelColor = DIFFICULTY_COLORS[article.level] || theme.colors.primary;

    return (
      <TouchableOpacity
        style={styles.featuredCard}
        onPress={() => handleArticlePress(article)}
        activeOpacity={0.8}
      >
        {/* 大图区域 + 渐变遮罩 + 标题叠加 */}
        <View style={styles.featuredImageWrap}>
          {article.imageUrl ? (
            <Image source={{ uri: article.imageUrl }} style={styles.featuredImage} resizeMode="cover" />
          ) : (
            <View style={styles.featuredImageFallback}>
              <Icon name="menu-book" size={48} color={theme.colors.text.disabled} />
            </View>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.featuredGradient}
          >
            <View style={styles.featuredBadge}>
              <Icon name="auto-awesome" size={12} color={theme.colors.text.inverse} />
              <Text style={styles.featuredBadgeText}>
                {t('reading.todayPick')}
              </Text>
            </View>
            <Text style={styles.featuredTitleOnImage} numberOfLines={2}>
              {article.title}
            </Text>
          </LinearGradient>
        </View>

        {/* 底部信息 */}
        <View style={styles.featuredContent}>
          {article.titleZh && (
            <Text style={styles.featuredTitleZh} numberOfLines={1}>{article.titleZh}</Text>
          )}
          <View style={styles.featuredMeta}>
            <View style={[styles.levelBadge, { backgroundColor: levelColor + '15' }]}>
              <Text style={[styles.levelText, { color: levelColor }]}>
                {getLevelLabel(article.level)}
              </Text>
            </View>
            <View style={styles.featuredMetaDivider} />
            <View style={styles.featuredMetaItem}>
              <Icon name="schedule" size={12} color={theme.colors.text.tertiary} />
              <Text style={styles.featuredMetaText}>{getReadTime(article.wordCount)}</Text>
            </View>
            <View style={styles.featuredMetaDivider} />
            <Text style={styles.featuredMetaText}>{getCategoryLabel(article.category)}</Text>
            {article.source && (
              <>
                <View style={styles.featuredMetaDivider} />
                <Text style={styles.featuredMetaText}>{article.source}</Text>
              </>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ==================== 普通文章卡片 ====================

  const renderArticleCard = (article: ArticleSummary & { progress: ReadingProgress | null }) => {
    const levelColor = DIFFICULTY_COLORS[article.level] || theme.colors.primary;
    const isCompleted = article.progress?.status === 'completed';

    return (
      <TouchableOpacity
        style={styles.articleCard}
        onPress={() => handleArticlePress(article)}
        activeOpacity={0.7}
      >
        {/* 封面图 + 完成标签 */}
        <View>
          <View style={styles.articleImageWrap}>
            {article.imageUrl ? (
              <Image source={{ uri: article.imageUrl }} style={styles.articleImage} resizeMode="cover" />
            ) : (
              <View style={styles.articleImageFallback}>
                <Icon name="menu-book" size={28} color={theme.colors.text.disabled} />
              </View>
            )}
          </View>
          {isCompleted && article.progress && renderCompletedBadge(article.progress)}
        </View>

        {/* 内容 */}
        <View style={styles.articleContent}>
          <Text style={styles.articleTitle} numberOfLines={2}>
            {article.title}
          </Text>
          {article.titleZh && (
            <Text style={styles.articleTitleZh} numberOfLines={1}>
              {article.titleZh}
            </Text>
          )}

          <View style={styles.articleMeta}>
            <Text style={styles.metaText}>
              {formatDate(article.publishDate, article.createdAt)}
            </Text>
            <View style={styles.metaDivider} />
            <View style={[styles.levelBadge, { backgroundColor: levelColor + '15' }]}>
              <Text style={[styles.levelText, { color: levelColor }]}>
                {getLevelLabel(article.level)}
              </Text>
            </View>
            <View style={styles.metaDivider} />
            <Text style={styles.metaText}>{getCategoryLabel(article.category)}</Text>
          </View>

          <View style={styles.articleBottom}>
            <View style={styles.articleBottomLeft}>
              <View style={styles.readTimeWrap}>
                <Icon name="schedule" size={10} color={theme.colors.text.disabled} />
                <Text style={styles.readTimeText}>{getReadTime(article.wordCount)}</Text>
              </View>
              <Text style={styles.wordCount}>
                {article.wordCount} {t('reading.words')}
              </Text>
              {article.source && (
                <Text style={styles.sourceText} numberOfLines={1}>{article.source}</Text>
              )}
            </View>
            {renderProgress(article.progress)}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ==================== FlatList ====================

  const renderItem = useCallback(({ item }: { item: (typeof flatData)[number] }) => {
    if (item.type === 'featured') {
      return renderFeaturedCard(item.article);
    }
    if (item.type === 'header') {
      return renderSectionHeader(item.section);
    }
    return renderArticleCard(item.article);
  }, [lang, selectedLevel, selectedCategory, selectedMonth, theme]);

  const renderListHeader = () => {
    if (isLoading || flatData.length === 0) return null;
    const hasFilter = selectedLevel || selectedCategory || selectedMonth;
    if (!hasFilter) return null;
    return (
      <View style={styles.resultHint}>
        <Text style={styles.resultHintText}>
          {t('reading.totalArticles', { count: articleCount })}
        </Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (isFetchingMore) {
      return (
        <View style={styles.footerContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      );
    }
    if (!hasMore && flatData.length > 0) {
      return (
        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>{t('reading.noMore')}</Text>
        </View>
      );
    }
    return <View style={{ height: 40 }} />;
  };

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Icon name="menu-book" size={48} color={theme.colors.text.disabled} />
        <Text style={styles.emptyText}>{t('reading.noArticles')}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name={IconNames.left} size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('reading.title')}</Text>
        {monthsData.length > 1 ? (
          <TouchableOpacity
            style={[styles.headerDateButton, selectedMonth !== '' && styles.headerDateButtonActive]}
            onPress={openMonthPicker}
            activeOpacity={0.7}
          >
            <Icon
              name="date-range"
              size={15}
              color={selectedMonth ? theme.colors.primary : theme.colors.text.tertiary}
            />
            <Text
              style={[styles.headerDateText, selectedMonth !== '' && styles.headerDateTextActive]}
              numberOfLines={1}
            >
              {dateButtonLabel}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.backButton} />
        )}
      </View>

      {renderFilters()}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={flatData}
          keyExtractor={(item) =>
            item.type === 'header'
              ? `header-${item.section.year}-${item.section.month}`
              : item.type === 'featured'
                ? `featured-${item.article.id}`
                : `article-${item.article.id}`
          }
          renderItem={renderItem}
          ListHeaderComponent={renderListHeader}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}

      {renderMonthPicker()}
    </SafeAreaView>
  );
}
