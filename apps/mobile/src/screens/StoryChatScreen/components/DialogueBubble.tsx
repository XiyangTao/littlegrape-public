import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import type { PronunciationWord } from '@/types/storyMode';

interface Props {
  character: string;
  characterName: string;
  line: string;
  translation?: string;
  avatarUrl?: string;
  isUser?: boolean;
  onPlayTTS?: () => void;
  isTTSPlaying?: boolean;
  voiceUri?: string;
  voiceDuration?: number;
  onPlayVoice?: () => void;
  isVoicePlaying?: boolean;
  pronunciationWords?: PronunciationWord[];
}

const CHARACTER_COLORS: Record<string, string> = {
  mia: '#FF9500',
  mr_johnson: '#5E5CE6',
  alex: '#4A90D9',
  emma: '#E85D75',
  margaret: '#FF6B81',
  sophie: '#AF52DE',
  mike: '#34C759',
  jack: '#FF453A',
  oliver: '#5E5CE6',
  user: '#7C5CFC',
};

const CHARACTER_EMOJIS: Record<string, string> = {
  mia: '👧',
  mr_johnson: '👨‍🏫',
  alex: '🧑‍🦱',
  emma: '👩',
  margaret: '👵',
  sophie: '💁‍♀️',
  mike: '💪',
  jack: '🎸',
  oliver: '🎩',
  user: '🧑',
};

export default function DialogueBubble({
  character,
  characterName,
  line,
  translation,
  avatarUrl,
  isUser,
  onPlayTTS,
  isTTSPlaying,
  voiceUri,
  onPlayVoice,
  isVoicePlaying,
  pronunciationWords,
}: Props) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const avatarColor = CHARACTER_COLORS[character] || theme.colors.primary;
  const emoji = CHARACTER_EMOJIS[character] || '👤';
  const [showTranslation, setShowTranslation] = useState(false);

  const avatar = (
    <View style={[styles.avatar, { backgroundColor: avatarColor + '20' }]}>
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
      ) : (
        <Text style={styles.avatarEmoji}>{emoji}</Text>
      )}
    </View>
  );

  const ttsIcon = (playing: boolean, onPress: () => void) => (
    <TouchableOpacity onPress={onPress} style={styles.ttsButton}>
      <Ionicons
        name={playing ? 'volume-high' : 'volume-medium-outline'}
        size={16}
        color={playing ? theme.colors.primary : theme.colors.text.secondary}
      />
    </TouchableOpacity>
  );

  // ========== 用户消息（右对齐） ==========
  if (isUser) {
    return (
      <View style={styles.row}>
        <View style={styles.bubbleAreaUser}>
          <Text style={styles.nameRight}>{characterName}</Text>
          <TouchableOpacity
            style={styles.bubble}
            onPress={() => translation && setShowTranslation(!showTranslation)}
            activeOpacity={translation ? 0.6 : 1}
          >
            <View style={styles.bubbleContent}>
              {pronunciationWords ? (
                <Text style={styles.text}>
                  {pronunciationWords.map((w, i) => (
                    <Text
                      key={i}
                      style={[
                        styles.pronunciationWord,
                        w.errorType === 'Omission'
                          ? styles.pronunciationOmission
                          : w.accuracyScore >= 80
                            ? styles.pronunciationGood
                            : w.accuracyScore >= 60
                              ? styles.pronunciationFair
                              : styles.pronunciationPoor,
                      ]}
                    >
                      {w.word}{' '}
                    </Text>
                  ))}
                </Text>
              ) : (
                <Text style={styles.text}>{line}</Text>
              )}
              {showTranslation && translation && (
                <Text style={styles.translation}>{translation}</Text>
              )}
            </View>
            {voiceUri && onPlayVoice && ttsIcon(!!isVoicePlaying, onPlayVoice)}
          </TouchableOpacity>
        </View>
        {avatar}
      </View>
    );
  }

  // ========== NPC 消息（左对齐） ==========
  return (
    <View style={styles.row}>
      {avatar}
      <View style={styles.bubbleAreaNpc}>
        <Text style={styles.nameLeft}>{characterName}</Text>
        <TouchableOpacity
          style={styles.bubbleNpc}
          onPress={() => translation && setShowTranslation(!showTranslation)}
          activeOpacity={translation ? 0.6 : 1}
        >
          {onPlayTTS && ttsIcon(!!isTTSPlaying, onPlayTTS)}
          <View style={styles.bubbleContent}>
            <Text style={styles.text}>{line}</Text>
            {showTranslation && translation && (
              <Text style={styles.translation}>{translation}</Text>
            )}
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const AVATAR_SIZE = 36;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
    },
    avatar: {
      width: theme.scale(AVATAR_SIZE),
      height: theme.scale(AVATAR_SIZE),
      borderRadius: theme.scale(AVATAR_SIZE / 2),
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarImage: {
      width: theme.scale(AVATAR_SIZE),
      height: theme.scale(AVATAR_SIZE),
      borderRadius: theme.scale(AVATAR_SIZE / 2),
    },
    avatarEmoji: {
      fontSize: theme.fontScale(20),
    },
    bubbleAreaNpc: {
      flex: 1,
      marginLeft: theme.spacing.sm,
      marginRight: theme.scale(AVATAR_SIZE) + theme.spacing.sm,
    },
    bubbleAreaUser: {
      flex: 1,
      alignItems: 'flex-end',
      marginRight: theme.spacing.sm,
      marginLeft: theme.scale(AVATAR_SIZE) + theme.spacing.sm,
    },
    nameLeft: {
      fontSize: theme.typography.fontSize.xxs,
      color: theme.colors.text.tertiary,
      marginBottom: 2,
    },
    nameRight: {
      fontSize: theme.typography.fontSize.xxs,
      color: theme.colors.text.tertiary,
      marginBottom: 2,
    },
    bubbleNpc: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.spacing.borderRadius.base,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    bubble: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.spacing.borderRadius.base,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    bubbleContent: {
      flexShrink: 1,
    },
    text: {
      fontSize: theme.typography.fontSize.base,
      lineHeight: theme.typography.fontSize.base * 1.5,
      color: theme.colors.text.primary,
    },
    translation: {
      fontSize: theme.typography.fontSize.xs,
      lineHeight: theme.typography.fontSize.xs * 1.5,
      color: theme.colors.text.tertiary,
      marginTop: 4,
    },
    ttsButton: {
      marginTop: 2,
    },
    pronunciationWord: {
      fontWeight: theme.typography.fontWeight.semibold,
    },
    pronunciationGood: {
      color: theme.colors.success,
    },
    pronunciationFair: {
      color: theme.colors.warning,
    },
    pronunciationPoor: {
      color: theme.colors.error,
    },
    pronunciationOmission: {
      color: theme.colors.text.disabled,
    },
  });
