/**
 * 聊天输入框组件
 */
import React from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, GestureResponderHandlers } from 'react-native';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import Icon, { IconNames } from '@/components/Icon';

interface ChatInputProps {
  /** 输入文本 */
  value: string;
  /** 文本变化回调 */
  onChangeText: (text: string) => void;
  /** 发送回调 */
  onSend: () => void;
  /** 是否为语音模式 */
  isVoiceMode: boolean;
  /** 切换模式回调 */
  onToggleMode: () => void;
  /** 语音按钮的手势处理器 */
  voicePanHandlers?: GestureResponderHandlers;
  /** 输入框获取焦点回调 */
  onFocus?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChangeText,
  onSend,
  isVoiceMode,
  onToggleMode,
  voicePanHandlers,
  onFocus,
}) => {
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme);

  const canSend = value.trim().length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        {/* 左侧切换按钮 */}
        <TouchableOpacity style={styles.modeToggleButton} onPress={onToggleMode}>
          <Icon
            name={isVoiceMode ? 'keyboard' : IconNames.graphicEq}
            size={24}
            color={theme.colors.text.primary}
          />
        </TouchableOpacity>

        {/* 中间区域 */}
        {isVoiceMode ? (
          <View style={styles.holdToTalkButton} {...voicePanHandlers}>
            <Text style={styles.holdToTalkText}>{t('voiceRecord.holdToTalk')}</Text>
          </View>
        ) : (
          <TextInput
            style={styles.textInput}
            placeholder={t('conversation.inputPlaceholder')}
            placeholderTextColor={theme.colors.text.secondary}
            value={value}
            onChangeText={onChangeText}
            multiline
            maxLength={500}
            onFocus={onFocus}
          />
        )}

        {/* 发送按钮 */}
        <TouchableOpacity
          style={[styles.sendButton, canSend ? styles.sendButtonActive : styles.sendButtonInactive]}
          onPress={onSend}
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
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background.primary,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border.light,
      paddingHorizontal: theme.spacing.sm,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.sm,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    modeToggleButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    holdToTalkButton: {
      flex: 1,
      height: 40,
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.spacing.borderRadius.lg,
      justifyContent: 'center',
      alignItems: 'center',
    },
    holdToTalkText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.primary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    textInput: {
      flex: 1,
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.spacing.borderRadius.lg,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.primary,
      maxHeight: 80,
    },
    sendButton: {
      width: 40,
      height: 40,
      borderRadius: theme.spacing.borderRadius.lg,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sendButtonActive: {
      backgroundColor: theme.colors.primary,
    },
    sendButtonInactive: {
      backgroundColor: theme.colors.background.secondary,
    },
  });

export default ChatInput;
