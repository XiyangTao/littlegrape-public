import React, { useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import { ChatInput } from '@/components/chat';
import { useVoiceInput, type VoiceMessageData } from '@/hooks/useVoiceInput';
import { VoiceRecordingModal } from '@/components/VoiceRecordingModal';
import type { ConversationEvaluation } from '@/types/storyMode';

interface Props {
  goal: string;
  hint: string;
  onSubmit: (userAnswer: string) => Promise<ConversationEvaluation>;
  onEvaluated: (evaluation: ConversationEvaluation) => void;
  onComplete: (evaluation: ConversationEvaluation, userText: string) => void;
  onUserMessage: (text: string, voiceData?: { filePath: string; duration: number }) => void;
  disabled?: boolean;
}

function getOverallText(score: number): string {
  if (score >= 9) return 'Excellent!';
  if (score >= 7) return 'Good!';
  if (score >= 5) return 'Not Bad!';
  return 'Keep Going!';
}

function getOverallColor(score: number): string {
  if (score >= 7) return '#34C759';
  if (score >= 5) return '#F59E0B';
  return '#F59E0B';
}

export default function ConversationQuestion({ goal, hint, onSubmit, onEvaluated, onComplete, onUserMessage, disabled }: Props) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [text, setText] = useState('');
  const [submittedText, setSubmittedText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [evaluation, setEvaluation] = useState<ConversationEvaluation | null>(null);
  const [isVoiceMode, setIsVoiceMode] = useState(false);

  // 当前语音数据（语音发送时暂存）
  const voiceDataRef = useRef<{ filePath: string; duration: number } | null>(null);

  // 统一提交逻辑（文本或语音）
  const doSubmit = useCallback(async (messageText: string, voiceInfo?: { filePath: string; duration: number }) => {
    if (!messageText.trim() || isSubmitting) return;
    const trimmed = messageText.trim();
    setSubmittedText(trimmed);
    setText('');
    setIsSubmitting(true);

    // 立即显示用户气泡（带语音数据）
    onUserMessage(trimmed, voiceInfo);

    try {
      const result = await onSubmit(trimmed);
      setEvaluation(result);
      // 立即显示结果气泡
      onEvaluated(result);
      // 延迟推进下一条剧情
      setTimeout(() => onComplete(result, trimmed), 2000);
    } catch (err) {
      // 配额不足：不推进剧情，弹窗已由 API 层触发
      if ((err as any)?.quotaExceeded) {
        setSubmittedText('');
        return;
      }
      // 其他错误：降级处理，继续剧情
      const fallback: ConversationEvaluation = {
        achieved: true,
        feedback: 'Good try!',
        score: 5,
        corrections: [],
        highlights: [],
        summary: '',
      };
      setEvaluation(fallback);
      onEvaluated(fallback);
      setTimeout(() => onComplete(fallback, trimmed), 1500);
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, onSubmit, onEvaluated, onComplete, onUserMessage]);

  // 语音识别后自动发送（带语音文件路径和时长）
  const handleVoiceMessageSend = useCallback((data: VoiceMessageData) => {
    if (data.text) {
      doSubmit(data.text, { filePath: data.filePath, duration: data.duration });
    }
  }, [doSubmit]);

  const voiceInput = useVoiceInput({ onVoiceMessageSend: handleVoiceMessageSend });

  // 文本发送
  const handleSubmit = () => {
    doSubmit(text);
  };


  return (
    <View style={styles.container}>
      {evaluation ? null : (
        <>
          {isSubmitting ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={theme.colors.primary} />
              <Text style={styles.loadingText}>Evaluating...</Text>
            </View>
          ) : (
            <ChatInput
              value={text}
              onChangeText={setText}
              onSend={handleSubmit}
              isVoiceMode={isVoiceMode}
              onToggleMode={() => setIsVoiceMode(!isVoiceMode)}
              voicePanHandlers={voiceInput.micPanHandlers}
            />
          )}
        </>
      )}

      {/* 语音录制弹窗 */}
      <VoiceRecordingModal
        visible={voiceInput.showVoiceModal}
        durationShared={voiceInput.recording.durationShared}
        isInCancelZone={voiceInput.isInCancelZone}
        isInitializing={voiceInput.recording.isInitializing}
        volumeHistoryShared={voiceInput.recording.volumeHistoryShared}
        onExitComplete={voiceInput.onVoiceModalExitComplete}
      />
      {voiceInput.AlertComponent}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.xs,
      paddingBottom: theme.spacing.xs,
    },
    loadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.md,
    },
    loadingText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
    },
    hintToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      marginTop: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    hintToggleText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.tertiary,
    },
    hintBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.sm,
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.warning + '10',
      borderRadius: theme.spacing.borderRadius.sm,
    },
    hintText: {
      flex: 1,
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
    },
    feedbackContainer: {
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    overallLabel: {
      fontSize: theme.fontScale(22),
      fontWeight: theme.typography.fontWeight.bold,
      textAlign: 'center',
    },
    feedbackMessage: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
      textAlign: 'center',
    },
    correctionsBox: {
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.spacing.borderRadius.sm,
      gap: theme.spacing.xs,
    },
    correctionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      flexWrap: 'wrap',
    },
    correctionOriginal: {
      fontSize: theme.typography.fontSize.sm,
      color: '#FF3B30',
      textDecorationLine: 'line-through',
    },
    correctionFixed: {
      fontSize: theme.typography.fontSize.sm,
      color: '#34C759',
      fontWeight: theme.typography.fontWeight.medium,
    },
  });
