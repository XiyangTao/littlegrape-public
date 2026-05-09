import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import Icon from '@/components/Icon';
import { getAllAvailableLibraries } from '@/services/WordService';
import { setLibrary } from '@/services/LibraryService';
import { useUserStore } from '@/stores';
import { LIBRARY_COLORS, LIBRARY_ICONS, LIBRARY_CATEGORIES } from '@/constants/libraryConfig';
import { getErrorMessage } from '@/utils/errorUtils';

interface LibraryInfo {
  tag: string;
  wordCount: number;
}

export default function LibrarySelectScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const navigation = useNavigation<any>();
  const styles = createStyles(theme);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [availableLibraries, setAvailableLibraries] = useState<LibraryInfo[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // 当前正在使用的词库（从 UserStore 读取）
  const currentTag = useUserStore((state) => state.currentLibraryTag);

  // 加载数据
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);

      const libraries = await getAllAvailableLibraries();
      setAvailableLibraries(libraries);
      setSelectedTag(currentTag);
    } catch (error) {
      console.error('[LibrarySelect] 加载数据失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentTag]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 选择词库（单选）
  const handleSelectLibrary = useCallback((tag: string) => {
    setSelectedTag(tag);
  }, []);

  // 获取标签的单词数量
  const getTagCount = useCallback((tag: string) => {
    const found = availableLibraries.find(lib => lib.tag === tag);
    return found?.wordCount || 0;
  }, [availableLibraries]);

  // 是否有变化
  const hasChanged = selectedTag !== null && selectedTag !== currentTag;

  // 确认选择
  const handleComplete = useCallback(async () => {
    if (!selectedTag) return;

    // 没有变化直接返回
    if (selectedTag === currentTag) {
      navigation.goBack();
      return;
    }

    setIsSaving(true);

    try {
      await setLibrary(selectedTag);
      navigation.goBack();
    } catch (error) {
      Alert.alert(t('librarySelect.operationFailed'), getErrorMessage(error) || t('librarySelect.retryLater'));
      setIsSaving(false);
    }
  }, [selectedTag, currentTag, navigation]);

  // 加载中
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 顶部导航栏 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {currentTag ? t('librarySelect.switchLibrary') : t('librarySelect.selectLibrary')}
        </Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {LIBRARY_CATEGORIES.map((category) => {
          const validTags = category.tags.filter(tag => getTagCount(tag) > 0);
          if (validTags.length === 0) return null;

          return (
            <View key={category.id} style={styles.categorySection}>
              <Text style={styles.categoryTitle}>{category.name}</Text>
              <View style={styles.libraryGrid}>
                {validTags.map((tag) => {
                  const color = LIBRARY_COLORS[tag] || theme.colors.text.tertiary;
                  const icon = LIBRARY_ICONS[tag] || 'menu-book';
                  const count = getTagCount(tag);
                  const isSelected = selectedTag === tag;

                  return (
                    <TouchableOpacity
                      key={tag}
                      style={[
                        styles.libraryCard,
                        isSelected && styles.libraryCardActive,
                        isSelected && { borderColor: color },
                      ]}
                      onPress={() => handleSelectLibrary(tag)}
                      activeOpacity={0.7}
                    >
                      {isSelected && (
                        <View style={[styles.checkBadge, { backgroundColor: color }]}>
                          <Icon name="check" size={12} color={theme.colors.text.inverse} />
                        </View>
                      )}

                      <View style={[styles.libraryIcon, { backgroundColor: color + '20' }]}>
                        <Icon name={icon} size={24} color={color} />
                      </View>
                      <Text style={styles.libraryName}>{tag}</Text>
                      <Text style={styles.libraryCount}>{t('librarySelect.wordCount', { count })}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* 底部确认按钮 */}
      {hasChanged && (
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleComplete}
            activeOpacity={0.8}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={theme.colors.text.inverse} />
            ) : (
              <Text style={styles.confirmButtonText}>
                {currentTag ? t('librarySelect.switchToLibrary') : t('librarySelect.startLearning')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // 头部
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: theme.spacing.borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },

  // 滚动区域
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  // 分类区域
  categorySection: {
    marginBottom: 28,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    marginBottom: 12,
  },
  libraryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  // 词库卡片
  libraryCard: {
    width: '30%',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.spacing.borderRadius.md,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  libraryCardActive: {
    backgroundColor: theme.colors.background.primary,
  },
  libraryIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.spacing.borderRadius.base,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  libraryName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  libraryCount: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },

  // 选中标记
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: theme.spacing.borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // 底部按钮
  bottomContainer: {
    padding: 20,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.light,
  },
  confirmButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: theme.spacing.borderRadius.base,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.inverse,
  },
});
