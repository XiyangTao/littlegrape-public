/**
 * 名著精读 · 按级别看全部（2 列网格）
 * 从 ClassicsHome 的「查看全部」进入；级别由路由参数决定，本页不再提供切换
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useTheme, type Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import Icon, { IconNames } from '@/components/Icon';
import { PremiumBadge } from '@/components/PremiumBadge';
import { CLASSICS } from '@/constants/classicsTheme';
import { useClassicsBooks, useAllBookProgress } from '@/hooks/queries/classicsQueries';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import type { BookSummary, BookLevel, BookProgressSummary } from '@/api/modules/classics';

type Params = { ClassicsBookshelf: { level?: BookLevel } };

export default function ClassicsBookshelfScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<Params, 'ClassicsBookshelf'>>();
  const { theme } = useTheme();
  const { t, effectiveLanguage } = useI18n();
  const lang = effectiveLanguage === 'zh-CN' ? 'zh-CN' : 'en';
  const isZh = lang === 'zh-CN';
  const styles = useMemo(() => createStyles(theme), [theme]);

  const level = route.params?.level;
  const query = useClassicsBooks(level);
  const books: BookSummary[] = useMemo(
    () => query.data?.pages.flatMap((p) => p.books) ?? [],
    [query.data],
  );
  const isLoading = query.isLoading;

  const { data: progressData } = useAllBookProgress();
  const chapterGate = useFeatureGate('classicsChapter');
  const progressMap = useMemo(() => {
    const map: Record<string, BookProgressSummary> = {};
    for (const p of progressData?.progress ?? []) map[p.slug] = p;
    return map;
  }, [progressData]);
  const loadMore = () => {
    if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
  };

  const pageTitle = useMemo(() => {
    if (!level) return t('classics.bookshelf.allTitle');
    const info = CLASSICS.level[level];
    return isZh ? t('classics.bookshelf.levelTitle', { label: info.label }) : info.labelEn;
  }, [level, lang, t, isZh]);

  const handleBookPress = (book: BookSummary) => {
    navigation.navigate('ClassicsBookDetail', { slug: book.slug });
  };

  const renderCard = ({ item }: { item: BookSummary }) => {
    const levelInfo = CLASSICS.level[item.level as BookLevel];
    const wordsShort =
      item.wordCount >= 10000 ? `${Math.round(item.wordCount / 1000)}k` : `${item.wordCount}`;
    const progress = progressMap[item.slug];
    const pct = progress ? Math.round(progress.progressPercent * 100) : 0;
    const isDone = progress?.status === 'completed';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleBookPress(item)}
        activeOpacity={0.85}
      >
        <View style={styles.coverWrap}>
          {item.coverUrl ? (
            <Image source={{ uri: item.coverUrl }} style={styles.cover} resizeMode="cover" />
          ) : (
            <View style={styles.coverFallback}>
              <Icon name="menu-book" size={36} color={CLASSICS.colors.inkFaint} />
            </View>
          )}
          {progress && (
            <View style={styles.coverProgressBar}>
              <View
                style={[
                  styles.coverProgressFill,
                  { width: isDone ? '100%' : `${Math.max(3, pct)}%` },
                ]}
              />
            </View>
          )}
          {!item.isFree && chapterGate.locked && (
            <View style={styles.premiumBadgeWrap}>
              <PremiumBadge size="sm" />
            </View>
          )}
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {lang === 'zh-CN' && item.titleZh ? item.titleZh : item.title}
        </Text>
        <Text style={styles.cardAuthor} numberOfLines={1}>
          {lang === 'zh-CN' && item.authorZh ? item.authorZh : item.author}
        </Text>
        <View style={styles.cardMeta}>
          {levelInfo && (
            <View style={[styles.levelBadge, { backgroundColor: levelInfo.color + '22' }]}>
              <Text style={[styles.levelBadgeText, { color: levelInfo.color }]}>
                {lang === 'zh-CN' ? levelInfo.label : levelInfo.labelEn}
              </Text>
            </View>
          )}
          <Text style={styles.cardMetaText}>{wordsShort} words</Text>
        </View>
        {progress && (
          <Text style={[styles.progressLabel, isDone && styles.progressLabelDone]}>
            {isDone
              ? t('classics.home.completed')
              : isZh
                ? t('classics.home.chapterProgress', { chapter: progress.lastChapter, pct })
                : `Ch.${progress.lastChapter} · ${pct}%`}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <>
      <StatusBar backgroundColor={CLASSICS.colors.paper} barStyle="dark-content" />
      <View style={styles.pageHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Icon name={IconNames.left} size={24} color={CLASSICS.colors.ink} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>{pageTitle}</Text>
        <View style={styles.iconBtn} />
      </View>
    </>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={CLASSICS.colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      <FlatList
        data={books}
        key="classics-grid"
        keyExtractor={(b) => b.id}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        renderItem={renderCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          query.isFetchingNextPage ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={CLASSICS.colors.accent} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.centerBox}>
            <Icon name="menu-book" size={48} color={CLASSICS.colors.inkFaint} />
            <Text style={styles.emptyText}>{t('classics.bookshelf.empty')}</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: CLASSICS.colors.paper },
    pageHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    iconBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    pageTitle: {
      flex: 1,
      textAlign: 'center',
      fontFamily: CLASSICS.fontFamily.serifBold,
      fontSize: theme.typography.fontSize.lg,
      color: CLASSICS.colors.ink,
    },
    listContent: { paddingTop: theme.spacing.xs, paddingBottom: theme.spacing.xl },
    columnWrapper: {
      paddingHorizontal: theme.spacing.md,
      gap: theme.spacing.md,
    },
    // 固定宽度 = (屏宽 - 左右 padding - 中间 gap) / 2；最后一行只 1 本时不会被拉伸
    card: {
      width: (theme.screen.width - theme.spacing.md * 3) / 2,
      marginBottom: theme.spacing.lg,
    },
    coverWrap: {
      width: '100%',
      aspectRatio: 2 / 3,
      borderRadius: theme.spacing.borderRadius.base,
      overflow: 'hidden',
      backgroundColor: CLASSICS.colors.paperDeep,
      marginBottom: theme.spacing.sm,
      ...theme.spacing.shadows.sm,
    },
    cover: { width: '100%', height: '100%' },
    coverFallback: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    cardTitle: {
      fontFamily: CLASSICS.fontFamily.serifBold,
      fontSize: theme.typography.fontSize.base,
      color: CLASSICS.colors.ink,
      lineHeight: 20,
    },
    cardTitleZh: {
      fontSize: theme.typography.fontSize.xs,
      color: CLASSICS.colors.inkMuted,
      marginTop: 2,
    },
    cardAuthor: {
      fontFamily: CLASSICS.fontFamily.serif,
      fontSize: theme.typography.fontSize.xs,
      color: CLASSICS.colors.inkMuted,
      fontStyle: 'italic',
      marginTop: 4,
    },
    cardMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      marginTop: theme.spacing.xs,
    },
    levelBadge: {
      paddingHorizontal: theme.spacing.xs + 2,
      paddingVertical: 2,
      borderRadius: theme.spacing.borderRadius.sm,
    },
    levelBadgeText: {
      fontSize: theme.typography.fontSize.xxs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    cardMetaText: {
      fontSize: theme.typography.fontSize.xxs,
      color: CLASSICS.colors.inkFaint,
    },
    coverProgressBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 3,
      backgroundColor: 'rgba(0,0,0,0.08)',
    },
    coverProgressFill: {
      height: 3,
      backgroundColor: CLASSICS.colors.gold,
    },
    premiumBadgeWrap: {
      position: 'absolute',
      top: 6,
      right: 6,
    },
    completedBadge: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: CLASSICS.colors.gold,
      alignItems: 'center',
      justifyContent: 'center',
    },
    progressLabel: {
      marginTop: 3,
      fontSize: theme.typography.fontSize.xxs,
      color: CLASSICS.colors.gold,
      fontStyle: 'italic',
    },
    progressLabelDone: {
      color: CLASSICS.colors.accent,
      fontStyle: 'normal',
    },
    centerBox: { paddingTop: 80, alignItems: 'center', justifyContent: 'center' },
    emptyText: {
      marginTop: theme.spacing.md,
      fontSize: theme.typography.fontSize.sm,
      color: CLASSICS.colors.inkMuted,
    },
    footerLoader: {
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
