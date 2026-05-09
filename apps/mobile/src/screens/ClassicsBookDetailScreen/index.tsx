/**
 * 名著精读 · 书详情（封面 + 元信息 + 章节目录）
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { MaterialIcons } from '@react-native-vector-icons/material-icons';
import { useTheme, type Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import Icon, { IconNames } from '@/components/Icon';
import { CLASSICS } from '@/constants/classicsTheme';
import { formatChapterTitle, formatChapterTitleZh } from '@/utils/classicsTitle';
import { useClassicsBook, useBookProgress } from '@/hooks/queries/classicsQueries';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import type { BookLevel } from '@/api/modules/classics';

type Params = { ClassicsBookDetail: { slug: string } };

export default function ClassicsBookDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<Params, 'ClassicsBookDetail'>>();
  const { theme } = useTheme();
  const { t, effectiveLanguage } = useI18n();
  const lang = effectiveLanguage === 'zh-CN' ? 'zh-CN' : 'en';
  const isZh = lang === 'zh-CN';
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { slug } = route.params;
  const { data: book, isLoading } = useClassicsBook(slug);
  const { data: progress } = useBookProgress(slug);
  const chapterGate = useFeatureGate('classicsChapter');

  if (isLoading || !book) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor={CLASSICS.colors.paper} barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name={IconNames.left} size={24} color={CLASSICS.colors.ink} />
          </TouchableOpacity>
        </View>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={CLASSICS.colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  const levelInfo = CLASSICS.level[book.level as BookLevel];
  const levelLabel = levelInfo ? (lang === 'zh-CN' ? levelInfo.label : levelInfo.labelEn) : book.level;

  const authorName = lang === 'zh-CN' && book.authorZh ? book.authorZh : book.author;
  const hours = Math.round((book.estMinutes / 60) * 10) / 10;
  const totalLabel =
    isZh
      ? t('classics.detail.totalLabelZh', { chapters: book.chapterCount, words: Math.round(book.wordCount / 1000), hours })
      : `${book.chapterCount} ch · ${Math.round(book.wordCount / 1000)}k words · ~${hours}h`;

  const chapterProgressMap = progress?.chapters ?? {};
  // 有任一章动过 = 有进度（跳过"没读完但开始过"的边缘情况）
  const hasProgress = progress
    ? Object.keys(chapterProgressMap).length > 0 || progress.lastChapter > 1 || progress.lastParaIndex > 0
    : false;
  const continueChapter = progress?.lastChapter ?? 1;
  const progressPercent = Math.round((progress?.progressPercent ?? 0) * 100);
  const isCompleted = progress?.status === 'completed';
  const readMinutes = Math.floor((progress?.readSeconds ?? 0) / 60);

  const handleStart = () => {
    if (!chapterGate.guard({ chapterNumber: continueChapter, bookSlug: book.slug })) return;
    navigation.navigate('ClassicsReader', {
      slug: book.slug,
      chapterNumber: continueChapter,
    });
  };
  const handleChapterPress = (chapterNumber: number) => {
    if (!chapterGate.guard({ chapterNumber, bookSlug: book.slug })) return;
    navigation.navigate('ClassicsReader', { slug: book.slug, chapterNumber });
  };

  const ctaLabel =
    isCompleted
      ? t('classics.detail.readAgain')
      : hasProgress
      ? isZh ? t('classics.detail.continueChapter', { chapter: continueChapter }) : `Continue ch. ${continueChapter}`
      : t('classics.detail.startReading');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={CLASSICS.colors.paper} barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name={IconNames.left} size={24} color={CLASSICS.colors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {book.title}
        </Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* 封面 + 标题 + 作者 */}
        <View style={styles.heroSection}>
          {book.coverUrl ? (
            <Image source={{ uri: book.coverUrl }} style={styles.cover} resizeMode="cover" />
          ) : (
            <View style={styles.coverFallback}>
              <Icon name="menu-book" size={64} color={CLASSICS.colors.inkFaint} />
            </View>
          )}
          <Text style={styles.title}>{book.title}</Text>
          {book.titleZh && <Text style={styles.titleZh}>{book.titleZh}</Text>}
          <Text style={styles.author}>
            {authorName}
            {book.publishedYear ? `  ·  ${book.publishedYear}` : ''}
          </Text>

          <View style={styles.metaRow}>
            {levelInfo && (
              <View style={[styles.levelBadge, { backgroundColor: levelInfo.color + '22' }]}>
                <Text style={[styles.levelBadgeText, { color: levelInfo.color }]}>
                  {levelLabel}
                  {book.cefr ? ` · ${book.cefr}` : ''}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.totalLine}>{totalLabel}</Text>

          {/* 阅读进度条 + 状态：有进度时才显示 */}
          {(hasProgress || isCompleted) && (
            <View style={styles.progressWrap}>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.max(2, progressPercent)}%` },
                    isCompleted && { backgroundColor: CLASSICS.colors.accent },
                  ]}
                />
              </View>
              <Text style={styles.progressLabel}>
                {isCompleted
                  ? isZh
                    ? t('classics.detail.completedMin', { minutes: readMinutes })
                    : `Completed · ${readMinutes} min read`
                  : isZh
                  ? t('classics.detail.progressMin', { pct: progressPercent, minutes: readMinutes })
                  : `${progressPercent}% · ${readMinutes} min read`}
              </Text>
            </View>
          )}
        </View>

        {/* 简介 */}
        {book.description && (
          <View style={styles.descSection}>
            <Text style={styles.descText}>{book.description}</Text>
          </View>
        )}

        {/* 主 CTA */}
        <TouchableOpacity style={styles.cta} onPress={handleStart} activeOpacity={0.85}>
          <Icon name="play-arrow" size={20} color="#FFFFFF" />
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </TouchableOpacity>

        {/* 章节目录 */}
        <View style={styles.chaptersSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionBar} />
            <Text style={styles.sectionTitle}>
              {t('classics.detail.chapters')}
            </Text>
            <Text style={styles.sectionCount}>{book.chapters.length}</Text>
          </View>

          {book.chapters.map((ch) => {
            const enTitle = formatChapterTitle(ch.title, ch.chapterNumber, 'en');
            const zhTitle = formatChapterTitleZh(ch.titleZh, ch.title, ch.chapterNumber);
            const primary = lang === 'zh-CN' ? zhTitle : enTitle;
            const secondary = lang === 'zh-CN' && enTitle !== zhTitle ? enTitle : null;

            // 非免费书单的书对 Free 用户全锁
            const isChapterLocked = !chapterGate.isAllowed({ chapterNumber: ch.chapterNumber, bookSlug: book.slug });

            // 按章节独立状态：跳章不互相污染
            const chEntry = chapterProgressMap[ch.chapterNumber];
            const isLastOpened = progress?.lastChapter === ch.chapterNumber;
            const state: 'done' | 'current' | 'todo' = chEntry?.completed
              ? 'done'
              : chEntry
              ? 'current' // 有记录但未完成 = 进行中
              : isLastOpened
              ? 'current' // 头表记录了这是最后打开章但 chapter 表还没入库（极少见）
              : 'todo';

            return (
              <TouchableOpacity
                key={ch.chapterNumber}
                style={styles.chapterRow}
                onPress={() => handleChapterPress(ch.chapterNumber)}
                activeOpacity={0.7}
              >
                <View style={styles.chapterStateCell}>
                  {state === 'done' ? (
                    <View style={[styles.stateDot, styles.stateDotDone]}>
                      <Icon name="check" size={12} color="#FFFFFF" />
                    </View>
                  ) : state === 'current' ? (
                    <View style={[styles.stateDot, styles.stateDotCurrent]}>
                      <View style={styles.stateDotCurrentInner} />
                    </View>
                  ) : (
                    <View style={[styles.stateDot, styles.stateDotTodo]} />
                  )}
                </View>
                <Text
                  style={[
                    styles.chapterNumber,
                    state === 'done' && styles.chapterNumberMuted,
                  ]}
                >
                  {ch.chapterNumber}
                </Text>
                <View style={styles.chapterMid}>
                  <Text
                    style={[
                      styles.chapterTitle,
                      state === 'done' && styles.chapterTitleMuted,
                    ]}
                    numberOfLines={2}
                  >
                    {primary}
                  </Text>
                  {secondary && (
                    <Text style={styles.chapterTitleEn} numberOfLines={1}>
                      {secondary}
                    </Text>
                  )}
                  <Text style={styles.chapterMeta}>
                    {ch.wordCount.toLocaleString()} {t('classics.detail.words')} · {ch.estMinutes} min
                  </Text>
                </View>
                {isChapterLocked ? (
                  <MaterialIcons name="lock" size={16} color={theme.colors.text.disabled} />
                ) : (
                  <Icon name={IconNames.right} size={18} color={CLASSICS.colors.inkFaint} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: CLASSICS.colors.paper },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      fontFamily: CLASSICS.fontFamily.serifBold,
      fontSize: theme.typography.fontSize.base,
      color: CLASSICS.colors.ink,
    },
    centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { paddingBottom: theme.spacing.xl },

    heroSection: {
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    cover: {
      width: 180,
      height: 260,
      borderRadius: theme.spacing.borderRadius.base,
      backgroundColor: CLASSICS.colors.paperDeep,
      ...theme.spacing.shadows.sm,
    },
    coverFallback: {
      width: 180,
      height: 260,
      borderRadius: theme.spacing.borderRadius.base,
      backgroundColor: CLASSICS.colors.paperDeep,
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: {
      marginTop: theme.spacing.md,
      fontFamily: CLASSICS.fontFamily.serifBold,
      fontSize: theme.typography.fontSize.xl,
      color: CLASSICS.colors.ink,
      textAlign: 'center',
    },
    titleZh: {
      marginTop: 4,
      fontSize: theme.typography.fontSize.sm,
      color: CLASSICS.colors.inkMuted,
    },
    author: {
      marginTop: theme.spacing.xs,
      fontFamily: CLASSICS.fontFamily.serif,
      fontSize: theme.typography.fontSize.sm,
      color: CLASSICS.colors.inkMuted,
      fontStyle: 'italic',
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: theme.spacing.sm,
      gap: theme.spacing.xs,
    },
    levelBadge: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      borderRadius: theme.spacing.borderRadius.full,
    },
    levelBadgeText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    totalLine: {
      marginTop: theme.spacing.xs,
      fontSize: theme.typography.fontSize.xs,
      color: CLASSICS.colors.inkFaint,
    },
    progressWrap: {
      alignSelf: 'stretch',
      marginTop: theme.spacing.sm,
      marginHorizontal: theme.spacing.md,
    },
    progressTrack: {
      height: 4,
      backgroundColor: CLASSICS.colors.divider,
      borderRadius: 2,
      overflow: 'hidden',
    },
    progressFill: {
      height: 4,
      backgroundColor: CLASSICS.colors.gold,
      borderRadius: 2,
    },
    progressLabel: {
      marginTop: theme.spacing.xs,
      fontSize: theme.typography.fontSize.xxs,
      color: CLASSICS.colors.inkMuted,
      textAlign: 'center',
      fontStyle: 'italic',
    },
    chapterStateCell: {
      width: 24,
      alignItems: 'center',
    },
    stateDot: {
      width: 16,
      height: 16,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stateDotTodo: {
      borderWidth: 1.5,
      borderColor: CLASSICS.colors.inkFaint,
    },
    stateDotCurrent: {
      borderWidth: 1.5,
      borderColor: CLASSICS.colors.gold,
    },
    stateDotCurrentInner: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: CLASSICS.colors.gold,
    },
    stateDotDone: {
      backgroundColor: CLASSICS.colors.gold,
    },
    chapterNumberMuted: {
      color: CLASSICS.colors.inkFaint,
      opacity: 0.6,
    },
    chapterTitleMuted: {
      color: CLASSICS.colors.inkMuted,
    },
    descSection: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
    },
    descText: {
      fontFamily: CLASSICS.fontFamily.serif,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: 24,
      color: CLASSICS.colors.inkMuted,
    },
    cta: {
      marginHorizontal: theme.spacing.lg,
      marginVertical: theme.spacing.md,
      backgroundColor: CLASSICS.colors.accent,
      borderRadius: theme.spacing.borderRadius.full,
      paddingVertical: theme.spacing.sm + 2,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    ctaText: {
      color: '#FFFFFF',
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    chaptersSection: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.xs,
      paddingBottom: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    sectionBar: { width: 3, height: 14, backgroundColor: CLASSICS.colors.gold, borderRadius: 2 },
    sectionTitle: {
      flex: 1,
      fontFamily: CLASSICS.fontFamily.serifBold,
      fontSize: theme.typography.fontSize.base,
      color: CLASSICS.colors.ink,
    },
    sectionCount: {
      fontSize: theme.typography.fontSize.xs,
      color: CLASSICS.colors.inkFaint,
    },
    chapterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm + 2,
      paddingHorizontal: theme.spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: CLASSICS.colors.divider,
      gap: theme.spacing.md,
    },
    chapterNumber: {
      width: 32,
      textAlign: 'center',
      fontFamily: CLASSICS.fontFamily.serif,
      fontSize: theme.typography.fontSize.sm,
      color: CLASSICS.colors.inkFaint,
      fontStyle: 'italic',
    },
    chapterMid: { flex: 1 },
    chapterTitle: {
      fontFamily: CLASSICS.fontFamily.serif,
      fontSize: theme.typography.fontSize.sm,
      color: CLASSICS.colors.ink,
    },
    chapterTitleEn: {
      marginTop: 2,
      fontFamily: CLASSICS.fontFamily.serif,
      fontSize: theme.typography.fontSize.xs,
      color: CLASSICS.colors.inkFaint,
      fontStyle: 'italic',
    },
    chapterMeta: {
      marginTop: 2,
      fontSize: theme.typography.fontSize.xxs,
      color: CLASSICS.colors.inkFaint,
    },
  });
