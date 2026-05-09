/**
 * 名著精读 · 首页（独立 Stack 入口）
 *
 * 结构:
 *   1. 顶部简洁头 + 介绍横幅
 *   2. (未来) 续读 Hero — 用户正在读的书
 *   3. 三级分级横滑书架: 初级 / 中级 / 高级
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme, type Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import Icon, { IconNames } from '@/components/Icon';
import { PremiumBadge } from '@/components/PremiumBadge';
import { CLASSICS } from '@/constants/classicsTheme';
import { useClassicsBooks, useRecentReadings, useAllBookProgress } from '@/hooks/queries/classicsQueries';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import type { BookSummary, BookLevel, RecentBook, BookProgressSummary } from '@/api/modules/classics';

const LEVEL_ORDER: BookLevel[] = ['beginner', 'intermediate', 'advanced'];

export default function ClassicsHomeScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const { t, effectiveLanguage } = useI18n();
  const lang = effectiveLanguage === 'zh-CN' ? 'zh-CN' : 'en';
  const isZh = lang === 'zh-CN';
  const styles = useMemo(() => createStyles(theme), [theme]);

  // 三级各自独立分页查询；ClassicsHome 只用首页做横向预览（限 10 本）
  const beginnerQuery = useClassicsBooks('beginner', 10);
  const intermediateQuery = useClassicsBooks('intermediate', 10);
  const advancedQuery = useClassicsBooks('advanced', 10);
  const recentQuery = useRecentReadings(5);
  const { data: progressData } = useAllBookProgress();
  const progressMap = useMemo(() => {
    const map: Record<string, BookProgressSummary> = {};
    for (const p of progressData?.progress ?? []) map[p.slug] = p;
    return map;
  }, [progressData]);

  const isLoading =
    beginnerQuery.isLoading || intermediateQuery.isLoading || advancedQuery.isLoading;

  const recentBooks = recentQuery.data?.books ?? [];
  const heroBook: RecentBook | undefined = recentBooks[0];
  const chapterGate = useFeatureGate('classicsChapter');

  const grouped: Record<BookLevel, BookSummary[]> = {
    beginner: beginnerQuery.data?.pages[0]?.books ?? [],
    intermediate: intermediateQuery.data?.pages[0]?.books ?? [],
    advanced: advancedQuery.data?.pages[0]?.books ?? [],
  };

  const handleBookPress = (slug: string) => {
    navigation.navigate('ClassicsBookDetail', { slug });
  };
  const handleSeeAll = (level: BookLevel) => {
    navigation.navigate('ClassicsBookshelf', { level });
  };

  const renderCover = ({ item }: { item: BookSummary }) => {
    const levelInfo = CLASSICS.level[item.level];
    const progress = progressMap[item.slug];
    const pct = progress ? Math.round(progress.progressPercent * 100) : 0;
    const isDone = progress?.status === 'completed';
    return (
      <TouchableOpacity
        style={styles.shelfCard}
        onPress={() => handleBookPress(item.slug)}
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
              <View style={[styles.coverProgressFill, { width: isDone ? '100%' : `${Math.max(3, pct)}%` }]} />
            </View>
          )}
          {!item.isFree && chapterGate.locked && (
            <View style={styles.premiumBadgeWrap}>
              <PremiumBadge size="sm" />
            </View>
          )}
        </View>
        <Text style={styles.coverTitle} numberOfLines={2}>
          {lang === 'zh-CN' && item.titleZh ? item.titleZh : item.title}
        </Text>
        <Text style={styles.coverAuthor} numberOfLines={1}>
          {lang === 'zh-CN' && item.authorZh ? item.authorZh : item.author}
        </Text>
        {progress && (
          <Text style={[styles.coverMeta, isDone && styles.coverMetaDone]}>
            {isDone
              ? t('classics.home.completed')
              : (isZh ? t('classics.home.chapterProgress', { chapter: progress.lastChapter, pct }) : `Ch.${progress.lastChapter} · ${pct}%`)}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderShelf = (level: BookLevel) => {
    const list = grouped[level];
    const info = CLASSICS.level[level];
    const levelLabel = lang === 'zh-CN' ? info.label : info.labelEn;
    const cefr = level === 'beginner' ? 'A2-B1' : level === 'intermediate' ? 'B1-B2' : 'C1+';

    if (list.length === 0) return null;

    return (
      <View key={level} style={styles.shelfSection}>
        <View style={styles.shelfHeader}>
          <View style={[styles.shelfDot, { backgroundColor: info.color }]} />
          <Text style={styles.shelfTitle}>
            {levelLabel}
            <Text style={styles.shelfCefr}>  · {cefr}</Text>
          </Text>
          <TouchableOpacity
            onPress={() => handleSeeAll(level)}
            activeOpacity={0.7}
            style={styles.seeAllBtn}
          >
            <Text style={styles.seeAllText}>
              {t('classics.home.seeAll')}
            </Text>
            <Icon name={IconNames.right} size={14} color={CLASSICS.colors.inkMuted} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={list}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(b) => b.id}
          renderItem={renderCover}
          contentContainerStyle={styles.shelfList}
          ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={CLASSICS.colors.paper} barStyle="dark-content" />
      <View style={styles.pageHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Icon name={IconNames.left} size={24} color={CLASSICS.colors.ink} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>
          {t('classics.home.pageTitle')}
        </Text>
        <View style={styles.iconBtn} />
      </View>

      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={CLASSICS.colors.accent} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* 续读 Hero — 有在读的书时置顶 */}
          {heroBook ? (
            <TouchableOpacity
              style={styles.heroCard}
              activeOpacity={0.9}
              onPress={() => {
                // 锁书直接拦截到 PlanSelect，避免进入 Reader 时拉章节正文触发后端 403
                if (!chapterGate.guard({ chapterNumber: heroBook.lastChapter, bookSlug: heroBook.slug })) return;
                navigation.navigate('ClassicsReader', {
                  slug: heroBook.slug,
                  chapterNumber: heroBook.lastChapter,
                });
              }}
            >
              <View style={styles.heroCoverWrap}>
                {heroBook.coverUrl ? (
                  <Image source={{ uri: heroBook.coverUrl }} style={styles.heroCover} resizeMode="cover" />
                ) : (
                  <View style={[styles.heroCover, styles.heroCoverFallback]}>
                    <Icon name="menu-book" size={28} color={CLASSICS.colors.inkFaint} />
                  </View>
                )}
                {!heroBook.isFree && chapterGate.locked && (
                  <View style={styles.heroPremiumBadgeWrap}>
                    <PremiumBadge size="xs" />
                  </View>
                )}
              </View>
              <View style={styles.heroInfo}>
                <Text style={styles.heroKicker}>
                  {t('classics.home.continueReading')}
                </Text>
                <Text style={styles.heroTitle} numberOfLines={1}>
                  {lang === 'zh-CN' && heroBook.titleZh ? heroBook.titleZh : heroBook.title}
                </Text>
                <Text style={styles.heroChapter} numberOfLines={1}>
                  {isZh
                    ? t('classics.home.heroChapter', { chapter: heroBook.lastChapter, title: heroBook.lastChapterTitleZh || heroBook.lastChapterTitle })
                    : `Ch. ${heroBook.lastChapter} · ${heroBook.lastChapterTitle}`}
                </Text>
                <View style={styles.heroProgressTrack}>
                  <View
                    style={[
                      styles.heroProgressFill,
                      { width: `${Math.max(3, Math.round(heroBook.progressPercent * 100))}%` },
                    ]}
                  />
                </View>
                <Text style={styles.heroPercent}>
                  {Math.round(heroBook.progressPercent * 100)}%
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.introBanner}>
              <Text style={styles.introQuote}>
                {t('classics.home.introQuote')}
              </Text>
              <Text style={styles.introSubtitle}>
                {t('classics.home.introSubtitle')}
              </Text>
            </View>
          )}

          {/* 三级书架 */}
          {LEVEL_ORDER.map(renderShelf)}
        </ScrollView>
      )}
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

    centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { paddingBottom: theme.spacing.xl },

    // ==================== 续读 Hero ====================
    heroCard: {
      marginHorizontal: theme.spacing.md,
      marginTop: theme.spacing.xs,
      marginBottom: theme.spacing.lg,
      flexDirection: 'row',
      backgroundColor: CLASSICS.colors.cardBg,
      borderRadius: theme.spacing.borderRadius.base,
      padding: theme.spacing.sm,
      gap: theme.spacing.md,
      ...theme.spacing.shadows.sm,
      borderWidth: 1,
      borderColor: CLASSICS.colors.divider,
    },
    heroCoverWrap: {
      position: 'relative',
    },
    heroCover: {
      width: 72,
      height: 104,
      borderRadius: theme.spacing.borderRadius.sm,
      backgroundColor: CLASSICS.colors.paperDeep,
    },
    heroCoverFallback: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    heroPremiumBadgeWrap: {
      position: 'absolute',
      top: 4,
      right: 4,
    },
    heroInfo: {
      flex: 1,
      justifyContent: 'space-between',
      paddingVertical: 2,
    },
    heroKicker: {
      fontSize: theme.typography.fontSize.xxs,
      color: CLASSICS.colors.gold,
      fontWeight: theme.typography.fontWeight.semibold,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    heroTitle: {
      fontFamily: CLASSICS.fontFamily.serifBold,
      fontSize: theme.typography.fontSize.base,
      color: CLASSICS.colors.ink,
      marginTop: 2,
    },
    heroChapter: {
      fontFamily: CLASSICS.fontFamily.serif,
      fontSize: theme.typography.fontSize.xs,
      color: CLASSICS.colors.inkMuted,
      fontStyle: 'italic',
      marginTop: 2,
    },
    heroProgressTrack: {
      height: 3,
      backgroundColor: CLASSICS.colors.divider,
      borderRadius: 2,
      marginTop: theme.spacing.xs,
      overflow: 'hidden',
    },
    heroProgressFill: {
      height: 3,
      backgroundColor: CLASSICS.colors.gold,
      borderRadius: 2,
    },
    heroPercent: {
      fontSize: theme.typography.fontSize.xxs,
      color: CLASSICS.colors.inkFaint,
      textAlign: 'right',
      marginTop: 2,
    },

    // ==================== 介绍横幅 ====================
    introBanner: {
      marginHorizontal: theme.spacing.md,
      marginTop: theme.spacing.xs,
      marginBottom: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      borderLeftWidth: 3,
      borderLeftColor: CLASSICS.colors.gold,
    },
    introQuote: {
      fontFamily: CLASSICS.fontFamily.serif,
      fontSize: theme.typography.fontSize.lg,
      color: CLASSICS.colors.ink,
      fontStyle: 'italic',
      lineHeight: 26,
    },
    introSubtitle: {
      marginTop: theme.spacing.xs,
      fontSize: theme.typography.fontSize.xs,
      color: CLASSICS.colors.inkMuted,
    },

    // ==================== 分级书架 ====================
    shelfSection: { marginBottom: theme.spacing.lg },
    shelfHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.sm,
      gap: theme.spacing.xs,
    },
    shelfDot: { width: 8, height: 8, borderRadius: 4 },
    shelfTitle: {
      flex: 1,
      fontFamily: CLASSICS.fontFamily.serifBold,
      fontSize: theme.typography.fontSize.base,
      color: CLASSICS.colors.ink,
    },
    shelfCefr: {
      fontFamily: CLASSICS.fontFamily.serif,
      fontSize: theme.typography.fontSize.xs,
      color: CLASSICS.colors.inkFaint,
      fontWeight: theme.typography.fontWeight.normal,
    },
    seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    seeAllText: {
      fontSize: theme.typography.fontSize.xs,
      color: CLASSICS.colors.inkMuted,
    },
    shelfList: { paddingHorizontal: theme.spacing.md },

    // 卡片：宽 130，封面 130x195（2:3）
    shelfCard: { width: 130 },
    coverWrap: {
      width: 130,
      height: 195,
      borderRadius: theme.spacing.borderRadius.sm,
      overflow: 'hidden',
      backgroundColor: CLASSICS.colors.paperDeep,
      marginBottom: theme.spacing.sm,
      ...theme.spacing.shadows.sm,
    },
    cover: { width: '100%', height: '100%' },
    coverFallback: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
      top: 5,
      right: 5,
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: CLASSICS.colors.gold,
      alignItems: 'center',
      justifyContent: 'center',
    },
    coverTitle: {
      fontFamily: CLASSICS.fontFamily.serifBold,
      fontSize: theme.typography.fontSize.sm,
      color: CLASSICS.colors.ink,
      lineHeight: 18,
    },
    coverAuthor: {
      fontFamily: CLASSICS.fontFamily.serif,
      fontSize: theme.typography.fontSize.xs,
      color: CLASSICS.colors.inkMuted,
      fontStyle: 'italic',
      marginTop: 2,
    },
    coverMeta: {
      marginTop: 3,
      fontSize: theme.typography.fontSize.xxs,
      color: CLASSICS.colors.gold,
      fontStyle: 'italic',
    },
    coverMetaDone: {
      color: CLASSICS.colors.accent,
      fontStyle: 'normal',
      fontWeight: theme.typography.fontWeight.semibold,
    },
  });
