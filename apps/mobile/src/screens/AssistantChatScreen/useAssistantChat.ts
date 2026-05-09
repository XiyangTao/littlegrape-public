/**
 * 助手聊天逻辑 Hook
 * 管理消息发送/加载、快捷操作
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { FlatList } from 'react-native';
import { useI18n } from '@/context/I18nProvider';
import { useAssistantStore } from '@/stores';
import type { QuickActionType, AssistantMessage } from '@/types/assistant';

export function useAssistantChat() {
  const { t } = useI18n();
  const [inputText, setInputText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const {
    messages,
    isLoading,
    isSending,
    hasMore,
    loadMessages,
    loadMoreMessages,
    sendMessage,
    sendQuickAction,
    markPushesRead,
  } = useAssistantStore();

  // 首次加载消息 + 清除未读
  useEffect(() => {
    loadMessages(true);
    markPushesRead();
  }, []);

  // 新消息自动滚动到底部
  const scrollToBottom = useCallback(() => {
    if (flatListRef.current && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // 消息变化时自动滚动
  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  // 发送文字消息
  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isSending) return;

    // 乐观清空输入框，失败时恢复
    const savedText = inputText;
    setInputText('');
    setError(null);

    try {
      await sendMessage(text);
    } catch (err: any) {
      setInputText(savedText);
      setError(err.message || t('assistant.sendFailed'));
    }
  }, [inputText, isSending, sendMessage]);

  // 发送快捷操作
  const handleQuickAction = useCallback(async (type: QuickActionType) => {
    if (isSending) return;
    setError(null);

    try {
      await sendQuickAction(type);
    } catch (err: any) {
      setError(err.message || t('assistant.sendFailed'));
    }
  }, [isSending, sendQuickAction]);

  // 加载更多历史
  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      loadMoreMessages();
    }
  }, [isLoading, hasMore, loadMoreMessages]);

  // 判断是否需要显示时间分割线
  const shouldShowTimeSeparator = useCallback((msg: AssistantMessage, index: number) => {
    if (index === 0) return true;
    const prev = messages[index - 1];
    if (!prev) return false;

    const prevTime = new Date(prev.createdAt).getTime();
    const currTime = new Date(msg.createdAt).getTime();
    // 超过 5 分钟显示时间分割
    return currTime - prevTime > 5 * 60 * 1000;
  }, [messages]);

  return {
    // 状态
    inputText,
    setInputText,
    error,
    messages,
    isLoading,
    isSending,
    hasMore,
    flatListRef,

    // 方法
    handleSend,
    handleQuickAction,
    handleLoadMore,
    scrollToBottom,
    shouldShowTimeSeparator,
  };
}
