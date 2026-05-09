/**
 * 关卡总结逻辑 Hook
 * 星级计算、XP 计算、保存进度、加载薄弱词
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Animated } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useAuth } from '@/stores/AuthStore';
import {
  saveUserLevelProgress,
  getUserLevelProgress,
  getWordsByIds,
  getLevelByIndex,
} from '@/db/word/LevelDB';
import { calcStars, calcXP, calcBossXP } from '@/services/LevelService';
import { apiClient } from '@/api';
import type { LearnWordWithProgress } from '@/types/word';
import type { LevelResult } from '@/types/level';

// ==================== 类型定义 ====================

type LevelSummaryRouteParams = {
  LevelSummary: {
    tag: string;
    levelIndex: number;
    result: LevelResult;
    isBoss?: boolean;
  };
};

// ==================== Hook ====================

export function useLevelSummary() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<LevelSummaryRouteParams, 'LevelSummary'>>();

  const { tag, levelIndex, result, isBoss: isBossParam } = route.params;

  const [isLoading, setIsLoading] = useState(true);
  const [stars, setStars] = useState(0);
  const [xp, setXp] = useState(0);
  const [isFirstClear, setIsFirstClear] = useState(false);
  const [isBoss, setIsBoss] = useState(!!isBossParam);
  const [weakWords, setWeakWords] = useState<LearnWordWithProgress[]>([]);
  const [nextPreviewWords, setNextPreviewWords] = useState<{word: string; meaningCn: string}[]>([]);
  const [isSaved, setIsSaved] = useState(false);

  // 星星动画
  const starAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  // ==================== 计算并保存 ====================

  useEffect(() => {
    const processResult = async () => {
      if (!user?.id) return;

      try {
        setIsLoading(true);

        // 计算星级（综合阶段二+三正确率）
        const quizCorrect = result.stage2Correct + result.stage3Correct;
        const quizTotal = result.stage2Total + result.stage3Total;
        const calculatedStars = calcStars(quizCorrect, quizTotal);
        setStars(calculatedStars);

        // 检查是否首次通关
        const existingProgress = await getUserLevelProgress(user.id, tag, levelIndex);
        const firstClear = !existingProgress || existingProgress.stars === 0;
        setIsFirstClear(firstClear);

        // 确认是否 Boss 关（以 DB 为准，路由参数为备选）
        const level = await getLevelByIndex(tag, levelIndex);
        const bossFlag = level?.isBoss ?? !!isBossParam;
        setIsBoss(bossFlag);

        // 计算 XP（Boss 关使用更高的 XP 表）
        const calculatedXP = bossFlag
          ? calcBossXP(result, firstClear)
          : calcXP(result, firstClear);
        setXp(calculatedXP);

        // 加载薄弱词
        if (result.wrongWordIds.length > 0) {
          const words = await getWordsByIds(result.wrongWordIds, user.id);
          setWeakWords(words);
        }

        // 保存进度（映射新字段到 DB 旧列名）
        await saveUserLevelProgress({
          userId: user.id,
          tag,
          levelIndex,
          stars: calculatedStars,
          flashCorrect: result.learnedCount,
          flashTotal: result.learnedCount + result.skippedCount,
          challengeCorrect: result.stage2Correct + result.stage3Correct,
          challengeTotal: result.stage2Total + result.stage3Total,
          comboMax: result.comboMax,
          score: 0,
          xpEarned: calculatedXP,
          weakWordIds: result.wrongWordIds,
          completedAt: Date.now(),
          updatedAt: Date.now(),
        });

        // 上报 XP
        try {
          if (bossFlag) {
            apiClient.addXP('boss_complete');
          } else {
            apiClient.addXP('level_complete');
          }
          if (calculatedStars === 3) {
            apiClient.addXP('perfect_level');
          }
        } catch {}

        setIsSaved(true);

        // 加载下一关预览
        try {
          const nextLevel = await getLevelByIndex(tag, levelIndex + 1);
          if (nextLevel) {
            const wordIdsToPreview = nextLevel.wordIds.slice(0, 3);
            if (wordIdsToPreview.length > 0) {
              const previewWords = await getWordsByIds(wordIdsToPreview, user.id);
              setNextPreviewWords(previewWords.map((w: any) => ({ word: w.word, meaningCn: w.meaningCn })));
            }
          }
        } catch (e) {
          console.warn('[LevelSummary] 加载下一关预览失败:', e);
        }

        // 触发星星动画
        const animations = [];
        for (let i = 0; i < calculatedStars; i++) {
          animations.push(
            Animated.sequence([
              Animated.delay(i * 300),
              Animated.spring(starAnims[i], {
                toValue: 1,
                friction: 4,
                tension: 80,
                useNativeDriver: true,
              }),
            ])
          );
        }
        Animated.parallel(animations).start();
      } catch (error) {
        console.error('[LevelSummary] 处理结果失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    processResult();
  }, [user?.id, tag, levelIndex, result]);

  // ==================== 导航 ====================

  const handleGoHome = useCallback(() => {
    navigation.popToTop();
  }, [navigation]);

  const handleNextLevel = useCallback(async () => {
    // 获取下一关信息
    const nextLevel = await getLevelByIndex(tag, levelIndex + 1);
    if (nextLevel) {
      navigation.replace('LevelLearn', { tag, levelIndex: levelIndex + 1 });
    } else {
      // 没有下一关，返回地图
      navigation.replace('LevelMap', { tag });
    }
  }, [navigation, tag, levelIndex]);

  return {
    // 状态
    isLoading,
    stars,
    xp,
    isFirstClear,
    isBoss,
    weakWords,
    nextPreviewWords,
    result,
    tag,
    levelIndex,
    isSaved,

    // 动画
    starAnims,

    // 操作
    handleGoHome,
    handleNextLevel,

    // 导航
    navigation,
  };
}
