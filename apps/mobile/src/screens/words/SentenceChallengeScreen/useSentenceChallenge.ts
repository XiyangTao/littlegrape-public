/**
 * AI 造句挑战逻辑 Hook
 */
import { useState, useCallback, useEffect } from 'react';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useAuth } from '@/stores/AuthStore';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import { getWordById, parseLocalWord } from '@/db/word';
import { saveSentenceChallenge } from '@/db/word';
import { apiClient } from '@/api';
import type { SentenceEvalResult } from '@/db/word';

type SentenceChallengeRouteParams = {
  SentenceChallenge: {
    wordId: string;
    word?: string;
    meaningCn?: string;
  };
};

type Phase = 'input' | 'evaluating' | 'result';

export function useSentenceChallenge() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<SentenceChallengeRouteParams, 'SentenceChallenge'>>();
  const { user } = useAuth();
  const aiGate = useFeatureGate('aiChat');
  const { wordId, word: wordParam, meaningCn: meaningCnParam } = route.params;

  const [phase, setPhase] = useState<Phase>('input');
  const [wordData, setWordData] = useState<{ word: string; meaningCn: string; collocations: string[] }>({
    word: wordParam || '',
    meaningCn: meaningCnParam || '',
    collocations: [],
  });
  const [inputText, setInputText] = useState('');
  const [evalResult, setEvalResult] = useState<SentenceEvalResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load word data
  useEffect(() => {
    const loadWord = async () => {
      if (!user?.id) return;
      try {
        const word = await getWordById(wordId);
        if (word) {
          const parsed = parseLocalWord(word);
          const collocations = parsed.collocations.map(c => c.pattern).slice(0, 3);
          setWordData({
            word: word.word,
            meaningCn: word.meaningCn,
            collocations,
          });
        }
      } catch (e) {
        console.warn('[SentenceChallenge] 加载单词失败:', e);
      }
    };
    loadWord();
  }, [wordId, user?.id]);

  const handleSubmit = useCallback(async () => {
    if (!inputText.trim() || !user?.id) return;
    if (!aiGate.guard()) return;

    setPhase('evaluating');
    setError(null);

    try {
      const result = await apiClient.evaluateSentence({
        word: wordData.word,
        wordId,
        meaningCn: wordData.meaningCn,
        sentence: inputText.trim(),
      });

      const evalData: SentenceEvalResult = {
        grammarScore: result.grammarScore,
        usageScore: result.usageScore,
        naturalScore: result.naturalScore,
        overallScore: result.overallScore,
        feedback: result.feedback,
        improvedSentence: result.improvedSentence,
      };

      setEvalResult(evalData);

      // Save to local DB
      await saveSentenceChallenge(user.id, wordId, inputText.trim(), evalData);

      // 上报 XP
      try { apiClient.addXP('sentence_done'); } catch {}

      setPhase('result');
    } catch (e: any) {
      console.error('[SentenceChallenge] 评估失败:', e);
      setError(e.message || '评估失败，请稍后重试');
      setPhase('input');
    }
  }, [inputText, user?.id, wordData, wordId]);

  const handleRetry = useCallback(() => {
    setInputText('');
    setEvalResult(null);
    setPhase('input');
  }, []);

  return {
    phase,
    wordData,
    inputText,
    setInputText,
    evalResult,
    error,
    handleSubmit,
    handleRetry,
    navigation,
  };
}
