/**
 * AI 消息气泡组件
 * 封装 TTS 播放、翻译功能
 */
import React, { useState, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import Icon, { IconNames } from '@/components/Icon';
import { CopyableText } from './CopyableText';
import { HighlightedText, LearnedWord } from './HighlightedText';
import { updateMessageTranslation, translateMessage } from '@/services/ConversationService';
import { useMessageStore } from '@/stores';
import type { Message, TranslationData } from '@/types/conversation';

interface AIMessageBubbleProps {
  /** 消息对象 */
  message: Message;
  /** TTS 是否正在加载 */
  isTTSLoading?: boolean;
  /** TTS 是否正在播放 */
  isTTSPlaying?: boolean;
  /** TTS 播放回调 */
  onTTSPlay?: () => void;
  /** 更新消息翻译的回调 */
  onTranslationUpdate: (messageId: string, translation: string, translationData?: TranslationData) => void;
  /** 用户学过的单词列表（用于高亮） */
  learnedWords?: LearnedWord[];
}

export const AIMessageBubble: React.FC<AIMessageBubbleProps> = ({
  message,
  isTTSLoading = false,
  isTTSPlaying = false,
  onTTSPlay,
  onTranslationUpdate,
  learnedWords,
}) => {
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme);
  const waitForTranslation = useMessageStore((state) => state.waitForTranslation);

  const [isTranslating, setIsTranslating] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);

  // 翻译
  const handleTranslate = useCallback(async () => {
    // 已有翻译，切换显示
    if (message.translation) {
      setShowTranslation((prev) => !prev);
      return;
    }

    // 显示加载状态
    setIsTranslating(true);
    try {
      // 先等待预取完成（如果正在预取中）
      await waitForTranslation(message.id);

      // 预取完成后展开显示
      setShowTranslation(true);
    } catch (error) {
      console.error('等待翻译失败:', error);
    } finally {
      setIsTranslating(false);
    }
  }, [message.id, message.translation, waitForTranslation]);

  // 如果展开了但没有翻译数据，手动请求（处理预取失败的情况）
  React.useEffect(() => {
    if (showTranslation && !message.translation && !isTranslating) {
      const fetchTranslation = async () => {
        setIsTranslating(true);
        try {
          const result = await translateMessage(message.text);

          const translationData: TranslationData = {
            translation: result.translation,
            notes: result.notes || '',
          };

          const fullTranslation = result.notes
            ? `${result.translation}\n\n${result.notes}`
            : result.translation;

          onTranslationUpdate(message.id, fullTranslation, translationData);
          await updateMessageTranslation(message.id, fullTranslation);
        } catch (error) {
          console.error('翻译失败:', error);
          setShowTranslation(false); // 失败时收起
        } finally {
          setIsTranslating(false);
        }
      };
      fetchTranslation();
    }
  }, [showTranslation, message.translation, message.id, message.text, isTranslating, onTranslationUpdate]);

  // 获取结构化翻译数据（兼容旧格式）
  const translationData = message.translationData || (() => {
    // 旧格式：translation 和 notes 用 \n\n 拼接
    if (message.translation && message.translation.includes('\n\n')) {
      const parts = message.translation.split('\n\n');
      return {
        translation: parts[0],
        notes: parts.slice(1).join('\n\n'),
      };
    }
    return message.translation ? { translation: message.translation, notes: '' } : undefined;
  })();

  return (
    <View style={styles.container}>
      {/* 消息气泡 */}
      <View style={styles.bubble}>
        {learnedWords && learnedWords.length > 0 ? (
          <HighlightedText
            text={message.text}
            learnedWords={learnedWords}
            style={styles.text}
            selectable
          />
        ) : (
          <CopyableText text={message.text} style={styles.text} />
        )}
        <View style={styles.triangleLeft} />
      </View>

      {/* 操作按钮 */}
      <View style={styles.actions}>
        {/* TTS 按钮 */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onTTSPlay}
          disabled={isTTSLoading}
        >
          <Icon
            name={isTTSLoading ? IconNames.refresh : isTTSPlaying ? IconNames.stop : IconNames.volume}
            size={14}
            color={isTTSPlaying ? theme.colors.primary : theme.colors.text.secondary}
          />
        </TouchableOpacity>

        {/* 翻译按钮 */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleTranslate}
          disabled={isTranslating}
        >
          <Icon
            name={isTranslating ? IconNames.refresh : IconNames.translate}
            size={14}
            color={showTranslation ? theme.colors.primary : theme.colors.text.secondary}
          />
        </TouchableOpacity>

      </View>

      {/* 翻译结果 - 结构化显示 */}
      {showTranslation && message.translation && (
        <View style={styles.translationCard}>
          {/* 翻译区块 */}
          <View style={styles.translationSection}>
            <Text style={styles.translationText}>
              <Text style={styles.sectionTitle}>{t('conversation.translation.title')}：</Text>
              {translationData?.translation || message.translation}
            </Text>
          </View>

          {/* 知识点区块 */}
          {translationData?.notes ? (
            <View style={styles.notesSection}>
              <Text style={styles.notesText}>
                <Text style={styles.sectionTitle}>{t('conversation.translation.notes')}：</Text>
                {translationData.notes}
              </Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      marginLeft: theme.spacing.xs,
      marginRight: 36 + theme.spacing.xs, // 预留右侧用户头像的空间
    },
    bubble: {
      alignSelf: 'flex-start',
      position: 'relative',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.spacing.borderRadius.sm,
      backgroundColor: theme.colors.background.primary,
    },
    text: {
      fontSize: theme.typography.fontSize.base,
      lineHeight: 20,
      color: theme.colors.text.primary,
    },
    triangleLeft: {
      position: 'absolute',
      left: -6,
      top: 12,
      width: 0,
      height: 0,
      borderTopWidth: 6,
      borderTopColor: 'transparent',
      borderBottomWidth: 6,
      borderBottomColor: 'transparent',
      borderRightWidth: 6,
      borderRightColor: theme.colors.background.primary,
    },
    actions: {
      flexDirection: 'row',
      marginTop: theme.spacing.xs,
      gap: theme.spacing.xs,
    },
    actionButton: {
      padding: theme.spacing.xs,
    },
    // 翻译卡片 - 与 Tips 卡片样式一致
    translationCard: {
      marginTop: theme.spacing.xs,
      backgroundColor: theme.colors.background.primary,
      padding: theme.spacing.sm,
      borderRadius: theme.spacing.borderRadius.sm,
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.primary,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    translationSection: {
      marginBottom: theme.spacing.xs,
    },
    notesSection: {
      marginTop: theme.spacing.xs,
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: '600',
      color: theme.colors.primary,
    },
    translationText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.secondary,
      lineHeight: 18,
    },
    notesText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.secondary,
      lineHeight: 18,
    },
  });

export default AIMessageBubble;
