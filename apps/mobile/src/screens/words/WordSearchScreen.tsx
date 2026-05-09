import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  FlatList,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import { useAuth } from '@/stores/AuthStore';
import Icon from '@/components/Icon';
import type { LocalWord, LocalProgress } from '@/types/word';
import { searchAllWords, getWordProgressBatch } from '@/services/WordService';
import WordDetailSheet from '@/components/WordDetailSheet';

interface WordWithProgress extends LocalWord {
  progress?: LocalProgress | null;
}

export default function WordSearchScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const styles = createStyles(theme);
  const searchInputRef = useRef<TextInput>(null);

  const [searchText, setSearchText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [words, setWords] = useState<WordWithProgress[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // 单词详情
  const [selectedWord, setSelectedWord] = useState<WordWithProgress | null>(null);
  const [showWordDetail, setShowWordDetail] = useState(false);

  // 自动聚焦搜索框
  useEffect(() => {
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  }, []);

  // 搜索单词
  const handleSearch = useCallback(async (text: string) => {
    if (!user?.id) return;

    const trimmed = text.trim();
    if (!trimmed) {
      setWords([]);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);

    try {
      // 搜索所有词库中的单词
      const results = await searchAllWords(trimmed, 50);

      // 获取学习进度
      const wordIds = results.map(w => w.id);
      const progressMap = await getWordProgressBatch(user.id, wordIds);

      // 组合数据
      const wordsWithProgress: WordWithProgress[] = results.map(word => ({
        ...word,
        progress: progressMap.get(word.id) || null,
      }));

      setWords(wordsWithProgress);
    } catch (error) {
      console.error('搜索失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // 防抖搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(searchText);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchText, handleSearch]);

  // 获取状态颜色
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'learned': return theme.colors.warning;
      case 'mastered': return theme.colors.success;
      default: return theme.colors.text.disabled;
    }
  };

  // 获取状态文本
  const getStatusText = (status?: string) => {
    switch (status) {
      case 'learned': return t('words.learningStatus');
      case 'mastered': return t('words.masteredStatus');
      default: return t('wordSearch.statusNew');
    }
  };

  // 渲染单词项
  const renderWordItem = useCallback(({ item }: { item: WordWithProgress }) => {
    const status = item.progress?.status || 'new';
    const statusColor = getStatusColor(status);

    return (
      <TouchableOpacity
        style={styles.wordItem}
        activeOpacity={0.7}
        onPress={() => {
          Keyboard.dismiss();
          setSelectedWord(item);
          setShowWordDetail(true);
        }}
      >
        <View style={styles.wordItemLeft}>
          <Text style={styles.wordItemText} numberOfLines={1}>
            {item.word}
          </Text>
          <Text style={styles.wordItemMeaning} numberOfLines={2}>
            {item.pos && <Text style={styles.wordPos}>{item.pos} </Text>}
            {item.meaningCn}
          </Text>
        </View>

        <View style={styles.wordItemRight}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {getStatusText(status)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [styles, theme]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 顶部搜索栏 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>

        <View style={styles.searchInputWrapper}>
          <Icon name="search" size={20} color={theme.colors.text.tertiary} />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder={t('wordSearch.searchPlaceholder')}
            placeholderTextColor={theme.colors.text.tertiary}
            value={searchText}
            onChangeText={setSearchText}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Icon name="close" size={18} color={theme.colors.text.tertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 搜索结果 */}
      <View style={styles.content}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : hasSearched && words.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="search-off" size={48} color={theme.colors.text.disabled} />
            <Text style={styles.emptyText}>{t('wordSearch.noResult')}</Text>
          </View>
        ) : !hasSearched ? (
          <View style={styles.emptyContainer}>
            <Icon name="search" size={48} color={theme.colors.text.disabled} />
            <Text style={styles.emptyText}>{t('wordSearch.hint')}</Text>
          </View>
        ) : (
          <FlatList
            data={words}
            keyExtractor={(item) => item.id}
            renderItem={renderWordItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        )}
      </View>

      {/* 单词详情 */}
      <WordDetailSheet
        visible={showWordDetail}
        word={selectedWord}
        progress={selectedWord?.progress}
        onClose={() => {
          setShowWordDetail(false);
          setSelectedWord(null);
        }}
      />
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },

  // 顶部
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.spacing.borderRadius.base,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text.primary,
  },

  // 内容
  content: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },

  // 单词项
  wordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.spacing.borderRadius.base,
    padding: 12,
    marginBottom: 8,
  },
  wordItemLeft: {
    flex: 1,
    marginRight: 12,
  },
  wordItemText: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  wordItemMeaning: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    lineHeight: 20,
  },
  wordPos: {
    color: theme.colors.primary,
    fontWeight: '500',
  },
  wordItemRight: {
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.spacing.borderRadius.sm,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // 加载状态
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // 空状态
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.text.disabled,
    marginTop: 16,
  },
});
