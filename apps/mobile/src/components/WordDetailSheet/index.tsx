/**
 * 单词详情底部抽屉组件
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Animated,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import type { LocalWord, LocalProgress } from '@/types/word';
import { useWordDetailSheet } from './useWordDetailSheet';
import SheetHeader from './SheetHeader';
import TagsSection from './TagsSection';
import MeaningsSection from './MeaningsSection';
import EtymologySection from './EtymologySection';
import CollocationsSection from './CollocationsSection';
import { createStyles } from './styles';

interface WordDetailSheetProps {
  visible: boolean;
  word: LocalWord | null;
  progress?: LocalProgress | null;
  currentTag?: string | null;
  isFavorited?: boolean;
  onClose: () => void;
  onFavoriteChange?: (isFavorited: boolean) => void;
  onSkipped?: (wordId: string) => void;
}

export default function WordDetailSheet({
  visible,
  word,
  progress,
  currentTag,
  isFavorited: initialFavorited,
  onClose,
  onFavoriteChange,
  onSkipped,
}: WordDetailSheetProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme, insets.bottom);

  const {
    translateY,
    backdropOpacity,
    panResponder,
    sheetHeight,
    meanings,
    etymology,
    collocations,
    tags,
    status,
    isStarred,
    isTogglingFavorite,
    handleToggleFavorite,
    tts,
    playingAccent,
    handlePlayPronunciation,
    showEtymology,
    setShowEtymology,
    showCollocations,
    setShowCollocations,
    isSkipped,
    handleSkipWord,
    AlertComponent,
    handleClose,
    getStatusColor,
    getStatusText,
    isAiWord,
  } = useWordDetailSheet({
    visible,
    word,
    progress,
    currentTag,
    initialFavorited,
    onClose,
    onFavoriteChange,
    onSkipped,
  });

  if (!word) return null;

  // 获取状态颜色
  const statusColorKey = getStatusColor(status);
  const statusColor = statusColorKey
    ? theme.colors[statusColorKey]
    : theme.colors.text.disabled;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      {/* 背景遮罩 */}
      <Animated.View
        style={[styles.backdrop, { opacity: backdropOpacity }]}
      >
        <TouchableOpacity
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={handleClose}
        />
      </Animated.View>

      {/* 抽屉内容 */}
      <Animated.View
        style={[
          styles.sheet,
          { maxHeight: sheetHeight, transform: [{ translateY }] },
        ]}
        {...panResponder.panHandlers}
      >
        {/* 拖拽条 */}
        <View style={styles.dragHandleContainer}>
          <View style={styles.dragHandle} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <SheetHeader
            word={word}
            isStarred={isStarred}
            isTogglingFavorite={isTogglingFavorite}
            onToggleFavorite={handleToggleFavorite}
            playingAccent={playingAccent}
            ttsIsLoading={tts.isLoading}
            ttsIsPlaying={tts.isPlaying}
            onPlayPronunciation={handlePlayPronunciation}
            bottomInset={insets.bottom}
            canFavorite={!isAiWord}
          />

          <TagsSection
            status={status}
            statusColor={statusColor}
            statusText={getStatusText(status)}
            tags={tags}
            bottomInset={insets.bottom}
          />

          <MeaningsSection
            word={word}
            meanings={meanings}
            bottomInset={insets.bottom}
          />

          {etymology && (
            <EtymologySection
              etymology={etymology}
              showEtymology={showEtymology}
              onToggle={() => setShowEtymology(!showEtymology)}
              bottomInset={insets.bottom}
            />
          )}

          <CollocationsSection
            collocations={collocations}
            showCollocations={showCollocations}
            onToggle={() => setShowCollocations(!showCollocations)}
            bottomInset={insets.bottom}
          />

          {/* 跳过按钮：未掌握且非跳过状态时显示；AI 兜底词无真实 wordId，隐藏避免写脏 user_word_progress */}
          {status !== 'mastered' && !isSkipped && !isAiWord && (
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkipWord}
              activeOpacity={0.7}
            >
              <Text style={styles.skipButtonText}>{t('wordBook.markMastered')}</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </Animated.View>
      {AlertComponent}
    </Modal>
  );
}
