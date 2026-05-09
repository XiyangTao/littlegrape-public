import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { toast } from '@/stores/ToastStore';
import { useI18n } from '@/context/I18nProvider';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import {
  PHONEME_AUDIO_URLS,
  PHONEME_WORD_AUDIO_URLS,
  type Phoneme,
} from '@/data/phonemes';
import { usePhonemeData } from './usePhonemeData';
import { usePronunciationAssessment } from '@/hooks/usePronunciationAssessment';
import { useTTS } from '@/hooks/useTTS';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useAuth } from '@/stores/AuthStore';
import { useUserStore } from '@/stores';
import { apiClient } from '@/api';
import { recordPhonemePractice } from '@/services/StatsService';
import { isPhonemeMatch, fillEmptyPhonemes } from '@/utils/phonemeMapping';
import {
  savePhonemeSessionResult,
  getPhonemeProgress,
  type PhonemeProgressRow,
} from '@/db/PhonemeProgressDB';
import {
  type RootStackParamList,
  type PageMode,
  type IntroState,
  type SessionDrill,
  type SessionState,
  type DrillStep,
  type DrillResult,
  type ListenDrillResult,
  type SpeakDrillResult,
} from './types';
import { generateSessionDrills } from './drillGenerator';

// Re-export 所有类型（向后兼容）
export type {
  PageMode,
  IntroState,
  DrillType,
  ListenIdentifyDrill,
  SameDifferentDrill,
  SpeakDrill,
  SessionDrill,
  ListenDrillResult,
  SpeakDrillResult,
  DrillResult,
  SessionState,
  ListenStep,
  SameDifferentStep,
  SpeakStep,
  DrillStep,
} from './types';

// Re-export generateSessionDrills（向后兼容）
export { generateSessionDrills } from './drillGenerator';

type MasteryLevel = PhonemeProgressRow['masteryLevel'];

// ============================================================================
// Hook
// ============================================================================

