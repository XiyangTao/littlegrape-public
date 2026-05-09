import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/context/ThemeProvider';
import Icon, { IconNames } from '@/components/Icon';
import { ChatInput } from '@/components/chat';
import { VoiceRecordingModal } from '@/components/VoiceRecordingModal';
import { useChatSession } from './useChatSession';
import MessageList from './MessageList';
import { createStyles } from './styles';

export default function ConversationChatScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const {
    inputText,
    setInputText,
    isVoiceMode,
    setIsVoiceMode,
    showSessionInfo,
    setShowSessionInfo,
    playingVoiceMessageId,
    scrollViewRef,
    messages,
    isTyping,
    conversationTitle,
    voiceAvatar,
    user,
    streamingTTS,
    voicePlayer,
    voiceInput,
    sessionInfoItems,
    learnedWords,
    scrollToBottom,
    handleTranslationUpdate,
    handlePlayTTS,
    handlePlayVoiceMessage,
    handleSendMessage,
    shouldShowTimeSeparator,
    t,
  } = useChatSession();

  // ============ 会话信息弹窗 ============
  const renderSessionInfoModal = () => (
    <Modal
      visible={showSessionInfo}
      transparent
      animationType="slide"
      onRequestClose={() => setShowSessionInfo(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.sessionInfoContainer}>
          <View style={styles.sessionInfoHeader}>
            <Icon name={IconNames.info} size={20} color={theme.colors.primary} />
            <Text style={styles.sessionInfoTitle}>{t('conversation.sessionInfo.title')}</Text>
            <TouchableOpacity onPress={() => setShowSessionInfo(false)}>
              <Icon name={IconNames.close} size={20} color={theme.colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.sessionInfoContent} showsVerticalScrollIndicator={false}>
            {sessionInfoItems.map((item, index) => (
              <View key={index} style={styles.sessionInfoItem}>
                <Text style={styles.sessionInfoLabel}>{item.label}</Text>
                <Text style={styles.sessionInfoValue}>{item.value}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // ============ 主渲染 ============
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
              {conversationTitle || t('conversation.title')}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setShowSessionInfo(true)} style={styles.settingsButton}>
            <Icon name={IconNames.info} size={22} color={theme.colors.text.primary} />
          </TouchableOpacity>
        </View>

        {/* 消息列表 */}
        <MessageList
          messages={messages}
          isTyping={isTyping}
          voiceAvatar={voiceAvatar}
          user={user}
          playingVoiceMessageId={playingVoiceMessageId}
          voicePlayerIsPlaying={voicePlayer.isPlaying}
          streamingTTSIsLoading={streamingTTS.isLoading}
          streamingTTSIsPlaying={streamingTTS.isPlaying}
          streamingTTSCurrentMessageId={streamingTTS.currentMessageId}
          scrollViewRef={scrollViewRef}
          theme={theme}
          t={t}
          shouldShowTimeSeparator={shouldShowTimeSeparator}
          onPlayVoiceMessage={handlePlayVoiceMessage}
          onPlayTTS={handlePlayTTS}
          onTranslationUpdate={handleTranslationUpdate}
          learnedWords={learnedWords}
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

      {renderSessionInfoModal()}

      <VoiceRecordingModal
        visible={voiceInput.showVoiceModal}
        durationShared={voiceInput.recording.durationShared}
        isInCancelZone={voiceInput.isInCancelZone}
        isInitializing={voiceInput.recording.isInitializing}
        volumeHistoryShared={voiceInput.recording.volumeHistoryShared}
        onExitComplete={voiceInput.onVoiceModalExitComplete}
      />

      {voiceInput.AlertComponent}
    </SafeAreaView>
  );
}
