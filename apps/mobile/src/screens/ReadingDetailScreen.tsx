import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import { useAuth } from '@/stores/AuthStore';
import { apiClient } from '@/api';
import type { ArticleDetail } from '@/api/modules/reading';
import Icon, { IconNames } from '@/components/Icon';
import { HighlightedText } from '@/components/chat/HighlightedText';
import type { LearnedWord } from '@/components/chat/HighlightedText';
import { getRecentLearnedWords, recordEncounter } from '@/db/word/EncounterDB';

export default function ReadingDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { theme } = useTheme();
  const { t, effectiveLanguage: locale } = useI18n();
  const { user } = useAuth();
  const styles = createStyles(theme);

  const { articleId } = route.params;
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showTranslation, setShowTranslation] = useState(false);
  const [learnedWords, setLearnedWords] = useState<LearnedWord[]>([]);

  useEffect(() => {
    loadArticle();
  }, [articleId]);

  // 加载用户学过的词（用于高亮）
  useEffect(() => {
    const loadLearnedWords = async () => {
      try {
        const userId = user?.id || 'guest';
        const words = await getRecentLearnedWords(userId, 30, 50);
        const now = Date.now();
        setLearnedWords(words.map(w => ({
          wordId: w.wordId,
          word: w.word,
          learnedDaysAgo: Math.max(0, Math.floor((now - w.learnedAt) / (24 * 60 * 60 * 1000))),
        })));
      } catch (e) {
        // 静默失败
      }
    };
    loadLearnedWords();
  }, [user?.id]);

  const loadArticle = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.getArticleDetail(articleId);
      if (res.success) setArticle(res.data);
    } catch (error) {
      console.error('加载文章失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 记录阅读进度
  useEffect(() => {
    if (!article) return;
    apiClient.updateReadingProgress({ articleId, status: 'reading', readTime: 0 }).catch(e => {
      if (__DEV__) console.warn('[ReadingDetail] 记录阅读进度失败:', e);
    });

    const interval = setInterval(() => {
      apiClient.updateReadingProgress({ articleId, readTime: 30 }).catch(e => {
        if (__DEV__) console.warn('[ReadingDetail] 更新阅读时长失败:', e);
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [article]);

  if (isLoading || !article) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name={IconNames.left} size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('reading.reading')}</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const paragraphs = article.content.split('\n\n').filter(p => p.trim());
  const paragraphsZh = article.contentZh?.split('\n\n').filter(p => p.trim()) || [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name={IconNames.left} size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {locale === 'zh-CN' && article.titleZh ? article.titleZh : article.title}
        </Text>
        <TouchableOpacity
          onPress={() => setShowTranslation(!showTranslation)}
          style={styles.toggleButton}
        >
          <Icon
            name="translate"
            size={20}
            color={showTranslation ? theme.colors.primary : theme.colors.text.secondary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 文章标题 */}
        <Text style={styles.articleTitle}>{article.title}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{article.wordCount} {t('reading.words')}</Text>
        </View>

        {/* 逐段展示 */}
        {paragraphs.map((para, index) => (
          <View key={index} style={styles.paragraphSection}>
            {learnedWords.length > 0 ? (
              <HighlightedText
                text={para}
                learnedWords={learnedWords}
                style={styles.paragraphText}
                onWordPress={(word) => {
                  recordEncounter(user?.id || 'guest', word.wordId, 'reading', para).catch(() => {});
                }}
              />
            ) : (
              <Text style={styles.paragraphText}>{para}</Text>
            )}
            {showTranslation && paragraphsZh[index] && (
              <Text style={styles.translationText}>{paragraphsZh[index]}</Text>
            )}
          </View>
        ))}

        {/* 完成按钮 */}
        <TouchableOpacity
          style={styles.completeButton}
          onPress={async () => {
            await apiClient.updateReadingProgress({
              articleId,
              status: 'completed',
            });
            navigation.goBack();
          }}
        >
          <Icon name={IconNames.check} size={20} color={theme.colors.text.inverse} />
          <Text style={styles.completeButtonText}>{t('reading.markComplete')}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background.primary },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: {
    fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary, flex: 1, textAlign: 'center',
  },
  toggleButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, paddingHorizontal: theme.spacing.lg },
  articleTitle: {
    fontSize: theme.typography.fontSize['2xl'], fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary, marginBottom: theme.spacing.sm,
  },
  metaRow: {
    flexDirection: 'row', marginBottom: theme.spacing.lg,
    paddingBottom: theme.spacing.md, borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  metaText: { fontSize: theme.typography.fontSize.xs, color: theme.colors.text.tertiary },
  paragraphSection: { marginBottom: theme.spacing.lg },
  paragraphText: {
    fontSize: theme.typography.fontSize.base, color: theme.colors.text.primary,
    lineHeight: 26,
  },
  translationText: {
    fontSize: theme.typography.fontSize.sm, color: theme.colors.text.secondary,
    lineHeight: 22, marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.primary + '08', padding: theme.spacing.sm,
    borderRadius: theme.spacing.borderRadius.sm, borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  completeButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.colors.success, paddingVertical: theme.spacing.md,
    borderRadius: theme.spacing.borderRadius.md, gap: theme.spacing.sm,
  },
  completeButtonText: {
    fontSize: theme.typography.fontSize.base, fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.inverse,
  },
});
