import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeProvider';
import { LoadingView } from '@/components/common/LoadingView';
import ErrorView from '@/components/common/ErrorView';
import Icon, { IconNames } from '@/components/Icon';
import type { AchievementInfo } from '@/api/modules/achievement';
import {
  useAchievement,
  groupBySeries,
  CATEGORY_ORDER,
  CATEGORY_LABELS,
  RARITY_COLORS,
  RARITY_LABELS,
  FILTER_LABELS,
  type AchievementFilter,
} from './useAchievement';
import { createStyles } from './styles';

export default function AchievementScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const achievement = useAchievement();

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={achievement.goBack} style={styles.backButton}>
        <Icon name={IconNames.left} size={24} color={theme.colors.text.primary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{achievement.t('achievement.title')}</Text>
      <View style={styles.backButton} />
    </View>
  );

  const renderRarityBadge = (rarity?: string | null) => {
    if (!rarity || rarity === 'common') return null;
    const color = RARITY_COLORS[rarity];
    if (!color) return null;

    return (
      <View style={[styles.rarityBadge, { backgroundColor: color }]}>
        <Text style={styles.rarityText}>
          {RARITY_LABELS[rarity]?.[achievement.lang] || rarity}
        </Text>
      </View>
    );
  };

  const renderTierDots = (seriesItems: AchievementInfo[]) => (
    <View style={styles.tierDots}>
      {seriesItems.map((item) => (
        <View
          key={item.id}
          style={[
            styles.tierDot,
            item.unlocked
              ? { backgroundColor: theme.colors.primary }
              : { backgroundColor: theme.colors.border.light },
          ]}
        />
      ))}
    </View>
  );

  const renderSeriesCard = (seriesItems: AchievementInfo[]) => {
    const currentTier = seriesItems.filter(s => s.unlocked).pop() || seriesItems[0];
    const anyUnlocked = seriesItems.some(s => s.unlocked);

    return (
      <View
        key={currentTier.seriesCode || currentTier.id}
        style={[
          styles.achievementCard,
          !anyUnlocked && styles.achievementCardLocked,
        ]}
      >
        {renderRarityBadge(currentTier.rarity)}
        {renderTierDots(seriesItems)}

        <View
          style={[
            styles.achievementIconWrap,
            anyUnlocked
              ? { backgroundColor: theme.colors.primary + '20' }
              : { backgroundColor: theme.colors.border.light },
          ]}
        >
          <Icon
            name={currentTier.icon}
            size={28}
            color={anyUnlocked ? theme.colors.primary : theme.colors.text.disabled}
          />
        </View>

        <Text
          style={[
            styles.achievementName,
            !anyUnlocked && styles.achievementNameLocked,
          ]}
          numberOfLines={1}
        >
          {currentTier.name[achievement.lang] || currentTier.name['zh-CN']}
        </Text>
        <Text style={styles.achievementDesc} numberOfLines={2}>
          {currentTier.description[achievement.lang] || currentTier.description['zh-CN']}
        </Text>

        {/* 进度条：显示下一个未解锁 tier 的进度 */}
        {(() => {
          const nextTier = seriesItems.find(s => !s.unlocked);
          if (nextTier && nextTier.progress && nextTier.progress.target > 0) {
            return (
              <View style={styles.progressContainer}>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${Math.min(nextTier.progress.percent, 100)}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {nextTier.progress.current}/{nextTier.progress.target}
                </Text>
              </View>
            );
          }
          return null;
        })()}

        {anyUnlocked && currentTier.xpReward > 0 && (
          <Text style={styles.xpReward}>+{currentTier.xpReward} XP</Text>
        )}

        {anyUnlocked && currentTier.rarityPercent != null && currentTier.rarityPercent > 0 && (
          <Text style={styles.rarityPercentText}>
            {achievement.t('achievement.rarityPercent', { percent: currentTier.rarityPercent.toFixed(1) })}
          </Text>
        )}
      </View>
    );
  };

  const renderCountdownLabel = (item: AchievementInfo) => {
    if (!item.availableUntil) return null;
    const endDate = new Date(item.availableUntil);
    const now = new Date();
    const diffMs = endDate.getTime() - now.getTime();
    if (diffMs <= 0) return null;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return (
      <View style={styles.countdownBadge}>
        <Text style={styles.countdownText}>
          {diffDays <= 1 ? achievement.t('achievement.endingSoon') : achievement.t('achievement.daysLeft', { days: diffDays })}
        </Text>
      </View>
    );
  };

  const renderSingleCard = (item: AchievementInfo) => (
    <View
      key={item.id}
      style={[
        styles.achievementCard,
        !item.unlocked && styles.achievementCardLocked,
      ]}
    >
      {renderRarityBadge(item.rarity)}
      {(item.isLimited || item.seasonCode) && renderCountdownLabel(item)}

      <View
        style={[
          styles.achievementIconWrap,
          item.unlocked
            ? { backgroundColor: theme.colors.primary + '20' }
            : { backgroundColor: theme.colors.border.light },
        ]}
      >
        <Icon
          name={item.icon}
          size={28}
          color={item.unlocked ? theme.colors.primary : theme.colors.text.disabled}
        />
      </View>
      <Text
        style={[
          styles.achievementName,
          !item.unlocked && styles.achievementNameLocked,
        ]}
        numberOfLines={1}
      >
        {item.name[achievement.lang] || item.name['zh-CN']}
      </Text>
      <Text style={styles.achievementDesc} numberOfLines={2}>
        {item.description[achievement.lang] || item.description['zh-CN']}
      </Text>
      {!item.unlocked && item.progress && item.progress.target > 0 && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.min(item.progress.percent, 100)}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {item.progress.current}/{item.progress.target}
          </Text>
        </View>
      )}
      {item.unlocked && item.xpReward > 0 && (
        <Text style={styles.xpReward}>+{item.xpReward} XP</Text>
      )}
      {item.unlocked && item.rarityPercent != null && item.rarityPercent > 0 && (
        <Text style={styles.rarityPercentText}>
          {achievement.t('achievement.rarityPercent', { percent: item.rarityPercent.toFixed(1) })}
        </Text>
      )}
    </View>
  );

  if (achievement.isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <LoadingView />
      </SafeAreaView>
    );
  }

  if (achievement.error) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <ErrorView message={achievement.error} onRetry={achievement.reload} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 等级卡片 */}
        {achievement.level && (
          <View style={styles.levelCard}>
            <View style={styles.levelHeader}>
              <View style={styles.levelBadge}>
                <Text style={styles.levelNumber}>{achievement.level.level}</Text>
              </View>
              <View style={styles.levelInfo}>
                <Text style={styles.levelTitle}>
                  {achievement.lang === 'zh-CN' ? achievement.level.title : achievement.level.titleEn}
                </Text>
                <Text style={styles.levelSubtitle}>
                  Lv.{achievement.level.level} · {achievement.level.xp} XP
                </Text>
              </View>
            </View>
            {!achievement.level.isMaxLevel && (
              <View style={styles.xpBarContainer}>
                <View style={styles.xpBarBackground}>
                  <View
                    style={[
                      styles.xpBarFill,
                      { width: `${Math.min((achievement.level.xpInCurrentLevel / achievement.level.xpForNextLevel) * 100, 100)}%` },
                    ]}
                  />
                </View>
                <Text style={styles.xpText}>
                  {achievement.level.xpInCurrentLevel} / {achievement.level.xpForNextLevel} XP
                </Text>
              </View>
            )}
          </View>
        )}

        {/* 成就统计 */}
        <View style={styles.statsRow}>
          <Text style={styles.statsText}>
            {achievement.t('achievement.progress', { unlocked: achievement.unlockedCount, total: achievement.totalCount })}
          </Text>
        </View>

        {/* Tab 过滤栏（仅在有赛季/限时成就时显示） */}
        {achievement.availableFilters.length > 1 && (
          <View style={styles.filterRow}>
            {achievement.availableFilters.map((f: AchievementFilter) => (
              <TouchableOpacity
                key={f}
                style={[
                  styles.filterTab,
                  achievement.filter === f && styles.filterTabActive,
                ]}
                onPress={() => achievement.setFilter(f)}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    achievement.filter === f && styles.filterTabTextActive,
                  ]}
                >
                  {FILTER_LABELS[f]?.[achievement.lang] || f}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* 按分类展示成就（阶梯分组） */}
        {CATEGORY_ORDER.map(category => {
          const items = achievement.achievements.filter(a => a.category === category);
          if (items.length === 0) return null;
          const groups = groupBySeries(items);

          return (
            <View key={category} style={styles.categorySection}>
              <Text style={styles.categoryTitle}>
                {CATEGORY_LABELS[category]?.[achievement.lang] || category}
              </Text>
              <View style={styles.achievementGrid}>
                {groups.map(group => {
                  if (group.type === 'series') {
                    return renderSeriesCard(group.items);
                  } else {
                    return renderSingleCard(group.item);
                  }
                })}
              </View>
            </View>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
