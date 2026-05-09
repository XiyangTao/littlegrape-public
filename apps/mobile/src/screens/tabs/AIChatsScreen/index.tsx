import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Modal, Animated, StyleSheet } from 'react-native';
import { MaterialIcons } from '@react-native-vector-icons/material-icons';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { PremiumBadge } from '@/components/PremiumBadge';
import { CHARACTER_EMOJIS } from '@/data/storyMockData';
import { createStyles } from './styles';
import { useAIChats } from './useAIChats';
import type { ChatCharacterItem } from './useAIChats';

export default function AIChatsScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const navigation = useNavigation();
  const audioPlayer = useAudioPlayer();
  const [playingCharId, setPlayingCharId] = useState<string | null>(null);
  const audioPlayerRef = useRef(audioPlayer);
  audioPlayerRef.current = audioPlayer;

  // 离开页面时停止播放
  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      audioPlayerRef.current.stop();
      setPlayingCharId(null);
    });
    return unsubscribe;
  }, [navigation]);

  // 播放结束时清除 playingCharId（排除加载中状态）
  useEffect(() => {
    if (!audioPlayer.isPlaying && !audioPlayer.isLoading && playingCharId) {
      setPlayingCharId(null);
    }
  }, [audioPlayer.isPlaying, audioPlayer.isLoading, playingCharId]);

  const handlePlayGreeting = useCallback((charId: string, audioUrl: string) => {
    const player = audioPlayerRef.current;
    if (playingCharId === charId && player.isPlaying) {
      player.stop();
      setPlayingCharId(null);
    } else {
      setPlayingCharId(charId);
      player.play(audioUrl);
    }
  }, [playingCharId]);

  const {
    t,
    chatCharacters,
    handleStartScenario,
    handleCharacterPress,
    aiChatLocked,
    connectingCharacter,
  } = useAIChats();

  // ==================== 角色卡片渲染 ====================
  const renderCharacterCard = (item: ChatCharacterItem) => {
    const { character, themeColor, emoji, isUnlocked, unlockConditionKey } = item;

    return (
      <TouchableOpacity
        key={character.id}
        style={[styles.characterCard, !isUnlocked && styles.characterCardLocked]}
        onPress={() => isUnlocked && handleCharacterPress(character.id)}
        activeOpacity={isUnlocked ? 0.7 : 1}
      >
        <View style={[styles.characterThemeBar, { backgroundColor: themeColor }]} />

        {character.avatar ? (
          <Image source={{ uri: character.avatar }} style={styles.characterAvatar} />
        ) : (
          <View style={[styles.characterAvatarPlaceholder, { backgroundColor: themeColor + '20' }]}>
            <Text style={styles.characterAvatarEmoji}>
              {emoji}
            </Text>
          </View>
        )}

        <View style={styles.characterInfo}>
          <Text style={styles.characterName}>{character.name}</Text>
          <Text style={styles.characterDescription} numberOfLines={1}>
            {character.description}
          </Text>
          <View style={styles.catchphraseRow}>
            {character.greetingAudio && (() => {
              const isThisChar = playingCharId === character.id;
              const isLoading = isThisChar && audioPlayer.isLoading;
              const isPlaying = isThisChar && audioPlayer.isPlaying;
              return (
                <TouchableOpacity
                  onPress={() => handlePlayGreeting(character.id, character.greetingAudio!)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {isLoading ? (
                    <ActivityIndicator size={12} color={theme.colors.primary} />
                  ) : (
                    <Ionicons
                      name={isPlaying ? 'volume-high' : 'volume-medium-outline'}
                      size={14}
                      color={isPlaying ? theme.colors.primary : theme.colors.text.tertiary}
                    />
                  )}
                </TouchableOpacity>
              );
            })()}
            <Text style={styles.catchphraseText} numberOfLines={1}>
              {character.catchphrase}
            </Text>
          </View>
        </View>

        {isUnlocked ? (
          <MaterialIcons
            name="chevron-right"
            size={20}
            color={theme.colors.text.tertiary}
            style={styles.chevronIcon}
          />
        ) : (
          <View style={styles.lockIcon}>
            <MaterialIcons name="lock" size={16} color={theme.colors.text.disabled} />
            {unlockConditionKey && (
              <Text style={styles.unlockCondition}>
                {t(`aiChats.${unlockConditionKey}`)}
              </Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 页面标题 */}
        <View style={styles.pageHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.pageTitle}>{t('aiChats.title')}</Text>
            {aiChatLocked && <PremiumBadge size="md" />}
          </View>
        </View>

        <View style={styles.characterList}>
          {chatCharacters.map(renderCharacterCard)}
        </View>
      </ScrollView>

      {/* 首次对话过渡动画 */}
      <ConnectingOverlay character={connectingCharacter} theme={theme} t={t} />
    </>
  );
}

// ==================== 过渡动画组件 ====================

function ConnectingOverlay({ character, theme, t }: {
  character: import('@/types/conversation').Character | null;
  theme: Theme;
  t: (key: string) => string;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const dotAnim1 = useRef(new Animated.Value(0)).current;
  const dotAnim2 = useRef(new Animated.Value(0)).current;
  const dotAnim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (character) {
      // 淡入
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      // 头像脉冲
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      pulse.start();

      // 三个点依次跳动
      const dotLoop = Animated.loop(
        Animated.stagger(200, [
          Animated.sequence([
            Animated.timing(dotAnim1, { toValue: -6, duration: 300, useNativeDriver: true }),
            Animated.timing(dotAnim1, { toValue: 0, duration: 300, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(dotAnim2, { toValue: -6, duration: 300, useNativeDriver: true }),
            Animated.timing(dotAnim2, { toValue: 0, duration: 300, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(dotAnim3, { toValue: -6, duration: 300, useNativeDriver: true }),
            Animated.timing(dotAnim3, { toValue: 0, duration: 300, useNativeDriver: true }),
          ]),
        ])
      );
      dotLoop.start();

      return () => {
        pulse.stop();
        dotLoop.stop();
      };
    } else {
      fadeAnim.setValue(0);
      pulseAnim.setValue(1);
    }
  }, [character]);

  if (!character) return null;

  const os = overlayStyles(theme);

  return (
    <Modal transparent visible animationType="none">
      <Animated.View style={[os.backdrop, { opacity: fadeAnim }]}>
        <View style={os.card}>
          {/* 头像 */}
          <Animated.View style={[os.avatarWrapper, { transform: [{ scale: pulseAnim }] }]}>
            {character.avatar ? (
              <Image source={{ uri: character.avatar }} style={os.avatar} />
            ) : (
              <View style={[os.avatar, os.avatarPlaceholder]}>
                <Text style={os.avatarEmoji}>{CHARACTER_EMOJIS[character.id] || '💬'}</Text>
              </View>
            )}
          </Animated.View>

          {/* 角色名 */}
          <Text style={os.name}>{character.name}</Text>

          {/* 跳动的三个点 */}
          <View style={os.dotsRow}>
            {[dotAnim1, dotAnim2, dotAnim3].map((anim, i) => (
              <Animated.View
                key={i}
                style={[os.dot, { transform: [{ translateY: anim }] }]}
              />
            ))}
          </View>

          {/* 提示文字 */}
          <Text style={os.hint}>{t('aiChats.connecting')}</Text>
        </View>
      </Animated.View>
    </Modal>
  );
}

const overlayStyles = (theme: Theme) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.spacing.borderRadius.xl,
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing['2xl'],
    alignItems: 'center',
    ...theme.spacing.shadows.sm,
    minWidth: 200,
  },
  avatarWrapper: {
    marginBottom: theme.spacing.md,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarPlaceholder: {
    backgroundColor: theme.colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEmoji: {
    fontSize: 32,
  },
  name: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: theme.spacing.sm,
    height: 20,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  hint: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
  },
});
