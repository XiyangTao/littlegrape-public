/**
 * 用户消息气泡组件
 * 封装文本消息、语音消息、Tips 显示
 */
import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import Icon, { IconNames } from '@/components/Icon';
import { VoiceWaveform } from './VoiceWaveform';
import { TipsCard } from './TipsCard';
import { CopyableText } from './CopyableText';
import { formatVoiceDuration, getScoreLevelKey } from '@/utils/formatters';
import type { Message } from '@/types/conversation';

interface UserMessageBubbleProps {
  /** 消息对象 */
  message: Message;
  /** 是否正在播放语音 */
  isVoicePlaying?: boolean;
  /** 播放语音回调 */
  onVoicePlay?: () => void;
}

export const UserMessageBubble: React.FC<UserMessageBubbleProps> = ({
  message,
  isVoicePlaying = false,
  onVoicePlay,
}) => {
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme);

  const [showTips, setShowTips] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  const toggleTips = useCallback(() => {
    setShowTips((prev) => !prev);
  }, []);

  const handleLongPress = useCallback((pageX: number, pageY: number) => {
    setMenuPosition({ x: pageX, y: pageY });
    setMenuVisible(true);
  }, []);

  const handleToggleTranscript = useCallback(() => {
    setMenuVisible(false);
    setShowTranscript((prev) => !prev);
  }, []);

  const tipsColor =
    message.score !== undefined && message.score !== null
      ? theme.colors.scoreLevel[getScoreLevelKey(message.score)]
      : theme.colors.primary;

  const isVoiceMessage = !!message.voiceUri;

  return (
    <View style={styles.container}>
      {/* 消息气泡 */}
      {isVoiceMessage ? (
        // 语音消息
        <View style={styles.voiceBubble}>
          <TouchableOpacity
            style={styles.voiceContent}
            onLongPress={(e) => handleLongPress(e.nativeEvent.pageX, e.nativeEvent.pageY)}
            delayLongPress={300}
            activeOpacity={0.9}
          >
            <TouchableOpacity
              style={styles.playButton}
              onPress={onVoicePlay}
              activeOpacity={0.7}
            >
              <Icon
                name={isVoicePlaying ? IconNames.pause : IconNames.play}
                size={16}
                color={theme.colors.text.inverse}
              />
            </TouchableOpacity>
            <VoiceWaveform isPlaying={isVoicePlaying} />
            <Text style={styles.voiceDuration}>
              {formatVoiceDuration(message.voiceDuration || 0)}
            </Text>
          </TouchableOpacity>

          {/* Tips 指示器 */}
          {message.tips && (
            <TouchableOpacity
              style={styles.tipsIndicator}
              onPress={toggleTips}
              activeOpacity={0.7}
            >
              <Icon name={IconNames.lightbulb} size={12} color={tipsColor} />
            </TouchableOpacity>
          )}

          <View style={styles.triangleRight} />
        </View>
      ) : (
        // 文本消息
        <View style={styles.textBubble}>
          <CopyableText text={message.text} style={styles.text} />

          {/* Tips 指示器 */}
          {message.tips && (
            <TouchableOpacity
              style={styles.tipsIndicator}
              onPress={toggleTips}
              activeOpacity={0.7}
            >
              <Icon name={IconNames.lightbulb} size={12} color={tipsColor} />
            </TouchableOpacity>
          )}

          <View style={styles.triangleRight} />
        </View>
      )}

      {/* 语音转文字显示 */}
      {isVoiceMessage && showTranscript && (
        <View style={styles.transcript}>
          <CopyableText text={message.text} style={styles.transcriptText} />
        </View>
      )}

      {/* Tips 卡片 */}
      {showTips && message.tips && (
        <TipsCard tips={message.tips} score={message.score} />
      )}

      {/* 语音菜单弹窗 */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View
            style={[
              styles.menuContainer,
              { left: menuPosition.x - 60, top: menuPosition.y - 70 },
            ]}
          >
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleToggleTranscript}
            >
              <Icon
                name={showTranscript ? IconNames.subtitlesOff : IconNames.transcript}
                size={16}
                color={theme.colors.recording.sendText}
              />
              <Text style={styles.menuItemText}>
                {showTranscript ? t('voiceRecord.hideTranscript') : t('voiceRecord.showTranscript')}
              </Text>
            </TouchableOpacity>
            <View style={styles.menuArrow} />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'flex-end',
      marginRight: theme.spacing.xs,
      marginLeft: 36 + theme.spacing.xs, // 预留左侧 AI 头像的空间
    },
    // 文本消息
    textBubble: {
      position: 'relative',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.spacing.borderRadius.sm,
      backgroundColor: theme.colors.accent.wechatGreen,
    },
    text: {
      fontSize: theme.typography.fontSize.base,
      lineHeight: 20,
      color: theme.colors.text.inverse,
    },
    // 语音消息
    voiceBubble: {
      position: 'relative',
      minWidth: 120,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.colors.accent.wechatGreen,
      borderRadius: theme.spacing.borderRadius.sm,
    },
    voiceContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    playButton: {
      padding: 4,
    },
    voiceDuration: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.inverse,
      marginLeft: theme.spacing.xs,
    },
    transcript: {
      marginTop: theme.spacing.xs,
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.background.primary,
      borderRadius: theme.spacing.borderRadius.sm,
    },
    transcriptText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
      lineHeight: 18,
    },
    // 共用
    triangleRight: {
      position: 'absolute',
      right: -6,
      top: 12,
      width: 0,
      height: 0,
      borderTopWidth: 6,
      borderTopColor: 'transparent',
      borderBottomWidth: 6,
      borderBottomColor: 'transparent',
      borderLeftWidth: 6,
      borderLeftColor: theme.colors.accent.wechatGreen,
    },
    tipsIndicator: {
      position: 'absolute',
      top: -10,
      right: -2,
      width: 20,
      height: 20,
      borderRadius: theme.spacing.borderRadius.sm,
      backgroundColor: theme.colors.background.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 2,
      elevation: 2,
    },
    // 语音菜单
    menuOverlay: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    menuContainer: {
      position: 'absolute',
      backgroundColor: theme.colors.recording.panelBackground,
      borderRadius: theme.spacing.borderRadius.sm,
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      gap: theme.spacing.xs,
    },
    menuItemText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.recording.sendText,
    },
    menuArrow: {
      position: 'absolute',
      bottom: -8,
      left: '50%',
      marginLeft: -8,
      width: 0,
      height: 0,
      borderLeftWidth: 8,
      borderRightWidth: 8,
      borderTopWidth: 8,
      borderLeftColor: 'transparent',
      borderRightColor: 'transparent',
      borderTopColor: theme.colors.recording.panelBackground,
    },
  });

export default UserMessageBubble;
