/**
 * 情景学习模式 — 播放逻辑 Hook
 */
import { useState, useCallback, useRef, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useI18n } from '@/context/I18nProvider';
import { useCharacters } from '@/stores/AppStore';
import { getChapter } from '@/data/scenarioChapters';
import { useTTS } from '@/hooks/useTTS';
import type {
  ScenarioChapter,
  ScenarioStep,
  ScenarioScene,
  StepResult,
  ChapterScore,
} from '@/types/scenarioMode';

interface UseScenarioPlayParams {
  chapterId: string;
}

export function useScenarioPlay({ chapterId }: UseScenarioPlayParams) {
  const { t } = useI18n();
  const navigation = useNavigation<any>();
  const { getCharacterById } = useCharacters();
  const tts = useTTS();

  // 加载章节数据
  const chapter = useMemo(() => getChapter(chapterId), [chapterId]);

  // 将所有场景的 steps 展平为一个列表，附带场景信息
  const flatSteps = useMemo(() => {
    if (!chapter) return [];
    const result: { step: ScenarioStep; scene: ScenarioScene; sceneIndex: number; stepIndex: number }[] = [];
    chapter.scenes.forEach((scene, si) => {
      scene.steps.forEach((step, sti) => {
        result.push({ step, scene, sceneIndex: si, stepIndex: sti });
      });
    });
    return result;
  }, [chapter]);

  // ==================== 播放状态 ====================
  const [phase, setPhase] = useState<'playing' | 'summary'>('playing');
  const [visibleCount, setVisibleCount] = useState(1); // 已显示的 step 数量
  const [activeInteraction, setActiveInteraction] = useState<string | null>(null); // 当前需要交互的 step id
  const [stepResults, setStepResults] = useState<Record<string, StepResult>>({});
  const [showTranslation, setShowTranslation] = useState<Record<string, boolean>>({});
  const [listeningRevealed, setListeningRevealed] = useState<Record<string, boolean>>({});
  const scrollViewRef = useRef<any>(null);

  // 当前可见的 steps
  const visibleSteps = useMemo(() => flatSteps.slice(0, visibleCount), [flatSteps, visibleCount]);

  // 检查当前 step 是否需要交互（选择题/跟读/对话/听力）
  const isInteractiveStep = useCallback((step: ScenarioStep) => {
    return ['choice', 'read_aloud', 'conversation', 'listening'].includes(step.type);
  }, []);

  // 当前最后一个 step 是否已完成交互
  const isCurrentStepDone = useMemo(() => {
    if (visibleCount === 0) return true;
    const current = flatSteps[visibleCount - 1];
    if (!current) return true;
    if (!isInteractiveStep(current.step)) return true;
    return !!stepResults[current.step.id];
  }, [visibleCount, flatSteps, stepResults, isInteractiveStep]);

  // 是否所有 step 都显示完了
  const isAllStepsVisible = visibleCount >= flatSteps.length;

  // ==================== 推进到下一步 ====================
  const advanceStep = useCallback(() => {
    if (!isCurrentStepDone) return; // 还有交互未完成
    if (isAllStepsVisible) {
      // 所有 step 都显示了，进入总结
      setPhase('summary');
      return;
    }
    const nextIndex = visibleCount;
    const nextItem = flatSteps[nextIndex];
    setVisibleCount(prev => prev + 1);

    // 如果下一步需要交互，设置为 active
    if (nextItem && isInteractiveStep(nextItem.step)) {
      setActiveInteraction(nextItem.step.id);
    } else {
      setActiveInteraction(null);
    }

    // 滚动到底部
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd?.({ animated: true });
    }, 100);
  }, [isCurrentStepDone, isAllStepsVisible, visibleCount, flatSteps, isInteractiveStep]);

  // ==================== 选择题作答 ====================
  const handleChoiceSelect = useCallback((stepId: string, optionId: string, correctOptionId: string) => {
    setStepResults(prev => ({
      ...prev,
      [stepId]: {
        stepId,
        type: 'choice',
        correct: optionId === correctOptionId,
        selectedOptionId: optionId,
      },
    }));
    setActiveInteraction(null);
  }, []);

  // ==================== 听力题作答 ====================
  const handleListeningSelect = useCallback((stepId: string, optionId: string, correctOptionId: string) => {
    setStepResults(prev => ({
      ...prev,
      [stepId]: {
        stepId,
        type: 'listening',
        correct: optionId === correctOptionId,
        selectedOptionId: optionId,
      },
    }));
    setActiveInteraction(null);
    // 揭示文字
    setListeningRevealed(prev => ({ ...prev, [stepId]: true }));
  }, []);

  // ==================== 跟读完成（MVP 阶段简化，直接通过） ====================
  const handleReadAloudComplete = useCallback((stepId: string, score?: number) => {
    setStepResults(prev => ({
      ...prev,
      [stepId]: {
        stepId,
        type: 'read_aloud',
        score: score ?? 80,
      },
    }));
    setActiveInteraction(null);
  }, []);

  // ==================== 对话题完成（MVP 阶段简化，直接通过） ====================
  const handleConversationComplete = useCallback((stepId: string, userInput: string, score?: number) => {
    setStepResults(prev => ({
      ...prev,
      [stepId]: {
        stepId,
        type: 'conversation',
        score: score ?? 75,
        userInput,
      },
    }));
    setActiveInteraction(null);
  }, []);

  // ==================== 翻译切换 ====================
  const toggleTranslation = useCallback((stepId: string) => {
    setShowTranslation(prev => ({ ...prev, [stepId]: !prev[stepId] }));
  }, []);

  // ==================== TTS 播放 ====================
  const handlePlayTTS = useCallback((stepId: string, text: string, characterId?: string) => {
    const character = characterId ? getCharacterById(characterId) : null;
    const voice = character?.voiceEngineId || 'en-US-AriaNeural';
    tts.speak(stepId, text, voice);
  }, [getCharacterById, tts]);

  // ==================== 计算评分 ====================
  const calculateScore = useCallback((): ChapterScore => {
    const results = Object.values(stepResults);

    // 理解力：选择题 + 听力题正确率
    const comprehensionSteps = results.filter(r => r.type === 'choice' || r.type === 'listening');
    const comprehensionCorrect = comprehensionSteps.filter(r => r.correct).length;
    const comprehension = comprehensionSteps.length > 0
      ? Math.round((comprehensionCorrect / comprehensionSteps.length) * 100)
      : 100;

    // 表达力：对话题平均分
    const expressionSteps = results.filter(r => r.type === 'conversation');
    const expression = expressionSteps.length > 0
      ? Math.round(expressionSteps.reduce((sum, r) => sum + (r.score || 0), 0) / expressionSteps.length)
      : 100;

    // 发音：跟读题平均分
    const pronunciationSteps = results.filter(r => r.type === 'read_aloud');
    const pronunciation = pronunciationSteps.length > 0
      ? Math.round(pronunciationSteps.reduce((sum, r) => sum + (r.score || 0), 0) / pronunciationSteps.length)
      : 100;

    const overall = Math.round((comprehension + expression + pronunciation) / 3);
    const stars = overall >= 90 ? 3 : overall >= 70 ? 2 : 1;

    return { comprehension, expression, pronunciation, overall, stars: stars as 1 | 2 | 3 };
  }, [stepResults]);

  // ==================== 返回 ====================
  const handleBack = useCallback(() => {
    tts.stop();
    navigation.goBack();
  }, [navigation, tts]);

  // 检测场景切换（用于显示场景标题卡片）
  const getSceneTransition = useCallback((index: number): ScenarioScene | null => {
    if (index === 0) return flatSteps[0]?.scene || null;
    const prev = flatSteps[index - 1];
    const curr = flatSteps[index];
    if (prev && curr && prev.scene.id !== curr.scene.id) {
      return curr.scene;
    }
    return null;
  }, [flatSteps]);

  return {
    // 数据
    chapter,
    visibleSteps,
    phase,
    stepResults,
    showTranslation,
    listeningRevealed,
    activeInteraction,
    isCurrentStepDone,
    isAllStepsVisible,
    scrollViewRef,
    tts,
    t,

    // 事件
    advanceStep,
    handleChoiceSelect,
    handleListeningSelect,
    handleReadAloudComplete,
    handleConversationComplete,
    toggleTranslation,
    handlePlayTTS,
    handleBack,
    calculateScore,
    getSceneTransition,
    getCharacterById,
  };
}
