import { useCallback, useEffect, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import { useIntensiveArticle, useSubmitReadingQuiz, useUpdateReadingStep } from '@/hooks/queries';
import { useTTS } from '@/hooks/useTTS';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import { useCharacters } from '@/stores';
import { apiClient } from '@/api';
import { getWordByText, getWordById, ensureWordDetails } from '@/db/word';
import { aiLookupToLocalWord, emptyAiLookupWord } from '@/utils/aiWordLookup';

import type { QuizQuestion, ExplanationMappingItem, AudioTimestampItem } from '@/api/modules/reading';
import type { LocalWord } from '@/types/word';

type RouteParams = RouteProp<{ IntensiveReading: { articleId: string; initialStep?: number } }>;

/** 清洗文本中不适合 TTS 朗读的符号 */
function sanitizeForTTS(text: string): string {
  return text
    .replace(/[*_~`#"""''「」『』【】（）()]/g, '')
    .replace(/（注[：:].*?）/g, '')
    .replace(/^\s*\d+[.、)）]\s*/gm, '')
    .replace(/[①②③④⑤⑥⑦⑧⑨⑩]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const STEP_LABELS = ['reading', 'quiz', 'completion'];

/** 老用户旧 5 步进度 → 新 3 步映射 */
function mapOldStep(step: number): number {
  if (step <= 2) return 0; // 阅读/讲解/朗读 → 阅读
  if (step === 3) return 1; // 练习 → 练习
  return 2; // 完成 → 完成
}

export function useIntensiveReading() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteParams>();
  const { theme } = useTheme();
  const { t } = useI18n();
  const { getCharacterById, getCharactersByRole } = useCharacters();

  const articleId = route.params.articleId;
  const { data: article, isLoading, error } = useIntensiveArticle(articleId);
  const tts = useTTS();
  const explanationGate = useFeatureGate('readingExplanation');

  // 三步流程状态（兼容老用户旧进度）
  const [currentStep, setCurrentStep] = useState(() => {
    const raw = route.params.initialStep || 0;
    return raw > 2 ? mapOldStep(raw) : raw;
  });
  const [showTranslation, setShowTranslation] = useState(false);


  // 点词查义
  const [wordDetailData, setWordDetailData] = useState<LocalWord | null>(null);

  // 练习步骤
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [quizResults, setQuizResults] = useState<Array<{
    questionId: string;
    answer: string;
    isCorrect: boolean;
  }>>([]);

  // 完成页
  const [quizScore, setQuizScore] = useState<number | null>(null);

  // 进度保存（30秒定时）
  const updateStep = useUpdateReadingStep();
  const submitQuiz = useSubmitReadingQuiz();
  const readTimeRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 计时器
  useEffect(() => {
    timerRef.current = setInterval(() => {
      readTimeRef.current += 30;
      apiClient.updateReadingProgress({
        articleId,
        readTime: 30,
      }).catch(() => {});
    }, 30000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [articleId]);

  // 步骤切换时同步后端（延迟到过渡动画完成后，避免卡顿）
  useEffect(() => {
    if (articleId) {
      const task = InteractionManager.runAfterInteractions(() => {
        updateStep.mutate({ articleId, step: currentStep });
      });
      return () => task.cancel();
    }
  }, [currentStep, articleId]);

  const paragraphs = article?.paragraphs || [];
  const quizQuestions = (article?.quiz || []) as QuizQuestion[];
  const currentQuestion = quizQuestions[currentQuizIndex] || null;

  // ==================== 步骤切换 ====================
  const goToStep = useCallback((step: number) => {
    setCurrentStep(step);
  }, []);

  const goNext = useCallback(() => {
    setCurrentStep(prev => (prev < 2 ? prev + 1 : prev));
  }, []);

  const goBack = useCallback(() => {
    // 练习步骤：先回退到上一题，第一题时才回退到阅读步骤
    if (currentStep === 1 && currentQuizIndex > 0) {
      const prevIndex = currentQuizIndex - 1;
      const prevResult = quizResults.find(r => r.questionId === quizQuestions[prevIndex]?.id);
      setCurrentQuizIndex(prevIndex);
      setSelectedAnswer(prevResult?.answer ?? null);
      setIsAnswerChecked(!!prevResult);
      return;
    }

    let shouldNavigateBack = false;
    setCurrentStep(prev => {
      if (prev > 0) return prev - 1;
      shouldNavigateBack = true;
      return prev;
    });
    if (shouldNavigateBack && navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation, currentStep, currentQuizIndex, quizResults, quizQuestions]);

  // ==================== 音频播放 ====================
  // 角色 ID = 声音 ID（来自 characters.json）
  const defaultTeacherId = getCharactersByRole('reading_teacher')[0]?.id;
  const teacherCharacter = article?.teacherId ? getCharacterById(article.teacherId) : null;
  const voice = article?.teacherId || defaultTeacherId || '';

  // 播放全文朗读（仅播放预生成音频，无音频时不降级）
  const playFullAudio = useCallback(() => {
    const audioUrl = article?.audioUrl;
    if (!audioUrl) return;
    const messageId = `full_${articleId}`;
    tts.playUrl(messageId, audioUrl);
  }, [article?.audioUrl, articleId, tts]);

  // 播放整篇讲解（仅播放预生成音频，无音频时不降级）
  const playExplanation = useCallback(() => {
    if (!explanationGate.guard()) return;
    const audioUrl = article?.explanationAudioUrl;
    if (!audioUrl) return;
    const messageId = `explanation_${articleId}`;
    tts.playUrl(messageId, audioUrl);
  }, [article?.explanationAudioUrl, articleId, tts, explanationGate]);

  // 播放/暂停切换
  const togglePlayPause = useCallback(() => {
    if (tts.isPlaying) {
      tts.pause();
    } else {
      tts.resume();
    }
  }, [tts]);

  // 完全停止音频
  const stopAudio = useCallback(() => {
    tts.stop();
  }, [tts]);

  // 播放结束后自动清除会话（隐藏播放器，显示进入练习按钮）
  useEffect(() => {
    if (tts.isFinished) {
      tts.stop();
    }
  }, [tts.isFinished]);

  // 步骤切换时停止音频（延迟执行，避免阻塞渲染）
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      tts.stop();
    });
    return () => task.cancel();
  }, [currentStep]);

  // ==================== 点词查义（本地 SQLite → AI 兜底） ====================
  // 序号比对：快速切词时老请求响应到达不覆盖新词
  const lookupSeqRef = useRef(0);
  const handleWordPress = useCallback(async (word: string) => {
    const cleaned = word.replace(/[^a-zA-Z'-]/g, '').toLowerCase();
    if (!cleaned || cleaned.length < 2) return;
    const seq = ++lookupSeqRef.current;
    const result = await getWordByText(cleaned);
    if (seq !== lookupSeqRef.current) return;
    if (result) {
      await ensureWordDetails([result.id]).catch(() => {});
      if (seq !== lookupSeqRef.current) return;
      const detail = await getWordById(result.id);
      if (seq !== lookupSeqRef.current) return;
      setWordDetailData(detail);
      return;
    }
    // 本地未命中 — 先亮一个占位 sheet,再走 AI 兜底填充
    setWordDetailData({ id: `pending:${cleaned}`, word: cleaned, meaningCn: '' } as LocalWord);
    try {
      const res = await apiClient.lookupWord(cleaned);
      if (seq !== lookupSeqRef.current) return;
      // 无论 AI 是否识别出词义都切到 ai:xxx 态。
      // 识别失败时 meaningCn 为空，UI 会 fallback 到"暂无释义"；否则永远卡在"查询中…"
      setWordDetailData(aiLookupToLocalWord(res.data, cleaned));
    } catch {
      if (seq !== lookupSeqRef.current) return;
      // 网络/服务器错误也要脱离 pending，避免"永久查询中"
      setWordDetailData(emptyAiLookupWord(cleaned));
    }
  }, []);

  // ==================== 练习步骤 ====================
  const selectAnswer = useCallback((answer: string) => {
    if (isAnswerChecked) return;
    setSelectedAnswer(answer);
  }, [isAnswerChecked]);

  const checkAnswer = useCallback(() => {
    if (!selectedAnswer || !currentQuestion) return;
    const isCorrect = selectedAnswer === currentQuestion.answer;
    setIsAnswerChecked(true);
    setQuizResults(prev => [
      ...prev,
      { questionId: currentQuestion.id, answer: selectedAnswer, isCorrect },
    ]);
  }, [selectedAnswer, currentQuestion]);

  const nextQuestion = useCallback(() => {
    if (currentQuizIndex < quizQuestions.length - 1) {
      const nextIndex = currentQuizIndex + 1;
      const nextResult = quizResults.find(r => r.questionId === quizQuestions[nextIndex]?.id);
      setCurrentQuizIndex(nextIndex);
      setSelectedAnswer(nextResult?.answer ?? null);
      setIsAnswerChecked(!!nextResult);
    } else {
      // 全部答完，提交
      const allAnswers = [
        ...quizResults,
      ];
      submitQuiz.mutate(
        { articleId, answers: allAnswers.map(r => ({ questionId: r.questionId, answer: r.answer })) },
        {
          onSuccess: (data) => {
            setQuizScore(data.score);
            goNext();
          },
        },
      );
    }
  }, [currentQuizIndex, quizQuestions.length, quizResults, articleId, submitQuiz, goNext]);

  // ==================== 音频播放时高亮对应句子 ====================
  const explanationMapping = (article?.explanationMapping || []) as ExplanationMappingItem[];
  const audioTimestamps = (article?.audioTimestamps || []) as AudioTimestampItem[];
  const [highlightParagraphIndex, setHighlightParagraphIndex] = useState<number | null>(null);
  const [highlightSentence, setHighlightSentence] = useState<string | null>(null);
  const lastHighlightRef = useRef<{ p: number | null; s: string | null }>({ p: null, s: null });

  useEffect(() => {
    if (!tts.isPlaying || !tts.currentMessageId) return;

    const currentMs = tts.currentTime * 1000;
    const isExplanation = tts.currentMessageId.startsWith('explanation_');
    const isFull = tts.currentMessageId.startsWith('full_');

    let newP: number | null = null;
    let newS: string | null = null;

    if (isExplanation && explanationMapping.length > 0) {
      for (let i = explanationMapping.length - 1; i >= 0; i--) {
        if (currentMs >= explanationMapping[i].startMs) {
          const item = explanationMapping[i];
          if (item.englishSentence) {
            newP = item.paragraphIndex;
            newS = item.englishSentence;
          }
          break;
        }
      }
    } else if (isFull && audioTimestamps.length > 0) {
      for (let i = audioTimestamps.length - 1; i >= 0; i--) {
        if (currentMs >= audioTimestamps[i].startMs) {
          newP = audioTimestamps[i].paragraphIndex;
          newS = audioTimestamps[i].sentence;
          break;
        }
      }
    }

    if (newP !== null) {
      const last = lastHighlightRef.current;
      if (newP !== last.p || newS !== last.s) {
        lastHighlightRef.current = { p: newP, s: newS };
        setHighlightParagraphIndex(newP);
        setHighlightSentence(newS);
      }
    }
  }, [tts.currentTime, tts.isPlaying, tts.currentMessageId, explanationMapping, audioTimestamps]);

  // 步骤切换 或 音频源切换（原文↔讲解）时清除高亮
  useEffect(() => {
    lastHighlightRef.current = { p: null, s: null };
    setHighlightParagraphIndex(null);
    setHighlightSentence(null);
  }, [currentStep, tts.currentMessageId]);

  // 播放结束后清除高亮
  useEffect(() => {
    if (!tts.isPlaying && !tts.isLoading && highlightParagraphIndex !== null) {
      lastHighlightRef.current = { p: null, s: null };
      setHighlightParagraphIndex(null);
      setHighlightSentence(null);
    }
  }, [tts.isPlaying, tts.isLoading]);

  // ==================== Step Labels ====================
  const stepLabels = STEP_LABELS.map(key => t(`intensiveReading.step.${key}`));

  return {
    // 导航
    navigation,
    theme,
    t,
    goBack,
    goNext,
    goToStep,

    // 数据
    article,
    isLoading,
    error,
    paragraphs,
    quizQuestions,

    // 三步
    currentStep,
    stepLabels,

    // 阅读
    showTranslation,
    setShowTranslation,
    highlightParagraphIndex,
    highlightSentence,
    showExplanationLock: explanationGate.locked,

    // 音频
    playFullAudio,
    playExplanation,
    togglePlayPause,
    stopAudio,
    ttsState: {
      isPlaying: tts.isPlaying,
      isLoading: tts.isLoading,
      isFinished: tts.isFinished,
      currentMessageId: tts.currentMessageId,
      currentTime: tts.currentTime,
      duration: tts.duration,
    },
    seekBy: tts.seekBy,

    // 教师角色
    teacherCharacter,
    voice,

    // 点词查义
    wordDetailData,
    setWordDetailData,
    handleWordPress,

    // 练习
    currentQuizIndex,
    currentQuestion,
    selectedAnswer,
    isAnswerChecked,
    quizResults,
    selectAnswer,
    checkAnswer,
    nextQuestion,
    isSubmitting: submitQuiz.isPending,

    // 完成
    quizScore,
    readTime: readTimeRef.current,
  };
}
