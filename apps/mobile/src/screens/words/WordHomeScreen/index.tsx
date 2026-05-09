import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { useTheme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import Icon from '@/components/Icon';
import { useUserStore } from '@/stores';
import { LIBRARY_COLORS, LIBRARY_ICONS } from '@/constants/libraryConfig';
import createStyles from './styles';
import { useWordHome } from './useWordHome';
import VocabCard from './VocabCard';

export default function WordHomeScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme);
  const [showSortModal, setShowSortModal] = useState(false);
  const setLearnSortMode = useUserStore((state) => state.setLearnSortMode);

  const {
    isLoading,
    isRefreshing,
    homeState,
    currentLibrary,
    vocabularyTest,
    learnSortMode,
    cta,
    favoriteCount,
    difficultCount,
    recommendedTags,
    navigation,
    handleRefresh,
    handleOpenVocabularyTest,
    handleSwitchLibrary,
    handleOpenFavorites,
    handleOpenDifficult,
    handleOpenWordBook,
    handleOpenRootMap,
    handleOpenSentenceChallenge,
    handleStartLearn,
    handleStartPractice,
    handleAddRecommendedLibrary,
    AlertComponent,
  } = useWordHome();

  // 加载中
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  // ==================== 搜索栏 ====================

  const renderSearchBar = () => (
    <TouchableOpacity
      style={styles.searchBar}
      onPress={() => navigation.navigate('WordSearch')}
      activeOpacity={0.7}
    >
      <Icon name="search" size={20} color={theme.colors.text.disabled} />
      <Text style={styles.searchBarText}>{t('wordHome.searchPlaceholder')}</Text>
    </TouchableOpacity>
  );

  // ==================== 状态 A：未测试词汇量 ====================

  if (homeState === 'A') {
    return (
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
        >
          {renderSearchBar()}

          <View style={styles.stateACard}>
            <Text style={styles.stateAEmoji}>{'📊'}</Text>
            <Text style={styles.stateATitle}>{t('wordHome.stateATitle')}</Text>
            <Text style={styles.stateADesc}>{t('wordHome.stateADesc')}</Text>

            <View style={styles.stateAFeatures}>
              <Text style={styles.stateAFeatureItem}>{'·'} {t('wordHome.stateAFeature1')}</Text>
              <Text style={styles.stateAFeatureItem}>{'·'} {t('wordHome.stateAFeature2')}</Text>
              <Text style={styles.stateAFeatureItem}>{'·'} {t('wordHome.stateAFeature3')}</Text>
            </View>

            <TouchableOpacity style={styles.stateAButton} onPress={handleOpenVocabularyTest} activeOpacity={0.8}>
              <Text style={styles.stateAButtonText}>{t('wordHome.startTest')}</Text>
              <Icon name="chevron-right" size={20} color={theme.colors.text.inverse} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.skipTestCard} onPress={handleSwitchLibrary} activeOpacity={0.8}>
            <Text style={styles.skipTestText}>{t('wordHome.skipTestHint')}</Text>
            <Text style={styles.skipTestLink}>{t('wordHome.skipTestLink')}</Text>
          </TouchableOpacity>
        </ScrollView>
        {AlertComponent}
      </View>
    );
  }

  // ==================== 状态 B：已测试，未选词库 ====================

  if (homeState === 'B') {
    return (
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
        >
          {renderSearchBar()}

          {/* 词汇量卡片 */}
          <VocabCard vocabularyTest={vocabularyTest} onPress={handleOpenVocabularyTest} />

          {/* 词库选择引导 */}
          <View style={styles.stateBGuideCard}>
            <Text style={styles.stateBGuideTitle}>{t('wordHome.stateBGuideTitle')}</Text>
            <Text style={styles.stateBGuideDesc}>
              {vocabularyTest
                ? t('wordHome.stateBGuideDescWithTest')
                : t('wordHome.stateBGuideDescNoTest')}
            </Text>

            {recommendedTags.map((tag, i) => (
              <TouchableOpacity
                key={tag}
                style={[styles.stateBLibraryItem, i === 0 && styles.stateBLibraryItemHighlight]}
                onPress={() => handleAddRecommendedLibrary(tag)}
                activeOpacity={0.7}
              >
                <View style={[styles.stateBLibraryIcon, { backgroundColor: (LIBRARY_COLORS[tag] || theme.colors.primary) + '20' }]}>
                  <Icon
                    name={LIBRARY_ICONS[tag] || 'menu-book'}
                    size={22}
                    color={LIBRARY_COLORS[tag] || theme.colors.primary}
                  />
                </View>
                <View style={styles.stateBLibraryInfo}>
                  <View style={styles.stateBLibraryTitleRow}>
                    {i === 0 && <Text style={styles.stateBStarBadge}>{'⭐'}</Text>}
                    <Text style={styles.stateBLibraryName}>{tag} {t('wordHome.coreVocab')}</Text>
                  </View>
                  {i === 0 && <Text style={styles.stateBLibraryDesc}>{t('wordHome.suitableLevel')}</Text>}
                </View>
                <Icon name="add-circle-outline" size={22} color={theme.colors.primary} />
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.stateBViewAll} onPress={handleSwitchLibrary} activeOpacity={0.7}>
              <Text style={styles.stateBViewAllText}>{t('wordHome.viewAllLibraries')}</Text>
              <Icon name="chevron-right" size={18} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        </ScrollView>
        {AlertComponent}
      </View>
    );
  }

  // ==================== 状态 C：正常学习 ====================

  const libColor = LIBRARY_COLORS[currentLibrary!.tag] || theme.colors.primary;
  const libIcon = LIBRARY_ICONS[currentLibrary!.tag] || 'menu-book';
  const masteryRaw = currentLibrary!.totalCount > 0
    ? (currentLibrary!.masteredCount / currentLibrary!.totalCount) * 100
    : 0;
  const formatPercent = (v: number) => {
    if (v === 0) return '0';
    if (v > 0 && v < 1) return '<1';
    return Math.round(v).toString();
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
      >
        {renderSearchBar()}

        {/* 词汇量卡片 */}
        <VocabCard vocabularyTest={vocabularyTest} onPress={handleOpenVocabularyTest} />

        {/* 我的词库 */}
        <Text style={styles.sectionTitle}>{t('wordHome.myLibrary')}</Text>
        <TouchableOpacity style={styles.libCard} activeOpacity={0.85} onPress={handleOpenWordBook}>
          <View style={styles.libCardHeader}>
            <View style={[styles.libCardIcon, { backgroundColor: libColor + '20' }]}>
              <Icon name={libIcon} size={22} color={libColor} />
            </View>
            <Text style={styles.libCardName}>{currentLibrary!.tag} {t('wordHome.coreVocab')}</Text>
            <View style={{ flex: 1 }} />
            <TouchableOpacity
              onPress={handleSwitchLibrary}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
            >
              <Icon name="swap-horiz" size={20} color={theme.colors.text.tertiary} />
            </TouchableOpacity>
          </View>

          {/* 百分比 + 统计 */}
          <View style={styles.libBody}>
            <View style={styles.libPercentCol}>
              <View style={styles.libPercentRow}>
                <Text style={styles.libPercent}>{formatPercent(masteryRaw)}</Text>
                <Text style={styles.libPercentSign}>%</Text>
              </View>
              <Text style={styles.libPercentLabel}>{t('wordHome.masteryLabel')}</Text>
            </View>

            <View style={styles.libStatsDivider} />

            <View style={styles.libStatsCol}>
              <View style={styles.libStatItem}>
                <Text style={styles.libStatNum}>{currentLibrary!.totalCount}</Text>
                <Text style={styles.libStatLabel}>{t('wordHome.totalCount')}</Text>
              </View>
              {currentLibrary!.learnedCount > 0 && (
                <View style={styles.libStatItem}>
                  <Text style={[styles.libStatNum, { color: theme.colors.warning }]}>{currentLibrary!.learnedCount}</Text>
                  <Text style={styles.libStatLabel}>{t('wordHome.learningCount')}</Text>
                </View>
              )}
              {currentLibrary!.masteredCount > 0 && (
                <View style={styles.libStatItem}>
                  <Text style={[styles.libStatNum, { color: theme.colors.success }]}>{currentLibrary!.masteredCount}</Text>
                  <Text style={styles.libStatLabel}>{t('wordHome.masteredCount')}</Text>
                </View>
              )}
              {currentLibrary!.skippedCount > 0 && (
                <View style={styles.libStatItem}>
                  <Text style={[styles.libStatNum, { color: theme.colors.text.tertiary }]}>{currentLibrary!.skippedCount}</Text>
                  <Text style={styles.libStatLabel}>{t('wordHome.skippedCount')}</Text>
                </View>
              )}
            </View>
          </View>

        </TouchableOpacity>

        {/* 开始学习 */}
        <Text style={styles.sectionTitle}>{t('wordHome.startLearning')}</Text>
        <View style={styles.actionSection}>
          {cta.unlearnedCount > 0 && (
            <TouchableOpacity style={styles.actionCard} activeOpacity={0.8} onPress={() => setShowSortModal(true)}>
              <View style={[styles.actionIcon, { backgroundColor: theme.colors.primary + '12' }]}>
                <Icon name="auto-stories" size={22} color={theme.colors.primary} />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>{t('wordHome.learnNew')}</Text>
                <Text style={styles.actionDesc}>{t('wordHome.unlearnedCount', { count: cta.unlearnedCount })}</Text>
              </View>
              <Icon name="chevron-right" size={22} color={theme.colors.text.tertiary} />
            </TouchableOpacity>
          )}

          {cta.practiceCount > 0 && (
            <TouchableOpacity style={styles.actionCard} activeOpacity={0.8} onPress={handleStartPractice}>
              <View style={[styles.actionIcon, { backgroundColor: theme.colors.success + '12' }]}>
                <Icon name="fitness-center" size={22} color={theme.colors.success} />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>{t('wordHome.practice')}</Text>
                <Text style={styles.actionDesc}>{t('wordHome.practiceCount', { count: cta.practiceCount })}</Text>
              </View>
              <Icon name="chevron-right" size={22} color={theme.colors.text.tertiary} />
            </TouchableOpacity>
          )}

          {cta.unlearnedCount === 0 && cta.practiceCount === 0 && (
            <View style={styles.completedCard}>
              <View style={[styles.actionIcon, { backgroundColor: theme.colors.success + '12' }]}>
                <Icon name="check-circle" size={22} color={theme.colors.success} />
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { color: theme.colors.success }]}>{t('wordHome.allDone')}</Text>
                <Text style={styles.actionDesc}>{t('wordHome.allDoneDesc')}</Text>
              </View>
            </View>
          )}
        </View>

        {/* 工具箱 */}
        <Text style={styles.sectionTitle}>{t('wordHome.toolbox')}</Text>
        <View style={styles.toolGrid}>
          {[
            { icon: 'star', label: t('wordHome.favorites'), color: theme.colors.warning, onPress: handleOpenFavorites, count: favoriteCount },
            { icon: 'bookmark', label: t('wordHome.difficult'), color: theme.colors.error, onPress: handleOpenDifficult, count: difficultCount },
          ].map((item) => (
            <TouchableOpacity key={item.label} style={styles.toolCard} onPress={item.onPress} activeOpacity={0.7}>
              <View style={[styles.toolIcon, { backgroundColor: item.color + '12' }]}>
                <Icon name={item.icon} size={18} color={item.color} />
              </View>
              <Text style={styles.toolLabel}>{item.label}</Text>
              {item.count > 0 && (
                <Text style={styles.toolCount}>{item.count}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* 学新词模式选择弹窗 */}
      <Modal visible={showSortModal} transparent animationType="fade" onRequestClose={() => setShowSortModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowSortModal(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('wordHome.sortModalTitle')}</Text>
            {([
              { mode: 'smart' as const, icon: 'auto-awesome', label: t('wordHome.sortSmart'), desc: t('wordHome.sortSmartDesc') },
              { mode: 'random' as const, icon: 'shuffle', label: t('wordHome.sortRandom'), desc: t('wordHome.sortRandomDesc') },
              { mode: 'alphabetical' as const, icon: 'sort-by-alpha', label: t('wordHome.sortAlpha'), desc: t('wordHome.sortAlphaDesc') },
            ]).map((item) => {
              const isActive = item.mode === learnSortMode;
              return (
                <TouchableOpacity
                  key={item.mode}
                  style={[styles.modalOption, isActive && styles.modalOptionActive]}
                  activeOpacity={0.7}
                  onPress={() => setLearnSortMode(item.mode)}
                >
                  <View style={[styles.modalOptionIcon, { backgroundColor: theme.colors.primary + (isActive ? '20' : '12') }]}>
                    <Icon name={item.icon} size={22} color={theme.colors.primary} />
                  </View>
                  <View style={styles.modalOptionContent}>
                    <Text style={[styles.modalOptionLabel, isActive && { color: theme.colors.primary }]}>{item.label}</Text>
                    <Text style={styles.modalOptionDesc}>{item.desc}</Text>
                  </View>
                  {isActive && <Icon name="check" size={20} color={theme.colors.primary} />}
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={styles.modalStartButton}
              activeOpacity={0.8}
              onPress={() => {
                setShowSortModal(false);
                handleStartLearn(learnSortMode);
              }}
            >
              <Text style={styles.modalStartButtonText}>{t('wordHome.startLearning')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {AlertComponent}
    </View>
  );
}
