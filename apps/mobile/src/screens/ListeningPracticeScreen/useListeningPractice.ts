import { useState, useEffect, useCallback } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { apiClient } from '@/api';
import { useStreamingTTS } from '@/hooks/useStreamingTTS';
import type { ListeningMaterialDetail, ListeningSentence, ListeningQuestion } from '@/api/modules/listening';

export type PracticeMode = 'dictation' | 'comprehension';
export const SPEED_OPTIONS = [0.5, 0.75, 1.0, 1.25, 1.5];
const DEFAULT_VOICE = 'en-US-JennyNeural';

/** 简易句子比较（忽略大小写和标点） */
function compareSentences(input: string, target: string): boolean {
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
  return normalize(input) === normalize(target);
}

export function useListeningPractice() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const tts = useStreamingTTS();

  const { materialId } = route.params;
  const [material, setMaterial] = useState<ListeningMaterialDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<PracticeMode>('dictation');
  const [speed, setSpeed] = useState(1.0);

  // 精听状态
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [dictationResults, setDictationResults] = useState<boolean[]>([]);
  const [isDictationDone, setIsDictationDone] = useState(false);

  // 泛听状态
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showQuizResults, setShowQuizResults] = useState(false);

  useEffect(() => {
    loadMaterial();
    return () => { tts.stop(); };
  }, [materialId]);

  const loadMaterial = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.getListeningMaterialDetail(materialId);
      if (res.success) setMaterial(res.data);
    } catch (error) {
      console.error('加载听力材料失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 播放当前句子
  const playSentence = useCallback((index?: number) => {
    if (!material) return;
    const idx = index ?? currentSentenceIndex;
    const sentence = material.sentences[idx];
    if (!sentence) return;
    tts.stop();
    tts.speak(`listening_${materialId}_${idx}`, sentence.en, DEFAULT_VOICE);
  }, [material, currentSentenceIndex, materialId, tts]);

  // 播放全部句子
  const playAll = useCallback(() => {
    if (!material) return;
    const fullText = material.sentences.map(s => s.en).join(' ');
    tts.stop();
    tts.speak(`listening_${materialId}_all`, fullText, DEFAULT_VOICE);
  }, [material, materialId, tts]);

  // 检查听写答案
  const checkDictation = () => {
    if (!material) return;
    const sentence = material.sentences[currentSentenceIndex];
    const correct = compareSentences(userInput.trim(), sentence.en);
    setDictationResults(prev => [...prev, correct]);
    setShowAnswer(true);
  };

  // 下一句
  const nextSentence = () => {
    if (!material) return;
    if (currentSentenceIndex < material.sentences.length - 1) {
      setCurrentSentenceIndex(prev => prev + 1);
      setUserInput('');
      setShowAnswer(false);
    } else {
      setIsDictationDone(true);
      const totalCount = material.sentences.length;
      const score = Math.round((dictationResults.filter(Boolean).length / totalCount) * 100);
      apiClient.updateListeningProgress({
        materialId, mode: 'dictation', dictationScore: score,
      }).catch(e => {
        if (__DEV__) console.warn('[ListeningPractice] 提交听写成绩失败:', e);
      });
    }
  };

  // 提交理解题
  const submitQuiz = () => {
    if (!material?.questions) return;
    const questions = material.questions as ListeningQuestion[];
    let correctCount = 0;
    questions.forEach((q, i) => {
      if (selectedAnswers[i] === q.answer) correctCount++;
    });
    const score = Math.round((correctCount / questions.length) * 100);
    setShowQuizResults(true);
    apiClient.updateListeningProgress({
      materialId, mode: 'comprehension', quizScore: score,
    }).catch(e => {
      if (__DEV__) console.warn('[ListeningPractice] 提交理解题成绩失败:', e);
    });
  };

  // 切换模式
  const switchMode = (newMode: PracticeMode) => {
    setMode(newMode);
    tts.stop();
  };

  // 返回
  const goBack = () => {
    tts.stop();
    navigation.goBack();
  };

  // 选择答案
  const selectAnswer = (qIndex: number, oIndex: number) => {
    if (!showQuizResults) {
      setSelectedAnswers(prev => ({ ...prev, [qIndex]: oIndex }));
    }
  };

  const sentences = (material?.sentences || []) as ListeningSentence[];
  const questions = (material?.questions || []) as ListeningQuestion[];

  return {
    // 数据
    material,
    isLoading,
    mode,
    speed,
    sentences,
    questions,
    // 精听
    currentSentenceIndex,
    userInput,
    showAnswer,
    dictationResults,
    isDictationDone,
    // 泛听
    selectedAnswers,
    showQuizResults,
    // TTS
    tts,
    // 操作
    setSpeed,
    setUserInput,
    switchMode,
    playSentence,
    playAll,
    checkDictation,
    nextSentence,
    submitQuiz,
    selectAnswer,
    goBack,
  };
}
