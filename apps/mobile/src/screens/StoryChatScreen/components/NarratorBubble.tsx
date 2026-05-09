import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  text: string;
  translation?: string;
  onPlayTTS?: () => void;
  isTTSPlaying?: boolean;
}

export default function NarratorBubble({ text, translation, onPlayTTS, isTTSPlaying }: Props) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [showTranslation, setShowTranslation] = useState(false);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => translation && setShowTranslation(!showTranslation)}
      activeOpacity={translation ? 0.6 : 1}
    >
      {onPlayTTS && (
        <TouchableOpacity onPress={onPlayTTS} style={styles.speakerButton}>
          <Ionicons
            name={isTTSPlaying ? 'volume-high' : 'volume-medium-outline'}
            size={16}
            color={isTTSPlaying ? theme.colors.primary : theme.colors.text.secondary}
          />
        </TouchableOpacity>
      )}
      <View style={styles.textWrap}>
        <Text style={styles.text}>{text}</Text>
        {showTranslation && translation && (
          <Text style={styles.translation}>{translation}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    speakerButton: {
      marginTop: 2,
    },
    textWrap: {
      flex: 1,
    },
    text: {
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.fontSize.sm * 1.6,
      color: theme.colors.text.secondary,
      fontStyle: 'italic',
    },
    translation: {
      fontSize: theme.typography.fontSize.xs,
      lineHeight: theme.typography.fontSize.xs * 1.5,
      color: theme.colors.text.tertiary,
      marginTop: 4,
    },
  });
