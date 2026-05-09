/**
 * 每日挑战赛逻辑 Hook
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/stores/AuthStore';
import { useTTS } from '@/hooks/useTTS';
import { apiClient } from '@/api';
import type {
  DailyChallenge,
  DailyChallengeQuestion,
  LeaderboardEntry,
  DailyChallengeStats,
} from '@/api/modules/dailyChallenge';

type Phase = 'lobby' | 'playing' | 'result';

const BASE_SCORE = 100;
const SPEED_BONUS_MAX = 50;
const COMBO_BONUS = 20;
const FEEDBACK_DELAY = 1200;

export function useDailyChallenge() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const tts = useTTS();

  // Lobby state
  const [phase, setPhase] = useState<Phase>('lobby');
  const [isLoading, setIsLoading] = useState(true);
  const [challenge, setChallenge] = useState<DailyChallenge | null>(null);
  const [myStats, setMyStats] = useState<DailyChallengeStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [alreadyPlayed, setAlreadyPlayed] = useState(false);

  // Playing state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [feedbackState, setFeedbackState] = useState<'correct' | 'wrong' | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [overallTimeLeft, setOverallTimeLeft] = useState(0); // ms
  const [questionStartTime, setQuestionStartTime] = useState(0);

  // Refs
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const overallTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isAnsweredRef = useRef(false);
  const startTimeRef = useRef(0);

  const currentQuestion = challenge?.questions?.[currentIndex] || null;
  const isFinished = challenge ? currentIndex >= challenge.totalQuestions : false;

  // ==================== Lobby 数据加载 ====================

  const loadLobbyData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setIsLoading(true);

      // 并行加载
      const [challengeRes, statsRes, lbRes] = await Promise.allSettled([
        apiClient.getDailyChallenge(),
        apiClient.getDailyChallengeStats(),
        apiClient.getDailyChallengeLeaderboard(),
      ]);

      if (challengeRes.status === 'fulfilled' && challengeRes.value.success) {
        setChallenge(challengeRes.value.data);
      }
      if (statsRes.status === 'fulfilled' && statsRes.value.success) {
        setMyStats(statsRes.value.data);
      }
      if (lbRes.status === 'fulfilled' && lbRes.value.success) {
        setLeaderboard(lbRes.value.data.leaderboard.slice(0, 10));
        setMyRank(lbRes.value.data.myRank);
        if (lbRes.value.data.myRank !== null) {
          setAlreadyPlayed(true);
        }
      }
    } catch (error) {
      console.error('[DailyChallenge] 加载失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadLobbyData();
  }, [loadLobbyData]);

  // ==================== 开始挑战 ====================

  const handleStartChallenge = useCallback(() => {
    if (!challenge) return;
    setPhase('playing');
    setCurrentIndex(0);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setCorrectCount(0);
    setOverallTimeLeft(challenge.timeLimit * 1000);
    setQuestionStartTime(Date.now());
    startTimeRef.current = Date.now();
    isAnsweredRef.current = false;

    // 启动总计时器
    overallTimerRef.current = setInterval(() => {
      setOverallTimeLeft(prev => {
        if (prev <= 1000) {
          if (overallTimerRef.current) clearInterval(overallTimerRef.current);
          handleTimeUp();
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);
  }, [challenge]);

  // ==================== 答题 ====================

  const handleAnswer = useCallback((index: number) => {
    if (isAnsweredRef.current || !currentQuestion) return;
    isAnsweredRef.current = true;
    setSelectedIndex(index);

    const isCorrect = index === currentQuestion.correctIndex;
    const timeTaken = Date.now() - questionStartTime;
    const timeRatio = Math.max(0, 1 - timeTaken / 10000); // 10s per question

    if (isCorrect) {
      const newCombo = combo + 1;
      const newMaxCombo = Math.max(maxCombo, newCombo);
      const speedBonus = Math.round(timeRatio * SPEED_BONUS_MAX);
      const comboBonus = newCombo * COMBO_BONUS;
      const questionScore = BASE_SCORE + speedBonus + comboBonus;

      setCombo(newCombo);
      setMaxCombo(newMaxCombo);
      setScore(prev => prev + questionScore);
      setCorrectCount(prev => prev + 1);
      setFeedbackState('correct');
    } else {
      setCombo(0);
      setFeedbackState('wrong');
    }

    feedbackTimerRef.current = setTimeout(() => {
      goToNext();
    }, FEEDBACK_DELAY);
  }, [currentQuestion, combo, maxCombo, questionStartTime]);

  // ==================== 下一题 ====================

  const goToNext = useCallback(() => {
    setFeedbackState(null);
    setSelectedIndex(null);
    isAnsweredRef.current = false;

    const nextIndex = currentIndex + 1;
    if (challenge && nextIndex >= challenge.totalQuestions) {
      finishChallenge();
    } else {
      setCurrentIndex(nextIndex);
      setQuestionStartTime(Date.now());
    }
  }, [currentIndex, challenge]);

  // ==================== 完成/超时 ====================

  const handleTimeUp = useCallback(() => {
    finishChallenge();
  }, []);

  const finishChallenge = useCallback(async () => {
    if (overallTimerRef.current) clearInterval(overallTimerRef.current);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);

    const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
    setPhase('result');

    // 提交结果
    if (challenge && user?.id) {
      try {
        const res = await apiClient.submitDailyChallenge({
          date: challenge.date,
          score,
          correctCount,
          totalQuestions: challenge.totalQuestions,
          maxCombo,
          duration,
        });
        if (res.success && res.data.rank) {
          setMyRank(res.data.rank);
        }
        // 上报 XP
        try { apiClient.addXP('daily_challenge_done'); } catch {}
      } catch (e) {
        console.error('[DailyChallenge] 提交失败:', e);
      }
    }
  }, [challenge, user?.id, score, correctCount, maxCombo]);

  // 听力题自动播放
  useEffect(() => {
    if (
      phase === 'playing' &&
      currentQuestion?.type === 'listenChoice' &&
      !feedbackState
    ) {
      tts.speak(`dc_${currentQuestion.wordId}`, currentQuestion.word, 'en-US-AvaMultilingualNeural');
    }
  }, [currentIndex, phase, feedbackState]);

  // 清理
  useEffect(() => {
    return () => {
      if (overallTimerRef.current) clearInterval(overallTimerRef.current);
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      tts.stop();
    };
  }, []);

  return {
    // Lobby
    phase,
    isLoading,
    challenge,
    myStats,
    leaderboard,
    myRank,
    alreadyPlayed,

    // Playing
    currentIndex,
    currentQuestion,
    score,
    combo,
    correctCount,
    feedbackState,
    selectedIndex,
    overallTimeLeft,
    isFinished,
    maxCombo,

    // Actions
    handleStartChallenge,
    handleAnswer,
    navigation,
  };
}
