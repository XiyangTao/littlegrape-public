import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
} from 'react-native';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import Icon, { IconNames } from '@/components/Icon';

type FilterType = 'difficulty' | 'topic' | 'length';

export default function ReadingScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const [searchText, setSearchText] = useState('');
  const styles = createStyles(theme);

  const mockArticles = [
    {
      id: 1,
      title: "The Future of Artificial Intelligence",
      source: "BBC Technology",
      readTime: "5 min",
      difficulty: t('reading.intermediate'),
      topic: t('reading.technology'),
      excerpt: "Artificial intelligence is rapidly transforming our world..."
    },
    {
      id: 2,
      title: "Coffee Culture Around the World",
      source: "Travel Magazine",
      readTime: "3 min",
      difficulty: t('reading.beginner'),
      topic: t('reading.culture'),
      excerpt: "From Italian espresso to Turkish coffee, explore different..."
    },
    {
      id: 3,
      title: "Climate Change and Ocean Life",
      source: "National Geographic",
      readTime: "8 min",
      difficulty: t('reading.advanced'),
      topic: t('reading.environment'),
      excerpt: "Rising sea temperatures are affecting marine ecosystems..."
    }
  ];

  return (
    <View style={styles.container}>
      {/* 搜索和筛选区域 */}
      <View style={styles.headerSection}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder={t('reading.search')}
            placeholderTextColor={theme.colors.text.secondary}
            value={searchText}
            onChangeText={setSearchText}
          />
          <TouchableOpacity style={styles.searchButton}>
            <Icon name={IconNames.search} size={20} color={theme.colors.text.inverse} />
          </TouchableOpacity>
        </View>

        {/* 筛选按钮 */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          <TouchableOpacity style={styles.filterButton}>
            <View style={styles.filterButtonContent}>
              <Icon name="filter-list" size={16} color={theme.colors.text.primary} style={{ marginRight: 4 }} />
              <Text style={styles.filterButtonText}>{t('reading.difficulty')}</Text>
              <Icon name={IconNames.down} size={16} color={theme.colors.text.primary} style={{ marginLeft: 4 }} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterButton}>
            <View style={styles.filterButtonContent}>
              <Icon name="category" size={16} color={theme.colors.text.primary} style={{ marginRight: 4 }} />
              <Text style={styles.filterButtonText}>{t('reading.topic')}</Text>
              <Icon name={IconNames.down} size={16} color={theme.colors.text.primary} style={{ marginLeft: 4 }} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterButton}>
            <View style={styles.filterButtonContent}>
              <Icon name="schedule" size={16} color={theme.colors.text.primary} style={{ marginRight: 4 }} />
              <Text style={styles.filterButtonText}>{t('reading.length')}</Text>
              <Icon name={IconNames.down} size={16} color={theme.colors.text.primary} style={{ marginLeft: 4 }} />
            </View>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* 文章列表 */}
      <ScrollView style={styles.articleList} showsVerticalScrollIndicator={false}>
        {mockArticles.map((article) => (
          <TouchableOpacity key={article.id} style={styles.articleCard}>
            <View style={styles.articleHeader}>
              <View style={styles.articleMeta}>
                <Text style={styles.articleSource}>{article.source}</Text>
                <View style={styles.readTimeContainer}>
                  <Icon name={IconNames.menuBook} size={14} color={theme.colors.text.secondary} style={{ marginRight: 4 }} />
                  <Text style={styles.articleReadTime}>{article.readTime}</Text>
                </View>
              </View>
              <View style={styles.articleTags}>
                <Text style={[styles.difficultyTag,
                  article.difficulty === t('reading.beginner') && styles.easyTag,
                  article.difficulty === t('reading.intermediate') && styles.mediumTag,
                  article.difficulty === t('reading.advanced') && styles.hardTag
                ]}>
                  {article.difficulty}
                </Text>
                <Text style={styles.topicTag}>{article.topic}</Text>
              </View>
            </View>

            <Text style={styles.articleTitle}>{article.title}</Text>
            <Text style={styles.articleExcerpt}>{article.excerpt}</Text>

            <View style={styles.articleActions}>
              <TouchableOpacity style={styles.readButton}>
                <Text style={styles.readButtonText}>{t('reading.startReading')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.bookmarkButton}>
                <Icon name={IconNames.bookmarkBorder} size={24} color={theme.colors.text.secondary} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}

        {/* 加载更多提示 */}
        <TouchableOpacity style={styles.loadMoreButton}>
          <Text style={styles.loadMoreText}>{t('reading.loadMore')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  headerSection: {
    backgroundColor: theme.colors.background.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  searchInput: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.spacing.borderRadius.md,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.primary,
    marginRight: theme.spacing.sm,
  },
  searchButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.spacing.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    fontSize: 18,
  },
  filterContainer: {
    flexDirection: 'row',
  },
  filterButton: {
    backgroundColor: theme.colors.background.secondary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.spacing.borderRadius.md,
    marginRight: theme.spacing.sm,
  },
  filterButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterButtonText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.primary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  articleList: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
  },
  articleCard: {
    backgroundColor: theme.colors.background.secondary,
    padding: theme.spacing.lg,
    borderRadius: theme.spacing.borderRadius.lg,
    marginVertical: theme.spacing.sm,
    elevation: 1,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  articleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  articleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  articleSource: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.secondary,
    marginRight: theme.spacing.md,
  },
  readTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  articleReadTime: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.secondary,
  },
  articleTags: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  difficultyTag: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.spacing.borderRadius.sm,
    color: theme.colors.text.inverse,
  },
  easyTag: {
    backgroundColor: theme.colors.pronunciation.excellent,
  },
  mediumTag: {
    backgroundColor: theme.colors.pronunciation.good,
  },
  hardTag: {
    backgroundColor: theme.colors.pronunciation.poor,
  },
  topicTag: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.spacing.borderRadius.sm,
    backgroundColor: theme.colors.primary,
    color: theme.colors.text.inverse,
  },
  articleTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
    lineHeight: 24,
  },
  articleExcerpt: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    lineHeight: 20,
    marginBottom: theme.spacing.md,
  },
  articleActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  readButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.spacing.borderRadius.md,
  },
  readButtonText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.inverse,
  },
  bookmarkButton: {
    padding: theme.spacing.sm,
  },
  loadMoreButton: {
    backgroundColor: theme.colors.background.secondary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.spacing.borderRadius.md,
    alignItems: 'center',
    marginVertical: theme.spacing.lg,
  },
  loadMoreText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.secondary,
    fontWeight: theme.typography.fontWeight.medium,
  },
});