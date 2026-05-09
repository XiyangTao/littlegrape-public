import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import Icon from '@/components/Icon';
import { TranslationResult } from '@/hooks/useTranslation';
import { formatVoiceDuration } from '@/utils/formatters';
import { LANGUAGES } from './constants';
import { createStyles } from './styles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface TranslationCardProps {
  result: TranslationResult;
  playingVoiceId: string | null;
  playingTTSId: string | null;
  onPlayVoice: (result: TranslationResult) => void;
  onPlayTTS: (result: TranslationResult) => void;
}

export default React.memo(function TranslationCard({
  result,
  playingVoiceId,
  playingTTSId,
  onPlayVoice,
  onPlayTTS,
}: TranslationCardProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme, insets);

  const [copiedField, setCopiedField] = useState<'source' | 'target' | null>(null);
  const copiedTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  const handleCopy = useCallback((text: string, field: 'source' | 'target') => {
    Clipboard.setStringAsync(text);
    setCopiedField(field);
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = setTimeout(() => setCopiedField(null), 1500);
  }, []);

  const sourceLabel = result.sourceLanguageCode
    ? LANGUAGES[result.sourceLanguageCode]?.name || result.sourceLanguageCode
    : t('translation.sourceLanguage');
  const targetLabel = result.targetLanguageCode
    ? LANGUAGES[result.targetLanguageCode]?.name || result.targetLanguageCode
    : t('translation.targetLanguage');

  const isVoice = result.source === 'voice' && !!result.audioUri;
  const isPlaying = playingVoiceId === result.id;
  const isTTSPlaying = playingTTSId === result.id;
  const isDone = result.status === 'done';
  const isError = result.status === 'error';
  const isPending = result.status === 'pending';

  return (
    <View style={styles.cardContainer}>
      {/* 源文本区域 */}
      <View style={styles.sourceSection}>
        <View style={styles.sourceLabelRow}>
          <Text style={styles.languageLabel}>{sourceLabel}</Text>
          {isVoice && (
            <View style={styles.voiceBadge}>
              <Icon name="mic" size={10} color={theme.colors.primary} />
              <Text style={styles.voiceBadgeText}>{t('translation.voice')}</Text>
            </View>
          )}
        </View>
        {isPending && !result.sourceText ? (
          <View style={styles.pendingRow}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.pendingText}>{t('translation.recognizing')}</Text>
          </View>
        ) : (
          <Text style={styles.sourceText}>{result.sourceText}</Text>
        )}
      </View>

      {/* 分隔线 */}
      <View style={styles.dividerRow}>
        <View style={styles.dividerAccent} />
        <View style={styles.dividerLine} />
      </View>

      {/* 翻译区域 */}
      <View style={styles.translationSection}>
        <Text style={styles.translationLabel}>{targetLabel}</Text>
        {isPending ? (
          <View style={styles.pendingRow}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.pendingText}>{t('translation.translating')}</Text>
          </View>
        ) : isError ? (
          <Text style={styles.translationError}>{result.translatedText}</Text>
        ) : (
          <Text style={styles.translationText}>{result.translatedText}</Text>
        )}
      </View>

      {/* 操作栏 - 仅 done 状态显示 */}
      {isDone && (
        <View style={styles.actionBar}>
          {/* 播放原声按钮（仅语音输入） */}
          {isVoice && (
            <TouchableOpacity
              style={styles.voicePlayBtn}
              onPress={() => onPlayVoice(result)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon
                name={isPlaying ? 'pause' : 'play-arrow'}
                size={14}
                color={theme.colors.primary}
              />
              <Text style={styles.voicePlayBtnText}>
                {formatVoiceDuration(result.voiceDuration || 0)}
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.actionSpacer} />

          {/* 操作按钮组 */}
          <View style={styles.actionBtnGroup}>
            {/* 复制原文 */}
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleCopy(result.sourceText, 'source')}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            >
              <Icon
                name={copiedField === 'source' ? 'check' : 'content-copy'}
                size={14}
                color={copiedField === 'source' ? theme.colors.success : theme.colors.text.tertiary}
              />
              <Text style={copiedField === 'source' ? styles.actionBtnTextCopied : styles.actionBtnText}>
                {copiedField === 'source' ? t('translation.copied') : t('translation.sourceText')}
              </Text>
            </TouchableOpacity>

            {/* 复制译文 */}
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleCopy(result.translatedText, 'target')}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            >
              <Icon
                name={copiedField === 'target' ? 'check' : 'content-copy'}
                size={14}
                color={copiedField === 'target' ? theme.colors.success : theme.colors.text.tertiary}
              />
              <Text style={copiedField === 'target' ? styles.actionBtnTextCopied : styles.actionBtnText}>
                {copiedField === 'target' ? t('translation.copied') : t('translation.translatedText')}
              </Text>
            </TouchableOpacity>

            {/* TTS 播放 */}
            <TouchableOpacity
              style={styles.ttsBtn}
              onPress={() => onPlayTTS(result)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Icon
                name={isTTSPlaying ? 'stop' : 'volume-up'}
                size={18}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
});
