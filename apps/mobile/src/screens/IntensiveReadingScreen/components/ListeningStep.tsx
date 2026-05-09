import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import Icon from '@/components/Icon';
import { createStyles } from '../styles';
import { Theme } from '@/context/ThemeProvider';

import type { ArticleParagraph } from '@/api/modules/reading';

interface ListeningStepProps {
  paragraphs: ArticleParagraph[];
  isPlaying: boolean;
  playbackSpeed: number;
  onTogglePlay: () => void;
  onCycleSpeed: () => void;
  onNext: () => void;
  theme: Theme;
  t: (key: string) => string;
}

export function ListeningStep({
  paragraphs,
  isPlaying,
  playbackSpeed,
  onTogglePlay,
  onCycleSpeed,
  onNext,
  theme,
  t,
}: ListeningStepProps) {
  const styles = createStyles(theme);

  return (
    <View style={{ flex: 1 }}>
      {/* 播放控制 */}
      <View style={styles.audioControls}>
        <TouchableOpacity style={styles.speedButton} onPress={onCycleSpeed} activeOpacity={0.7}>
          <Text style={styles.speedText}>{playbackSpeed}x</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.audioButton} onPress={onTogglePlay} activeOpacity={0.7}>
          <Icon
            name={isPlaying ? 'pause' : 'play-arrow'}
            size={28}
            color={theme.colors.text.inverse}
          />
        </TouchableOpacity>

        <View style={{ width: 44 }} />
      </View>

      {/* 全文展示 */}
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.contentPadding}
        showsVerticalScrollIndicator={false}
      >
        {paragraphs.map((para) => (
          <View
            key={para.index}
            style={styles.listeningParagraph}
          >
            <Text style={styles.listeningParagraphText}>
              {para.en}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.nextButton} onPress={onNext} activeOpacity={0.7}>
          <Text style={styles.nextButtonText}>{t('intensiveReading.goQuiz')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
