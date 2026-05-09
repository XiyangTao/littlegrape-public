/**
 * 每日任务页面
 */
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import { createStyles } from './styles';
import { useDailyTask } from './useDailyTask';
import type { DailyTask } from '@/api/modules/dailyTask';

export default function DailyTaskScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const { t, effectiveLanguage: locale } = useI18n();
  const styles = createStyles(theme);

  const {
    isLoading,
    dailyTasks,
    weeklyTasks,
    dailyBonus,
    claimingId,
    claimingBonus,
    handleClaimTask,
    handleClaimBonus,
  } = useDailyTask();

  // ==================== Render ====================

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>{t('dailyTask.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  function renderTaskCard(task: DailyTask) {
    const progress = task.targetValue > 0 ? task.currentValue / task.targetValue : 0;
    const progressPercent = Math.min(progress, 1);
    const name = locale === 'zh-CN' ? task.nameZh : task.nameEn;

    return (
      <View
        key={task.id}
        style={[styles.taskCard, task.isClaimed && styles.taskCardCompleted]}
      >
        <Text style={styles.taskIcon}>{task.icon}</Text>
        <View style={styles.taskInfo}>
          <Text style={styles.taskName}>{name}</Text>
          <View style={styles.taskProgressRow}>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${progressPercent * 100}%`,
                    backgroundColor: task.isCompleted
                      ? theme.colors.success
                      : theme.colors.primary,
                  },
                ]}
              />
            </View>
            <Text style={styles.taskProgressText}>
              {t('dailyTask.progress', {
                current: task.currentValue,
                target: task.targetValue,
              })}
            </Text>
          </View>
        </View>
        <View style={styles.taskRight}>
          <Text style={styles.xpBadge}>+{task.xpReward} XP</Text>
          {task.isClaimed ? (
            <Text style={styles.claimedText}>{t('dailyTask.claimed')}</Text>
          ) : task.isCompleted ? (
            <TouchableOpacity
              style={[styles.claimButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => handleClaimTask(task.id)}
              disabled={claimingId === task.id}
            >
              {claimingId === task.id ? (
                <ActivityIndicator size="small" color={theme.colors.text.inverse} />
              ) : (
                <Text style={styles.claimButtonText}>{t('dailyTask.claim')}</Text>
              )}
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  }

  function renderBonusCard() {
    if (!dailyBonus) return null;

    const canClaim = dailyBonus.allCompleted && !dailyBonus.isClaimed;

    return (
      <View style={[styles.bonusCard, canClaim && styles.bonusCardActive]}>
        <View style={styles.bonusInfo}>
          <Text style={styles.bonusTitle}>{t('dailyTask.dailyBonus')}</Text>
          <Text style={styles.bonusDesc}>{t('dailyTask.dailyBonusDesc')}</Text>
        </View>
        <View style={styles.bonusRight}>
          <Text style={styles.bonusXp}>
            {t('dailyTask.bonusXp', { xp: dailyBonus.xpReward })}
          </Text>
          {dailyBonus.isClaimed ? (
            <Text style={styles.claimedText}>{t('dailyTask.bonusClaimed')}</Text>
          ) : canClaim ? (
            <TouchableOpacity
              style={[styles.claimButton, { backgroundColor: theme.colors.warning }]}
              onPress={handleClaimBonus}
              disabled={claimingBonus}
            >
              {claimingBonus ? (
                <ActivityIndicator size="small" color={theme.colors.text.inverse} />
              ) : (
                <Text style={styles.claimButtonText}>{t('dailyTask.claimBonus')}</Text>
              )}
            </TouchableOpacity>
          ) : (
            <Text style={styles.claimedText}>{t('dailyTask.notAllCompleted')}</Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('dailyTask.title')}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Daily Tasks */}
        {dailyTasks.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, styles.sectionTitleFirst]}>
              {t('dailyTask.dailyTitle')}
            </Text>
            {dailyTasks.map(renderTaskCard)}
          </>
        )}

        {/* Daily Bonus */}
        {renderBonusCard()}

        {/* Weekly Tasks */}
        {weeklyTasks.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{t('dailyTask.weeklyTitle')}</Text>
            {weeklyTasks.map(renderTaskCard)}
          </>
        )}

        {/* Empty state */}
        {dailyTasks.length === 0 && weeklyTasks.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t('dailyTask.empty')}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
