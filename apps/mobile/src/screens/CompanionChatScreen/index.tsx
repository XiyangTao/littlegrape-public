/**
 * 伙伴聊天界面
 * 永续对话，复用 ConversationChatScreen 的 MessageList 和样式
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, Animated, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme, Theme } from '@/context/ThemeProvider';
import Icon, { IconNames } from '@/components/Icon';
import { MaterialIcons } from '@react-native-vector-icons/material-icons';
import { Ionicons } from '@expo/vector-icons';
import { ChatInput } from '@/components/chat';
import { CustomAlert } from '@/components/CustomAlert';
import { VoiceRecordingModal } from '@/components/VoiceRecordingModal';
import MessageList from '@/screens/ConversationChatScreen/MessageList';
import { createStyles } from '@/screens/ConversationChatScreen/styles';
import { useCompanionChat } from './useCompanionChat';

type RouteParams = {
  CompanionChat: {
    characterId: string;
    characterName: string;
    voiceEngineId?: string;
    preloadedGreeting?: {
      id: string;
      text: string;
      translation?: string;
      timestamp: string;
    };
  };
};

export default function CompanionChatScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'CompanionChat'>>();
  const { characterId, characterName, voiceEngineId, preloadedGreeting } = route.params;
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const {
    inputText,
    setInputText,
    isVoiceMode,
    setIsVoiceMode,
    messages,
    isTyping,
    aiAvatar,
    user,
    streamingTTS,
    voiceInput,
    scrollViewRef,
    scrollToBottom,
    handleSendMessage,
    handlePlayTTS,
    handleTranslationUpdate,
    handleClearHistory,
    showClearAlert,
    handleConfirmClear,
    handleCancelClear,
    shouldShowTimeSeparator,
    autoPlayTTS,
    setAutoPlayTTS,
    t,
  } = useCompanionChat(characterId, voiceEngineId, preloadedGreeting);

  const [showMenu, setShowMenu] = useState(false);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.keyboardAvoidingView} behavior="padding" keyboardVerticalOffset={0}>
        {/* 顶部导航 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name={IconNames.back} size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
              {characterName}
            </Text>
            <Text style={{ fontSize: 10, color: theme.colors.text.disabled }}>{t('companion.aiGenerated')}</Text>
          </View>
          <TouchableOpacity onPress={() => setShowMenu(true)} style={styles.settingsButton}>
            <MaterialIcons name="more-vert" size={22} color={theme.colors.text.primary} />
          </TouchableOpacity>
        </View>

        {/* 消息列表 */}
        <MessageList
          messages={messages}
          isTyping={isTyping}
          voiceAvatar={aiAvatar}
          user={user}
          playingVoiceMessageId={null}
          voicePlayerIsPlaying={false}
          streamingTTSIsLoading={streamingTTS.isLoading}
          streamingTTSIsPlaying={streamingTTS.isPlaying}
          streamingTTSCurrentMessageId={streamingTTS.currentMessageId}
          scrollViewRef={scrollViewRef}
          theme={theme}
          t={t}
          shouldShowTimeSeparator={shouldShowTimeSeparator}
          onPlayVoiceMessage={() => {}}
          onPlayTTS={handlePlayTTS}
          onTranslationUpdate={handleTranslationUpdate}
        />

        {/* 输入区域 */}
        <ChatInput
          value={inputText}
          onChangeText={setInputText}
          onSend={() => handleSendMessage()}
          isVoiceMode={isVoiceMode}
          onToggleMode={() => setIsVoiceMode(!isVoiceMode)}
          voicePanHandlers={voiceInput.micPanHandlers}
          onFocus={scrollToBottom}
        />
      </KeyboardAvoidingView>

      {/* 语音录音弹窗 */}
      <VoiceRecordingModal
        visible={voiceInput.showVoiceModal}
        durationShared={voiceInput.recording.durationShared}
        isInCancelZone={voiceInput.isInCancelZone}
        isInitializing={voiceInput.recording.isInitializing}
        volumeHistoryShared={voiceInput.recording.volumeHistoryShared}
        onExitComplete={voiceInput.onVoiceModalExitComplete}
      />

      {/* 设置菜单 */}
      <ChatMenuModal
        visible={showMenu}
        autoPlayTTS={autoPlayTTS}
        theme={theme}
        t={t}
        onClose={() => setShowMenu(false)}
        onToggleAutoPlay={setAutoPlayTTS}
        onNewChat={() => {
          setShowMenu(false);
          handleClearHistory();
        }}
      />

      {/* 开启新聊天确认弹窗 */}
      <CustomAlert
        visible={showClearAlert}
        title={t('companion.newChat')}
        message={t('companion.newChatConfirm')}
        type="warning"
        confirmText={t('companion.newChatAction')}
        showCancel
        onConfirm={handleConfirmClear}
        onCancel={handleCancelClear}
      />

      {voiceInput.AlertComponent}
    </SafeAreaView>
  );
}

// ==================== 设置菜单弹窗 ====================

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

function ChatMenuModal({ visible, autoPlayTTS, theme, t, onClose, onToggleAutoPlay, onNewChat }: {
  visible: boolean;
  autoPlayTTS: boolean;
  theme: Theme;
  t: (key: string) => string;
  onClose: () => void;
  onToggleAutoPlay: (value: boolean) => void;
  onNewChat: () => void;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, friction: 9, tension: 80 }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(100);
    }
  }, [visible]);

  if (!visible) return null;

  const ms = menuStyles(theme);

  return (
    <Modal transparent visible animationType="none">
      <TouchableOpacity style={ms.backdrop} activeOpacity={1} onPress={onClose}>
        <Animated.View style={[ms.backdrop, { opacity: fadeAnim }]} />
      </TouchableOpacity>
      <Animated.View style={[ms.container, { transform: [{ translateY: slideAnim }] }]}>
        {/* 自动播放 TTS */}
        <View style={ms.menuItem}>
          <View style={ms.menuItemLeft}>
            <Ionicons name="volume-high-outline" size={20} color={theme.colors.text.primary} />
            <View>
              <Text style={ms.menuItemText}>{t('companion.autoPlayTTS')}</Text>
              <Text style={ms.menuItemHint}>{t('companion.autoPlayTTSHint')}</Text>
            </View>
          </View>
          <MiniToggle value={autoPlayTTS} onValueChange={onToggleAutoPlay} theme={theme} />
        </View>

        <View style={ms.divider} />

        {/* 开启新聊天 */}
        <TouchableOpacity style={ms.menuItem} onPress={onNewChat} activeOpacity={0.7}>
          <View style={ms.menuItemLeft}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={theme.colors.text.primary} />
            <View>
              <Text style={ms.menuItemText}>{t('companion.newChat')}</Text>
              <Text style={ms.menuItemHint}>{t('companion.newChatHint')}</Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={theme.colors.text.tertiary} />
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const menuStyles = (theme: Theme) => StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: theme.spacing.borderRadius.xl,
    borderTopRightRadius: theme.spacing.borderRadius.xl,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing['2xl'],
    paddingHorizontal: theme.spacing.lg,
    ...theme.spacing.shadows.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    flex: 1,
  },
  menuItemText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
  },
  menuItemHint: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border.light,
    marginVertical: theme.spacing.xs,
  },
});
