import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ScrollView } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useI18n } from '@/context/I18nProvider';
import { useAuth } from '@/stores/AuthStore';
import { useVoices, useScenarios } from '@/stores';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useStreamingTTS } from '@/hooks/useStreamingTTS';
import * as ConversationService from '@/services/ConversationService';
import { useMessageStore, useSessionMessages } from '@/stores';
import { getRecentLearnedWords, recordEncounter } from '@/db/word/EncounterDB';
import { apiClient } from '@/api';
import type { LearnedWord } from '@/components/chat/HighlightedText';

import type {
  Message,
  ConversationConfig,
  HistoryMessage,
  SessionInfo,
} from '@/types/conversation';
import {
  getLocalizedText,
  parseUTCTimestamp,
  formatMessageTime,
} from '@/utils/formatters';

// ============ 路由参数类型 ============
interface RouteParams {
  sessionId?: string;
  config?: ConversationConfig;
  welcomeMessage?: any;
  historyMessages?: HistoryMessage[];
  sessionInfo?: SessionInfo;
}

export function useChatSession() {
  const route = useRoute();
  const { t, effectiveLanguage } = useI18n();
  const { user } = useAuth();
  const { getVoiceById } = useVoices();
  const { scenarios } = useScenarios();

  const [inputText, setInputText] = useState('');
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [showSessionInfo, setShowSessionInfo] = useState(false);
  const [playingVoiceMessageId, setPlayingVoiceMessageId] = useState<string | null>(null);
  const [learnedWords, setLearnedWords] = useState<LearnedWord[]>([]);

  const scrollViewRef = useRef<ScrollView>(null);

  // 路由参数
  const { sessionId, config, welcomeMessage, historyMessages, sessionInfo } =
    (route.params as RouteParams) || {};

  // Voice 信息
  const effectiveVoiceId = config?.voiceId || sessionInfo?.voiceId || null;
  const voiceInfo = useMemo(() => {
    if (!effectiveVoiceId) return null;
    return getVoiceById(effectiveVoiceId);
  }, [effectiveVoiceId, getVoiceById]);

  const voiceAvatar = voiceInfo?.avatar || null;
  const voiceEngineId = voiceInfo?.voiceEngineId || null;
  const voiceName = voiceInfo?.name || sessionInfo?.voiceName || null;

  // Hooks
  const voicePlayer = useAudioPlayer();
  const streamingTTS = useStreamingTTS();

  // 是否正在录音（录音时暂停 TTS）
  const isRecordingRef = useRef<boolean>(false);
  // 是否已完成初始化（用于区分欢迎消息和后续 AI 回复）
  const isInitializedRef = useRef<boolean>(false);
  // 欢迎消息 ID（用于初始化时自动播放）
  const welcomeMessageIdRef = useRef<string | null>(null);
  // 待播放 TTS 的消息（用于状态驱动的 TTS 播放）
  const pendingTTSMessageRef = useRef<{ id: string; text: string } | null>(null);
  const [ttsTrigger, setTtsTrigger] = useState(0);

  // ============ MessageStore 状态管理 ============
  const initSession = useMessageStore((state) => state.initSession);
  const sendMessage = useMessageStore((state) => state.sendMessage);
  const updateTranslation = useMessageStore((state) => state.updateTranslation);
  const { messages, isTyping } = useSessionMessages(sessionId || '');

  // 会话标题
  const conversationTitle = useMemo(() => {
    if (config?.voiceName) return config.voiceName;
    if (sessionInfo?.voiceName) return sessionInfo.voiceName;
    if (config?.mode === 'free') return 'Free Chat';
    if (config?.selectedScenario?.title) {
      return getLocalizedText(config.selectedScenario.title, effectiveLanguage);
    }
    return sessionInfo?.aiRole || sessionInfo?.scenario || 'English Practice';
  }, [config, sessionInfo, effectiveLanguage]);

  const userMessageCount = messages.filter((m) => m.sender === 'user').length;

  // ============ 加载用户学过的词（用于高亮） ============
  useEffect(() => {
    const loadLearnedWords = async () => {
      try {
        const userId = user?.id || 'guest';
        const words = await getRecentLearnedWords(userId, 7, 30);
        const now = Date.now();
        setLearnedWords(words.map(w => ({
          wordId: w.wordId,
          word: w.word,
          learnedDaysAgo: Math.max(0, Math.floor((now - w.learnedAt) / (24 * 60 * 60 * 1000))),
        })));
      } catch (e) {
        console.error('[useChatSession] Failed to load learned words:', e);
      }
    };
    loadLearnedWords();
  }, [user?.id]);

  // ============ 初始化消息到 Store ============
  useEffect(() => {
    if (!sessionId) return;

    // 从历史会话恢复 - 历史会话不自动播放
    if (historyMessages && historyMessages.length > 0) {
      const convertedMessages: Message[] = historyMessages.map((msg) => ({
        id: msg.id,
        text: msg.text,
        sender: msg.sender,
        timestamp: parseUTCTimestamp(msg.timestamp),
        tips: msg.tips,
        score: msg.score,
        voiceUri: msg.voiceUri,
        voiceDuration: msg.voiceDuration,
        translation: msg.translation,
      }));
      initSession(sessionId, convertedMessages);
      isInitializedRef.current = true; // 历史会话直接标记为已初始化，不自动播放
      return;
    }

    // 新会话（有欢迎消息）- 记录欢迎消息 ID，由 useEffect 播放
    if (welcomeMessage) {
      const welcomeTime = parseUTCTimestamp(welcomeMessage.timestamp);
      welcomeMessageIdRef.current = welcomeMessage.message_id; // 记录欢迎消息 ID
      initSession(sessionId, [{
        id: welcomeMessage.message_id,
        text: welcomeMessage.content,
        sender: 'ai',
        timestamp: welcomeTime,
        tips: welcomeMessage.tips,
      }]);
      return;
    }

    // 默认空会话
    initSession(sessionId, []);
  }, [sessionId, historyMessages, welcomeMessage, initSession]);

  // ============ 保存新会话到本地数据库 ============
  useEffect(() => {
    const saveNewSession = async () => {
      if (!welcomeMessage || !sessionId || !user?.id || !config) return;
      if (historyMessages && historyMessages.length > 0) return;

      try {
        const exists = await ConversationService.sessionExists(sessionId);
        if (exists) return;

        await ConversationService.createSession({
          sessionId: sessionId,
          userId: user.id,
          scenario: config.mode === 'free' ? 'general' : (config.selectedScenario?.id || config.customScenario || 'general'),
          aiRole: config.mode === 'free' ? 'english_coach' : (config.selectedScenario?.ai_role || 'assistant'),
          difficultyLevel: config.difficulty || 'cet4',
          englishVariant: config.englishVariant || 'american',
          conversationStyle: config.conversationStyle || 'balanced',
          enableTips: config.enableTips ? 1 : 0,
          voiceId: config.voiceId || null,
          voiceName: config.voiceName || null,
          predefinedScenarioId: config.selectedScenario?.id || null,
        });

        await ConversationService.addMessage({
          id: welcomeMessage.message_id,
          sessionId: sessionId,
          text: welcomeMessage.content,
          sender: 'ai',
          timestamp: welcomeMessage.timestamp,
          tips: welcomeMessage.tips || null,
          score: null,
        });
      } catch (error) {
        console.error('[ConversationChat] Failed to save new session:', error);
      }
    };

    saveNewSession();
  }, [sessionId, welcomeMessage, config, user?.id, historyMessages]);

  // ============ 滚动到底部 ============
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  // ============ 翻译回调 ============
  const handleTranslationUpdate = useCallback((messageId: string, translation: string) => {
    if (sessionId) {
      updateTranslation(sessionId, messageId, translation);
    }
  }, [sessionId, updateTranslation]);

  // ============ TTS 播放 ============
  const handlePlayTTS = useCallback((messageId: string, text: string) => {
    if (!voiceEngineId) return;
    streamingTTS.speak(messageId, text, voiceEngineId);
  }, [voiceEngineId, streamingTTS]);

  // ============ 自动播放欢迎消息 TTS ============
  useEffect(() => {
    if (isInitializedRef.current) return;
    if (!welcomeMessageIdRef.current) return;
    if (!voiceEngineId || !messages.length) return;
    if (isRecordingRef.current) return;

    const welcomeMsg = messages.find(m => m.id === welcomeMessageIdRef.current);
    if (!welcomeMsg) return;

    isInitializedRef.current = true;
    streamingTTS.speak(welcomeMsg.id, welcomeMsg.text, voiceEngineId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, voiceEngineId]);

  // ============ 语音消息播放 ============
  const handlePlayVoiceMessage = useCallback(async (messageId: string, voiceUri: string) => {
    if (playingVoiceMessageId === messageId && voicePlayer.isPlaying) {
      await voicePlayer.stop();
      setPlayingVoiceMessageId(null);
    } else {
      setPlayingVoiceMessageId(messageId);
      await voicePlayer.play(voiceUri);
    }
  }, [playingVoiceMessageId, voicePlayer]);

  // ============ 发送消息 ============
  const handleSendMessage = useCallback(async (directText?: string, voiceData?: { text: string; filePath: string; duration: number }) => {
    const messageText = (directText || inputText).trim();
    if (!messageText || !sessionId || !user?.id) return;

    setInputText('');
    sendMessage(sessionId, user.id, messageText, voiceData, (aiMessage) => {
      pendingTTSMessageRef.current = { id: aiMessage.id, text: aiMessage.text };
      setTtsTrigger(prev => prev + 1);

      // 记录单词遭遇：检测 AI 回复中是否包含用户学过的词
      if (learnedWords.length > 0 && user?.id) {
        const textLower = aiMessage.text.toLowerCase();
        for (const w of learnedWords) {
          if (textLower.includes(w.word.toLowerCase())) {
            recordEncounter(user.id, w.wordId, 'conversation', aiMessage.text).catch((e) => console.error('[useChatSession] recordEncounter failed:', e));
          }
        }
      }
    });
  }, [inputText, sessionId, user?.id, sendMessage]);

  // 语音输入
  const voiceInput = useVoiceInput({
    onVoiceMessageSend: (voiceData) => handleSendMessage(voiceData.text, voiceData),
    userId: user?.id,
  });

  // ============ 录音时停止 TTS ============
  useEffect(() => {
    isRecordingRef.current = voiceInput.recording.isRecording;
    if (voiceInput.recording.isRecording) {
      streamingTTS.stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceInput.recording.isRecording]);

  // ============ AI 回复 TTS 播放（状态驱动）============
  useEffect(() => {
    if (ttsTrigger === 0) return;
    if (!pendingTTSMessageRef.current) return;
    if (!voiceEngineId || isRecordingRef.current) return;

    const { id, text } = pendingTTSMessageRef.current;
    pendingTTSMessageRef.current = null;

    streamingTTS.speak(id, text, voiceEngineId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ttsTrigger]);

  // ============ 时间分隔判断 ============
  const shouldShowTimeSeparator = (currentMessage: Message, previousMessage: Message | null): boolean => {
    if (!previousMessage) return true;
    const diffMinutes = (currentMessage.timestamp.getTime() - previousMessage.timestamp.getTime()) / (1000 * 60);
    return diffMinutes >= 5;
  };

  // ============ 获取会话信息标签 ============
  const getDifficultyLabel = () => {
    const difficulty = config?.difficulty || sessionInfo?.difficultyLevel;
    if (!difficulty) return '-';
    return t(`conversation.difficulty.${difficulty}.label`);
  };

  const getStyleLabel = () => {
    const style = config?.conversationStyle || sessionInfo?.conversationStyle;
    if (!style) return '-';
    return t(`conversation.style.${style}.label`);
  };

  const getVariantLabel = () => {
    const variant = config?.englishVariant || sessionInfo?.englishVariant;
    if (!variant) return '-';
    return t(`conversation.variant.${variant}.label`);
  };

  const getScenarioLabel = () => {
    if (config?.mode === 'free') return t('conversation.sessionInfo.freeMode');
    if (config?.selectedScenario?.title) {
      return getLocalizedText(config.selectedScenario.title, effectiveLanguage);
    }
    if (config?.customScenario) return config.customScenario.substring(0, 30);
    if (sessionInfo?.scenario === 'general') return t('conversation.sessionInfo.freeMode');
    const predefinedScenarioId = sessionInfo?.predefinedScenarioId;
    if (predefinedScenarioId) {
      const predefinedScenario = scenarios.find((s) => s.id === predefinedScenarioId);
      if (predefinedScenario) return getLocalizedText(predefinedScenario.title, effectiveLanguage);
    }
    return sessionInfo?.scenario || '-';
  };

  const getEnableTipsLabel = () => {
    const enableTips = config?.enableTips ?? sessionInfo?.enableTips;
    if (enableTips === undefined || enableTips === null) return '-';
    return enableTips ? t('conversation.sessionInfo.enabled') : t('conversation.sessionInfo.disabled');
  };

  // 会话信息数据
  const sessionInfoItems = useMemo(() => [
    { label: t('conversation.sessionInfo.scenario'), value: getScenarioLabel() },
    { label: t('conversation.sessionInfo.difficulty'), value: getDifficultyLabel() },
    { label: t('conversation.sessionInfo.variant'), value: getVariantLabel() },
    { label: t('conversation.sessionInfo.style'), value: getStyleLabel() },
    { label: t('conversation.sessionInfo.voice'), value: voiceName || '-' },
    { label: t('conversation.sessionInfo.tips'), value: getEnableTipsLabel() },
    { label: t('conversation.sessionInfo.rounds'), value: t('conversation.sessionInfo.roundsCount', { count: userMessageCount }) },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [t, config, sessionInfo, effectiveLanguage, voiceName, userMessageCount, scenarios]);

  return {
    // 状态
    inputText,
    setInputText,
    isVoiceMode,
    setIsVoiceMode,
    showSessionInfo,
    setShowSessionInfo,
    playingVoiceMessageId,
    scrollViewRef,
    messages,
    isTyping,
    conversationTitle,
    voiceAvatar,
    user,
    streamingTTS,
    voicePlayer,
    voiceInput,
    sessionInfoItems,
    learnedWords,
    // 回调
    scrollToBottom,
    handleTranslationUpdate,
    handlePlayTTS,
    handlePlayVoiceMessage,
    handleSendMessage,
    shouldShowTimeSeparator,
    // i18n
    t,
  };
}
