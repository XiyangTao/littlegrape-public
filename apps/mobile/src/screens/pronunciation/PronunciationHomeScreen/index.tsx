import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '@/components/Icon';
import { PremiumBadge } from '@/components/PremiumBadge';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import { type Phoneme } from '@/data/phonemes';
import { type PhonemeProgressRow } from '@/db/PhonemeProgressDB';
import { usePronunciationHome } from './usePronunciationHome';
import { createStyles } from './styles';

/** 星级：0=未练习, 1=已练习(分<80), 2=1次≥80, 3=2次≥80, 4=3次≥80, 5=5次≥90 */
function getProgressStars(progress: PhonemeProgressRow | undefined): number {
  if (!progress || progress.practiceCount === 0) return 0;
  switch (progress.masteryLevel) {
    case 'mastered': return 5;     // ≥5次, 综合分≥90
    case 'advanced': return 4;     // ≥3次, 综合分≥80
    case 'intermediate': return 3; // ≥2次, 综合分≥80
    case 'beginner': return 2;     // ≥1次, 综合分≥80
    default: return 1;             // 已练习, 综合分<80
  }
}

export default function PronunciationHomeScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme);

  const {
    vowels,
    consonants,
    totalPhonemes,
    progressMap,
    handlePhonemePress,
    handlePhonemePlay,
    pronunciationLocked,
  } = usePronunciationHome();

  // 统计已练习的音素数
  const practicedCount = progressMap.size;

  const renderPhonemeCard = (phoneme: Phoneme) => {
    const progress = progressMap.get(phoneme.symbol);
    const stars = getProgressStars(progress);

    return (
      <TouchableOpacity
        key={phoneme.symbol}
        style={styles.phonemeCard}
        onPress={() => handlePhonemePress(phoneme)}
        activeOpacity={0.7}
      >
        <View style={styles.phonemeCardHeader}>
          <Text style={styles.phonemeSymbol}>/{phoneme.symbol}/</Text>
          <TouchableOpacity
            style={styles.cardPlayBtn}
            onPress={() => handlePhonemePlay(phoneme)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="volume-up" size={16} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.phonemeSubInfo} numberOfLines={1}>{phoneme.name.split(' /')[0]} · {phoneme.words[0]?.word}</Text>
        <View style={styles.phonemeDifficulty}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Icon
              key={i}
              name="star"
              size={10}
              color={i < stars ? theme.colors.warning : theme.colors.border.light}
            />
          ))}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 顶部进度卡片 */}
        <LinearGradient
          colors={theme.colors.gradient.primary}
          style={styles.headerCard}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.headerTitle}>{t('learn.pronunciationTraining')}</Text>
            {pronunciationLocked && <PremiumBadge size="sm" />}
          </View>
          <Text style={styles.headerSubtitle}>
            {t('learn.pronunciationDesc')}
          </Text>
          <View style={styles.headerStatsRow}>
            <View style={styles.headerStat}>
              <Text style={styles.headerStatValue}>{totalPhonemes}</Text>
              <Text style={styles.headerStatLabel}>{t('learn.totalPhonemes')}</Text>
            </View>
            <View style={styles.headerStat}>
              <Text style={styles.headerStatValue}>{practicedCount}</Text>
              <Text style={styles.headerStatLabel}>{t('words.practiced')}</Text>
            </View>
            <View style={styles.headerStat}>
              <Text style={styles.headerStatValue}>{vowels.length}</Text>
              <Text style={styles.headerStatLabel}>{t('learn.vowels')}</Text>
            </View>
            <View style={styles.headerStat}>
              <Text style={styles.headerStatValue}>{consonants.length}</Text>
              <Text style={styles.headerStatLabel}>{t('learn.consonants')}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* 元音 */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('learn.vowels')}</Text>
          <Text style={styles.sectionCount}>{vowels.length}{t('learn.phonemeUnit')}</Text>
        </View>
        <View style={styles.phonemeGrid}>
          {vowels.map(renderPhonemeCard)}
        </View>

        {/* 辅音 */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('learn.consonants')}</Text>
          <Text style={styles.sectionCount}>{consonants.length}{t('learn.phonemeUnit')}</Text>
        </View>
        <View style={styles.phonemeGrid}>
          {consonants.map(renderPhonemeCard)}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}
