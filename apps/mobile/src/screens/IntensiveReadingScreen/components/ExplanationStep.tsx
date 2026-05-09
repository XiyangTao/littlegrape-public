import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import Icon from '@/components/Icon';
import { createStyles } from '../styles';
import { Theme } from '@/context/ThemeProvider';

import type { KeyWord } from '@/api/modules/reading';

interface TTSState {
  isPlaying: boolean;
  isLoading: boolean;
  currentMessageId: string | null;
}

interface ExplanationStepProps {
  explanationScript: string | null;
  keyVocabulary: KeyWord[];
  onPlayExplanation: () => void;
  ttsState: TTSState;
  articleId: string;
  onNext: () => void;
  theme: Theme;
  t: (key: string) => string;
}

export function ExplanationStep({
  explanationScript,
  keyVocabulary,
  onPlayExplanation,
  ttsState,
  articleId,
  onNext,
  theme,
  t,
}: ExplanationStepProps) {
  const styles = createStyles(theme);
  const messageId = `explanation_${articleId}`;
  const isThisPlaying = ttsState.currentMessageId === messageId && ttsState.isPlaying;
  const isThisLoading = ttsState.currentMessageId === messageId && ttsState.isLoading;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.contentPadding}
        showsVerticalScrollIndicator={false}
      >
        {/* 播放讲解按钮 */}
        {explanationScript && (
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: theme.spacing.md,
              paddingHorizontal: theme.spacing.lg,
              borderRadius: theme.spacing.borderRadius.base,
              backgroundColor: isThisPlaying ? theme.colors.primary + '15' : theme.colors.primary,
              marginBottom: theme.spacing.lg,
              gap: theme.spacing.sm,
            }}
            onPress={onPlayExplanation}
            activeOpacity={0.7}
          >
            {isThisLoading ? (
              <ActivityIndicator size={20} color={isThisPlaying ? theme.colors.primary : theme.colors.text.inverse} />
            ) : (
              <Icon
                name={isThisPlaying ? 'pause' : 'play-arrow'}
                size={24}
                color={isThisPlaying ? theme.colors.primary : theme.colors.text.inverse}
              />
            )}
            <Text style={{
              fontSize: theme.typography.fontSize.base,
              fontWeight: theme.typography.fontWeight.semibold,
              color: isThisPlaying ? theme.colors.primary : theme.colors.text.inverse,
            }}>
              {isThisLoading
                ? t('intensiveReading.audioLoading')
                : isThisPlaying
                  ? t('intensiveReading.audioPlaying')
                  : t('intensiveReading.listenExplanation')}
            </Text>
          </TouchableOpacity>
        )}

        {/* 讲解文本 */}
        {explanationScript && (
          <View style={{
            backgroundColor: theme.colors.card,
            borderRadius: theme.spacing.borderRadius.base,
            padding: theme.spacing.lg,
            marginBottom: theme.spacing.lg,
          }}>
            <Text style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.text.primary,
              lineHeight: theme.fontScale(22),
            }}>
              {explanationScript}
            </Text>
          </View>
        )}

        {/* 核心生词列表 */}
        {keyVocabulary.length > 0 && (
          <View style={{
            backgroundColor: theme.colors.card,
            borderRadius: theme.spacing.borderRadius.base,
            padding: theme.spacing.lg,
            marginBottom: theme.spacing.lg,
          }}>
            <Text style={{
              fontSize: theme.typography.fontSize.base,
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.text.primary,
              marginBottom: theme.spacing.md,
            }}>
              {t('intensiveReading.coreVocabulary')}
            </Text>
            {keyVocabulary.map((word, i) => (
              <View key={i} style={{
                paddingVertical: theme.spacing.sm,
                borderTopWidth: i > 0 ? 1 : 0,
                borderTopColor: theme.colors.border.light,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.sm }}>
                  <Text style={{
                    fontSize: theme.typography.fontSize.base,
                    fontWeight: theme.typography.fontWeight.semibold,
                    color: theme.colors.primary,
                  }}>
                    {word.word}
                  </Text>
                  <Text style={{
                    fontSize: theme.typography.fontSize.xs,
                    color: theme.colors.text.tertiary,
                  }}>
                    {word.phonetic} {word.pos}
                  </Text>
                </View>
                <Text style={{
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.text.secondary,
                  marginTop: 2,
                }}>
                  {word.meaningCn}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={onNext}
          activeOpacity={0.7}
        >
          <Text style={styles.nextButtonText}>{t('intensiveReading.goListening')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
