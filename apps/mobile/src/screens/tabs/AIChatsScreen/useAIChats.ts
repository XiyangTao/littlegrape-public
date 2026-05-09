import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useI18n } from '@/context/I18nProvider';
import { useAuth } from '@/stores/AuthStore';
import { useCharacters } from '@/stores/AppStore';
import { apiClient } from '@/api';
import * as CompanionDB from '@/db/CompanionDB';
import { CHARACTER_THEME_COLORS, CHARACTER_EMOJIS, UNLOCK_CONDITIONS } from '@/data/storyMockData';
import { useRefreshOnFocus } from '@/hooks/queries/useRefreshOnFocus';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import type { Character } from '@/types/conversation';
import type { StoryLineSummary } from '@/api/modules/story';

export interface ChatCharacterItem {
  character: Character;
  themeColor: string;
  emoji: string;
  isUnlocked: boolean;
  unlockConditionKey?: string;
}

export function useAIChats() {
  const navigation = useNavigation<any>();
  const { t } = useI18n();
  const { user } = useAuth();
  const { getCharactersByRole } = useCharacters();

  // 过渡动画状态
  const [connectingCharacter, setConnectingCharacter] = useState<Character | null>(null);
  const connectingRef = useRef(false);

  const [storyLines, setStoryLines] = useState<StoryLineSummary[]>([]);

  // 获取故事线数据（含解锁条件）
  const loadStoryLines = useCallback(async () => {
    try {
      const res = await apiClient.getStoryList();
      setStoryLines(res);
    } catch (e) {
      console.error('加载故事线失败:', e);
    }
  }, []);

  useEffect(() => {
    loadStoryLines();
  }, [loadStoryLines]);

  useRefreshOnFocus(loadStoryLines);

  // 获取 conversation 角色
  const conversationCharacters = useMemo(
    () => getCharactersByRole('conversation'),
    [getCharactersByRole],
  );

  // 角色卡片列表
  const chatCharacters: ChatCharacterItem[] = useMemo(() => {
    return conversationCharacters.map((character) => {
      // 从故事线数据判断解锁状态
      const line = storyLines.find(
        (sl) => sl.characterId === character.id,
      );
      const isUnlocked = line ? !line.unlockCondition : true;

      return {
        character,
        themeColor: CHARACTER_THEME_COLORS[character.id] || '#7C5CFC',
        emoji: CHARACTER_EMOJIS[character.id] || '💬',
        isUnlocked,
        unlockConditionKey: UNLOCK_CONDITIONS[character.id],
      };
    });
  }, [conversationCharacters, storyLines]);

  const aiChatGate = useFeatureGate('aiChat');

  // 进入情景学习
  const handleStartScenario = () => {
    if (!aiChatGate.guard()) return;
    navigation.navigate('ScenarioPlay', { chapterId: 'mia_school_ch1' });
  };

  // 进入伙伴聊天 — 首次对话先获取 AI 开场白，已有线程直接进入
  const handleCharacterPress = useCallback(async (characterId: string) => {
    if (!aiChatGate.guard()) return;
    if (!user?.id) return;
    if (connectingRef.current) return;
    const character = conversationCharacters.find((c) => c.id === characterId);
    if (!character) return;

    // 检查本地是否已有对话历史
    let hasLocalHistory = false;
    try {
      const localThreads = await CompanionDB.getThreads(user.id);
      const localThread = localThreads.find(t => t.characterId === characterId);
      hasLocalHistory = !!(localThread && localThread.messageCount > 0);
    } catch { /* DB 未初始化 */ }

    if (hasLocalHistory) {
      // 有历史 → 直接进入
      navigation.navigate('CompanionChat', {
        characterId: character.id,
        characterName: character.name,
        voiceEngineId: character.voiceEngineId,
      });
      return;
    }

    // 首次对话 → 显示过渡动画 → 请求 AI 生成开场白
    connectingRef.current = true;
    setConnectingCharacter(character);

    try {
      const resp = await apiClient.initCompanionThread(characterId);
      if (!resp.success || !resp.data) {
        setConnectingCharacter(null);
        connectingRef.current = false;
        return;
      }

      const { thread, welcomeMessage } = resp.data;

      // 预存到本地 DB
      try {
        const localThread = await CompanionDB.getOrCreateThread(
          thread.id, user.id, characterId, thread.agnoSessionId,
        );
        if (welcomeMessage && localThread) {
          await CompanionDB.addMessage({
            id: welcomeMessage.messageId,
            threadId: thread.id,
            text: welcomeMessage.content,
            sender: 'ai',
            timestamp: welcomeMessage.timestamp,
            translation: welcomeMessage.translation || null,
          });
          await CompanionDB.updateThreadLastMessage(thread.id, 1, welcomeMessage.content);
        }
      } catch { /* 忽略 DB 错误 */ }

      // 导航到聊天页，传入开场白数据
      navigation.navigate('CompanionChat', {
        characterId: character.id,
        characterName: character.name,
        voiceEngineId: character.voiceEngineId,
        preloadedGreeting: welcomeMessage ? {
          id: welcomeMessage.messageId,
          text: welcomeMessage.content,
          translation: welcomeMessage.translation,
          timestamp: welcomeMessage.timestamp,
        } : undefined,
      });
    } catch (error) {
      console.error('[AIChats] 初始化线程失败:', error);
      // 失败仍然进入聊天页，让内部流程兜底
      navigation.navigate('CompanionChat', {
        characterId: character.id,
        characterName: character.name,
        voiceEngineId: character.voiceEngineId,
      });
    } finally {
      setConnectingCharacter(null);
      connectingRef.current = false;
    }
  }, [user?.id, conversationCharacters, aiChatGate, navigation]);

  return {
    t,
    chatCharacters,
    handleStartScenario,
    handleCharacterPress,
    aiChatLocked: aiChatGate.locked,
    connectingCharacter,
  };
}
