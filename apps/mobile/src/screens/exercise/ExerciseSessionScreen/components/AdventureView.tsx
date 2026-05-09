import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import Icon from '@/components/Icon';
import { useI18n } from '@/context/I18nProvider';
import type { AdventureQuestion } from '@/api/modules/exercise';

interface Props {
  question: AdventureQuestion;
  isAnswered: boolean;
  onAnswer: (correct: boolean) => void;
  styles: any;
  theme: any;
}

interface ChatMessage {
  role: 'ai' | 'user';
  text: string;
}

export default function AdventureView({ question, isAnswered, onAnswer, styles, theme }: Props) {
  const { t } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'ai', text: question.openingLine },
  ]);
  const [input, setInput] = useState('');
  const [completedObjectives, setCompletedObjectives] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const turnCount = useRef(0);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading || isAnswered) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text }]);
    turnCount.current++;
    setIsLoading(true);

    try {
      const { apiClient } = await import('@/api');
      const conversationHistory = [...messages, { role: 'user' as const, text }];

      const res = await apiClient.api.post('/api/exercise/adventure/respond', {
        scenarioTitle: question.scenarioTitle,
        character: question.character,
        objectives: question.objectives,
        conversationHistory: conversationHistory.map(m => ({
          role: m.role === 'ai' ? 'assistant' : 'user',
          content: m.text,
        })),
      });

      const data = res.data;
      setMessages(prev => [...prev, { role: 'ai', text: data.response }]);

      // 检查完成的目标
      if (data.completedObjectives && Array.isArray(data.completedObjectives)) {
        setCompletedObjectives(prev => {
          const updated = new Set(prev);
          data.completedObjectives.forEach((i: number) => updated.add(i));

          // 检查是否所有目标完成
          if (updated.size >= question.objectives.length) {
            setTimeout(() => onAnswer(true), 500);
          }
          return updated;
        });
      }
    } catch {
      // 离线模式：简单回复
      const fallbackReplies = [
        `That's interesting! Tell me more about that.`,
        `Great point! What would you do next?`,
        `I see. How does that make you feel?`,
        `Let's continue our adventure. What else do you notice?`,
      ];
      const reply = fallbackReplies[turnCount.current % fallbackReplies.length];
      setMessages(prev => [...prev, { role: 'ai', text: reply }]);

      // 离线模式下 5 轮后自动完成
      if (turnCount.current >= 5) {
        const allCompleted = new Set(question.objectives.map((_, i) => i));
        setCompletedObjectives(allCompleted);
        setTimeout(() => onAnswer(true), 500);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {/* 场景标题 */}
      <Text style={styles.questionType}>{question.scenarioTitle}</Text>
      <Text style={{ color: theme.colors.text.secondary, fontSize: 13, marginBottom: 12 }}>
        {question.scenarioDescription}
      </Text>

      {/* 目标清单 */}
      <View style={{
        backgroundColor: theme.colors.background.secondary,
        borderRadius: theme.spacing.borderRadius.base,
        padding: 12,
        marginBottom: 16,
      }}>
        <Text style={{ color: theme.colors.text.tertiary, fontSize: 12, marginBottom: 6 }}>{t('exercise.adventure.objectives')}</Text>
        {question.objectives.map((obj, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Icon
              name={completedObjectives.has(i) ? 'check-circle' : 'radio-button-unchecked'}
              size={16}
              color={completedObjectives.has(i) ? theme.colors.success : theme.colors.text.disabled}
            />
            <Text style={{
              fontSize: 13,
              color: completedObjectives.has(i) ? theme.colors.success : theme.colors.text.primary,
              textDecorationLine: completedObjectives.has(i) ? 'line-through' : 'none',
            }}>
              {obj}
            </Text>
          </View>
        ))}
      </View>

      {/* 对话区域 */}
      <View style={{ marginBottom: 12 }}>
        {messages.map((msg, i) => (
          <View key={i} style={{
            flexDirection: 'row',
            justifyContent: msg.role === 'ai' ? 'flex-start' : 'flex-end',
            marginBottom: 8,
          }}>
            <View style={{
              maxWidth: '80%',
              backgroundColor: msg.role === 'ai'
                ? theme.colors.background.secondary
                : theme.colors.primary + '15',
              borderRadius: theme.spacing.borderRadius.md,
              padding: 12,
            }}>
              {msg.role === 'ai' && (
                <Text style={{ fontSize: 11, color: theme.colors.text.tertiary, marginBottom: 2 }}>
                  {question.character}
                </Text>
              )}
              <Text style={{ color: theme.colors.text.primary, fontSize: 14, lineHeight: 22 }}>
                {msg.text}
              </Text>
            </View>
          </View>
        ))}
        {isLoading && (
          <View style={{ flexDirection: 'row', justifyContent: 'flex-start', marginBottom: 8 }}>
            <View style={{
              backgroundColor: theme.colors.background.secondary,
              borderRadius: theme.spacing.borderRadius.md,
              padding: 12,
            }}>
              <Text style={{ color: theme.colors.text.tertiary, fontSize: 14 }}>...</Text>
            </View>
          </View>
        )}
      </View>

      {/* 输入框 */}
      {!isAnswered && (
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
          <TextInput
            style={[styles.textInput, { flex: 1, marginBottom: 0 }]}
            value={input}
            onChangeText={setInput}
            placeholder="Type your response in English..."
            placeholderTextColor={theme.colors.text.disabled}
            multiline
            editable={!isLoading}
          />
          <TouchableOpacity
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: input.trim() ? theme.colors.primary : theme.colors.border.light,
              justifyContent: 'center',
              alignItems: 'center',
            }}
            onPress={handleSend}
            disabled={!input.trim() || isLoading}
            activeOpacity={0.7}
          >
            <Icon name="send" size={20} color={theme.colors.text.inverse} />
          </TouchableOpacity>
        </View>
      )}

      {/* 完成 */}
      {isAnswered && (
        <View style={{ alignItems: 'center', paddingVertical: 16 }}>
          <Icon name="emoji-events" size={40} color={theme.colors.warning} />
          <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.text.primary, marginTop: 8 }}>
            {t('exercise.adventure.complete')}
          </Text>
          <Text style={{ fontSize: 13, color: theme.colors.text.secondary, marginTop: 4 }}>
            {t('exercise.adventure.completedCount', { done: completedObjectives.size, total: question.objectives.length })}
          </Text>
        </View>
      )}
    </View>
  );
}
