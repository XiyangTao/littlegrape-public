/**
 * 伙伴聊天 Hook
 * 集成 CompanionStore + TTS + 翻译 + 头像
 *
 * TTS 自动播放规则：
 * - 首次见面（开场白）：自动播放
 * - 再次进入（加载历史）：不播放
 * - 清空后进入：没消息，不播放
 * - 对话中 AI 新回复：自动播放
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/stores/AuthStore';
import { useCharacters } from '@/stores/AppStore';
import { useI18n } from '@/context/I18nProvider';
import { useStreamingTTS } from '@/hooks/useStreamingTTS';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useCompanionStore } from '@/stores';
import * as CompanionDB from '@/db/CompanionDB';
import type { Message } from '@/types/conversation';

const AUTO_PLAY_TTS_KEY = 'companion_auto_play_tts';

interface PreloadedGreeting {
  id: string;
  text: string;
  translation?: string;
  timestamp: string;
}

export function useCompanionChat(characterId: string, voiceEngineId?: string, preloadedGreeting?: PreloadedGreeting) {
  const { user } = useAuth();
  const { t } = useI18n();
  const { getCharacterById } = useCharacters();
  const character = getCharacterById(characterId);

  const streamingTTS = useStreamingTTS();
  const [inputText, setInputText] = useState('');
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [autoPlayTTS, setAutoPlayTTSState] = useState(true);
  const autoPlayTTSRef = useRef(true);

  const scrollViewRef = useRef<any>(null);
  const pendingTTSRef = useRef<{ id: string; text: string } | null>(null);
  const [ttsTrigger, setTtsTrigger] = useState(0);

  // 从 AsyncStorage 加载自动播放设置
  useEffect(() => {
    AsyncStorage.getItem(AUTO_PLAY_TTS_KEY).then(val => {
      const enabled = val !== 'false'; // 默认开启
      setAutoPlayTTSState(enabled);
      autoPlayTTSRef.current = enabled;
    }).catch(() => {});
  }, []);

  const setAutoPlayTTS = useCallback((value: boolean) => {
    setAutoPlayTTSState(value);
    autoPlayTTSRef.current = value;
    AsyncStorage.setItem(AUTO_PLAY_TTS_KEY, String(value)).catch(() => {});
    if (!value) {
      streamingTTS.stop();
    }
  }, [streamingTTS]);

  const {
    messages: rawMessages,
    sendingStatus,
    isTyping,
    isNewThread,
    initThread,
    sendMessage,
    clearHistory,
  } = useCompanionStore();

  const aiAvatar = character?.avatar || null;

  // CompanionChatMessage → Message
  const messages: Message[] = rawMessages.map(m => ({
    id: m.id,
    text: m.text,
    sender: m.sender,
    timestamp: m.timestamp,
    voiceUri: m.voiceUri,
    voiceDuration: m.voiceDuration,
    translation: m.translation,
    tips: m.tips,
  }));

  // ==================== 初始化 + 开场白 TTS ====================
  // 不用 reactive effect 监听 Store 变化触发 TTS，
  // 而是 initThread 完成后直接命令式调用，彻底消除跨角色竞态
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    streamingTTS.stop();
    pendingTTSRef.current = null;

    (async () => {
      if (preloadedGreeting) {
        await initThread(characterId, preloadedGreeting);
      } else {
        await initThread(characterId);
      }

      if (cancelled) return;

      // initThread 完成后，检查是否需要播放开场白 TTS
      const state = useCompanionStore.getState();
      if (state.isNewThread && state.activeCharacterId === characterId && autoPlayTTSRef.current) {
        const firstAiMsg = state.messages.find(m => m.sender === 'ai');
        const voiceId = voiceEngineId || character?.voiceEngineId;
        if (firstAiMsg && voiceId) {
          streamingTTS.speak(firstAiMsg.id, firstAiMsg.text, voiceId);
        }
      }
    })();

    return () => {
      cancelled = true;
      streamingTTS.stop();
    };
  }, [user?.id, characterId]);

  // ==================== 对话中 AI 新回复 TTS（自动播放开启时） ====================
  useEffect(() => {
    if (ttsTrigger === 0) return;
    if (!pendingTTSRef.current) return;
    if (!autoPlayTTSRef.current) return;

    const voiceId = voiceEngineId || character?.voiceEngineId;
    if (!voiceId) return;

    const { id, text } = pendingTTSRef.current;
    pendingTTSRef.current = null;
    streamingTTS.speak(id, text, voiceId);
  }, [ttsTrigger]);

  // 消息变化时滚动到底部
  useEffect(() => {
    setTimeout(() => scrollViewRef.current?.scrollToEnd?.({ animated: true }), 100);
  }, [messages.length, isTyping]);

  // ==================== 语音输入 ====================
  const voiceInput = useVoiceInput({
    onVoiceMessageSend: (voiceData) => handleSendMessage(voiceData.text),
    userId: user?.id,
  });

  // 录音时停止 TTS
  useEffect(() => {
    if (voiceInput.recording.isRecording) {
      streamingTTS.stop();
    }
  }, [voiceInput.recording.isRecording]);

  // ==================== 发送消息 ====================
  const handleSendMessage = useCallback((directText?: string) => {
    const text = (directText || inputText).trim();
    if (!text || !user?.id || sendingStatus === 'sending') return;

    if (!directText) setInputText('');

    (async () => {
      const prevCount = useCompanionStore.getState().messages.length;
      await useCompanionStore.getState().sendMessage(characterId, text);

      const currentMessages = useCompanionStore.getState().messages;
      if (currentMessages.length > prevCount) {
        const lastMsg = currentMessages[currentMessages.length - 1];
        if (lastMsg.sender === 'ai') {
          pendingTTSRef.current = { id: lastMsg.id, text: lastMsg.text };
          setTtsTrigger(prev => prev + 1);
        }
      }
    })();
  }, [inputText, user?.id, characterId, sendingStatus]);

  // ==================== TTS 手动播放 ====================
  const handlePlayTTS = useCallback((messageId: string, text: string) => {
    const voiceId = voiceEngineId || character?.voiceEngineId;
    if (!voiceId) return;

    if (streamingTTS.currentMessageId === messageId && streamingTTS.isPlaying) {
      streamingTTS.stop();
    } else {
      streamingTTS.speak(messageId, text, voiceId);
    }
  }, [voiceEngineId, character, streamingTTS]);

  // ==================== 翻译更新 ====================
  const handleTranslationUpdate = useCallback((messageId: string, translation: string) => {
    // 更新 Store 中的消息（当前会话内生效）
    const store = useCompanionStore.getState();
    const updatedMessages = store.messages.map(m =>
      m.id === messageId ? { ...m, translation } : m
    );
    useCompanionStore.setState({ messages: updatedMessages });

    // 持久化到本地 DB
    if (store.activeThread) {
      CompanionDB.updateMessageTranslation(messageId, translation).catch(() => {});
    }
  }, []);

  // ==================== 清空聊天记录 ====================
  const [showClearAlert, setShowClearAlert] = useState(false);

  const handleClearHistory = useCallback(() => {
    setShowClearAlert(true);
  }, []);

  const handleConfirmClear = useCallback(async () => {
    setShowClearAlert(false);
    if (!user?.id) return;
    streamingTTS.stop();
    try {
      await clearHistory(characterId);
      // 只清空记录，不生成开场白。用户可以直接发消息开始新对话。
      // 如果用户离开页面再进来，initThread 会自动生成 AI 开场白。
    } catch {
      // 失败静默处理
    }
  }, [user?.id, characterId, clearHistory, streamingTTS]);

  const handleCancelClear = useCallback(() => {
    setShowClearAlert(false);
  }, []);

  // ==================== 滚动 ====================
  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollViewRef.current?.scrollToEnd?.({ animated: true }), 100);
  }, []);

  // ==================== 时间分隔 ====================
  const shouldShowTimeSeparator = useCallback((current: Message, previous: Message | null) => {
    if (!previous) return true;
    const diff = current.timestamp.getTime() - previous.timestamp.getTime();
    return diff > 5 * 60 * 1000;
  }, []);

  return {
    inputText,
    setInputText,
    isVoiceMode,
    setIsVoiceMode,
    messages,
    isTyping,
    sendingStatus,
    aiAvatar,
    user,
    characterName: character?.name || characterId,
    streamingTTS,
    voiceInput,
    scrollViewRef,
    scrollToBottom,
    handleSendMessage,
    handlePlayTTS,
    handleTranslationUpdate,
    handleClearHistory,
    showClearAlert,
    handleConfirmClear,
    handleCancelClear,
    shouldShowTimeSeparator,
    autoPlayTTS,
    setAutoPlayTTS,
    t,
  };
}
