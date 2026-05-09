/**
 * 头部区域：拖拽条+单词+音标+发音按钮+收藏
 */

import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import Icon from '@/components/Icon';
import type { LocalWord } from '@/types/word';
import { createStyles } from './styles';

interface SheetHeaderProps {
  word: LocalWord;
  isStarred: boolean;
  isTogglingFavorite: boolean;
  onToggleFavorite: () => void;
  playingAccent: 'us' | 'uk' | null;
  ttsIsLoading: boolean;
  ttsIsPlaying: boolean;
  onPlayPronunciation: (accent: 'us' | 'uk') => void;
  bottomInset: number;
  /** 是否允许收藏：AI 兜底词无真实 wordId，不展示收藏按钮 */
  canFavorite?: boolean;
}

export default function SheetHeader({
  word,
  isStarred,
  isTogglingFavorite,
  onToggleFavorite,
  playingAccent,
  ttsIsLoading,
  ttsIsPlaying,
  onPlayPronunciation,
  bottomInset,
  canFavorite = true,
}: SheetHeaderProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme, bottomInset);

  const hasUsPhonetic = !!word.phoneticUs;
  const hasUkPhonetic = !!word.phoneticUk;

  return (
    <>
      {/* 头部：单词、收藏（AI 兜底词无真实 wordId，隐藏收藏按钮） */}
      <View style={styles.header}>
        <Text style={styles.wordText}>{word.word}</Text>
        {canFavorite && (
          <TouchableOpacity
            style={styles.starButton}
            onPress={onToggleFavorite}
            activeOpacity={0.7}
            disabled={isTogglingFavorite}
          >
            {isTogglingFavorite ? (
              <ActivityIndicator size={22} color={theme.colors.warning} />
            ) : (
              <Icon
                name={isStarred ? 'star' : 'star-border'}
                size={26}
                color={isStarred ? theme.colors.warning : theme.colors.text.secondary}
              />
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* 音标区域：美式和英式 */}
      <View style={styles.phoneticSection}>
        {hasUsPhonetic && (
          <View style={styles.phoneticItem}>
            <TouchableOpacity
              style={[
                styles.phoneticPlayButton,
                (ttsIsLoading && playingAccent === 'us') && styles.phoneticPlayButtonLoading,
                (ttsIsPlaying && playingAccent === 'us') && styles.phoneticPlayButtonActive,
              ]}
              onPress={() => onPlayPronunciation('us')}
              activeOpacity={0.7}
              disabled={ttsIsLoading && playingAccent === 'us'}
            >
              {(ttsIsLoading && playingAccent === 'us') ? (
                <ActivityIndicator size={16} color={theme.colors.primary} />
              ) : (
                <Icon
                  name={(playingAccent === 'us' && ttsIsPlaying) ? 'stop' : 'volume-up'}
                  size={18}
                  color={(ttsIsPlaying && playingAccent === 'us') ? theme.colors.text.inverse : theme.colors.primary}
                />
              )}
            </TouchableOpacity>
            <Text style={styles.phoneticLabel}>{t('wordCard.phoneticUs')}</Text>
            <Text style={styles.phoneticText}>{word.phoneticUs}</Text>
          </View>
        )}
        {hasUkPhonetic && (
          <View style={styles.phoneticItem}>
            <TouchableOpacity
              style={[
                styles.phoneticPlayButton,
                (ttsIsLoading && playingAccent === 'uk') && styles.phoneticPlayButtonLoading,
                (ttsIsPlaying && playingAccent === 'uk') && styles.phoneticPlayButtonActive,
              ]}
              onPress={() => onPlayPronunciation('uk')}
              activeOpacity={0.7}
              disabled={ttsIsLoading && playingAccent === 'uk'}
            >
              {(ttsIsLoading && playingAccent === 'uk') ? (
                <ActivityIndicator size={16} color={theme.colors.primary} />
              ) : (
                <Icon
                  name={(playingAccent === 'uk' && ttsIsPlaying) ? 'stop' : 'volume-up'}
                  size={18}
                  color={(ttsIsPlaying && playingAccent === 'uk') ? theme.colors.text.inverse : theme.colors.primary}
                />
              )}
            </TouchableOpacity>
            <Text style={styles.phoneticLabel}>{t('wordCard.phoneticUk')}</Text>
            <Text style={styles.phoneticText}>{word.phoneticUk}</Text>
          </View>
        )}
      </View>
    </>
  );
}
