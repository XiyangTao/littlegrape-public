/**
 * 卡片正面：单词、音标、发音按钮、释义、标签
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
} from 'react-native';
import Icon from '@/components/Icon';
import { Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import type { LearnWordWithProgress } from '@/types/word';
import { getLibraryColor } from '@/constants/libraryConfig';
import { createStyles } from './styles';

interface WordCardFrontProps {
  word: LearnWordWithProgress;
  parsed: ReturnType<typeof import('@/services/WordService').parseLocalWord>;
  tts: { isLoading: boolean; isPlaying: boolean };
  theme: Theme;
  cardHeight: number;
  frontAnimatedStyle: any;
  isFlipped: boolean;
  onFlip: () => void;
  onPlayPronunciation: () => void;
}

const WordCardFront = React.memo(({
  word,
  parsed,
  tts,
  theme,
  cardHeight,
  frontAnimatedStyle,
  isFlipped,
  onFlip,
  onPlayPronunciation,
}: WordCardFrontProps) => {
  const styles = createStyles(theme, cardHeight);
  const { t } = useI18n();

  return (
    <Animated.View style={[styles.cardFace, styles.frontFace, frontAnimatedStyle]} pointerEvents={isFlipped ? 'none' : 'auto'}>
      <TouchableOpacity style={styles.flipTouchArea} onPress={onFlip} activeOpacity={1}>
        <Text style={styles.wordText} adjustsFontSizeToFit numberOfLines={1}>{word.word}</Text>

        {/* 音标 */}
        <View style={styles.phoneticRow}>
          {word.phoneticUs && (
            <View style={styles.phoneticItem}>
              <Text style={styles.phoneticLabel}>{t('wordCard.phoneticUs')}</Text>
              <Text style={styles.phoneticText}>{word.phoneticUs}</Text>
            </View>
          )}
          {word.phoneticUk && (
            <View style={styles.phoneticItem}>
              <Text style={styles.phoneticLabel}>{t('wordCard.phoneticUk')}</Text>
              <Text style={styles.phoneticText}>{word.phoneticUk}</Text>
            </View>
          )}
        </View>

        {/* 播放按钮 */}
        <TouchableOpacity
          style={[styles.playButton, tts.isPlaying && styles.playButtonActive]}
          onPress={onPlayPronunciation}
          activeOpacity={0.7}
        >
          {tts.isLoading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Icon
              name={tts.isPlaying ? 'stop' : 'volume-up'}
              size={32}
              color={tts.isPlaying ? theme.colors.text.inverse : theme.colors.primary}
            />
          )}
        </TouchableOpacity>

        {/* 主释义 */}
        <View style={styles.meaningSection}>
          <Text style={styles.meaningCnText}>{word.meaningCn}</Text>
          {word.meaningEn && <Text style={styles.meaningEnText}>{word.meaningEn}</Text>}
        </View>

        {/* 标签 */}
        {parsed.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {parsed.tags.map((tag, index) => {
              const tagColor = getLibraryColor(tag, theme.colors.primary);
              return (
                <View key={index} style={[styles.tagItem, { backgroundColor: tagColor + '20' }]}>
                  <Text style={[styles.tagText, { color: tagColor }]}>{tag}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* 翻转提示 */}
        <View style={styles.flipHint}>
          <Icon name="touch-app" size={16} color={theme.colors.text.disabled} />
          <Text style={styles.flipHintText}>{t('wordCard.flipHint')}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

export default WordCardFront;
