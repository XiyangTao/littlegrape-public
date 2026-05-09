import React from 'react';
import { View, ScrollView } from 'react-native';
import type { Message } from '@/types/conversation';
import { formatMessageTime } from '@/utils/formatters';
import {
  ChatAvatar,
  TimeSeparator,
  TypingIndicator,
  AIMessageBubble,
  UserMessageBubble,
} from '@/components/chat';
import type { LearnedWord } from '@/components/chat/HighlightedText';
import { createStyles } from './styles';
import { Theme } from '@/context/ThemeProvider';

interface MessageListProps {
  messages: Message[];
  isTyping: boolean;
  voiceAvatar: string | null;
  user: { avatar?: string; nickname?: string; username?: string } | null;
  playingVoiceMessageId: string | null;
  voicePlayerIsPlaying: boolean;
  streamingTTSIsLoading: boolean;
  streamingTTSIsPlaying: boolean;
  streamingTTSCurrentMessageId: string | null;
  scrollViewRef: React.RefObject<ScrollView | null>;
  theme: Theme;
  t: (key: string) => string;
  shouldShowTimeSeparator: (current: Message, previous: Message | null) => boolean;
  onPlayVoiceMessage: (messageId: string, voiceUri: string) => void;
  onPlayTTS: (messageId: string, text: string) => void;
  onTranslationUpdate: (messageId: string, translation: string) => void;
  learnedWords?: LearnedWord[];
}

export default function MessageList({
  messages,
  isTyping,
  voiceAvatar,
  user,
  playingVoiceMessageId,
  voicePlayerIsPlaying,
  streamingTTSIsLoading,
  streamingTTSIsPlaying,
  streamingTTSCurrentMessageId,
  scrollViewRef,
  theme,
  t,
  shouldShowTimeSeparator,
  onPlayVoiceMessage,
  onPlayTTS,
  onTranslationUpdate,
  learnedWords,
}: MessageListProps) {
  const styles = createStyles(theme);

  const renderMessage = (message: Message, index: number) => {
    const previousMessage = index > 0 ? messages[index - 1] : null;
    const showTime = shouldShowTimeSeparator(message, previousMessage);
    const isUser = message.sender === 'user';

    return (
      <View key={message.id}>
        {showTime && <TimeSeparator timeText={formatMessageTime(message.timestamp, t)} />}

        <View style={[styles.messageContainer, isUser ? styles.userMessage : styles.aiMessage]}>
          {!isUser && <ChatAvatar type="ai" avatarUrl={voiceAvatar} />}

          {isUser ? (
            <UserMessageBubble
              message={message}
              isVoicePlaying={playingVoiceMessageId === message.id && voicePlayerIsPlaying}
              onVoicePlay={() => message.voiceUri && onPlayVoiceMessage(message.id, message.voiceUri)}
            />
          ) : (
            <AIMessageBubble
              message={message}
              isTTSLoading={streamingTTSIsLoading && streamingTTSCurrentMessageId === message.id}
              isTTSPlaying={streamingTTSIsPlaying && streamingTTSCurrentMessageId === message.id}
              onTTSPlay={() => onPlayTTS(message.id, message.text)}
              onTranslationUpdate={onTranslationUpdate}
              learnedWords={learnedWords}
            />
          )}

          {isUser && (
            <ChatAvatar
              type="user"
              avatarUrl={user?.avatar}
              nickname={user?.nickname}
              username={user?.username}
            />
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.mainContent}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((message, index) => renderMessage(message, index))}
        {isTyping && <TypingIndicator avatarUrl={voiceAvatar} />}
      </ScrollView>
    </View>
  );
}
