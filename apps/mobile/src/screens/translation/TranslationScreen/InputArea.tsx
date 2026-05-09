import React from 'react';
import { View, Text, TouchableOpacity, TextInput, PanResponderInstance } from 'react-native';
import { useTheme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import Icon, { IconNames } from '@/components/Icon';
import { LanguageCode } from './constants';
import { createStyles } from './styles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface InputAreaProps {
  isVoiceMode: boolean;
  isRecording: boolean;
  inputText: string;
  sourceLanguage: LanguageCode;
  voicePanResponder: PanResponderInstance;
  onToggleVoiceMode: () => void;
  onChangeText: (text: string) => void;
  onTextTranslate: () => void;
}

export default function InputArea({
  isVoiceMode,
  isRecording,
  inputText,
  sourceLanguage,
  voicePanResponder,
  onToggleVoiceMode,
  onChangeText,
  onTextTranslate,
}: InputAreaProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme, insets);

  const canSend = !isVoiceMode && inputText.trim().length > 0;

  return (
    <View style={styles.inputContainer}>
      {/* 左侧切换按钮 */}
      <TouchableOpacity
        style={styles.modeToggleButton}
        onPress={onToggleVoiceMode}
        disabled={isRecording}
      >
        <Icon
          name={isVoiceMode ? 'keyboard' : IconNames.graphicEq}
          size={24}
          color={isRecording ? theme.colors.text.tertiary : theme.colors.text.primary}
        />
      </TouchableOpacity>

      {/* 中间区域 */}
      {isVoiceMode ? (
        <View style={styles.holdToTalkButton} {...voicePanResponder.panHandlers}>
          <Text style={styles.holdToTalkText}>{t('translation.holdToTalk')}</Text>
        </View>
      ) : (
        <TextInput
          style={styles.textInput}
          placeholder={t('translation.inputPlaceholder', { language: sourceLanguage === 'zh-CN' ? t('translation.langZh') : t('translation.langEn') })}
          placeholderTextColor={theme.colors.text.tertiary}
          value={inputText}
          onChangeText={onChangeText}
          multiline
          maxLength={500}
        />
      )}

      {/* 右侧发送按钮 */}
      <TouchableOpacity
        style={[styles.sendButton, canSend ? styles.sendButtonActive : styles.sendButtonInactive]}
        onPress={onTextTranslate}
        disabled={!canSend}
      >
        <Icon
          name={IconNames.send}
          size={20}
          color={canSend ? theme.colors.text.inverse : theme.colors.text.secondary}
        />
      </TouchableOpacity>
    </View>
  );
}
