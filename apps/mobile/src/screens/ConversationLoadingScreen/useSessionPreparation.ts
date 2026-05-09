import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { BackHandler } from 'react-native';
import { Animated } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useI18n } from '@/context/I18nProvider';
import { useAuth } from '@/stores/AuthStore';
import { prepareChatSession, createChatSession } from '@/services/ConversationService';
import { getRecentLearnedWords } from '@/db/word/EncounterDB';
import type { ConversationConfig, I18nText } from '@/types/conversation';

// 导航类型定义
type RootStackParamList = {
  ConversationLoading: { config: ConversationConfig };
  ConversationChat: {
    sessionId: string;
    config: ConversationConfig;
    welcomeMessage: any;
  };
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'ConversationLoading'>;

// 获取本地化文本的辅助函数
const getLocalizedText = (text: I18nText | string | undefined, language: string): string => {
  if (!text) return '';
  if (typeof text === 'string') return text;
  return text[language as keyof I18nText] || text['en'] || '';
};

export function useSessionPreparation() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<RootStackParamList, 'ConversationLoading'>>();
  const { t, effectiveLanguage } = useI18n();
  const { user } = useAuth();

  // 安全获取 config，添加防护
  const config = route.params?.config;

  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [loadingStage, setLoadingStage] = useState<'prepare' | 'create'>('prepare');
  const [errorInfo, setErrorInfo] = useState<{ title: string; message: string } | null>(null);

  // 动画值 - 使用 useRef 保持稳定引用
  const rotationValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(1)).current;
  const progressValue = useRef(new Animated.Value(0)).current;

  // Refs 用于清理
  const isMountedRef = useRef(true);
  const rotationAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const pulseAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const progressAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSessionCreatedRef = useRef(false); // 防止重复创建会话

  // 组件卸载时清理所有资源
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      // 清理所有动画
      rotationAnimRef.current?.stop();
      pulseAnimRef.current?.stop();
      progressAnimRef.current?.stop();
      // 清理所有定时器
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, []);

  // 检查 config 是否存在，如果不存在则返回上一页
  useEffect(() => {
    if (!config) {
      console.error('ConversationLoadingScreen: Missing config in route params');
      navigation.goBack();
    }
  }, [config, navigation]);

  // 旋转动画
  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(rotationValue, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      }),
    );
    rotationAnimRef.current = animation;
    animation.start();

    return () => {
      animation.stop();
    };
  }, [rotationValue]);

  // 脉冲动画
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleValue, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(scaleValue, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    pulseAnimRef.current = animation;
    animation.start();

    return () => {
      animation.stop();
    };
  }, [scaleValue]);

  // 消息轮播
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessageIndex(prev => {
        if (prev >= 9) { // loadingMessageKeys.length - 1
          return 0;
        }
        return prev + 1;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  // 辅助函数：启动进度动画
  const animateProgress = useCallback((toValue: number, duration: number) => {
    progressAnimRef.current?.stop();
    const animation = Animated.timing(progressValue, {
      toValue,
      duration,
      useNativeDriver: false,
    });
    progressAnimRef.current = animation;
    animation.start();
  }, [progressValue]);

  // 创建对话会话 - 分两步调用 API
  useEffect(() => {
    // 防止重复创建或 config 不存在
    if (!config || isSessionCreatedRef.current) return;
    isSessionCreatedRef.current = true;

    const createSession = async () => {
      try {
        // 获取场景信息
        const predefinedScenarioId = config.selectedScenario?.id;
        const aiRole = config.selectedScenario?.ai_role || config.customRole || 'English Teacher';
        const scenario = config.selectedScenario?.scenario || config.customScenario || 'General English Conversation';

        // 第一步：预生成系统提示词
        if (!isMountedRef.current) return;
        setLoadingStage('prepare');
        animateProgress(0.4, 1000);

        // 查询用户最近学过的单词，用于 AI 对话词汇强化
        let learnedWordsList: string[] = [];
        try {
          const userId = user?.id || 'guest';
          const recentWords = await getRecentLearnedWords(userId, 7, 30);
          learnedWordsList = recentWords.map(w => w.word);
        } catch (e) {
          console.warn('[ConversationLoading] 获取学过的词失败:', e);
        }

        const prepareResult = await prepareChatSession({
          predefined_scenario_id: predefinedScenarioId,
          ai_role: aiRole,
          scenario: scenario,
          difficulty_level: config.difficulty,
          english_variant: config.englishVariant,
          conversation_style: config.conversationStyle,
          enable_tips: config.enableTips,
          voice_id: config.voiceId,
          voice_name: config.voiceName,
          voice_gender: config.voiceGender,
          learned_words: learnedWordsList.length > 0 ? learnedWordsList : undefined,
        });
        if (!isMountedRef.current) return;

        if (!prepareResult.success || !prepareResult.system_prompt) {
          throw new Error(prepareResult.error || t('conversation.loading.generatePromptFailed'));
        }

        // 第二步：创建会话
        setLoadingStage('create');
        animateProgress(0.8, 500);

        const session = await createChatSession({
          user_id: user?.id || 'guest',
          session_title: getLocalizedText(config.selectedScenario?.title, effectiveLanguage) || scenario,
          predefined_scenario_id: predefinedScenarioId,
          ai_role: aiRole,
          scenario: scenario,
          difficulty_level: config.difficulty,
          english_variant: config.englishVariant,
          conversation_style: config.conversationStyle,
          enable_tips: config.enableTips,
          voice_id: config.voiceId,
          voice_name: config.voiceName,
          voice_gender: config.voiceGender,
          prepared_system_prompt: prepareResult.system_prompt,
        });
        if (!isMountedRef.current) return;

        // 完成
        animateProgress(1, 300);
        setIsComplete(true);

        // 延迟一点再跳转，让用户看到完成状态
        navigationTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            navigation.replace('ConversationChat', {
              sessionId: session.session_id,
              config: config,
              welcomeMessage: session.welcome_message,
            });
          }
        }, 800);

      } catch (error) {
        if (!isMountedRef.current) return;

        // 设置错误信息显示在页面上
        const errorTitle = t('conversation.loading.createFailed');
        const errorMessage = error instanceof Error ? error.message : t('conversation.loading.createFailedMessage');
        setErrorInfo({ title: errorTitle, message: errorMessage });

        // 5秒后自动返回上一级
        errorTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            navigation.goBack();
          }
        }, 5000);
      }
    };

    createSession();
  }, [config, user?.id, effectiveLanguage, t, navigation, animateProgress]);

  // 处理返回按钮 - 直接返回
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      navigation.goBack();
      return true;
    });

    return () => backHandler.remove();
  }, [navigation]);

  // 动画插值
  const spin = rotationValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const progressWidth = progressValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  // 获取场景标题（处理 i18n）- 使用 useMemo 优化
  const scenarioTitle = useMemo(() => {
    if (!config) return '';
    if (config.selectedScenario?.title) {
      return getLocalizedText(config.selectedScenario.title, effectiveLanguage);
    }
    if (config.customScenario) {
      return config.customScenario.length > 30
        ? config.customScenario.substring(0, 30) + '...'
        : config.customScenario;
    }
    return '';
  }, [config, effectiveLanguage]);

  return {
    config,
    currentMessageIndex,
    isComplete,
    loadingStage,
    errorInfo,
    scaleValue,
    spin,
    progressWidth,
    scenarioTitle,
    t,
  };
}
