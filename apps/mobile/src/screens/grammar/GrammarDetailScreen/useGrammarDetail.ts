import { useNavigation, useRoute } from '@react-navigation/native';
import { getGrammarPointByCode } from '@/data/grammarPoints';
import { useTTS } from '@/hooks/useTTS';
import { useGrammarExplanation } from '@/hooks/queries';
import type { StructuredExplanation } from '@/api/modules/grammar';

interface RouteParams {
  pointCode: string;
  categoryCode: string;
}

export function useGrammarDetail() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { pointCode, categoryCode } = route.params as RouteParams;

  const tts = useTTS();

  const pointData = getGrammarPointByCode(pointCode);
  const point = pointData?.point;
  const category = pointData?.category;

  // React Query：自动缓存 10min，错误状态通过 isError 暴露
  const { data, isLoading, isError } = useGrammarExplanation(pointCode);

  const explanation = data?.explanation ?? null;
  const audioSummary = data?.audioSummary ?? null;
  const audioUrl = data?.audioUrl ?? null;
  const pointId = data?.id ?? null;

  const isStructured = explanation !== null && typeof explanation === 'object';
  const structuredExplanation = isStructured ? (explanation as StructuredExplanation) : null;

  const handlePlayTTS = () => {
    if (!audioUrl) return;
    tts.playUrl(`grammar_${pointCode}`, audioUrl);
  };

  const handleStartPractice = () => {
    tts.stop();
    navigation.navigate('GrammarPractice', { pointCode, categoryCode, pointId });
  };

  const handleStartLesson = () => {
    tts.stop();
    navigation.navigate('GrammarLesson', { pointCode, categoryCode, pointId });
  };

  const handleGoBack = () => {
    tts.stop();
    navigation.goBack();
  };

  return {
    point,
    category,
    explanation,
    isStructured,
    structuredExplanation,
    isLoading,
    isError,
    tts,
    handlePlayTTS,
    handleStartPractice,
    handleStartLesson,
    handleGoBack,
  };
}
