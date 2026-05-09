/**
 * AI 学习助手聊天页
 */

import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import Icon, { IconNames } from '@/components/Icon';
import { parseUTCTimestamp, isSameDayCN } from '@/utils/dateUtils';
import type { AssistantMessage, SuggestedAction } from '@/types/assistant';
import { useAssistantChat } from './useAssistantChat';
import QuickActions from './QuickActions';
import { createStyles } from './styles';

export default function AssistantChatScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme);

  const {
    inputText,
    setInputText,
    error,
    messages,
    isLoading,
    isSending,
    hasMore,
    flatListRef,
    handleSend,
    handleQuickAction,
    handleLoadMore,
    scrollToBottom,
    shouldShowTimeSeparator,
  } = useAssistantChat();

  // ==================== 渲染函数 ====================

  const renderTimeSeparator = (time: string) => {
    const date = parseUTCTimestamp(time);
    const now = new Date();
    const isToday = isSameDayCN(date.getTime(), now.getTime());
    const timeStr = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    const label = isToday ? timeStr : `${date.getMonth() + 1}/${date.getDate()} ${timeStr}`;

    return (
      <View style={styles.timeSeparator}>
        <Text style={styles.timeSeparatorText}>{label}</Text>
      </View>
    );
  };

  const handleSuggestedAction = (action: SuggestedAction) => {
    if (action.type === 'navigate' && action.route) {
      navigation.navigate(action.route);
    } else if (action.type === 'quick_action' && action.actionType) {
      handleQuickAction(action.actionType);
    }
  };

  const renderSuggestedActions = (actions: SuggestedAction[]) => (
    <View style={styles.suggestedActionsRow}>
      {actions.map((action, i) => (
        <TouchableOpacity
          key={i}
          style={styles.suggestedActionButton}
          onPress={() => handleSuggestedAction(action)}
        >
          <Text style={styles.suggestedActionText}>{action.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderMessage = ({ item, index }: { item: AssistantMessage; index: number }) => {
    const isUser = item.role === 'user';
    const showTime = shouldShowTimeSeparator(item, index);
    const actions = !isUser ? item.metadata?.actions : undefined;

    return (
      <>
        {showTime && renderTimeSeparator(item.createdAt)}
        <View style={[styles.messageRow, isUser ? styles.userMessageRow : styles.assistantMessageRow]}>
          {!isUser && (
            <View style={styles.assistantAvatar}>
              <Text style={styles.avatarText}>AI</Text>
            </View>
          )}
          <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.assistantBubble]}>
            <Text style={isUser ? styles.userMessageText : styles.assistantMessageText}>
              {item.content}
            </Text>
          </View>
        </View>
        {actions && actions.length > 0 && renderSuggestedActions(actions)}
      </>
    );
  };

  const renderWelcome = () => (
    <View style={styles.welcomeContainer}>
      <View style={styles.welcomeAvatar}>
        <Text style={styles.welcomeAvatarText}>AI</Text>
      </View>
      <Text style={styles.welcomeTitle}>{t('assistant.welcome.title')}</Text>
      <Text style={styles.welcomeSubtitle}>
        {t('assistant.welcome.subtitle')}
      </Text>
    </View>
  );

  const renderTypingIndicator = () => {
    if (!isSending) return null;
    return (
      <View style={styles.typingContainer}>
        <View style={styles.assistantAvatar}>
          <Text style={styles.avatarText}>AI</Text>
        </View>
        <View style={styles.typingBubble}>
          <View style={styles.typingDots}>
            <View style={styles.typingDot} />
            <View style={styles.typingDot} />
            <View style={styles.typingDot} />
          </View>
        </View>
      </View>
    );
  };

  const renderHeader = () => {
    if (!hasMore) return null;
    return (
      <TouchableOpacity
        style={styles.loadMoreContainer}
        onPress={handleLoadMore}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : (
          <Text style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.text.secondary }}>
            {t('assistant.loadEarlierMessages')}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const canSend = inputText.trim().length > 0 && !isSending;

  // ==================== 主渲染 ====================

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.keyboardAvoidingView} behavior="padding" keyboardVerticalOffset={0}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name={IconNames.back} size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>{t('assistant.title')}</Text>
          </View>
        </View>

        {/* 错误提示 */}
        {error && (
          <View style={styles.errorBanner}>
            <Icon name={IconNames.info} size={14} color={theme.colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* 消息列表 */}
        <FlatList
          ref={flatListRef}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderWelcome}
          ListFooterComponent={renderTypingIndicator}
          onEndReachedThreshold={0.1}
          inverted={false}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
          onContentSizeChange={() => {
            if (messages.length > 0 && !isLoading) {
              scrollToBottom();
            }
          }}
        />

        {/* 快捷操作 */}
        <QuickActions onAction={handleQuickAction} disabled={isSending} />

        {/* 输入区域 */}
        <View style={styles.inputContainer}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              placeholder={t('assistant.inputPlaceholder')}
              placeholderTextColor={theme.colors.text.secondary}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              onFocus={scrollToBottom}
            />
            <TouchableOpacity
              style={[styles.sendButton, canSend ? styles.sendButtonActive : styles.sendButtonInactive]}
              onPress={handleSend}
              disabled={!canSend}
            >
              <Icon
                name={IconNames.send}
                size={20}
                color={canSend ? theme.colors.text.inverse : theme.colors.text.secondary}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
