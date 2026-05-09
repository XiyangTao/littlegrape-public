import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '@/components/Icon';
import { useTheme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import { GRAMMAR_STATUS_COLORS } from '@/constants/colors';
import { type GrammarCategory, type GrammarPoint, type GrammarLevel } from '@/data/grammarPoints';
import type { GrammarPointStatus } from '@/api/modules/grammar';
import { useGrammarHome } from './useGrammarHome';
import createStyles from './styles';

const STATUS_CONFIG: Record<GrammarPointStatus, {
  icon: string;
  color: string;
  label: string;
} | null> = {
  not_started: null,
  learning: null,
  practiced: { icon: 'edit-note', color: GRAMMAR_STATUS_COLORS.practiced, label: '已练习' },
  mastered: { icon: 'check-circle', color: GRAMMAR_STATUS_COLORS.mastered, label: '已掌握' },
};

export default function GrammarHomeScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme);

  const {
    levels,
    totalPoints,
    learnedCount,
    progressMap,
    levelProgress,
    pointStatusMap,
    expandedUnit,
    toggleUnit,
    handlePointPress,
  } = useGrammarHome();

  const progressPercent = totalPoints > 0 ? Math.round((learnedCount / totalPoints) * 100) : 0;

  // ========== 语法点 ==========
  const renderPointItem = (point: GrammarPoint, category: GrammarCategory, index: number, total: number) => {
    const pointStatus = pointStatusMap[point.code];
    const statusConfig = pointStatus ? STATUS_CONFIG[pointStatus.status] : null;

    return (
      <TouchableOpacity
        key={point.code}
        style={[styles.pointItem, index === total - 1 && styles.pointItemLast]}
        onPress={() => handlePointPress(point, category)}
        activeOpacity={0.7}
      >
        <View style={styles.pointStatusIcon}>
          {statusConfig ? (
            <Icon name={statusConfig.icon as any} size={18} color={statusConfig.color} />
          ) : (
            <View style={styles.pointStatusDot} />
          )}
        </View>

        <View style={styles.pointContent}>
          <Text style={styles.pointName}>{point.nameZh}</Text>
          <Text style={styles.pointNameEn}>{point.nameEn}</Text>
        </View>

        {/* 星级显示（已练习/已掌握时） */}
        {pointStatus?.starRating != null ? (
          <View style={{ flexDirection: 'row', gap: 2, marginRight: 4 }}>
            {[1, 2, 3, 4, 5].map(i => (
              <Icon
                key={i}
                name={i <= pointStatus.starRating! ? 'star' : 'star-border'}
                size={14}
                color={i <= pointStatus.starRating! ? theme.colors.warning : theme.colors.border.light}
              />
            ))}
          </View>
        ) : pointStatus?.practiceScore != null ? (
          <Text style={[styles.pointScore, { color: statusConfig?.color || theme.colors.text.tertiary }]}>
            {pointStatus.practiceScore}分
          </Text>
        ) : null}

        <Icon name="chevron-right" size={18} color={theme.colors.text.tertiary} />
      </TouchableOpacity>
    );
  };

  // ========== 单元卡片 ==========
  const renderUnitCard = (unit: GrammarCategory, index: number, unitsInLevel: GrammarCategory[]) => {
    const isExpanded = expandedUnit === unit.code;
    const unitLearnedCount = progressMap[unit.code] || 0;
    const unitProgress = Math.round((unitLearnedCount / unit.points.length) * 100);
    const isCompleted = unitLearnedCount >= unit.points.length;
    const isFirst = index === 0;
    const isLast = index === unitsInLevel.length - 1;

    return (
      <View key={unit.code} style={styles.unitRow}>
        {/* 左侧路径线 */}
        <View style={styles.pathLineArea}>
          <View style={[
            styles.pathLineTop,
            isFirst ? styles.pathLineHidden : styles.pathLineSolid,
            !isFirst && isCompleted && { backgroundColor: unit.color + '40' },
          ]} />
          <View style={[
            styles.pathNode,
            isCompleted && styles.pathNodeCompleted,
            isCompleted && { backgroundColor: unit.color },
          ]}>
            {isCompleted && (
              <Icon name="check" size={10} color={theme.colors.text.inverse} />
            )}
          </View>
          <View style={[
            styles.pathLineBottom,
            isLast ? styles.pathLineHidden : styles.pathLineSolid,
            isCompleted && { backgroundColor: unit.color + '40' },
          ]} />
        </View>

        {/* 单元卡片 */}
        <View style={styles.unitCard}>
          <TouchableOpacity
            style={styles.unitHeader}
            onPress={() => toggleUnit(unit.code)}
            activeOpacity={0.7}
          >
            <View style={[styles.unitIconWrap, { backgroundColor: unit.color + '15' }]}>
              <Icon name={unit.icon as any} size={22} color={unit.color} />
            </View>
            <View style={styles.unitContent}>
              <Text style={styles.unitName}>{unit.nameZh}</Text>
              <Text style={styles.unitMeta}>
                {unitLearnedCount > 0
                  ? `${unitLearnedCount} / ${unit.points.length} ${t('learn.grammarPoints')}`
                  : `${unit.points.length} ${t('learn.grammarPoints')}`}
              </Text>
            </View>
            <View style={styles.unitArrow}>
              <Icon
                name={isExpanded ? 'expand-less' : 'expand-more'}
                size={22}
                color={theme.colors.text.tertiary}
              />
            </View>
          </TouchableOpacity>

          {/* 进度条 */}
          <View style={styles.unitProgressRow}>
            <View style={styles.unitProgressBar}>
              <View
                style={[
                  styles.unitProgressFill,
                  {
                    width: `${unitProgress}%` as any,
                    backgroundColor: unit.color,
                  },
                ]}
              />
            </View>
            <Text style={styles.unitProgressText}>{unitProgress}%</Text>
          </View>

          {/* 展开语法点列表 */}
          {isExpanded && (
            <View style={styles.pointsList}>
              {unit.points.map((point, idx) =>
                renderPointItem(point, unit, idx, unit.points.length)
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  // ========== 等级区块 ==========
  const renderLevel = (level: GrammarLevel) => {
    const lp = levelProgress[level.level];
    const lpPercent = lp && lp.total > 0 ? Math.round((lp.learned / lp.total) * 100) : 0;

    return (
      <View key={level.level}>
        {/* 等级标题 */}
        <View style={styles.levelHeader}>
          <View style={[styles.levelBadge, { backgroundColor: level.color }]}>
            <Text style={styles.levelBadgeText}>Lv.{level.level}</Text>
          </View>
          <Text style={styles.levelName}>{level.nameZh}</Text>
          <Text style={styles.levelProgress}>{lpPercent}%</Text>
        </View>

        {/* 单元路径 */}
        <View style={styles.pathContainer}>
          {level.units.map((unit, idx) =>
            renderUnitCard(unit, idx, level.units)
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 顶部进度卡片 */}
        <LinearGradient
          colors={['#7C5CFC', '#6366F1']}
          style={styles.headerCard}
        >
          <Text style={styles.headerTitle}>{t('learn.grammarLearning')}</Text>
          <Text style={styles.headerSubtitle}>
            {t('learn.grammarLearnedCount', { learned: learnedCount, total: totalPoints })}
          </Text>
          <View style={styles.headerProgressRow}>
            <View style={styles.headerProgressBar}>
              <View style={[styles.headerProgressFill, { width: `${progressPercent}%` as any }]} />
            </View>
            <Text style={styles.headerProgressText}>{progressPercent}%</Text>
          </View>
        </LinearGradient>

        {/* 学习路径 */}
        {levels.map(renderLevel)}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}