export function usePhonemePractice() {
  const { t } = useI18n();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'PhonemePractice'>>();
  const { user } = useAuth();

  // 动态音素数据
  const { getPhonemeBySymbol } = usePhonemeData();

  // Hooks
  const pronunciation = usePronunciationAssessment();
  const tts = useTTS();
  const audioPlayer = useAudioPlayer();
  const pronunciationGate = useFeatureGate('pronunciation');

  // 页面状态
  const [mode, setMode] = useState<PageMode>('intro');
  const [intro, setIntro] = useState<IntroState | null>(null);
  const [session, setSession] = useState<SessionState | null>(null);
  const [drillStep, setDrillStep] = useState<DrillStep>('playing');
  const [tipExpanded, setTipExpanded] = useState(true);

  // 听辨题状态
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isOptionCorrect, setIsOptionCorrect] = useState<boolean | null>(null);

  // same_different 题状态
  const [selectedAnswer, setSelectedAnswer] = useState<boolean | null>(null);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);

  // Refs
  const drillStepRef = useRef<DrillStep>('playing');
  const sessionRef = useRef<SessionState | null>(null);
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  drillStepRef.current = drillStep;
  sessionRef.current = session;

  // 安全的 setTimeout，卸载时自动清理
  const safeTimeout = useCallback((fn: () => void, delay: number) => {
    const id = setTimeout(() => {
      timersRef.current.delete(id);
      fn();
    }, delay);
    timersRef.current.add(id);
    return id;
  }, []);

  // 组件卸载时清理所有定时器
  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current.clear();
    };
  }, []);

  // 派生状态
  const currentDrill = session ? session.drills[session.currentIndex] : null;
  const progress = session
    ? { current: session.currentIndex + 1, total: session.drills.length }
    : { current: 0, total: 0 };

  // 跟读题当前单词
  const currentWord = currentDrill?.type === 'speak' ? currentDrill.word : null;

  // 评估配置（仅跟读题需要）
  const assessmentConfig = useMemo(() => {
    if (!currentWord) return null;
    return {
      referenceText: currentWord.word,
      language: 'en-GB',
      granularity: 'phoneme' as const,
      enableProsody: false,
      enableMiscue: true,
      maxDuration: 3000,
      userId: user?.id || null,
    };
  }, [currentWord, user?.id]);

  // ============================================================================
  // 播放单词发音（CDN 预生成音频，voice 默认 sonia）
  // ============================================================================

  const playWord = useCallback((word: string, messageId: string, voice: 'sonia' | 'ryan' = 'sonia') => {
    const urls = PHONEME_WORD_AUDIO_URLS[word];
    if (!urls) return;
    tts.playUrl(messageId, urls[voice]);
  }, [tts]);

  // ============================================================================
  // Intro 进入
  // ============================================================================

  const enterIntro = useCallback((phoneme: Phoneme) => {
    setIntro({ targetPhoneme: phoneme, confusablePhoneme: null });
    setMode('intro');
  }, []);

  // ============================================================================
  // 路由参数处理
  // ============================================================================

  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current) return;
    const { phonemeSymbol } = route.params || {};
    if (phonemeSymbol) {
      const phoneme = getPhonemeBySymbol(phonemeSymbol);
      if (phoneme) {
        initializedRef.current = true;
        enterIntro(phoneme);
      }
    }
  }, [route.params, getPhonemeBySymbol, enterIntro]);

  // ============================================================================
  // Session 管理
  // ============================================================================

  const startSession = useCallback(async (phoneme: Phoneme, masteryLevel: MasteryLevel = 'none') => {
    pronunciation.reset();
    audioPlayer.stop();
    tts.stop();

    const result = generateSessionDrills(phoneme, getPhonemeBySymbol, masteryLevel);

    // 缺少最小对数据 → toast 提示
    if (!result) {
      toast.warning(t('phonemePractice.dataNotReady'));
      return;
    }

    const { drills, confusablePhoneme } = result;

    setSession({
      targetPhoneme: phoneme,
      confusablePhoneme,
      drills,
      currentIndex: 0,
      results: [],
    });
    setSelectedOption(null);
    setIsOptionCorrect(null);
    setSelectedAnswer(null);
    setIsAnswerCorrect(null);
    setTipExpanded(true);
    setMode('session');

    // 根据第一题类型初始化步骤
    const firstDrill = drills[0];
    if (firstDrill.type === 'speak') {
      setDrillStep('listen');
      safeTimeout(() => {
        playWord(firstDrill.word.word, `word_${firstDrill.word.word}`);
      }, 500);
    } else if (firstDrill.type === 'listen_identify') {
      setDrillStep('playing');
      safeTimeout(() => {
        playWord(firstDrill.playWord.word, `word_${firstDrill.playWord.word}`);
      }, 500);
    } else if (firstDrill.type === 'same_different') {
      setDrillStep('playing_first');
      safeTimeout(() => {
        playWord(firstDrill.word1.word, `sd_w1_${firstDrill.word1.word}`, firstDrill.voice1);
      }, 500);
    }
  }, [pronunciation, audioPlayer, tts, getPhonemeBySymbol, playWord, t, safeTimeout]);

  // ============================================================================
  // TTS 播放完自动切换
  // ============================================================================

  const prevTtsPlaying = useRef(false);
  useEffect(() => {
    if (prevTtsPlaying.current && !tts.isPlaying && !tts.isLoading) {
      const step = drillStepRef.current;
      const drill = sessionRef.current?.drills[sessionRef.current.currentIndex];

      if (!drill) return;

      if (drill.type === 'speak' && step === 'listen') {
        setDrillStep('record');
      } else if (drill.type === 'listen_identify' && step === 'playing') {
        setDrillStep('choosing');
      } else if (drill.type === 'same_different' && step === 'playing_first') {
        // 延迟 800ms 用不同音色播放第二个词
        safeTimeout(() => {
          setDrillStep('playing_second');
          playWord(drill.word2.word, `sd_w2_${drill.word2.word}`, drill.voice2);
        }, 800);
      } else if (drill.type === 'same_different' && step === 'playing_second') {
        setDrillStep('choosing');
      }
    }
    prevTtsPlaying.current = tts.isPlaying;
  }, [tts.isPlaying, tts.isLoading]);

  // ============================================================================
  // 评估结果返回 → feedback / 评估失败 → 回到录音
  // ============================================================================

  useEffect(() => {
    if (drillStepRef.current !== 'assessing') return;
    if (pronunciation.result) {
      setDrillStep('feedback');
    } else if (pronunciation.error && !pronunciation.isAssessing) {
      // 评估失败（如未检测到发音），回到录音步骤允许重试
      setDrillStep('record');
    }
  }, [pronunciation.result, pronunciation.error, pronunciation.isAssessing]);

  // ============================================================================
  // 进入一道题（统一入口）
  // ============================================================================

  const enterDrill = useCallback((drill: SessionDrill) => {
    setSelectedOption(null);
    setIsOptionCorrect(null);
    setSelectedAnswer(null);
    setIsAnswerCorrect(null);

    if (drill.type === 'speak') {
      setDrillStep('listen');
      safeTimeout(() => {
        playWord(drill.word.word, `word_${drill.word.word}`);
      }, 400);
    } else if (drill.type === 'listen_identify') {
      setDrillStep('playing');
      safeTimeout(() => {
        playWord(drill.playWord.word, `word_${drill.playWord.word}`);
      }, 400);
    } else if (drill.type === 'same_different') {
      setDrillStep('playing_first');
      safeTimeout(() => {
        playWord(drill.word1.word, `sd_w1_${drill.word1.word}`, drill.voice1);
      }, 400);
    }
  }, [playWord, safeTimeout]);

  // ============================================================================
  // 操作方法
  // ============================================================================

  // 从 intro 页开始练习
  const handleStartFromIntro = useCallback(async () => {
    if (!intro) return;
    let masteryLevel: MasteryLevel = 'none';
    if (user?.id) {
      try {
        const progress = await getPhonemeProgress(user.id, intro.targetPhoneme.symbol);
        if (progress) masteryLevel = progress.masteryLevel;
      } catch (error) {
        console.error('获取音素进度失败:', error);
      }
    }
    startSession(intro.targetPhoneme, masteryLevel);
  }, [intro, user?.id, startSession]);

  // 播放标准发音（跟读题、listen_identify 重播）
  const handlePlayStandard = useCallback(() => {
    if (!currentDrill) return;
    if (tts.isPlaying || tts.isLoading) {
      tts.stop();
      return;
    }
    if (currentDrill.type === 'speak') {
      playWord(currentDrill.word.word, `word_${currentDrill.word.word}`);
    } else if (currentDrill.type === 'listen_identify') {
      playWord(currentDrill.playWord.word, `word_${currentDrill.playWord.word}`);
    }
  }, [currentDrill, tts, playWord]);

  // same_different 题：用户选择"相同"或"不同"
  const handleSelectSameDifferent = useCallback((userAnswer: boolean) => {
    if (!currentDrill || currentDrill.type !== 'same_different' || drillStep !== 'choosing') return;
    const correct = userAnswer === currentDrill.isSame;
    setSelectedAnswer(userAnswer);
    setIsAnswerCorrect(correct);
    setDrillStep('feedback');
  }, [currentDrill, drillStep]);

  // same_different 题：重播某个词
  const handlePlaySDWord = useCallback((wordIndex: 1 | 2) => {
    if (!currentDrill || currentDrill.type !== 'same_different') return;
    if (tts.isPlaying || tts.isLoading) {
      tts.stop();
      return;
    }
    const word = wordIndex === 1 ? currentDrill.word1 : currentDrill.word2;
    const voice = wordIndex === 1 ? currentDrill.voice1 : currentDrill.voice2;
    playWord(word.word, `sd_replay_${word.word}_${wordIndex}`, voice);
  }, [currentDrill, tts, playWord]);

  // 听辨题：用户选择选项
  const handleSelectOption = useCallback((index: number) => {
    if (!currentDrill || drillStep !== 'choosing') return;

    setSelectedOption(index);

    let correct = false;
    if (currentDrill.type === 'listen_identify') {
      correct = index === currentDrill.correctIndex;
    }

    setIsOptionCorrect(correct);
    setDrillStep('feedback');
  }, [currentDrill, drillStep]);

  // 开始录音
  const handleStartRecording = useCallback(async () => {
    if (!assessmentConfig || pronunciation.isRecording || pronunciation.isInitializing || pronunciation.isAssessing) return;
    if (!pronunciationGate.guard()) return;
    try {
      setDrillStep('record');
      await pronunciation.start(assessmentConfig);
    } catch (error) {
      console.error('开始录音失败:', error);
    }
  }, [assessmentConfig, pronunciation]);

  // 停止录音
  const handleStopRecording = useCallback(async () => {
    if (!pronunciation.isRecording) return;
    try {
      setDrillStep('assessing');
      await pronunciation.stop();
    } catch (error) {
      console.error('停止录音失败:', error);
      setDrillStep('record');
    }
  }, [pronunciation]);

  // 收集跟读题结果
  const collectSpeakResult = useCallback((): SpeakDrillResult | null => {
    if (!currentDrill || currentDrill.type !== 'speak' || !pronunciation.result || !session) return null;
    const result = pronunciation.result;
    const rawPhonemes = result.words?.[0]?.phonemes || [];
    const phonemes = fillEmptyPhonemes(rawPhonemes, currentDrill.word.phonetic);
    const targetScore = phonemes.find(p => isPhonemeMatch(p.phoneme, session.targetPhoneme.symbol));
    return {
      drillType: 'speak',
      word: currentDrill.word,
      accuracyScore: result.accuracyScore,
      targetPhonemeScore: targetScore ? targetScore.accuracyScore : null,
      allPhonemes: phonemes.map(p => ({ phoneme: p.phoneme, accuracyScore: p.accuracyScore })),
      recordingUri: pronunciation.recordingUri,
    };
  }, [currentDrill, pronunciation.result, pronunciation.recordingUri, session]);

  // 下一题（通用）
  const handleNextDrill = useCallback(() => {
    if (!session) return;

    // 收集当前题目的结果
    let drillResult: DrillResult | null = null;
    if (currentDrill) {
      if (currentDrill.type === 'speak') {
        drillResult = collectSpeakResult();
      } else if (currentDrill.type === 'listen_identify') {
        drillResult = {
          drillType: currentDrill.type,
          correct: isOptionCorrect ?? false,
        };
      } else if (currentDrill.type === 'same_different') {
        drillResult = {
          drillType: 'same_different',
          correct: isAnswerCorrect ?? false,
        };
      }
    }

    const updatedResults = drillResult
      ? [...session.results, drillResult]
      : session.results;

    const nextIndex = session.currentIndex + 1;

    // 最后一题 → 完成
    if (nextIndex >= session.drills.length) {
      setSession(prev => prev ? { ...prev, results: updatedResults } : null);
      finishSession(session, updatedResults);
      return;
    }

    // 进入下一题
    pronunciation.reset();
    audioPlayer.stop();

    const nextDrill = session.drills[nextIndex];
    setSession(prev => prev ? {
      ...prev,
      currentIndex: nextIndex,
      results: updatedResults,
    } : null);
    setTipExpanded(false);

    enterDrill(nextDrill);
  }, [session, currentDrill, collectSpeakResult, isOptionCorrect, isAnswerCorrect, pronunciation, audioPlayer, enterDrill]);

  // 重试（仅跟读题）
  const handleRetryDrill = useCallback(() => {
    if (!currentDrill || currentDrill.type !== 'speak') return;
    pronunciation.reset();
    audioPlayer.stop();
    setDrillStep('listen');

    safeTimeout(() => {
      playWord(currentDrill.word.word, `word_${currentDrill.word.word}`);
    }, 300);
  }, [currentDrill, pronunciation, audioPlayer, playWord, safeTimeout]);

  // 完成 Session → 保存 DB + 切到 summary
  const finishSession = useCallback(async (sess: SessionState, results: DrillResult[]) => {
    if (user?.id && results.length > 0) {
      try {
        // 提取跟读结果
        const speakResults = results.filter((r): r is SpeakDrillResult => r.drillType === 'speak');
        // 提取听辨结果
        const listenResults = results.filter((r): r is ListenDrillResult =>
          r.drillType === 'listen_identify' || r.drillType === 'same_different'
        );

        const listenStats = listenResults.length > 0
          ? { totalCount: listenResults.length, correctCount: listenResults.filter(r => r.correct).length }
          : undefined;

        if (speakResults.length > 0 || listenStats) {
          await savePhonemeSessionResult(
            user.id,
            sess.targetPhoneme.symbol,
            speakResults.map(r => ({
              word: r.word.word,
              accuracyScore: r.accuracyScore,
              phonemeAccuracyScore: r.targetPhonemeScore,
              allPhonemes: r.allPhonemes,
            })),
            listenStats,
          );
        }
        // 记录发音练习到每日统计
        await recordPhonemePractice(user.id);
        useUserStore.getState().updateTodayStats({
          phonemePracticedCount: useUserStore.getState().todayStats.phonemePracticedCount + 1,
        });

        // 上报成就事件（fire-and-forget）
        apiClient.reportPhonemePracticeDone(sess.targetPhoneme.symbol).catch(() => {});
      } catch (error) {
        console.error('保存发音练习结果失败:', error);
      }
    }
    setMode('summary');
  }, [user?.id]);

  // 从 summary 重新练习
  const handleRestartSession = useCallback(() => {
    if (!session) return;
    startSession(session.targetPhoneme);
  }, [session, startSession]);

  // 播放用户录音
  const handlePlayRecording = useCallback(() => {
    if (!pronunciation.recordingUri) return;
    if (audioPlayer.isPlaying) {
      audioPlayer.stop();
    } else {
      audioPlayer.play(pronunciation.recordingUri);
    }
  }, [pronunciation.recordingUri, audioPlayer]);

  // IntroView: 播放音素+示例词（CDN 预生成音频）
  const handlePlayPhonemeWord = useCallback((word: string, phonemeIpa: string) => {
    const audioUrl = PHONEME_AUDIO_URLS[phonemeIpa];
    if (audioUrl) {
      tts.playUrl(`phoneme_${phonemeIpa}`, audioUrl);
    } else {
      // 降级：CDN 无此音素，用 TTS 合成
      tts.speak(`phoneme_${phonemeIpa}_${word}`, word, 'en-GB-SoniaNeural', phonemeIpa);
    }
  }, [tts]);

  const handleToggleTip = useCallback(() => {
    setTipExpanded(prev => !prev);
  }, []);

  // 退出确认弹窗状态
  const [showExitAlert, setShowExitAlert] = useState(false);

  // 退出 Session（显示自定义确认弹窗）
  const handleExitSession = useCallback(() => {
    setShowExitAlert(true);
  }, []);

  const handleConfirmExit = useCallback(() => {
    setShowExitAlert(false);
    pronunciation.reset();
    audioPlayer.stop();
    tts.stop();
    setSession(null);
    navigation.goBack();
  }, [pronunciation, audioPlayer, tts, navigation]);

  const handleCancelExit = useCallback(() => {
    setShowExitAlert(false);
  }, []);

  // 返回
  const handleBack = useCallback(() => {
    if (mode === 'session') {
      handleExitSession();
    } else if (mode === 'summary') {
      pronunciation.reset();
      audioPlayer.stop();
      tts.stop();
      setSession(null);
      navigation.goBack();
    } else {
      // intro
      navigation.goBack();
    }
  }, [mode, navigation, pronunciation, audioPlayer, tts, handleExitSession]);

  return {
    // i18n
    t,

    // 页面状态
    mode,
    intro,

    // Session 状态
    session,
    currentDrill,
    drillStep,
    progress,
    tipExpanded,

    // 听辨题状态
    selectedOption,
    isOptionCorrect,

    // same_different 题状态
    selectedAnswer,
    isAnswerCorrect,

    // 跟读题兼容
    currentWord,

    // 发音评估（透传）
    pronunciation,
    tts,
    audioPlayer,

    // 操作
    handleStartFromIntro,
    handlePlayStandard,
    handleSelectSameDifferent,
    handlePlaySDWord,
    handleSelectOption,
    handleStartRecording,
    handleStopRecording,
    handleNextDrill,
    handleRetryDrill,
    handleRestartSession,
    handlePlayPhonemeWord,
    handlePlayRecording,
    handleToggleTip,
    handleBack,
    handleExitSession,
    showExitAlert,
    handleConfirmExit,
    handleCancelExit,
  };
}
