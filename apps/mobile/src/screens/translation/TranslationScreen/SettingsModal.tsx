import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, Image, Animated, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import { useCharacters } from '@/stores/AppStore';
import { createStyles } from './styles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Theme } from '@/context/ThemeProvider';

interface SettingsModalProps {
  visible: boolean;
  autoPlay: boolean;
  voiceZh: string;
  voiceEn: string;
  onClose: () => void;
  onSetAutoPlay: (value: boolean) => void;
  onSetVoiceZh: (voiceId: string) => void;
  onSetVoiceEn: (voiceId: string) => void;
}

const TRACK_W = 44;
const TRACK_H = 26;
const THUMB_SIZE = 20;
const THUMB_MARGIN = 3;
const SLIDE_DISTANCE = TRACK_W - THUMB_SIZE - THUMB_MARGIN * 2;

function MiniToggle({ value, onValueChange, theme }: { value: boolean; onValueChange: (v: boolean) => void; theme: Theme }) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, { toValue: value ? 1 : 0, useNativeDriver: false, friction: 8, tension: 60 }).start();
  }, [value]);

  const trackBg = anim.interpolate({ inputRange: [0, 1], outputRange: [theme.colors.border.medium, theme.colors.primary] });
  const thumbX = anim.interpolate({ inputRange: [0, 1], outputRange: [THUMB_MARGIN, THUMB_MARGIN + SLIDE_DISTANCE] });

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={() => onValueChange(!value)}>
      <Animated.View style={[toggleStyles.track, { backgroundColor: trackBg }]}>
        <Animated.View style={[toggleStyles.thumb, { transform: [{ translateX: thumbX }] }]} />
      </Animated.View>
    </TouchableOpacity>
  );
}

const toggleStyles = StyleSheet.create({
  track: { width: TRACK_W, height: TRACK_H, borderRadius: TRACK_H / 2, justifyContent: 'center' },
  thumb: { width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: THUMB_SIZE / 2, backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 2, elevation: 2 },
});

export default function SettingsModal({
  visible,
  autoPlay,
  voiceZh,
  voiceEn,
  onClose,
  onSetAutoPlay,
  onSetVoiceZh,
  onSetVoiceEn,
}: SettingsModalProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme, insets);
  const { getCharactersByRole } = useCharacters();

  // 中文角色：精读教师（5个多语言角色）
  const zhCharacters = getCharactersByRole('reading_teacher');
  // 英文角色：对话角色（8个英文角色）
  const enCharacters = getCharactersByRole('conversation');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
          <Text style={styles.modalTitle}>{t('translation.broadcastSettings')}</Text>

          {/* 自动播放开关 */}
          <View style={styles.autoPlayRow}>
            <Text style={styles.autoPlayLabel}>{t('translation.autoPlayResult')}</Text>
            <MiniToggle value={autoPlay} onValueChange={onSetAutoPlay} theme={theme} />
          </View>
          <Text style={styles.autoPlayHint}>{t('translation.autoPlayHint')}</Text>

          <View style={styles.modalDivider} />

          {/* 中文音色 */}
          <Text style={styles.voiceSectionTitle}>{t('translation.chineseVoice')}</Text>
          <View style={styles.voiceOptions}>
            {zhCharacters.map((char) => (
              <TouchableOpacity
                key={char.id}
                style={[
                  styles.voiceOption,
                  voiceZh === char.id && styles.voiceOptionSelected,
                ]}
                onPress={() => onSetVoiceZh(char.id)}
              >
                {char.avatar ? (
                  <Image source={{ uri: char.avatar }} style={styles.voiceAvatar} />
                ) : null}
                <Text style={[
                  styles.voiceOptionText,
                  voiceZh === char.id && styles.voiceOptionTextSelected,
                ]}>
                  {char.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 英文音色 */}
          <Text style={styles.voiceSectionTitle}>{t('translation.englishVoice')}</Text>
          <View style={styles.voiceOptions}>
            {enCharacters.map((char) => (
              <TouchableOpacity
                key={char.id}
                style={[
                  styles.voiceOption,
                  voiceEn === char.id && styles.voiceOptionSelected,
                ]}
                onPress={() => onSetVoiceEn(char.id)}
              >
                {char.avatar ? (
                  <Image source={{ uri: char.avatar }} style={styles.voiceAvatar} />
                ) : null}
                <Text style={[
                  styles.voiceOptionText,
                  voiceEn === char.id && styles.voiceOptionTextSelected,
                ]}>
                  {char.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={onClose}
          >
            <Text style={styles.modalCloseButtonText}>{t('translation.done')}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
