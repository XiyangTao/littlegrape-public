import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeProvider';
import Icon from '@/components/Icon';
import { createStyles } from './styles';
import { useDiscover } from './useDiscover';
import { BANNERS, CONTENT_ITEMS } from './mockData';

const RANK_MEDALS = ['', '\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49'];

export default function DiscoverScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const {
    navigation,
    t,
    activeBanner,
    bannerRef,
    handleBannerScroll,
    dailyWord,
    isWordFavorited,
    toggleFavorite,
    recommendedUsers,
    weeklyStars,
    SCREEN_WIDTH,
  } = useDiscover();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 搜索框 */}
      <TouchableOpacity
        style={styles.searchBar}
        onPress={() => navigation.navigate('WordSearch')}
        activeOpacity={0.7}
      >
        <Icon name="search" size={20} color={theme.colors.text.tertiary} />
        <Text style={styles.searchText}>{t('discover.searchPlaceholder')}</Text>
      </TouchableOpacity>

      {/* Banner 轮播 */}
      <View style={styles.bannerContainer}>
        <ScrollView
          ref={bannerRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleBannerScroll}
        >
          {BANNERS.map((banner, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => navigation.navigate(banner.route)}
              activeOpacity={0.8}
              style={styles.bannerPage}
            >
              <LinearGradient
                colors={theme.colors.gradient[banner.gradient]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.bannerCard}
              >
                <View style={styles.bannerIconWrap}>
                  <Icon name={banner.icon} size={32} color={theme.colors.text.inverse} />
                </View>
                <View style={styles.bannerContent}>
                  <Text style={styles.bannerTitle}>{t(banner.titleKey)}</Text>
                  <Text style={styles.bannerDesc}>{t(banner.descKey)}</Text>
                </View>
                <Icon name="chevron-right" size={24} color="rgba(255,255,255,0.7)" />
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.dotsRow}>
          {BANNERS.map((_, idx) => (
            <View
              key={idx}
              style={[styles.dot, idx === activeBanner && styles.dotActive]}
            />
          ))}
        </View>
      </View>

      {/* 每日一词 */}
      <Text style={styles.sectionTitle}>{t('discover.dailyWord')}</Text>
      <View style={styles.dailyWordCard}>
        <View style={styles.dailyWordHeader}>
          <View style={styles.dailyWordBadge}>
            <Icon name="auto-awesome" size={16} color={theme.colors.primary} />
            <Text style={styles.dailyWordBadgeText}>{t('discover.dailyWord')}</Text>
          </View>
          <TouchableOpacity onPress={() => {/* TODO: TTS */}}>
            <Icon name="volume-up" size={22} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.wordRow}>
          <Text style={styles.wordText}>{dailyWord.word}</Text>
          <Text style={styles.phoneticText}>{dailyWord.phonetic}</Text>
        </View>
        <Text style={styles.meaningText}>{dailyWord.meaning}</Text>
        <Text style={styles.exampleText}>{dailyWord.example}</Text>
        <Text style={styles.exampleTranslation}>{dailyWord.exampleTranslation}</Text>

        <View style={styles.dailyWordActions}>
          <TouchableOpacity
            style={[styles.dailyWordActionBtn, isWordFavorited && styles.dailyWordActionBtnActive]}
            onPress={toggleFavorite}
          >
            <Icon
              name={isWordFavorited ? 'favorite' : 'favorite-border'}
              size={16}
              color={isWordFavorited ? theme.colors.primary : theme.colors.text.secondary}
            />
            <Text style={[styles.dailyWordActionText, isWordFavorited && styles.dailyWordActionTextActive]}>
              {t('discover.collectWord')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dailyWordActionBtn}
            onPress={() => navigation.navigate('SentenceChallenge')}
          >
            <Icon name="edit" size={16} color={theme.colors.text.secondary} />
            <Text style={styles.dailyWordActionText}>{t('discover.makeSentence')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 学习内容 2×2 */}
      <Text style={styles.sectionTitle}>{t('discover.contentCategories')}</Text>
      <View style={styles.contentGrid}>
        {CONTENT_ITEMS.map((item, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.contentCard}
            onPress={() => {
              if (item.route) {
                navigation.navigate(item.route);
              } else {
                Alert.alert(t('discover.comingSoon'));
              }
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.contentIconWrap, { backgroundColor: item.color + '20' }]}>
              <Icon name={item.icon} size={24} color={item.color} />
            </View>
            <Text style={styles.contentTitle}>{t(item.titleKey)}</Text>
            <Text style={styles.contentDesc}>{t(item.descKey)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 挑战赛场 */}
      <Text style={styles.sectionTitle}>{t('discover.challengeArena')}</Text>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => navigation.navigate('DailyChallenge')}
      >
        <LinearGradient
          colors={theme.colors.gradient.featured}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.challengeCard}
        >
          <View style={styles.challengeContent}>
            <Text style={styles.challengeTitle}>{t('discover.todayChallenge')}</Text>
            <Text style={styles.challengeDesc}>{t('discover.todayChallengeDesc')}</Text>
            <View style={styles.challengeBtn}>
              <Text style={styles.challengeBtnText}>{t('discover.joinChallenge')}</Text>
            </View>
          </View>
          <View style={styles.challengeIconWrap}>
            <Icon name="emoji-events" size={28} color={theme.colors.text.inverse} />
          </View>
        </LinearGradient>
      </TouchableOpacity>
      <View style={styles.challengeEntryRow}>
        <TouchableOpacity
          style={styles.challengeEntryCard}
          onPress={() => navigation.navigate('Leaderboard')}
          activeOpacity={0.7}
        >
          <View style={[styles.challengeEntryIcon, { backgroundColor: theme.colors.warning + '20' }]}>
            <Icon name="leaderboard" size={20} color={theme.colors.warning} />
          </View>
          <Text style={styles.challengeEntryText}>{t('discover.viewLeaderboard')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.challengeEntryCard}
          onPress={() => navigation.navigate('LearningPath')}
          activeOpacity={0.7}
        >
          <View style={[styles.challengeEntryIcon, { backgroundColor: theme.colors.primary + '20' }]}>
            <Icon name="route" size={20} color={theme.colors.primary} />
          </View>
          <Text style={styles.challengeEntryText}>{t('discover.learningPath')}</Text>
        </TouchableOpacity>
      </View>

      {/* 推荐关注 */}
      <Text style={styles.sectionTitle}>{t('discover.recommendFollow')}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.recommendScroll}
      >
        {recommendedUsers.map(user => (
          <View key={user.id} style={styles.recommendCard}>
            <View style={styles.recommendAvatar}>
              <Text style={styles.recommendAvatarText}>
                {user.nickname.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.recommendName} numberOfLines={1}>{user.nickname}</Text>
            <Text style={styles.recommendStreak}>🔥 {user.streak}{t('home.streakDays')}</Text>
            <TouchableOpacity style={styles.followButton}>
              <Text style={styles.followButtonText}>{t('discover.follow')}</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {/* 本周学习之星 */}
      <Text style={styles.sectionTitle}>{t('discover.weeklyStars')}</Text>
      <View style={styles.weeklyStarList}>
        {weeklyStars.map(star => (
          <View key={star.rank} style={styles.weeklyStarItem}>
            <Text style={styles.starRank}>{RANK_MEDALS[star.rank]}</Text>
            <Text style={styles.starName}>{star.nickname}</Text>
            <Text style={styles.starCount}>
              {t('discover.wordsLearned', { count: star.learnedCount })}
            </Text>
          </View>
        ))}
        <TouchableOpacity
          style={styles.viewAllButton}
          onPress={() => navigation.navigate('Leaderboard')}
        >
          <Text style={styles.viewAllButtonText}>{t('discover.viewFullRanking')}</Text>
          <Icon name="chevron-right" size={16} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}
