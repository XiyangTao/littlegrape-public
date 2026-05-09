import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeProvider';
import Icon, { IconNames } from '@/components/Icon';
import { MEDAL_COLORS } from '@/constants/colors';
import { useLeaderboard, TAB_CONFIG, PERIOD_CONFIG } from './useLeaderboard';
import { createStyles } from './styles';

export default function LeaderboardScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const leaderboard = useLeaderboard();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={leaderboard.goBack} style={styles.backButton}>
          <Icon name={IconNames.left} size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{leaderboard.t('leaderboard.title')}</Text>
        <View style={styles.backButton} />
      </View>

      {/* 全局/好友 范围切换 */}
      <View style={styles.scopeRow}>
        <TouchableOpacity
          style={[styles.scopeButton, leaderboard.scope === 'all' && styles.scopeButtonActive]}
          onPress={() => leaderboard.setScope('all')}
        >
          <Text style={[styles.scopeText, leaderboard.scope === 'all' && styles.scopeTextActive]}>
            {leaderboard.t('leaderboard.scopeAll')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.scopeButton, leaderboard.scope === 'following' && styles.scopeButtonActive]}
          onPress={() => leaderboard.setScope('following')}
        >
          <Text style={[styles.scopeText, leaderboard.scope === 'following' && styles.scopeTextActive]}>
            {leaderboard.t('leaderboard.scopeFollowing')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 维度 Tab */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabRow}>
        {TAB_CONFIG.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabItem, leaderboard.activeTab === tab.key && styles.tabItemActive]}
            onPress={() => leaderboard.setActiveTab(tab.key)}
          >
            <Icon
              name={tab.icon}
              size={16}
              color={leaderboard.activeTab === tab.key ? theme.colors.primary : theme.colors.text.secondary}
            />
            <Text style={[styles.tabText, leaderboard.activeTab === tab.key && styles.tabTextActive]}>
              {leaderboard.t(tab.labelKey)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* 时间段选择 */}
      {leaderboard.activeTab !== 'streak' && leaderboard.activeTab !== 'xp' && (
        <View style={styles.periodRow}>
          {PERIOD_CONFIG.map(p => (
            <TouchableOpacity
              key={p.key}
              style={[styles.periodButton, leaderboard.period === p.key && styles.periodButtonActive]}
              onPress={() => leaderboard.setPeriod(p.key)}
            >
              <Text style={[styles.periodText, leaderboard.period === p.key && styles.periodTextActive]}>
                {leaderboard.t(p.labelKey)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* 我的排名 */}
      {leaderboard.myRank && (
        <View style={styles.myRankBar}>
          <Text style={styles.myRankLabel}>{leaderboard.t('leaderboard.myRank')}</Text>
          <Text style={styles.myRankValue}>#{leaderboard.myRank}</Text>
        </View>
      )}

      {/* 排行列表 */}
      {leaderboard.isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView style={styles.listContent} showsVerticalScrollIndicator={false}>
          {leaderboard.entries.map((entry) => {
            const isMe = entry.userId === leaderboard.user?.id;
            const isMedal = entry.rank <= 3;

            return (
              <TouchableOpacity
                key={entry.userId}
                style={[styles.entryCard, isMe && styles.entryCardMe]}
                onPress={() => leaderboard.navigateToUserProfile(entry.userId)}
              >
                {/* 排名 */}
                <View style={styles.rankCol}>
                  {isMedal ? (
                    <View style={[styles.medalBadge, { backgroundColor: MEDAL_COLORS[entry.rank - 1] + '30' }]}>
                      <Text style={[styles.medalText, { color: MEDAL_COLORS[entry.rank - 1] }]}>
                        {entry.rank}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.rankText}>{entry.rank}</Text>
                  )}
                </View>

                {/* 用户信息 */}
                <View style={styles.userCol}>
                  <View style={styles.avatarPlaceholder}>
                    <Icon name="person" size={20} color={theme.colors.text.tertiary} />
                  </View>
                  <Text style={[styles.nicknameText, isMe && styles.nicknameTextMe]} numberOfLines={1}>
                    {entry.nickname || leaderboard.t('leaderboard.anonymous')}
                    {isMe ? ` (${leaderboard.t('leaderboard.me')})` : ''}
                  </Text>
                </View>

                {/* 数值 */}
                <Text style={[styles.valueText, isMedal && styles.valueTextMedal]}>
                  {entry.value} {leaderboard.getValueLabel(leaderboard.activeTab)}
                </Text>
              </TouchableOpacity>
            );
          })}

          {leaderboard.entries.length === 0 && (
            <View style={styles.emptyContainer}>
              <Icon name="leaderboard" size={48} color={theme.colors.text.disabled} />
              <Text style={styles.emptyText}>{leaderboard.t('leaderboard.noData')}</Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
