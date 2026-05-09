import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from '@/components/Icon';
import { useTheme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import type { ExerciseType } from '@/api/modules/exercise';
import createStyles from './styles';

interface ExerciseTypeConfig {
  type: ExerciseType;
  icon: string;
  color: string;
}

interface Section {
  categoryKey: string;
  items: ExerciseTypeConfig[];
}

const SECTIONS: Section[] = [
  {
    categoryKey: 'reading',
    items: [
      { type: 'meaning_choice', icon: 'translate', color: '#3B82F6' },
      { type: 'fill_blank', icon: 'text-fields', color: '#EF4444' },
      { type: 'read_respond', icon: 'menu-book', color: '#14B8A6' },
      { type: 'immersive_fill', icon: 'auto-stories', color: '#0EA5E9' },
      { type: 'immersive_dialogue', icon: 'forum', color: '#7C3AED' },
      { type: 'immersive_reading', icon: 'chrome-reader-mode', color: '#059669' },
    ],
  },
  {
    categoryKey: 'writing',
    items: [
      { type: 'translation', icon: 'edit', color: '#8B5CF6' },
      { type: 'sentence_shuffle', icon: 'sort', color: '#10B981' },
      { type: 'complete_translation', icon: 'edit-note', color: '#F59E0B' },
      { type: 'arrange_words', icon: 'reorder', color: '#D946EF' },
    ],
  },
  {
    categoryKey: 'listening',
    items: [
      { type: 'dictation', icon: 'hearing', color: '#06B6D4' },
      { type: 'listen_choice', icon: 'headphones', color: '#6366F1' },
      { type: 'listen_fill', icon: 'spatial-audio-off', color: '#0891B2' },
      { type: 'minimal_pairs', icon: 'compare', color: '#4338CA' },
      { type: 'duo_radio', icon: 'podcasts', color: '#B45309' },
    ],
  },
  {
    categoryKey: 'speaking',
    items: [
      { type: 'read_aloud', icon: 'record-voice-over', color: '#EC4899' },
      { type: 'listen_repeat', icon: 'replay', color: '#BE185D' },
      { type: 'speak_translation', icon: 'mic', color: '#DC2626' },
      { type: 'dialogue_speaking', icon: 'people', color: '#9333EA' },
      { type: 'perfect_pronunciation', icon: 'graphic-eq', color: '#E11D48' },
    ],
  },
  {
    categoryKey: 'comprehensive',
    items: [
      { type: 'matching_pairs', icon: 'compare-arrows', color: '#F97316' },
      { type: 'timed_match', icon: 'timer', color: '#EA580C' },
      { type: 'flashcard', icon: 'style', color: '#2563EB' },
    ],
  },
  {
    categoryKey: 'advanced',
    items: [
      { type: 'story', icon: 'auto-stories', color: '#7C3AED' },
      { type: 'adventure', icon: 'explore', color: '#059669' },
    ],
  },
  {
    categoryKey: 'review',
    items: [
      { type: 'mistake_review', icon: 'refresh', color: '#DC2626' },
    ],
  },
];

export default function ExerciseHomeScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme);
  const navigation = useNavigation<any>();
  const aiGate = useFeatureGate('aiChat');

  const handlePress = useCallback((type: ExerciseType) => {
    if (!aiGate.guard()) return;
    navigation.navigate('ExerciseSession', { exerciseType: type });
  }, [aiGate, navigation]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={22} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('exercise.homeTitle')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {SECTIONS.map((section) => (
          <React.Fragment key={section.categoryKey}>
            <Text style={styles.sectionTitle}>{t(`exercise.categories.${section.categoryKey}`)}</Text>
            {section.items.map((item) => (
              <TouchableOpacity
                key={item.type}
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => handlePress(item.type)}
              >
                <View style={[styles.iconWrap, { backgroundColor: item.color + '18' }]}>
                  <Icon name={item.icon} size={22} color={item.color} />
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{t(`exercise.types.${item.type}`)}</Text>
                  <Text style={styles.cardDesc}>{t(`exercise.types.${item.type}_desc`)}</Text>
                </View>
                <Icon name="chevron-right" size={20} color={theme.colors.text.tertiary} style={styles.arrow} />
              </TouchableOpacity>
            ))}
          </React.Fragment>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
