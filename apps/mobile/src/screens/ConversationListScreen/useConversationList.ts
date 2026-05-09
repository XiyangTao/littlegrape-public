import { useState, useCallback, useRef, useEffect } from 'react';
import { Swipeable } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '@/stores/AuthStore';
import { useI18n } from '@/context/I18nProvider';
import { useVoices, useScenarios } from '@/stores';
import { useCustomAlert } from '@/hooks/useCustomAlert';
import { useFocusLoader } from '@/hooks/useDataLoader';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import * as ConversationService from '@/services/ConversationService';
import { FREE_CONVERSATION_SCENARIO_ID, HistoryMessage, SessionInfo } from '@/types/conversation';
import { getLocalizedText } from '@/utils/formatters';

// ============ 类型定义 ============
type RootStackParamList = {
  ConversationList: undefined;
  ConversationSetup: undefined;
  ConversationChat: {
    sessionId: string;
    historyMessages?: HistoryMessage[];
    sessionInfo?: SessionInfo;
  };
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'ConversationList'>;
export type SessionSummary = ConversationService.SessionSummary;

const PAGE_SIZE = 20;
const MAX_SESSIONS = 200;

export function useConversationList() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const { t, effectiveLanguage } = useI18n();
  const { voiceAvatars } = useVoices();
  const { scenarios } = useScenarios();
  const { confirm, toast, AlertComponent } = useCustomAlert();
  const aiChatGate = useFeatureGate('aiChat');

  // 使用 useFocusLoader 加载初始数据（每次页面聚焦时自动刷新）
  const { data: initialSessions, isLoading: loading, reload } = useFocusLoader(
    async () => {
      if (!user?.id) return [];
      return await ConversationService.getSessionList(user.id, PAGE_SIZE, 0);
    },
    [user?.id],
  );

  // sessions 状态：支持分页追加和删除更新
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingSession, setLoadingSession] = useState<string | null>(null);

  // 当 useFocusLoader 的数据更新时，同步到 sessions
  useEffect(() => {
    if (initialSessions) {
      setSessions(initialSessions);
      setHasMore(initialSessions.length >= PAGE_SIZE);
    }
  }, [initialSessions]);

  // 编辑模式
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());
  const [isScrollable, setIsScrollable] = useState(false);
  const contentHeight = useRef(0);
  const containerHeight = useRef(0);

  // ============ 数据加载 ============
  const handleRefresh = useCallback(async () => {
    if (!user?.id) return;
    try {
      setRefreshing(true);
      await reload();
    } finally {
      setRefreshing(false);
    }
  }, [user?.id, reload]);

  const loadMore = useCallback(async () => {
    if (!user?.id || loadingMore || !hasMore) return;

    try {
      setLoadingMore(true);
      const moreSessions = await ConversationService.getSessionList(user.id, PAGE_SIZE, sessions.length);
      setSessions((prev) => [...prev, ...moreSessions]);
      setHasMore(moreSessions.length >= PAGE_SIZE);
    } catch (error) {
      console.error('加载更多会话失败:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [user?.id, sessions.length, loadingMore, hasMore]);

  // ============ 会话操作 ============
  const handleDeleteSession = useCallback((sessionId: string) => {
    confirm(
      t('conversationList.deleteTitle'),
      t('conversationList.deleteMessage'),
      async () => {
        try {
          await ConversationService.deleteSession(sessionId, user?.id);
          setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
          toast(t('common.success'), t('conversationList.deleteSuccess'), 'success');
        } catch (error) {
          console.error('删除会话失败:', error);
          toast(t('common.error'), t('conversationList.deleteError'), 'error');
        }
      },
      () => swipeableRefs.current.get(sessionId)?.close(),
      'error'
    );
  }, [t, user?.id, confirm, toast]);

  const handleBatchDelete = useCallback(() => {
    if (selectedIds.size === 0) return;

    confirm(
      t('conversationList.batchDeleteTitle'),
      t('conversationList.batchDeleteMessage', { count: selectedIds.size }),
      async () => {
        setIsDeleting(true);
        try {
          const idsToDelete = Array.from(selectedIds);
          const deletedCount = await ConversationService.batchDeleteSessions(idsToDelete, user?.id);
          setSessions((prev) => prev.filter((s) => !selectedIds.has(s.sessionId)));
          setSelectedIds(new Set());
          setIsEditMode(false);
          toast(t('common.success'), t('conversationList.batchDeleteSuccess', { count: deletedCount }), 'success');
        } catch (error) {
          console.error('批量删除失败:', error);
          toast(t('common.error'), t('conversationList.deleteError'), 'error');
        } finally {
          setIsDeleting(false);
        }
      },
      undefined,
      'error'
    );
  }, [selectedIds, user?.id, confirm, toast, t]);

  const handleSessionPress = useCallback(async (session: SessionSummary) => {
    if (!user?.id || loadingSession) return;

    try {
      setLoadingSession(session.sessionId);
      const dbMessages = await ConversationService.getMessages(session.sessionId);

      const historyMessages: HistoryMessage[] = dbMessages.map((msg) => ({
        id: msg.id,
        text: msg.text,
        sender: msg.sender,
        timestamp: msg.timestamp,
        tips: msg.tips || undefined,
        score: msg.score ?? undefined,
        voiceUri: msg.voiceUri || undefined,
        voiceDuration: msg.voiceDuration ?? undefined,
        translation: msg.translation || undefined,
      }));

      const sessionInfo: SessionInfo = {
        sessionId: session.sessionId,
        scenario: session.scenario,
        aiRole: session.aiRole,
        difficultyLevel: session.difficultyLevel,
        englishVariant: session.englishVariant,
        conversationStyle: session.conversationStyle,
        enableTips: session.enableTips,
        voiceId: session.voiceId,
        voiceName: session.voiceName,
        predefinedScenarioId: session.predefinedScenarioId,
      };

      navigation.navigate('ConversationChat', { sessionId: session.sessionId, historyMessages, sessionInfo });
    } catch (error) {
      console.error('加载会话历史失败:', error);
      toast(t('common.error'), t('conversationList.loadError'), 'error');
    } finally {
      setLoadingSession(null);
    }
  }, [user?.id, loadingSession, navigation, toast, t]);

  const handleStartNewConversation = useCallback(async () => {
    if (!user?.id) return;
    if (!aiChatGate.guard()) return;

    try {
      const count = await ConversationService.getSessionCount(user.id);
      if (count >= MAX_SESSIONS) {
        toast(
          t('conversationList.limitReached'),
          t('conversationList.limitReachedMessage', { count: MAX_SESSIONS }),
          'error'
        );
        return;
      }
      navigation.navigate('ConversationSetup');
    } catch (error) {
      console.error('检查会话数量失败:', error);
      navigation.navigate('ConversationSetup');
    }
  }, [user?.id, navigation, toast, t]);

  // ============ 编辑模式 ============
  const toggleSelect = useCallback((sessionId: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      newSet.has(sessionId) ? newSet.delete(sessionId) : newSet.add(sessionId);
      return newSet;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds(selectedIds.size === sessions.length ? new Set() : new Set(sessions.map((s) => s.sessionId)));
  }, [sessions, selectedIds.size]);

  const enterEditMode = useCallback(() => {
    setIsEditMode(true);
    setSelectedIds(new Set());
  }, []);

  const exitEditMode = useCallback(() => {
    setIsEditMode(false);
    setSelectedIds(new Set());
  }, []);

  // ============ 辅助函数 ============
  const getDisplayRole = useCallback((aiRole: string, voiceName: string | null) => {
    if (voiceName) return voiceName;
    if (aiRole === 'english_coach') return t('conversation.mode.free.defaultRole');
    return aiRole;
  }, [t]);

  const getDisplayScenario = useCallback((predefinedScenarioId: string | null, scenario: string) => {
    if (predefinedScenarioId === FREE_CONVERSATION_SCENARIO_ID || scenario === 'general') {
      return t('conversation.mode.free.title');
    }
    if (predefinedScenarioId) {
      const predefinedScenario = scenarios.find((s) => s.id === predefinedScenarioId);
      if (predefinedScenario) return getLocalizedText(predefinedScenario.title, effectiveLanguage);
      return predefinedScenarioId;
    }
    return scenario;
  }, [t, scenarios, effectiveLanguage]);

  const getDifficultyLabel = useCallback((level: string) => {
    const labels: Record<string, string> = {
      starter: t('conversation.difficulty.starter.label'),
      elementary: t('conversation.difficulty.elementary.label'),
      cet4: t('conversation.difficulty.cet4.label'),
      cet6: t('conversation.difficulty.cet6.label'),
      ielts7_tem8: t('conversation.difficulty.ielts7_tem8.label'),
      native: t('conversation.difficulty.native.label'),
    };
    return labels[level] || level;
  }, [t]);

  // ============ 滚动相关 ============
  const handleContentSizeChange = useCallback((_w: number, h: number) => {
    contentHeight.current = h;
    setIsScrollable(h > containerHeight.current);
  }, []);

  const handleLayout = useCallback((e: { nativeEvent: { layout: { height: number } } }) => {
    containerHeight.current = e.nativeEvent.layout.height;
    setIsScrollable(contentHeight.current > e.nativeEvent.layout.height);
  }, []);

  return {
    // 数据
    sessions,
    loading,
    refreshing,
    hasMore,
    loadingMore,
    loadingSession,
    isScrollable,

    // 编辑模式
    isEditMode,
    selectedIds,
    isDeleting,

    // refs
    swipeableRefs,
    voiceAvatars,

    // 操作
    handleRefresh,
    loadMore,
    handleDeleteSession,
    handleBatchDelete,
    handleSessionPress,
    handleStartNewConversation,
    toggleSelect,
    toggleSelectAll,
    enterEditMode,
    exitEditMode,

    // 辅助
    getDisplayRole,
    getDisplayScenario,
    getDifficultyLabel,
    handleContentSizeChange,
    handleLayout,

    // UI
    navigation,
    t,
    AlertComponent,
  };
}
