import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { PanResponder, GestureResponderEvent } from 'react-native';
import { useTranslation, TranslationConfig, TranslationResult } from '@/hooks/useTranslation';
import { useStreamingTTS } from '@/hooks/useStreamingTTS';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useTranslationSettings, useCharacters } from '@/stores/AppStore';
import { useI18n } from '@/context/I18nProvider';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import { translateBidirectional } from '@/services/TranslationService';
import { formatVoiceDuration } from '@/utils/formatters';
import { LanguageCode } from './constants';

let idCounter = 0;
function generateId(): string {
  return `tr_${Date.now()}_${++idCounter}`;
}

export function useTranslationState() {
  const { t } = useI18n();
  const translationGate = useFeatureGate('textTranslation');
  // 语言设置（默认中翻英）
  const [sourceLanguage, setSourceLanguage] = useState<LanguageCode>('zh-CN');
  const [targetLanguage, setTargetLanguage] = useState<LanguageCode>('en-US');

  // 输入模式
  const [isVoiceMode, setIsVoiceMode] = useState(true);

  // 文本输入相关
  const [inputText, setInputText] = useState('');

  // 语音录制弹窗
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [isInCancelZone, setIsInCancelZone] = useState(false);
  const gestureStartY = useRef(0);
  const isInCancelZoneRef = useRef(false);
  const CANCEL_THRESHOLD = 80;

  // 从 AppStore 获取翻译设置
  const {
    autoPlay,
    voiceZh,
    voiceEn,
    setAutoPlay,
    setVoiceZh,
    setVoiceEn,
  } = useTranslationSettings();

  // 角色 ID → voiceEngineId（用于 TTS 播放）
  const { getCharacterById } = useCharacters();
  const voiceZhEngine = getCharacterById(voiceZh)?.voiceEngineId || voiceZh;
  const voiceEnEngine = getCharacterById(voiceEn)?.voiceEngineId || voiceEn;

  // 语音回放
  const pendingVoiceResultIdRef = useRef<string | null>(null);
  const wasCancelledRef = useRef(false);
  const voicePlayer = useAudioPlayer();
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const voiceWasPlayingRef = useRef(false);

  // TTS 播放状态
  const [playingTTSId, setPlayingTTSId] = useState<string | null>(null);

  // 设置弹窗
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // ============================================================================
  // results 状态（上提到此处）
  // ============================================================================

  const [results, setResults] = useState<TranslationResult[]>([]);

  const addResult = useCallback((result: TranslationResult) => {
    setResults(prev => [...prev, result]);
  }, []);

  const updateResult = useCallback((id: string, updates: Partial<TranslationResult>) => {
    setResults(prev =>
      prev.map(r => (r.id === id ? { ...r, ...updates } : r))
    );
  }, []);

  const clearResults = useCallback(() => setResults([]), []);

  // ============================================================================
  // 语音翻译回调
  // ============================================================================

  const handleVoiceResult = useCallback((data: { sourceText: string; translatedText: string; detectedLanguage?: string }) => {
    // 用户取消了录音，忽略服务器返回的翻译结果
    if (wasCancelledRef.current) {
      wasCancelledRef.current = false;
      return;
    }

    if (pendingVoiceResultIdRef.current) {
      updateResult(pendingVoiceResultIdRef.current, {
        sourceText: data.sourceText,
        translatedText: data.translatedText,
        detectedLanguage: data.detectedLanguage,
        status: 'done',
      });
      pendingVoiceResultIdRef.current = null;
    } else {
      addResult({
        id: generateId(),
        sourceText: data.sourceText,
        translatedText: data.translatedText,
        detectedLanguage: data.detectedLanguage,
        status: 'done',
        source: 'voice',
        timestamp: Date.now(),
        sourceLanguageCode: sourceLanguage,
        targetLanguageCode: targetLanguage,
      });
    }
  }, [addResult, updateResult, sourceLanguage, targetLanguage]);

  // 翻译 Hook
  const {
    isInitializing,
    isRecording,
    isTranslating,
    error,
    volumeHistoryShared,
    durationShared,
    start,
    stop,
  } = useTranslation({ onResult: handleVoiceResult });

  // 监听翻译结束：如果 isTranslating 变为 false 但 pending result 还在，说明没有翻译结果，移除它
  useEffect(() => {
    if (!isTranslating && pendingVoiceResultIdRef.current) {
      const pendingId = pendingVoiceResultIdRef.current;
      pendingVoiceResultIdRef.current = null;
      setResults(prev => prev.filter(r => !(r.id === pendingId && r.status === 'pending')));
    }
  }, [isTranslating]);

  // 录音被服务端错误强制终止时（如配额超限），关闭录音弹窗
  // 正常流程：handleVoiceEnd 已主动 setShowVoiceModal(false)，此处是 fallback
  useEffect(() => {
    if (!isRecording) {
      setShowVoiceModal(false);
      setIsInCancelZone(false);
    }
  }, [isRecording]);

  // ============================================================================
  // TTS 自动播放（修复双重触发）
  // ============================================================================

  const tts = useStreamingTTS();
  const ttsRef = useRef(tts);
  ttsRef.current = tts;
  const lastPlayedResultIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!autoPlay || results.length === 0) return;
    const latest = results[results.length - 1];
    if (latest.status !== 'done' || latest.id === lastPlayedResultIdRef.current) return;
    lastPlayedResultIdRef.current = latest.id;

    // 停止语音回放
    if (voicePlayer.isPlaying) {
      voicePlayer.stop();
      voiceWasPlayingRef.current = false;
    }
    setPlayingVoiceId(null);

    setPlayingTTSId(latest.id);
    const voice = targetLanguage === 'zh-CN' ? voiceZhEngine : voiceEnEngine;
    ttsRef.current.speak(`translation_${latest.id}`, latest.translatedText, voice);
  }, [results, autoPlay, targetLanguage, voiceZhEngine, voiceEnEngine, voicePlayer]);

  // 切换语言方向
  const handleSwitchLanguage = useCallback(() => {
    if (isRecording) return;
    setSourceLanguage(targetLanguage);
    setTargetLanguage(sourceLanguage);
  }, [sourceLanguage, targetLanguage, isRecording]);

  // 开始语音翻译
  const handleVoiceStart = useCallback(async () => {
    if (!translationGate.guard()) return;
    // 停止正在播放的 TTS 和语音回放，避免录音混入播放声音
    ttsRef.current.stop();
    setPlayingTTSId(null);
    if (voicePlayer.isPlaying) {
      await voicePlayer.stop();
    }
    setPlayingVoiceId(null);
    voiceWasPlayingRef.current = false;

    setShowVoiceModal(true);
    setIsInCancelZone(false);
    isInCancelZoneRef.current = false;
    wasCancelledRef.current = false;

    const config: TranslationConfig = {
      sourceLanguage: sourceLanguage,
      targetLanguage: targetLanguage,
      maxDuration: 60000,
    };
    try {
      await start(config);
    } catch (err) {
      console.error('Start translation failed:', err);
      setShowVoiceModal(false);
    }
  }, [sourceLanguage, targetLanguage, start, voicePlayer]);

  // 停止语音翻译
  const handleVoiceEnd = useCallback(async () => {
    const isCancel = isInCancelZoneRef.current;
    const duration = durationShared.value;

    // 标记取消状态，让 handleVoiceResult 忽略后续返回的翻译结果
    if (isCancel) {
      wasCancelledRef.current = true;
    }

    const audioUri = await stop();

    setShowVoiceModal(false);
    setIsInCancelZone(false);

    if (!isCancel && audioUri) {
      const id = generateId();
      pendingVoiceResultIdRef.current = id;
      addResult({
        id,
        sourceText: '',
        translatedText: '',
        status: 'pending',
        source: 'voice',
        audioUri,
        voiceDuration: duration,
        timestamp: Date.now(),
        sourceLanguageCode: sourceLanguage,
        targetLanguageCode: targetLanguage,
      });
    }
  }, [stop, addResult, durationShared, sourceLanguage, targetLanguage]);

  // 手势移动处理
  const handleGestureMove = useCallback((dy: number) => {
    const inCancelZone = dy < -CANCEL_THRESHOLD;
    isInCancelZoneRef.current = inCancelZone;
    setIsInCancelZone(inCancelZone);
  }, []);

  // 语音按钮的 PanResponder
  const voicePanResponder = useMemo(() => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        gestureStartY.current = evt.nativeEvent.pageY;
        handleVoiceStart();
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        const dy = evt.nativeEvent.pageY - gestureStartY.current;
        handleGestureMove(dy);
      },
      onPanResponderRelease: () => {
        handleVoiceEnd();
      },
      onPanResponderTerminate: () => {
        handleVoiceEnd();
      },
    });
  }, [handleVoiceStart, handleGestureMove, handleVoiceEnd]);

  // ============================================================================
  // 文本翻译（乐观更新）
  // ============================================================================

  const handleTextTranslate = useCallback(async () => {
    const text = inputText.trim();
    if (!text) return;
    if (!translationGate.guard()) return;
    setInputText('');  // 立即清空

    const id = generateId();
    addResult({
      id,
      sourceText: text,
      translatedText: '',
      status: 'pending',
      source: 'text',
      timestamp: Date.now(),
      sourceLanguageCode: sourceLanguage,
      targetLanguageCode: targetLanguage,
    });

    try {
      const response = await translateBidirectional(text, sourceLanguage, targetLanguage);
      if (response.success && response.data) {
        updateResult(id, { translatedText: response.data.translatedText, status: 'done' });
      } else {
        updateResult(id, { translatedText: t('quota.translationFailed'), status: 'error' });
      }
    } catch (error) {
      if ((error as any)?.quotaExceeded) {
        setResults(prev => prev.filter(r => r.id !== id));
        return;
      }
      console.error('[useTranslationState] Text translation failed:', error);
      updateResult(id, { translatedText: t('quota.translationFailed'), status: 'error' });
    }
  }, [inputText, sourceLanguage, targetLanguage, addResult, updateResult, t]);

  // 切换输入模式
  const toggleVoiceMode = useCallback(() => {
    setIsVoiceMode(!isVoiceMode);
  }, [isVoiceMode]);

  // 打开/关闭设置弹窗
  const openSettings = useCallback(() => setShowSettingsModal(true), []);
  const closeSettings = useCallback(() => setShowSettingsModal(false), []);

  // 播放语音录音回放
  const handlePlayVoice = useCallback(async (result: TranslationResult) => {
    if (!result.audioUri) return;

    // toggle：正在播放同一条则停止
    if (playingVoiceId === result.id && voicePlayer.isPlaying) {
      await voicePlayer.stop();
      setPlayingVoiceId(null);
      return;
    }

    // 互斥：停止 TTS
    if (ttsRef.current.isPlaying) {
      ttsRef.current.stop();
      setPlayingTTSId(null);
    }

    // 停止当前语音回放，重置 wasPlaying 标记防止误清
    if (voicePlayer.isPlaying) {
      await voicePlayer.stop();
    }
    voiceWasPlayingRef.current = false;
    setPlayingVoiceId(result.id);
    await voicePlayer.play(result.audioUri);
  }, [playingVoiceId, voicePlayer]);

  // 播放历史 TTS（使用 ttsRef 避免依赖问题，支持 toggle）
  const playHistoryTTS = useCallback((result: TranslationResult) => {
    // toggle：正在播放同一条则停止
    if (playingTTSId === result.id && ttsRef.current.isPlaying) {
      ttsRef.current.stop();
      setPlayingTTSId(null);
      return;
    }

    // 互斥：停止语音回放
    if (voicePlayer.isPlaying) {
      voicePlayer.stop();
      setPlayingVoiceId(null);
      voiceWasPlayingRef.current = false;
    }

    setPlayingTTSId(result.id);
    const lang = result.targetLanguageCode || targetLanguage;
    const voice = lang === 'zh-CN' ? voiceZhEngine : voiceEnEngine;
    ttsRef.current.speak(`history_${result.id}`, result.translatedText, voice);
  }, [playingTTSId, targetLanguage, voiceZhEngine, voiceEnEngine, voicePlayer]);

  // 监听语音回放结束，重置 playingVoiceId
  useEffect(() => {
    if (voicePlayer.isPlaying) {
      voiceWasPlayingRef.current = true;
    } else if (voiceWasPlayingRef.current && playingVoiceId) {
      voiceWasPlayingRef.current = false;
      setPlayingVoiceId(null);
    }
  }, [voicePlayer.isPlaying, playingVoiceId]);

  // 监听 TTS 播放结束，重置 playingTTSId
  const ttsWasPlayingRef = useRef(false);
  useEffect(() => {
    if (tts.isPlaying) {
      ttsWasPlayingRef.current = true;
    } else if (ttsWasPlayingRef.current && playingTTSId) {
      ttsWasPlayingRef.current = false;
      setPlayingTTSId(null);
    }
  }, [tts.isPlaying, playingTTSId]);

  return {
    // 语言
    sourceLanguage,
    targetLanguage,

    // 输入模式
    isVoiceMode,
    inputText,
    setInputText,
    toggleVoiceMode,

    // 语音录制
    showVoiceModal,
    isInCancelZone,
    voicePanResponder,

    // 翻译状态
    isInitializing,
    isRecording,
    results,
    error,
    volumeHistoryShared,
    durationShared,

    // 设置
    showSettingsModal,
    autoPlay,
    voiceZh,
    voiceEn,
    setAutoPlay,
    setVoiceZh,
    setVoiceEn,
    openSettings,
    closeSettings,

    // 操作
    handleSwitchLanguage,
    handleTextTranslate,
    clearResults,
    playHistoryTTS,

    // 语音回放
    playingVoiceId,
    handlePlayVoice,

    // TTS 播放状态
    playingTTSId,
  };
}
