import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import { apiClient } from '@/api';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useCharacters } from '@/stores';
import type {
  EpisodeConfig,
  ScriptItem,
  DisplayItem,
  DialogueItem,
  AnswerRecord,
  ConversationEvaluation,
  ConversationQuestion,
  PronunciationWord,
} from '@/types/storyMode';

type PracticePhase = 'transition' | 'loading' | 'playing' | 'finished' | 'completed';

type StoryRoute = RouteProp<{ StoryChat: { characterId: string; episodeId: string } }, 'StoryChat'>;

export default function useStoryPractice() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const navigation = useNavigation<any>();
  const route = useRoute<StoryRoute>();
  const { characterId, episodeId } = route.params;

  // 获取角色信息
  const { characters: allCharacters } = useCharacters();

  // 角色 → avatar URL
  const getAvatarForCharacter = useCallback((charId: string): string | null => {
    const char = allCharacters.find(c => c.id === charId || c.name.toLowerCase() === charId.toLowerCase());
    return char?.avatar || null;
  }, [allCharacters]);

  // 角色 → 显示名
  const getCharacterName = useCallback((charId: string): string => {
    if (charId === 'user') return 'You';
    const char = allCharacters.find(c => c.id === charId || c.name.toLowerCase() === charId.toLowerCase());
    return char?.name || charId;
  }, [allCharacters]);

  // 核心状态
  const [phase, setPhase] = useState<PracticePhase>('loading');
  const [episodeConfig, setEpisodeConfig] = useState<EpisodeConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  // episodeInfo 从 episodeConfig 派生
  const episodeInfo = useMemo(() => {
    if (!episodeConfig) return null;
    return {
      id: episodeConfig.episode_id,
      title: episodeConfig.title,
      titleZh: episodeConfig.title_zh,
    };
  }, [episodeConfig]);

  // 剧情推进状态
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayedItems, setDisplayedItems] = useState<DisplayItem[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<ScriptItem | null>(null);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);

  // 输入状态
  const [inputText, setInputText] = useState('');
  const [isVoiceMode, setIsVoiceMode] = useState(false);

  // 剧情音频播放器（标题 + script 预生成音频，自动推进用）
  const storyPlayer = useAudioPlayer();
  // play 是 useCallback 稳定引用，用 ref 避免整个 storyPlayer 对象进 useCallback 依赖
  const storyPlayRef = useRef(storyPlayer.play);
  storyPlayRef.current = storyPlayer.play;

  // 用户语音消息回放（手动点击播放录音，独立于剧情流）
  const voicePlayer = useAudioPlayer();
  const voicePlayRef = useRef(voicePlayer.play);
  voicePlayRef.current = voicePlayer.play;
  const voiceStopRef = useRef(voicePlayer.stop);
  voiceStopRef.current = voicePlayer.stop;
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);

  // 语音输入
  const voiceInput = useVoiceInput({
    onVoiceMessageSend: (voiceData) => {
      // 语音识别后作为文本提交
      if (voiceData.text) {
        setInputText(voiceData.text);
      }
    },
  });

  // Refs
  const scrollViewRef = useRef<ScrollView>(null);
  const autoPlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentIndexRef = useRef(0);
  const ttsQueueRef = useRef<{ id: string; text: string; voice: string | null }[]>([]);

  // 同步 currentIndex 到 ref
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  // 自动滚到底部
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  // 加载 episode 配置
  const handleStart = useCallback(async () => {
    setPhase('loading');
    setError(null);
    try {
      const config = await apiClient.getEpisodeConfig(episodeId);
      setEpisodeConfig(config);
      setPhase('playing');
      setCurrentIndex(0);
      setDisplayedItems([]);
      setCurrentQuestion(null);
      setAnswers([]);
      hasSavedProgressRef.current = false;
      // 播标题预生成音频，播完后 storyPlayer effect 触发推进
      // 无音频时由 isAutoPlaying effect 自动推进
      if (config.title_audio_url) {
        storyPlayRef.current(config.title_audio_url);
      }
      setIsAutoPlaying(true);
    } catch (e: any) {
      setError(e.message || 'Failed to load episode');
      setPhase('transition');
    }
  }, [episodeId]);

  // 进入页面自动加载并开始
  useEffect(() => {
    handleStart();
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  // 剧情播完后保存进度
  const hasSavedProgressRef = useRef(false);
  const answersRef = useRef(answers);
  answersRef.current = answers;
  useEffect(() => {
    if (phase !== 'finished' || hasSavedProgressRef.current) return;
    hasSavedProgressRef.current = true;

    const currentAnswers = answersRef.current;
    const totalQuestions = currentAnswers.length;
    if (totalQuestions === 0) return;

    // 计算星星：正确率 >= 90% → 3星, >= 60% → 2星, 其他 → 1星
    const correctCount = currentAnswers.filter(a => a.correct).length;
    const correctRate = correctCount / totalQuestions;
    const stars = correctRate >= 0.9 ? 3 : correctRate >= 0.6 ? 2 : 1;

    apiClient.updateStoryProgress({
      episodeId,
      status: 'completed',
      stars,
      answers: currentAnswers,
    }).catch(e => console.error('保存剧情进度失败:', e));
  }, [phase, episodeId]);

  // 推进一条 script
  const advanceOne = useCallback(() => {
    if (!episodeConfig) return;
    const script = episodeConfig.script;
    const idx = currentIndexRef.current;

    if (idx >= script.length) {
      setIsAutoPlaying(false);
      setPhase('finished');
      setTimeout(() => scrollToBottom(), 300);
      return;
    }

    const item = script[idx];

    if (item.type === 'narrator' || item.type === 'dialogue') {
      setDisplayedItems(prev => [...prev, item]);
      setCurrentIndex(prev => prev + 1);
      currentIndexRef.current = idx + 1;
      scrollToBottom();

      // 播放预生成音频，无音频则延迟后推进下一条
      const audioUrl = item.audioUrl;
      if (audioUrl) {
        storyPlayRef.current(audioUrl);
      } else {
        autoPlayTimerRef.current = setTimeout(() => {
          advanceOne();
        }, 1000);
      }
    } else if (item.type === 'question') {
      // question 也加入对话流显示
      setDisplayedItems(prev => [...prev, item]);
      setIsAutoPlaying(false);
      setCurrentQuestion(item);
      setInputText('');
      scrollToBottom();
    }
  }, [episodeConfig, scrollToBottom]);

  // 监听预生成音频播完 → 推进下一条
  const prevAudioPlayingRef = useRef(false);
  useEffect(() => {
    const wasPlaying = prevAudioPlayingRef.current;
    const nowPlaying = storyPlayer.isPlaying || storyPlayer.isLoading;
    prevAudioPlayingRef.current = nowPlaying;

    if (wasPlaying && !nowPlaying && isAutoPlaying && phase === 'playing') {
      autoPlayTimerRef.current = setTimeout(() => {
        advanceOne();
      }, 300);
    }
  }, [storyPlayer.isPlaying, storyPlayer.isLoading, isAutoPlaying, phase, advanceOne]);

  // 开始自动推进（首次 or 答题后恢复）
  useEffect(() => {
    if (isAutoPlaying && episodeConfig && phase === 'playing' && !storyPlayer.isPlaying && !storyPlayer.isLoading) {
      advanceOne();
    }
    return () => {
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAutoPlaying]);

  // 对话题提交
  const handleConversationSubmit = useCallback(
    async (userAnswer: string): Promise<ConversationEvaluation> => {
      if (!currentQuestion || currentQuestion.type !== 'question' || currentQuestion.question_type !== 'conversation') {
        throw new Error('Not a conversation question');
      }
      const q = currentQuestion as ConversationQuestion;
      const result = await apiClient.evaluateConversation({
        goal: q.goal,
        goal_description: q.goal_description || q.goal,
        expected_answer: q.expected_answer,
        user_answer: userAnswer,
        difficulty_level: 'cet4',
      });
      return result;
    },
    [currentQuestion],
  );

  // 显示用户对话气泡
  const addUserDialogue = useCallback((userText: string, voiceData?: { filePath: string; duration: number }, pronunciationWords?: PronunciationWord[]) => {
    const userDialogue: DialogueItem = {
      type: 'dialogue',
      character: 'user',
      line: userText,
      voiceUri: voiceData?.filePath,
      voiceDuration: voiceData?.duration,
      pronunciationWords,
    };
    setDisplayedItems(prev => [...prev, userDialogue]);
    scrollToBottom();
  }, [scrollToBottom]);

  // 添加评估反馈到剧情流（对话题）
  const addEvaluationFeedback = useCallback((evaluation: ConversationEvaluation) => {
    const feedbackItem = {
      type: 'evaluation' as const,
      questionType: 'conversation',
      score: evaluation.score,
      feedback: evaluation.feedback,
      corrections: evaluation.corrections || [],
      highlights: evaluation.highlights || [],
    };
    setDisplayedItems(prev => [...prev, feedbackItem]);
    scrollToBottom();
  }, [scrollToBottom]);

  // 添加题目结果到剧情流（choice/listening/pronunciation）
  const addQuestionResult = useCallback((result: {
    questionType: string;
    correct?: boolean;
    score?: number;
    correctAnswer?: string;
    explanation?: string;
    explanationZh?: string;
    words?: { word: string; accuracyScore: number }[];
    sentence?: string;
  }) => {
    const resultItem = {
      type: 'evaluation' as const,
      questionType: result.questionType,
      correct: result.correct,
      score: result.score ?? (result.correct ? 10 : 3),
      correctAnswer: result.correctAnswer || '',
      feedback: result.explanationZh || result.explanation || '',
      corrections: [],
      highlights: [],
      words: result.words || [],
      sentence: result.sentence || '',
    };
    setDisplayedItems(prev => [...prev, resultItem]);
    scrollToBottom();
  }, [scrollToBottom]);

  // 播放用户语音消息
  const handlePlayVoiceMessage = useCallback(async (itemIndex: string, voiceUri: string) => {
    if (playingVoiceId === itemIndex && voicePlayer.isPlaying) {
      await voiceStopRef.current();
      setPlayingVoiceId(null);
    } else {
      setPlayingVoiceId(itemIndex);
      await voicePlayRef.current(voiceUri);
    }
  }, [playingVoiceId, voicePlayer.isPlaying]);

  // 答题完成（所有题型通用回调）
  const handleQuestionComplete = useCallback(
    (correct: boolean, score?: number, _userText?: string) => {
      if (!currentQuestion || currentQuestion.type !== 'question') return;

      // 记录答题结果
      setAnswers(prev => [
        ...prev,
        {
          scriptIndex: currentIndex,
          questionType: currentQuestion.question_type,
          correct,
          score,
        },
      ]);

      // 清除当前题目，推进下一条
      setCurrentQuestion(null);
      setCurrentIndex(prev => prev + 1);
      currentIndexRef.current = currentIndexRef.current + 1;

      setTimeout(() => {
        setIsAutoPlaying(true);
      }, 500);
    },
    [currentQuestion, currentIndex],
  );

  // 文本发送（对话题用）
  const handleSendText = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');
    // 触发由 ConversationQuestion 组件处理
    // 这里只是清空输入
  }, [inputText]);

  // 返回
  const handleBack = useCallback(() => {
    if (autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current);
    }
    storyPlayer.stop();
    navigation.goBack();
  }, [navigation, storyPlayer]);

  // 用户点击"查看结果"进入 completed 页面
  const handleFinish = useCallback(() => {
    setPhase('completed');
  }, []);

  // 计算进度
  const totalItems = episodeConfig?.script.length || 0;
  const progressCurrent = currentIndex;

  return {
    // 基础信息
    theme,
    t,
    characterId,
    episodeId,
    episodeInfo,

    // 阶段
    phase,
    error,

    // 剧情数据
    episodeConfig,
    displayedItems,
    currentQuestion,
    answers,
    isAutoPlaying,

    // 进度
    progressCurrent,
    totalItems,

    // 输入状态
    inputText,
    setInputText,
    isVoiceMode,
    setIsVoiceMode,
    voiceInput,

    // 音频
    storyPlayer,

    // Refs
    scrollViewRef,

    // 工具函数
    getCharacterName,
    getAvatarForCharacter,

    // 回调
    handleStart,
    handleBack,
    handleFinish,
    handleConversationSubmit,
    handleQuestionComplete,
    addUserDialogue,
    addEvaluationFeedback,
    addQuestionResult,
    handlePlayVoiceMessage,
    playingVoiceId,
    voicePlayer,
    handleSendText,
    scrollToBottom,
  };
}
