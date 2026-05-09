/**
 * 点词查义卡片（精读 / 名著共用）
 *
 * 两个页面仅视觉差异（紫色圆角 vs 米色衬线 + 金顶 + 浮层阴影），行为一致：
 *   - 展示单词 + 音标 + 主释义 + AI 变形说明
 *   - AI pending 时显示"查询中…"
 *   - 首条义项作为主释义（不拼接长串）
 *   - 有发音 URL 时在 header 右侧显示圆形播放按钮
 *   - 出现时 slide-up + fade-in 入场动画
 *   - 支持下滑手势关闭（仅 classics 显示拖拽条）
 *
 * 通过 variant prop 切换视觉主题；逻辑（useTTS / parseLocalWord / i18n）复用。
 */
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import { useTTS } from '@/hooks/useTTS';
import Icon from '@/components/Icon';
import { parseLocalWord } from '@/db/word/helpers';
import { isPendingLookupId } from '@/utils/aiWordLookup';
import type { LocalWord } from '@/types/word';
import { createStyles, type WordLookupCardVariant } from './styles';

interface WordLookupCardProps {
  word: LocalWord;
  onClose: () => void;
  variant?: WordLookupCardVariant;
}

export default function WordLookupCard({
  word,
  onClose,
  variant = 'default',
}: WordLookupCardProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const wordTts = useTTS();

  const { styles, colors } = useMemo(() => createStyles(theme, variant), [theme, variant]);

  const parsed = useMemo(() => parseLocalWord(word), [word]);
  const parsedMeanings = parsed.meanings;
  // AI 变形说明（如"imagine 的现在分词"），仅变形词有
  const aiNotes = parsed.inflections.find(i => i.type === 'ai_notes')?.inflection || null;

  const hasAudio = !!(word.audioUrlUs || word.audioUrlUk);
  const wordPlayId = `word_${word.id}`;
  const isWordPlaying = wordTts.isPlaying && wordTts.currentMessageId === wordPlayId;
  const isPending = isPendingLookupId(word.id);

  const primary = parsedMeanings[0];
  const primaryText = primary
    ? `${primary.pos ? primary.pos + ' ' : ''}${primary.meaningCn}`
    : word.meaningCn || t('intensiveReading.noMeaning');

  // 入场动画值（初始在下方 24pt + 透明）
  const translateY = useRef(new Animated.Value(24)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        damping: 22,
        stiffness: 240,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  const handlePlayWord = useCallback(() => {
    const audioUrl = word.audioUrlUs || word.audioUrlUk;
    if (!audioUrl) return;
    wordTts.playUrl(wordPlayId, audioUrl);
  }, [word.audioUrlUs, word.audioUrlUk, wordPlayId, wordTts]);

  const handleClose = useCallback(() => {
    wordTts.stop();
    onClose();
  }, [wordTts, onClose]);

  return (
    <Animated.View
      style={[styles.card, { transform: [{ translateY }], opacity }]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.word}>{word.word}</Text>
          {!!word.phoneticUs && (
            <Text style={styles.phonetic}>{word.phoneticUs}</Text>
          )}
        </View>
        {hasAudio && (
          <TouchableOpacity
            style={[styles.playButton, isWordPlaying && styles.playButtonActive]}
            onPress={() => (isWordPlaying ? wordTts.stop() : handlePlayWord())}
            activeOpacity={0.7}
          >
            <Icon
              name={isWordPlaying ? 'stop' : 'volume-up'}
              size={18}
              color={isWordPlaying ? colors.playInverse : colors.button}
            />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.close} onPress={handleClose} activeOpacity={0.7}>
          <Icon name="close" size={20} color={colors.closeIcon} />
        </TouchableOpacity>
      </View>

      <Text style={styles.meaning} numberOfLines={2}>
        {isPending ? t('words.lookingUp') : primaryText}
      </Text>

      {!isPending && !!aiNotes && (
        <>
          {variant === 'classics' && <View style={styles.notesDivider} />}
          <Text style={styles.notes}>{aiNotes}</Text>
        </>
      )}
    </Animated.View>
  );
}
