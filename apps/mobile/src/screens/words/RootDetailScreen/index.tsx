/**
 * 词根详情页面
 * 展示词根含义、衍生词列表和学习进度
 */
import React, { useRef, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '@/components/Icon';
import { useTheme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import { useRootDetail } from './useRootDetail';
import { createStyles } from './styles';
import type { RootWordItem } from '@/db/word';

const STATUS_I18N_KEYS: Record<string, string> = {
  new: 'wordRoot.statusNew',
  learned: 'wordRoot.statusLearned',
  mastered: 'words.masteredStatus',
};

export default function RootDetailScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme);
  const {
    isLoading,
    root,
    words,
    learnedCount,
    unlearnedCount,
    justLit,
    setJustLit,
    handleLearnUnlearned,
    navigation,
  } = useRootDetail();

  // 点亮动画：卡片缩放弹跳
  const cardScaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (justLit) {
      Animated.sequence([
        Animated.spring(cardScaleAnim, {
          toValue: 1.05,
          friction: 3,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.spring(cardScaleAnim, {
          toValue: 1,
          friction: 3,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setJustLit(false);
      });
    }
  }, [justLit]);

  const renderWordItem = ({ item }: { item: RootWordItem }) => {
    const isLearned = item.status === 'learned' || item.status === 'mastered';
    return (
      <View style={styles.wordItem}>
        <View style={styles.wordLeft}>
          <Text style={[styles.wordText, isLearned && styles.wordTextLearned]}>{item.word}</Text>
          {item.phoneticUs && (
            <Text style={styles.wordPhonetic}>/{item.phoneticUs}/</Text>
          )}
        </View>
        <View style={styles.wordRight}>
          <Text style={styles.wordMeaning} numberOfLines={1}>{item.meaningCn}</Text>
          <View style={[styles.statusBadge, isLearned && styles.statusBadgeLearned]}>
            <Text style={[styles.statusText, isLearned && styles.statusTextLearned]}>
              {t(STATUS_I18N_KEYS[item.status] || 'wordRoot.statusNew')}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (isLoading || !root) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('wordRoot.detailTitle')}</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const progressPercent = root.wordCount > 0 ? learnedCount / root.wordCount : 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('wordRoot.detailTitle')}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Root Info Card */}
      <Animated.View style={[styles.rootInfoCard, { transform: [{ scale: cardScaleAnim }] }]}>
        <Text style={styles.rootTitle}>{root.root}</Text>
        {root.rootMeaning && (
          <Text style={styles.rootMeaningText}>{root.rootMeaning}</Text>
        )}
        <View style={styles.progressSection}>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progressPercent * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>{learnedCount}/{root.wordCount} {t('wordRoot.statusLearned')}</Text>
        </View>
      </Animated.View>

      {/* Word List */}
      <FlatList
        data={words}
        renderItem={renderWordItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <Text style={styles.sectionTitle}>{t('wordRoot.derivedWords', { count: words.length })}</Text>
        }
      />

      {/* CTA Button */}
      {unlearnedCount > 0 && (
        <View style={styles.ctaContainer}>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={handleLearnUnlearned}
            activeOpacity={0.8}
          >
            <Icon name="play-arrow" size={20} color={theme.colors.text.inverse} />
            <Text style={styles.ctaText}>
              {t('wordRoot.learnUnlearned', { count: unlearnedCount })}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
