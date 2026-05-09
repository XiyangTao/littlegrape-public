import React, { useRef, useEffect, useCallback } from 'react';
import { View, Text, FlatList } from 'react-native';
import { useTheme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import Icon from '@/components/Icon';
import { TranslationResult } from '@/hooks/useTranslation';
import TranslationCard from './TranslationCard';
import { createStyles } from './styles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface TranslationHistoryProps {
  results: TranslationResult[];
  isVoiceMode: boolean;
  onPlayTTS: (result: TranslationResult) => void;
  playingVoiceId: string | null;
  playingTTSId: string | null;
  onPlayVoice: (result: TranslationResult) => void;
}

export default function TranslationHistory({
  results,
  isVoiceMode,
  onPlayTTS,
  playingVoiceId,
  playingTTSId,
  onPlayVoice,
}: TranslationHistoryProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme, insets);
  const flatListRef = useRef<FlatList<TranslationResult>>(null);

  useEffect(() => {
    if (results.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [results.length]);

  const renderItem = useCallback(({ item }: { item: TranslationResult }) => (
    <TranslationCard
      result={item}
      playingVoiceId={playingVoiceId}
      playingTTSId={playingTTSId}
      onPlayVoice={onPlayVoice}
      onPlayTTS={onPlayTTS}
    />
  ), [playingVoiceId, playingTTSId, onPlayVoice, onPlayTTS]);

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Icon name="translate" size={36} color={theme.colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>{t('translation.startTranslation')}</Text>
      <Text style={styles.emptySubtitle}>
        {isVoiceMode
          ? t('translation.voiceHint')
          : t('translation.textHint')}
      </Text>
    </View>
  );

  return (
    <FlatList
      ref={flatListRef}
      style={styles.historyList}
      contentContainerStyle={styles.historyListContent}
      data={results}
      keyExtractor={item => item.id}
      renderItem={renderItem}
      ListEmptyComponent={renderEmpty}
      showsVerticalScrollIndicator={false}
    />
  );
}
